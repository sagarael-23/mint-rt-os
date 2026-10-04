#include "api.h"

#include "autosched.h"
#include "history.h"
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

#define MAX_PROCS        2048
#define REQ_MAX          4096
#define LOG_PAGE         200
#define LOG_INITIAL      100
#define CYCLE_DEFAULT_MS 1000
#define CYCLE_MIN_MS     500
#define CYCLE_MAX_MS     5000

/* ------------------------------------------------------------------ */
/* Data terbaru (diperbarui tiap siklus, dibaca oleh handler)          */
/* ------------------------------------------------------------------ */

static Process     buf_a[MAX_PROCS];
static Process     buf_b[MAX_PROCS];
static Process    *latest   = buf_a;
static Process    *work     = buf_b;
static int         n_latest = 0;
static SystemStats sys_stats;
static CpuSample   last_cpu;

/* Panjang siklus sampling dan simulasi (setelan cycleMs). */
static long        g_cycle_ms = CYCLE_DEFAULT_MS;
static int         reset_tick = 0;

/* Scheduler EDF otomatis (simulasi): jadwal dari siklus terakhir. */
static Scheduler          g_sched;
static AutoJob            jobs_buf[MAX_PROCS];
static int                cycle_order[SCHED_MAX_TASKS];
static int                cycle_n           = 0;
static int                cycle_active      = 0;   /* proses yang memakai CPU */
static long               cycle_demand_ms   = 0;
static unsigned long      sim_cycle         = 0;
static unsigned long long total_met         = 0;
static unsigned long long total_missed      = 0;
static int                sim_running       = 1;
static int                prev_cycle_missed = 0;

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

/* Job simulasi milik PID ini pada siklus terakhir, atau NULL. */
static const SchedTask *sim_job_for_pid(int pid)
{
    for (int i = 0; i < g_sched.task_count; i++)
        if (g_sched.tasks[i].pid == pid)
            return &g_sched.tasks[i];
    return NULL;
}

static void sim_clear(void)
{
    sched_init(&g_sched);
    cycle_n = 0;
    cycle_active = 0;
    cycle_demand_ms = 0;
}

/* Bangun dan jalankan satu siklus EDF dari data proses nyata. */
static void sim_update(const Process *cur, int ncur, const Process *prev, int nprev)
{
    if (!sim_running)
        return;

    int nj = autosched_collect(cur, ncur, prev, nprev, jobs_buf, MAX_PROCS);
    cycle_active = nj;
    cycle_demand_ms = autosched_run_cycle(&g_sched, jobs_buf, nj, g_cycle_ms);
    cycle_n = autosched_order(&g_sched, cycle_order, SCHED_MAX_TASKS);
    sim_cycle++;
    total_met    += (unsigned long long)g_sched.met;
    total_missed += (unsigned long long)g_sched.missed;

    /* Catat ke log hanya saat keadaan berubah, bukan tiap siklus. */
    int missed = (g_sched.missed > 0);
    if (missed && !prev_cycle_missed)
        log_msg(LOG_WARN, LOG_DEADLINE,
                "EDF simulation: %d job(s) missed deadline (cycle #%lu, CPU demand %ld ms in a %ld ms cycle)",
                g_sched.missed, sim_cycle, cycle_demand_ms, g_cycle_ms);
    else if (!missed && prev_cycle_missed)
        log_msg(LOG_INFO, LOG_SCHEDULER,
                "EDF simulation: all deadlines met again (cycle #%lu)", sim_cycle);
    prev_cycle_missed = missed;
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
    sim_update(work, n, latest, n_latest);

    SystemStats st;
    if (monitor_read_system(&st) == 0) {
        st.cpu_percent   = monitor_cpu_percent(&last_cpu, &cs);
        st.process_count = n;
        monitor_log_thresholds(&st);
        sys_stats = st;

        HistorySample hs;
        memset(&hs, 0, sizeof(hs));
        hs.timestamp     = time(NULL);
        hs.cpu_percent   = st.cpu_percent;
        hs.mem_percent   = st.mem_percent;
        hs.process_count = n;
        hs.jobs          = g_sched.task_count;
        hs.met           = g_sched.met;
        hs.missed        = g_sched.missed;
        hs.utilization   = cycle_demand_ms * 100.0 / (double)g_cycle_ms;
        history_add(&hs);
    }

    /* Hasil baru menjadi 'latest'; yang lama dipakai ulang sebagai 'work'. */
    Process *tmp = latest;
    latest = work;
    work   = tmp;
    n_latest = n;
    last_cpu = cs;
}

/* Ambil baseline baru TANPA mencatat sampel, supaya siklus berikutnya tepat
   sepanjang cycleMs dan tidak ada sampel berjendela pendek yang menyesatkan. */
static void state_rebaseline(void)
{
    CpuSample cs;
    if (monitor_read_cpu_sample(&cs) != 0)
        return;
    int n = process_scan(work, MAX_PROCS);
    if (n < 0)
        return;

    /* Pertahankan CPU% terakhir agar tampilan tidak melonjak. */
    for (int i = 0; i < n; i++) {
        work[i].cpu_usage = 0.0;
        for (int j = 0; j < n_latest; j++) {
            if (latest[j].pid == work[i].pid &&
                latest[j].start_ticks == work[i].start_ticks) {
                work[i].cpu_usage = latest[j].cpu_usage;
                break;
            }
        }
    }
    monitor_log_changes(latest, n_latest, work, n);

    Process *tmp = latest;
    latest = work;
    work   = tmp;
    n_latest = n;
    last_cpu = cs;
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
    const SchedTask *job = sim_job_for_pid(p->pid);

    rc |= sb_appendf(b, "{\"pid\":%d,\"ppid\":%d,\"name\":", p->pid, p->ppid);
    rc |= sb_append_json_str(b, p->name);
    rc |= sb_appendf(b,
        ",\"state\":\"%c\",\"stateName\":\"%s\",\"cpu\":%.1f,"
        "\"memoryKb\":%ld,\"threads\":%d,\"priority\":%d,\"cpuTimeSec\":%.2f",
        st, process_state_name(p->state), p->cpu_usage,
        p->memory_kb, p->threads, p->priority, p->execution_time);

    if (job) {
        /* Deadline simulasi, BUKAN deadline Linux asli. */
        rc |= sb_appendf(b,
            ",\"rtStatus\":\"EDF SIMULATION\",\"rtExecMs\":%ld,\"rtDeadlineMs\":%ld}",
            job->exec_ms, job->deadline_ms);
    } else {
        rc |= sb_appendf(b,
            ",\"rtStatus\":\"NORMAL\",\"rtExecMs\":null,\"rtDeadlineMs\":null}");
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
/* Monitoring dan settings                                             */
/* ------------------------------------------------------------------ */

static int handle_monitoring(StrBuf *b)
{
    static HistorySample hs[HISTORY_CAPACITY];
    int n = history_get_all(hs, HISTORY_CAPACITY);
    unsigned long long met = 0, missed = 0;
    int rc = 0;

    for (int i = 0; i < n; i++) {
        met    += (unsigned long long)hs[i].met;
        missed += (unsigned long long)hs[i].missed;
    }

    rc |= sb_appendf(b,
        "{\"intervalMs\":%ld,\"capacity\":%d,\"count\":%d,"
        "\"current\":{\"cpuPercent\":%.1f,\"memPercent\":%.1f,\"processCount\":%d,"
        "\"activeProcesses\":%d,\"utilizationPercent\":%.1f",
        g_cycle_ms, HISTORY_CAPACITY, n,
        sys_stats.cpu_percent, sys_stats.mem_percent, sys_stats.process_count,
        cycle_active, cycle_demand_ms * 100.0 / (double)g_cycle_ms);

    if (met + missed > 0)
        rc |= sb_appendf(b, ",\"deadlinePerformancePercent\":%.1f",
                         (double)met * 100.0 / (double)(met + missed));
    else
        rc |= sb_appendf(b, ",\"deadlinePerformancePercent\":null");

    rc |= sb_appendf(b, ",\"windowMet\":%llu,\"windowMissed\":%llu},\"samples\":[",
                     met, missed);

    for (int i = 0; i < n; i++) {
        char tbuf[16];
        history_format_time(&hs[i], tbuf, sizeof(tbuf));
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b,
            "{\"time\":\"%s\",\"cpu\":%.1f,\"mem\":%.1f,\"processes\":%d,"
            "\"jobs\":%d,\"met\":%d,\"missed\":%d,\"utilization\":%.1f}",
            tbuf, hs[i].cpu_percent, hs[i].mem_percent, hs[i].process_count,
            hs[i].jobs, hs[i].met, hs[i].missed, hs[i].utilization);
    }
    rc |= sb_appendf(b, "]}");
    return rc == 0 ? 200 : 500;
}

static int handle_settings(StrBuf *b)
{
    int rc = sb_appendf(b,
        "{\"algorithm\":\"EDF\",\"cycleMs\":%ld,\"cycleMinMs\":%d,\"cycleMaxMs\":%d,"
        "\"simulatedCores\":1,\"schedulerStatus\":\"%s\",\"historyCapacity\":%d}",
        g_cycle_ms, CYCLE_MIN_MS, CYCLE_MAX_MS,
        sim_running ? "RUNNING" : "STOPPED", HISTORY_CAPACITY);
    return rc == 0 ? 200 : 500;
}

static int handle_settings_set(const char *query, StrBuf *b)
{
    unsigned long v;

    if (query_get_ulong(query, "cycleMs", &v) != 0)
        return json_err(b, 400, "no valid setting (supported: cycleMs)");
    if (v < (unsigned long)CYCLE_MIN_MS || v > (unsigned long)CYCLE_MAX_MS)
        return json_err(b, 400, "cycleMs must be between 500 and 5000");

    if ((long)v != g_cycle_ms) {
        g_cycle_ms = (long)v;
        log_msg(LOG_INFO, LOG_SYSTEM, "setting changed: cycleMs = %ld", g_cycle_ms);
        state_rebaseline();          /* ambil baseline baru segera */
        reset_tick = 1;          /* loop utama menjadwalkan ulang siklus berikutnya */
    }
    return handle_settings(b);
}

/* ------------------------------------------------------------------ */
/* Scheduler                                                           */
/* ------------------------------------------------------------------ */

/* Tulis ,"<key>":{"pid":N,"name":"..."} atau ,"<key>":null. */
static int json_job_ref(StrBuf *b, const char *key, int id)
{
    int rc = 0;
    if (id < 0)
        return sb_appendf(b, ",\"%s\":null", key);

    rc |= sb_appendf(b, ",\"%s\":{\"pid\":%d,\"name\":", key, g_sched.tasks[id].pid);
    rc |= sb_append_json_str(b, g_sched.tasks[id].name);
    rc |= sb_appendf(b, "}");
    return rc;
}

static int handle_scheduler(StrBuf *b)
{
    const Scheduler *s = &g_sched;
    int rc = 0;

    rc |= sb_appendf(b,
        "{\"simulation\":true,\"algorithm\":\"EDF\",\"status\":\"%s\","
        "\"cycle\":%lu,\"cycleMs\":%ld,\"simulatedCores\":1,"
        "\"jobCount\":%d,\"demandMs\":%ld,\"utilizationPercent\":%.1f,"
        "\"met\":%d,\"missed\":%d,\"totalMet\":%llu,\"totalMissed\":%llu",
        sim_running ? "RUNNING" : "STOPPED", sim_cycle, g_cycle_ms,
        s->task_count, cycle_demand_ms,
        cycle_demand_ms * 100.0 / (double)g_cycle_ms,
        s->met, s->missed, total_met, total_missed);

    /* "Current" = job pertama yang di-dispatch EDF pada siklus ini, "next" = kedua. */
    rc |= json_job_ref(b, "currentProcess", cycle_n > 0 ? cycle_order[0] : -1);
    rc |= json_job_ref(b, "nextProcess", cycle_n > 1 ? cycle_order[1] : -1);

    if (cycle_n > 0)
        rc |= sb_appendf(b, ",\"nextDeadlineMs\":%ld", s->tasks[cycle_order[0]].deadline_ms);
    else
        rc |= sb_appendf(b, ",\"nextDeadlineMs\":null");

    rc |= sb_appendf(b, ",\"queue\":[");
    for (int i = 0; i < cycle_n; i++) {
        const SchedTask *t = &s->tasks[cycle_order[i]];
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b, "{\"pid\":%d,\"name\":", t->pid);
        rc |= sb_append_json_str(b, t->name);
        rc |= sb_appendf(b, ",\"execMs\":%ld,\"deadlineMs\":%ld,", t->exec_ms, t->deadline_ms);
        if (t->finish_ms >= 0)
            rc |= sb_appendf(b, "\"finishMs\":%ld,", t->finish_ms);
        else
            rc |= sb_appendf(b, "\"finishMs\":null,");
        rc |= sb_appendf(b, "\"missed\":%s}", t->missed ? "true" : "false");
    }

    rc |= sb_appendf(b, "],\"timeline\":[");
    for (int i = 0; i < s->slice_count; i++) {
        const SchedSlice *sl = &s->slices[i];
        if (i > 0)
            rc |= sb_appendf(b, ",");
        rc |= sb_appendf(b, "{\"pid\":%d,\"name\":", s->tasks[sl->task_id].pid);
        rc |= sb_append_json_str(b, s->tasks[sl->task_id].name);
        rc |= sb_appendf(b, ",\"startMs\":%ld,\"endMs\":%ld}", sl->start_ms, sl->end_ms);
    }
    rc |= sb_appendf(b, "]}");
    return rc == 0 ? 200 : 500;
}

static int handle_sched_start(StrBuf *b)
{
    if (!sim_running) {
        sim_running = 1;
        prev_cycle_missed = 0;
        log_msg(LOG_INFO, LOG_SCHEDULER, "EDF scheduler started");
    }
    return handle_scheduler(b);
}

static int handle_sched_stop(StrBuf *b)
{
    if (sim_running) {
        sim_running = 0;
        sim_clear();                 /* semua proses kembali tampil NORMAL */
        log_msg(LOG_INFO, LOG_SCHEDULER, "EDF scheduler stopped");
    }
    return handle_scheduler(b);
}

static int handle_sched_reset(StrBuf *b)
{
    total_met = 0;
    total_missed = 0;
    sim_cycle = 0;
    prev_cycle_missed = 0;
    log_msg(LOG_INFO, LOG_SCHEDULER, "scheduler counters reset");
    return handle_scheduler(b);
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

static int route(const char *method, const char *path, const char *query, StrBuf *body)
{
    int is_get  = (strcmp(method, "GET") == 0);
    int is_post = (strcmp(method, "POST") == 0);

    /* Settings: GET membaca, POST mengubah. */
    if (strcmp(path, "/api/settings") == 0) {
        if (is_post)
            return handle_settings_set(query, body);
        if (is_get)
            return handle_settings(body);
        return json_err(body, 405, "method not allowed");
    }

    /* Aksi scheduler: hanya POST. */
    if (strncmp(path, "/api/scheduler/", 15) == 0) {
        if (!is_post)
            return json_err(body, 405, "use POST");
        if (strcmp(path, "/api/scheduler/start") == 0) return handle_sched_start(body);
        if (strcmp(path, "/api/scheduler/stop") == 0)  return handle_sched_stop(body);
        if (strcmp(path, "/api/scheduler/reset") == 0) return handle_sched_reset(body);
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
    if (strcmp(path, "/api/monitoring") == 0)
        return handle_monitoring(body);

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

    sim_clear();
    history_reset();

    log_msg(LOG_INFO, LOG_SYSTEM, "API listening on http://127.0.0.1:%d", port);
    log_msg(LOG_INFO, LOG_SCHEDULER,
            "EDF scheduler started (automatic mode: jobs built from real process CPU usage)");

    long long next_tick = now_ms() + g_cycle_ms;
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

        if (pr > 0 && (pfd.revents & POLLIN)) {
            int cfd = accept(srv, NULL, NULL);
            if (cfd >= 0) {
                handle_client(cfd);
                close(cfd);
            }
        }

        if (reset_tick) {                    /* cycleMs baru saja diubah */
            next_tick = now_ms() + g_cycle_ms;
            reset_tick = 0;
        }

        if (now_ms() >= next_tick) {
            state_update();
            next_tick += g_cycle_ms;
            if (next_tick < now_ms())        /* tertinggal: jangan mengejar */
                next_tick = now_ms() + g_cycle_ms;
        }
    }

    close(srv);
    log_msg(LOG_INFO, LOG_SYSTEM, "API stopped");
    return 0;
}