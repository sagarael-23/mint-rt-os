#include "api.h"

#include "logger.h"
#include "monitor.h"
#include "process.h"
#include "scheduler.h"
#include "utils.h"

#include <ctype.h>
#include <errno.h>
#include <netinet/in.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

#define MAX_PROCS      2048
#define REQ_MAX        4096
#define LOG_PAGE       200
#define LOG_INITIAL    100
#define SAMPLE_MS      1000
#define MAX_SIM_MS     3600000UL   /* batas execMs/deadlineMs: 1 jam simulasi */
#define MAX_ADVANCE_MS 5000        /* maksimum tick simulasi per pembaruan   */
#define MAX_PID_VALUE  4194304UL
#define TIMELINE_MAX   100

/* ------------------------------------------------------------------ */
/* Data terbaru (diperbarui tiap 1 detik, dibaca oleh handler)         */
/* ------------------------------------------------------------------ */

static Process     buf_a[MAX_PROCS];
static Process     buf_b[MAX_PROCS];
static Process    *latest   = buf_a;
static Process    *work     = buf_b;
static int         n_latest = 0;
static SystemStats sys_stats;
static CpuSample   last_cpu;

static Scheduler   g_sched;          /* scheduler EDF simulasi */
static long long   sched_last_ms = 0;

static volatile sig_atomic_t g_stop = 0;

static void on_signal(int sig)
{
    (void)sig;
    g_stop = 1;
}

static long long now_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (long long)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

static const Process *find_process(int pid)
{
    for (int i = 0; i < n_latest; i++)
        if (latest[i].pid == pid)
            return &latest[i];
    return NULL;
}

/* Task EDF aktif (belum selesai) yang ditautkan ke PID ini, atau NULL. */
static const SchedTask *sched_task_for_pid(int pid)
{
    if (pid <= 0)
        return NULL;
    for (int i = 0; i < g_sched.task_count; i++) {
        const SchedTask *t = &g_sched.tasks[i];
        if (t->pid == pid && t->state != TASK_COMPLETED)
            return t;
    }
    return NULL;
}

/* Majukan jam simulasi mengikuti waktu nyata: 1 ms nyata = 1 tick simulasi. */
static void sched_advance(void)
{
    long long t = now_ms();
    long long elapsed = t - sched_last_ms;
    sched_last_ms = t;

    if (!g_sched.active || elapsed <= 0)
        return;
    if (elapsed > MAX_ADVANCE_MS)
        elapsed = MAX_ADVANCE_MS;
    for (long long i = 0; i < elapsed; i++)
        sched_tick(&g_sched);
}

/* Lepas tautan PID jika proses yang ditautkan sudah tidak ada. */
static void unlink_dead_pids(void)
{
    for (int i = 0; i < g_sched.task_count; i++) {
        SchedTask *t = &g_sched.tasks[i];
        if (t->pid > 0 && t->state != TASK_COMPLETED && !find_process(t->pid)) {
            log_msg(LOG_INFO, LOG_SCHEDULER,
                    "%s: linked process (PID %d) exited, task continues as pure simulation",
                    t->name, t->pid);
            t->pid = 0;
        }
    }
}

static int state_init(void)
{
    if (monitor_read_cpu_sample(&last_cpu) != 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "cannot read /proc/stat");
        return -1;
    }
    n_latest = process_scan(latest, MAX_PROCS);
    if (n_latest < 0) {
        log_msg(LOG_ERROR, LOG_PROCESS, "cannot scan /proc");
        return -1;
    }
    if (monitor_read_system(&sys_stats) != 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "cannot read /proc/meminfo");
        return -1;
    }
    sys_stats.cpu_percent   = 0.0;
    sys_stats.process_count = n_latest;
    monitor_log_changes(NULL, 0, latest, n_latest);
    return 0;
}

static void state_update(void)
{
    CpuSample cs;
    if (monitor_read_cpu_sample(&cs) != 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "cannot read /proc/stat");
        return;
    }
    int n = process_scan(work, MAX_PROCS);
    if (n < 0) {
        log_msg(LOG_ERROR, LOG_PROCESS, "cannot scan /proc");
        return;
    }

    unsigned long long dt = (cs.total > last_cpu.total) ? cs.total - last_cpu.total : 0;
    monitor_apply_process_cpu(work, n, latest, n_latest, dt);
    monitor_log_changes(latest, n_latest, work, n);

    SystemStats st;
    if (monitor_read_system(&st) == 0) {
        st.cpu_percent   = monitor_cpu_percent(&last_cpu, &cs);
        st.process_count = n;
        monitor_log_thresholds(&st);
        sys_stats = st;
    }

    /* Hasil baru menjadi 'latest'; yang lama dipakai ulang sebagai 'work'. */
    Process *tmp = latest;
    latest = work;
    work   = tmp;
    n_latest = n;
    last_cpu = cs;

    unlink_dead_pids();
}

/* ------------------------------------------------------------------ */
/* Pembuat JSON                                                        */
/* ------------------------------------------------------------------ */

static int json_err(StrBuf *b, int status, const char *msg)
{
    sb_appendf(b, "{\"error\":");
    sb_append_json_str(b, msg);
    sb_appendf(b, "}");
    return status;
}

static int json_process_obj(StrBuf *b, const Process *p)
{
    int rc = 0;
    char st = isalpha((unsigned char)p->state) ? p->state : '?';
    const SchedTask *rt = sched_task_for_pid(p->pid);

    rc |= sb_appendf(b, "{\"pid\":%d,\"ppid\":%d,\"name\":", p->pid, p->ppid);
    rc |= sb_append_json_str(b, p->name);
    rc |= sb_appendf(b,
        ",\"state\":\"%c\",\"stateName\":\"%s\",\"cpu\":%.1f,"
        "\"memoryKb\":%ld,\"threads\":%d,\"priority\":%d,\"cpuTimeSec\":%.2f",
        st, process_state_name(p->state), p->cpu_usage,
        p->memory_kb, p->threads, p->priority, p->execution_time);

    if (rt) {
        /* Label simulasi: proses asli tidak diubah oleh scheduler kita. */
        rc |= sb_appendf(b,
            ",\"rtStatus\":\"EDF SIMULATION\",\"rtDeadlineInMs\":%ld,\"rtRemainingMs\":%ld}",
            rt->deadline_ms - g_sched.now_ms, rt->remaining_ms);
    } else {
        rc |= sb_appendf(b,
            ",\"rtStatus\":\"NORMAL\",\"rtDeadlineInMs\":null,\"rtRemainingMs\":null}");
    }
    return rc;
}

static int handle_system(StrBuf *b)
{
    const SystemStats *s = &sys_stats;
    int rc = sb_appendf(b,
        "{\"cpuPercent\":%.1f,\"cpuCores\":%d,\"memTotalKb\":%ld,"
        "\"memAvailableKb\":%ld,\"memUsedKb\":%ld,\"memPercent\":%.1f,"
        "\"processCount\":%d,\"load1\":%.2f,\"load5\":%.2f,\"load15\":%.2f,"
        "\"uptimeSec\":%.0f}",
        s->cpu_percent, s->cpu_cores, s->mem_total_kb,
        s->mem_available_kb, s->mem_used_kb, s->mem_percent,
        s->process_count, s->load1, s->load5, s->load15, s->uptime_sec);
    return rc == 0 ? 200 : 500;
}

static int handle_processes(StrBuf *b)
{
    int rc = sb_appendf(b, "{\"count\":%d,\"processes\":[", n_latest);
    for (int i = 0; i < n_latest; i++) {
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= json_process_obj(b, &latest[i]);
    }
    rc |= sb_appendf(b, "]}");
    return rc == 0 ? 200 : 500;
}

static int handle_process_one(const char *pidstr, StrBuf *b)
{
    if (*pidstr == '\0' || strlen(pidstr) > 9)
        return json_err(b, 400, "invalid pid");
    for (const char *c = pidstr; *c; c++)
        if (!isdigit((unsigned char)*c))
            return json_err(b, 400, "invalid pid");

    const Process *p = find_process(atoi(pidstr));
    if (!p)
        return json_err(b, 404, "process not found");
    return json_process_obj(b, p) == 0 ? 200 : 500;
}

static int handle_logs(const char *query, StrBuf *b)
{
    static LogEntry entries[LOG_PAGE];
    unsigned long since;

    /* Tanpa ?since=, kirim LOG_INITIAL entri terbaru. */
    if (query_get_ulong(query, "since", &since) != 0) {
        unsigned long last = log_last_seq();
        since = (last > LOG_INITIAL) ? last - LOG_INITIAL : 0;
    }

    int n = log_get_since(since, entries, LOG_PAGE);
    unsigned long cursor = (n > 0) ? entries[n - 1].seq : since;

    int rc = sb_appendf(b, "{\"cursor\":%lu,\"lastSeq\":%lu,\"entries\":[",
                        cursor, log_last_seq());
    for (int i = 0; i < n; i++) {
        char tbuf[16];
        log_format_time(&entries[i], tbuf, sizeof(tbuf));
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b, "{\"seq\":%lu,\"time\":\"%s\",\"level\":\"%s\","
                            "\"category\":\"%s\",\"message\":",
                         entries[i].seq, tbuf,
                         log_level_name(entries[i].level),
                         log_category_name(entries[i].category));
        rc |= sb_append_json_str(b, entries[i].message);
        rc |= sb_appendf(b, "}");
    }
    rc |= sb_appendf(b, "]}");
    return rc == 0 ? 200 : 500;
}

/* ------------------------------------------------------------------ */
/* Scheduler                                                           */
/* ------------------------------------------------------------------ */

/* Tulis ,"<id_key>":N,"<name_key>":"..." atau keduanya null. */
static int json_task_ref(StrBuf *b, const char *id_key, const char *name_key,
                         const Scheduler *s, int id)
{
    int rc = 0;
    if (id < 0) {
        rc |= sb_appendf(b, ",\"%s\":null,\"%s\":null", id_key, name_key);
    } else {
        rc |= sb_appendf(b, ",\"%s\":%d,\"%s\":", id_key, id, name_key);
        rc |= sb_append_json_str(b, s->tasks[id].name);
    }
    return rc;
}

static int handle_scheduler(StrBuf *b)
{
    const Scheduler *s = &g_sched;
    int q[SCHED_MAX_TASKS];
    int nq = sched_queue(s, q, SCHED_MAX_TASKS);
    int rc = 0;

    /* "Next" = task pertama di antrean yang bukan task yang sedang berjalan. */
    int next_id = -1;
    for (int i = 0; i < nq; i++) {
        if (q[i] != s->running_id) {
            next_id = q[i];
            break;
        }
    }

    rc |= sb_appendf(b,
        "{\"simulation\":true,\"algorithm\":\"EDF\",\"status\":\"%s\","
        "\"clockMs\":%ld,\"met\":%d,\"missed\":%d",
        s->active ? "RUNNING" : "STOPPED", s->now_ms, s->met, s->missed);
    rc |= json_task_ref(b, "currentTaskId", "currentTask", s, s->running_id);
    rc |= json_task_ref(b, "nextTaskId", "nextTask", s, next_id);

    long nd = sched_next_deadline(s);
    if (nd >= 0)
        rc |= sb_appendf(b, ",\"nextDeadlineMs\":%ld,\"nextDeadlineInMs\":%ld",
                         nd, nd - s->now_ms);
    else
        rc |= sb_appendf(b, ",\"nextDeadlineMs\":null,\"nextDeadlineInMs\":null");

    rc |= sb_appendf(b, ",\"queue\":[");
    for (int i = 0; i < nq; i++)
        rc |= sb_appendf(b, i ? ",%d" : "%d", q[i]);

    rc |= sb_appendf(b, "],\"tasks\":[");
    for (int i = 0; i < s->task_count; i++) {
        const SchedTask *t = &s->tasks[i];
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b, "{\"id\":%d,", t->id);
        if (t->pid > 0)
            rc |= sb_appendf(b, "\"pid\":%d,", t->pid);
        else
            rc |= sb_appendf(b, "\"pid\":null,");
        rc |= sb_appendf(b, "\"name\":");
        rc |= sb_append_json_str(b, t->name);
        rc |= sb_appendf(b,
            ",\"state\":\"%s\",\"arrivalMs\":%ld,\"execMs\":%ld,"
            "\"remainingMs\":%ld,\"deadlineMs\":%ld",
            sched_state_name(t->state), t->arrival_ms, t->exec_ms,
            t->remaining_ms, t->deadline_ms);
        if (t->finish_ms >= 0)
            rc |= sb_appendf(b, ",\"finishMs\":%ld", t->finish_ms);
        else
            rc |= sb_appendf(b, ",\"finishMs\":null");
        rc |= sb_appendf(b, ",\"missed\":%s}", t->missed ? "true" : "false");
    }

    rc |= sb_appendf(b, "],\"timeline\":[");
    int first = (s->slice_count > TIMELINE_MAX) ? s->slice_count - TIMELINE_MAX : 0;
    for (int i = first; i < s->slice_count; i++) {
        const SchedSlice *sl = &s->slices[i];
        if (i > first)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b, "{\"taskId\":%d,\"name\":", sl->task_id);
        rc |= sb_append_json_str(b, s->tasks[sl->task_id].name);
        rc |= sb_appendf(b, ",\"startMs\":%ld,\"endMs\":%ld}", sl->start_ms, sl->end_ms);
    }
    rc |= sb_appendf(b, "]}");
    return rc == 0 ? 200 : 500;
}

static int handle_sched_start(StrBuf *b)
{
    if (!g_sched.active) {
        sched_last_ms = now_ms();
        sched_start(&g_sched);
    }
    return handle_scheduler(b);
}

static int handle_sched_stop(StrBuf *b)
{
    if (g_sched.active) {
        sched_advance();            /* kejar waktu terakhir sebelum berhenti */
        sched_stop(&g_sched);
    }
    return handle_scheduler(b);
}

static int handle_sched_reset(StrBuf *b)
{
    sched_init(&g_sched);
    sched_last_ms = now_ms();
    log_msg(LOG_INFO, LOG_SCHEDULER, "scheduler reset");
    return handle_scheduler(b);
}

/* Reset lalu muat 3 task contoh. Urutan EDF yang benar: B, C, A. */
static int handle_sched_demo(StrBuf *b)
{
    sched_init(&g_sched);
    sched_last_ms = now_ms();
    sched_add_task(&g_sched, 0, "Task A", 0, 3000, 12000);
    sched_add_task(&g_sched, 0, "Task B", 0, 2000, 6000);
    sched_add_task(&g_sched, 0, "Task C", 0, 2500, 9000);
    log_msg(LOG_INFO, LOG_SCHEDULER, "demo workload loaded (3 simulated tasks)");
    return handle_scheduler(b);
}

static int handle_sched_add(const char *query, StrBuf *b)
{
    unsigned long exec_ms = 0, dl_ms = 0, pid_ul = 0;
    char name[SCHED_NAME_MAX];
    name[0] = '\0';

    int have_pid  = (query_get_ulong(query, "pid", &pid_ul) == 0);
    int have_name = (query_get_str(query, "name", name, sizeof(name)) == 0 &&
                     name[0] != '\0');

    if (query_get_ulong(query, "execMs", &exec_ms) != 0 ||
        query_get_ulong(query, "deadlineMs", &dl_ms) != 0 ||
        exec_ms < 1 || exec_ms > MAX_SIM_MS ||
        dl_ms < 1 || dl_ms > MAX_SIM_MS)
        return json_err(b, 400, "execMs and deadlineMs are required (1..3600000)");

    if (!have_pid && !have_name)
        return json_err(b, 400, "name or pid is required");

    int pid = 0;
    if (have_pid) {
        if (pid_ul < 1 || pid_ul > MAX_PID_VALUE)
            return json_err(b, 400, "invalid pid");
        const Process *p = find_process((int)pid_ul);
        if (!p)
            return json_err(b, 404, "process not found");
        if (sched_task_for_pid(p->pid))
            return json_err(b, 409, "process already has an active EDF task");
        pid = p->pid;
        if (!have_name) {
            strncpy(name, p->name, sizeof(name) - 1);
            name[sizeof(name) - 1] = '\0';
        }
    }

    int id = sched_add_task(&g_sched, pid, name, g_sched.now_ms,
                            (long)exec_ms, (long)dl_ms);
    if (id < 0)
        return json_err(b, 409, "task limit reached");

    log_msg(LOG_INFO, LOG_SCHEDULER,
            "task added: %s (exec %lu ms, deadline %lu ms)%s",
            name, exec_ms, dl_ms, pid > 0 ? ", linked to a Linux process" : "");
    return handle_scheduler(b);
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

static int route(const char *method, const char *path, const char *query, StrBuf *body)
{
    int is_get  = (strcmp(method, "GET") == 0);
    int is_post = (strcmp(method, "POST") == 0);

    /* Aksi scheduler: hanya POST. */
    if (strncmp(path, "/api/scheduler/", 15) == 0) {
        if (!is_post)
            return json_err(body, 405, "use POST");
        if (strcmp(path, "/api/scheduler/start") == 0)  return handle_sched_start(body);
        if (strcmp(path, "/api/scheduler/stop") == 0)   return handle_sched_stop(body);
        if (strcmp(path, "/api/scheduler/reset") == 0)  return handle_sched_reset(body);
        if (strcmp(path, "/api/scheduler/demo") == 0)   return handle_sched_demo(body);
        if (strcmp(path, "/api/scheduler/tasks") == 0)  return handle_sched_add(query, body);
        return json_err(body, 404, "not found");
    }

    /* Selebihnya: hanya GET. */
    if (!is_get)
        return json_err(body, 405, "method not allowed");

    if (strcmp(path, "/api/health") == 0) {
        sb_appendf(body, "{\"status\":\"ok\"}");
        return 200;
    }
    if (strcmp(path, "/api/system") == 0)
        return handle_system(body);
    if (strcmp(path, "/api/processes") == 0)
        return handle_processes(body);
    if (strncmp(path, "/api/processes/", 15) == 0)
        return handle_process_one(path + 15, body);
    if (strcmp(path, "/api/logs") == 0)
        return handle_logs(query, body);
    if (strcmp(path, "/api/scheduler") == 0)
        return handle_scheduler(body);

    return json_err(body, 404, "not found");
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

static const char *status_text(int code)
{
    switch (code) {
    case 200: return "OK";
    case 400: return "Bad Request";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 409: return "Conflict";
    default:  return "Internal Server Error";
    }
}

static int send_all(int fd, const char *data, size_t len)
{
    size_t off = 0;
    while (off < len) {
        ssize_t w = send(fd, data + off, len - off, MSG_NOSIGNAL);
        if (w < 0) {
            if (errno == EINTR)
                continue;
            return -1;
        }
        off += (size_t)w;
    }
    return 0;
}

static void send_response(int fd, int status, const StrBuf *body)
{
    char head[256];
    size_t blen = body->data ? body->len : 0;
    int hl = snprintf(head, sizeof(head),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Content-Length: %zu\r\n"
        "Cache-Control: no-store\r\n"
        "Connection: close\r\n\r\n",
        status, status_text(status), blen);

    if (send_all(fd, head, (size_t)hl) == 0 && blen > 0)
        send_all(fd, body->data, blen);
}

static void send_error(int fd, int status, const char *msg)
{
    StrBuf b;
    sb_init(&b);
    json_err(&b, status, msg);
    send_response(fd, status, &b);
    sb_free(&b);
}

/* Ambil nilai header (tanpa spasi di depan). Return 0 jika ada, -1 jika tidak. */
static int header_value(const char *req, const char *name, char *out, size_t n)
{
    size_t nl = strlen(name);
    const char *p = req;

    while ((p = strstr(p, "\r\n")) != NULL) {
        p += 2;
        if (strncasecmp(p, name, nl) == 0 && p[nl] == ':') {
            p += nl + 1;
            while (*p == ' ' || *p == '\t')
                p++;
            size_t o = 0;
            while (*p && *p != '\r' && o < n - 1)
                out[o++] = *p++;
            out[o] = '\0';
            return 0;
        }
    }
    return -1;
}

/* Tolak Host selain 127.0.0.1 / localhost (perlindungan DNS rebinding). */
static int host_allowed(const char *req)
{
    char host[128];
    static const char *allowed[] = { "127.0.0.1", "localhost" };

    if (header_value(req, "Host", host, sizeof(host)) != 0)
        return 0;
    for (size_t i = 0; i < sizeof(allowed) / sizeof(allowed[0]); i++) {
        size_t l = strlen(allowed[i]);
        if (strncmp(host, allowed[i], l) == 0 && (host[l] == '\0' || host[l] == ':'))
            return 1;
    }
    return 0;
}

static void handle_client(int fd)
{
    struct timeval tv = { 2, 0 };
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    char req[REQ_MAX];
    size_t len = 0;
    int complete = 0;

    while (len < sizeof(req) - 1) {
        ssize_t r = recv(fd, req + len, sizeof(req) - 1 - len, 0);
        if (r <= 0)
            break;                       /* ditutup, timeout, atau error */
        len += (size_t)r;
        req[len] = '\0';
        if (strstr(req, "\r\n\r\n")) {
            complete = 1;
            break;
        }
    }
    if (len == 0)
        return;
    req[len] = '\0';

    char method[8], target[512];
    if (!complete || sscanf(req, "%7s %511s", method, target) != 2) {
        send_error(fd, 400, "bad request");
        return;
    }

    int is_post = (strcmp(method, "POST") == 0);
    if (!is_post && strcmp(method, "GET") != 0) {
        send_error(fd, 405, "method not allowed");
        return;
    }
    if (!host_allowed(req)) {
        send_error(fd, 403, "host not allowed");
        return;
    }
    if (is_post) {
        char tmp[8];
        if (header_value(req, "X-Requested-With", tmp, sizeof(tmp)) != 0) {
            send_error(fd, 403, "missing X-Requested-With header");
            return;
        }
    }

    char *query = strchr(target, '?');
    if (query)
        *query++ = '\0';

    StrBuf body;
    sb_init(&body);
    int status = route(method, target, query, &body);
    if (status == 500 || body.data == NULL) {
        sb_free(&body);
        send_error(fd, 500, "internal error");
        return;
    }
    send_response(fd, status, &body);
    sb_free(&body);
}

/* ------------------------------------------------------------------ */
/* Loop utama                                                          */
/* ------------------------------------------------------------------ */

int api_serve(int port)
{
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = on_signal;           /* tanpa SA_RESTART: poll() ikut terbangun */
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv < 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "socket() failed: %s", strerror(errno));
        return -1;
    }
    int one = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family      = AF_INET;
    addr.sin_port        = htons((unsigned short)port);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);      /* hanya 127.0.0.1 */

    if (bind(srv, (struct sockaddr *)&addr, sizeof(addr)) != 0 ||
        listen(srv, 8) != 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "cannot listen on port %d: %s",
                port, strerror(errno));
        close(srv);
        return -1;
    }
    if (state_init() != 0) {
        close(srv);
        return -1;
    }

    sched_init(&g_sched);
    sched_last_ms = now_ms();

    log_msg(LOG_INFO, LOG_SYSTEM, "API listening on http://127.0.0.1:%d", port);

    long long next_tick = now_ms() + SAMPLE_MS;
    while (!g_stop) {
        long long wait = next_tick - now_ms();
        if (wait < 0)
            wait = 0;

        struct pollfd pfd = { srv, POLLIN, 0 };
        int pr = poll(&pfd, 1, (int)wait);
        if (pr < 0 && errno != EINTR) {
            log_msg(LOG_ERROR, LOG_SYSTEM, "poll() failed: %s", strerror(errno));
            break;
        }

        sched_advance();                 /* jam simulasi mengikuti waktu nyata */

        if (pr > 0 && (pfd.revents & POLLIN)) {
            int cfd = accept(srv, NULL, NULL);
            if (cfd >= 0) {
                handle_client(cfd);
                close(cfd);
            }
        }

        if (now_ms() >= next_tick) {
            state_update();
            next_tick += SAMPLE_MS;
            if (next_tick < now_ms())        /* tertinggal: jangan mengejar */
                next_tick = now_ms() + SAMPLE_MS;
        }
    }

    close(srv);
    log_msg(LOG_INFO, LOG_SYSTEM, "API stopped");
    return 0;
}