#include "api.h"

#include "logger.h"
#include "monitor.h"
#include "process.h"
#include "utils.h"

#include <ctype.h>
#include <errno.h>
#include <netinet/in.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

#define MAX_PROCS   2048
#define REQ_MAX     4096
#define LOG_PAGE    200
#define LOG_INITIAL 100
#define SAMPLE_MS   1000

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
}

/* ------------------------------------------------------------------ */
/* Pembuat JSON                                                        */
/* ------------------------------------------------------------------ */

static int json_process_obj(StrBuf *b, const Process *p)
{
    int rc = 0;
    char st = isalpha((unsigned char)p->state) ? p->state : '?';

    rc |= sb_appendf(b, "{\"pid\":%d,\"ppid\":%d,\"name\":", p->pid, p->ppid);
    rc |= sb_append_json_str(b, p->name);
    rc |= sb_appendf(b,
        ",\"state\":\"%c\",\"stateName\":\"%s\",\"cpu\":%.1f,"
        "\"memoryKb\":%ld,\"threads\":%d,\"priority\":%d,"
        "\"cpuTimeSec\":%.2f,\"rtStatus\":\"%s\"",
        st, process_state_name(p->state), p->cpu_usage,
        p->memory_kb, p->threads, p->priority,
        p->execution_time, p->rt_status);

    /* Proses Linux biasa tidak punya deadline asli -> null. */
    if (p->deadline_ms == RT_NONE)
        rc |= sb_appendf(b, ",\"deadlineMs\":null");
    else
        rc |= sb_appendf(b, ",\"deadlineMs\":%ld", p->deadline_ms);

    if (p->remaining_ms == RT_NONE)
        rc |= sb_appendf(b, ",\"remainingMs\":null}");
    else
        rc |= sb_appendf(b, ",\"remainingMs\":%ld}", p->remaining_ms);

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
    if (*pidstr == '\0')
        goto bad;
    for (const char *c = pidstr; *c; c++)
        if (!isdigit((unsigned char)*c))
            goto bad;
    if (strlen(pidstr) > 9)
        goto bad;

    int pid = atoi(pidstr);
    for (int i = 0; i < n_latest; i++) {
        if (latest[i].pid == pid)
            return json_process_obj(b, &latest[i]) == 0 ? 200 : 500;
    }
    sb_appendf(b, "{\"error\":\"process not found\"}");
    return 404;

bad:
    sb_appendf(b, "{\"error\":\"invalid pid\"}");
    return 400;
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

static int route(const char *path, const char *query, StrBuf *body)
{
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

    sb_appendf(body, "{\"error\":\"not found\"}");
    return 404;
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

static const char *status_text(int code)
{
    switch (code) {
    case 200: return "OK";
    case 400: return "Bad Request";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
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
    sb_appendf(&b, "{\"error\":\"%s\"}", msg);
    send_response(fd, status, &b);
    sb_free(&b);
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
    if (strcmp(method, "GET") != 0) {
        send_error(fd, 405, "method not allowed");
        return;
    }

    char *query = strchr(target, '?');
    if (query)
        *query++ = '\0';

    StrBuf body;
    sb_init(&body);
    int status = route(target, query, &body);
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