#include "monitor.h"
#include "logger.h"

#include <stdio.h>
#include <string.h>
#include <unistd.h>

int monitor_read_cpu_sample(CpuSample *out)
{
    FILE *f = fopen("/proc/stat", "r");
    if (!f)
        return -1;

    unsigned long long user = 0, nice = 0, sys = 0, idle = 0;
    unsigned long long iowait = 0, irq = 0, softirq = 0, steal = 0;

    int got = fscanf(f, "cpu %llu %llu %llu %llu %llu %llu %llu %llu",
                     &user, &nice, &sys, &idle, &iowait, &irq, &softirq, &steal);
    fclose(f);
    if (got < 4)
        return -1;

    /* guest/guest_nice sudah termasuk di user/nice, jadi tidak dijumlah lagi. */
    out->idle  = idle + iowait;
    out->total = user + nice + sys + idle + iowait + irq + softirq + steal;
    return 0;
}

double monitor_cpu_percent(const CpuSample *prev, const CpuSample *cur)
{
    if (cur->total <= prev->total)
        return 0.0;

    unsigned long long dtotal = cur->total - prev->total;
    unsigned long long didle  = (cur->idle >= prev->idle) ? cur->idle - prev->idle : 0;
    if (didle > dtotal)
        didle = dtotal;

    return (double)(dtotal - didle) * 100.0 / (double)dtotal;
}

int monitor_read_system(SystemStats *out)
{
    char line[256];
    long v;

    /* --- Memori: /proc/meminfo --- */
    FILE *f = fopen("/proc/meminfo", "r");
    if (!f)
        return -1;

    out->mem_total_kb = 0;
    out->mem_available_kb = 0;
    while (fgets(line, sizeof(line), f)) {
        if (sscanf(line, "MemTotal: %ld kB", &v) == 1)
            out->mem_total_kb = v;
        else if (sscanf(line, "MemAvailable: %ld kB", &v) == 1)
            out->mem_available_kb = v;
    }
    fclose(f);

    out->mem_used_kb = out->mem_total_kb - out->mem_available_kb;
    out->mem_percent = (out->mem_total_kb > 0)
        ? (double)out->mem_used_kb * 100.0 / (double)out->mem_total_kb
        : 0.0;

    /* --- Load average: /proc/loadavg --- */
    out->load1 = out->load5 = out->load15 = 0.0;
    f = fopen("/proc/loadavg", "r");
    if (f) {
        if (fscanf(f, "%lf %lf %lf", &out->load1, &out->load5, &out->load15) != 3)
            out->load1 = out->load5 = out->load15 = 0.0;
        fclose(f);
    }

    /* --- Uptime: /proc/uptime --- */
    out->uptime_sec = 0.0;
    f = fopen("/proc/uptime", "r");
    if (f) {
        if (fscanf(f, "%lf", &out->uptime_sec) != 1)
            out->uptime_sec = 0.0;
        fclose(f);
    }

    long cores = sysconf(_SC_NPROCESSORS_ONLN);
    out->cpu_cores = (cores > 0) ? (int)cores : 1;
    return 0;
}

void monitor_apply_process_cpu(Process *cur, int ncur,
                               const Process *prev, int nprev,
                               unsigned long long total_delta)
{
    for (int i = 0; i < ncur; i++) {
        cur[i].cpu_usage = 0.0;
        if (total_delta == 0)
            continue;

        for (int j = 0; j < nprev; j++) {
            /* PID sama DAN waktu mulai sama = proses yang sama. */
            if (prev[j].pid == cur[i].pid &&
                prev[j].start_ticks == cur[i].start_ticks) {
                unsigned long long a = cur[i].utime + cur[i].stime;
                unsigned long long b = prev[j].utime + prev[j].stime;
                if (a >= b) {
                    double pct = (double)(a - b) * 100.0 / (double)total_delta;
                    cur[i].cpu_usage = (pct > 100.0) ? 100.0 : pct;
                }
                break;
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* Pencatatan kejadian (Phase 6)                                       */
/* ------------------------------------------------------------------ */

#define CPU_WARN_PCT   90.0
#define MEM_WARN_PCT   90.0
#define CLEAR_MARGIN   10.0

static int find_same(const Process *list, int n, const Process *p)
{
    for (int i = 0; i < n; i++)
        if (list[i].pid == p->pid && list[i].start_ticks == p->start_ticks)
            return i;
    return -1;
}

static int is_notable_state(char s)
{
    return s == 'Z' || s == 'T' || s == 't';
}

void monitor_log_changes(const Process *prev, int nprev,
                         const Process *cur, int ncur)
{
    if (nprev <= 0) {
        log_msg(LOG_INFO, LOG_PROCESS, "initial scan: %d processes detected", ncur);
        return;
    }

    for (int i = 0; i < ncur; i++) {
        int j = find_same(prev, nprev, &cur[i]);
        if (j < 0) {
            log_msg(LOG_INFO, LOG_PROCESS, "%s (PID %d) detected",
                    cur[i].name, cur[i].pid);
        } else if (cur[i].state != prev[j].state &&
                   (is_notable_state(cur[i].state) || is_notable_state(prev[j].state))) {
            log_msg(cur[i].state == 'Z' ? LOG_WARN : LOG_INFO, LOG_PROCESS,
                    "%s (PID %d) state changed: %s -> %s",
                    cur[i].name, cur[i].pid,
                    process_state_name(prev[j].state),
                    process_state_name(cur[i].state));
        }
    }

    for (int j = 0; j < nprev; j++) {
        if (find_same(cur, ncur, &prev[j]) < 0)
            log_msg(LOG_INFO, LOG_PROCESS, "%s (PID %d) exited",
                    prev[j].name, prev[j].pid);
    }
}

void monitor_log_thresholds(const SystemStats *st)
{
    static int cpu_high = 0;
    static int mem_high = 0;

    if (!cpu_high && st->cpu_percent >= CPU_WARN_PCT) {
        cpu_high = 1;
        log_msg(LOG_WARN, LOG_CPU, "CPU usage high: %.1f %%", st->cpu_percent);
    } else if (cpu_high && st->cpu_percent < CPU_WARN_PCT - CLEAR_MARGIN) {
        cpu_high = 0;
        log_msg(LOG_INFO, LOG_CPU, "CPU usage back to normal: %.1f %%", st->cpu_percent);
    }

    if (!mem_high && st->mem_percent >= MEM_WARN_PCT) {
        mem_high = 1;
        log_msg(LOG_WARN, LOG_SYSTEM, "Memory usage high: %.1f %%", st->mem_percent);
    } else if (mem_high && st->mem_percent < MEM_WARN_PCT - CLEAR_MARGIN) {
        mem_high = 0;
        log_msg(LOG_INFO, LOG_SYSTEM, "Memory usage back to normal: %.1f %%", st->mem_percent);
    }
}