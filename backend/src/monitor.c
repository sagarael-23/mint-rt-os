#include "monitor.h"

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