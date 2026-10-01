#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "process.h"
#include "monitor.h"
#include "scheduler.h"
#include "logger.h"

#define MAX_PROCS 2048
#define SHOW_TOP  10

static Process prev_list[MAX_PROCS];
static Process cur_list[MAX_PROCS];

/* CPU terbesar dulu; jika sama, memori terbesar dulu. */
static int cmp_cpu_desc(const void *a, const void *b)
{
    const Process *pa = a;
    const Process *pb = b;
    if (pb->cpu_usage > pa->cpu_usage) return 1;
    if (pb->cpu_usage < pa->cpu_usage) return -1;
    if (pb->memory_kb > pa->memory_kb) return 1;
    if (pb->memory_kb < pa->memory_kb) return -1;
    return 0;
}

/* Demo EDF: simulasi tingkat aplikasi, BUKAN scheduler kernel Linux. */
static void edf_demo(void)
{
    static Scheduler s;

    log_reset();
    log_set_echo(1);

    sched_init(&s);
    sched_add_task(&s, 0, "Task A", 0, 20, 100);
    sched_add_task(&s, 0, "Task B", 0, 10, 50);
    sched_add_task(&s, 0, "Task C", 0, 15, 80);
    sched_start(&s);
    sched_run_until_idle(&s, 1000);

    printf("\n=== EDF DEMO (simulasi tingkat aplikasi, jam simulasi) ===\n");
    printf("%-8s %8s %5s %9s %7s  %s\n",
           "TASK", "ARRIVAL", "EXEC", "DEADLINE", "FINISH", "HASIL");
    for (int i = 0; i < s.task_count; i++) {
        const SchedTask *t = &s.tasks[i];
        printf("%-8s %8ld %5ld %9ld %7ld  %s\n",
               t->name, t->arrival_ms, t->exec_ms, t->deadline_ms,
               t->finish_ms, t->missed ? "MISSED" : "MET");
    }

    printf("\nTimeline (ms simulasi):\n");
    for (int i = 0; i < s.slice_count; i++)
        printf("  %4ld - %4ld  %s\n", s.slices[i].start_ms,
               s.slices[i].end_ms, s.tasks[s.slices[i].task_id].name);

    printf("\nMet: %d  Missed: %d\n", s.met, s.missed);
}

/* Pantau proses dan sistem tiap 1 detik; catat kejadian ke log. */
static void watch_mode(int seconds)
{
    Process *prev = prev_list;
    Process *cur  = cur_list;
    CpuSample s_prev, s_cur;
    SystemStats st;

    if (log_init("mint-rt-backend.log") != 0)
        fprintf(stderr, "Peringatan: file log tidak bisa dibuka, log hanya di layar.\n");
    log_set_echo(1);
    log_msg(LOG_INFO, LOG_SYSTEM, "backend started (watch mode, %d s)", seconds);

    if (monitor_read_cpu_sample(&s_prev) != 0) {
        log_msg(LOG_ERROR, LOG_SYSTEM, "cannot read /proc/stat");
        log_close();
        return;
    }
    int nprev = process_scan(prev, MAX_PROCS);
    if (nprev < 0) {
        log_msg(LOG_ERROR, LOG_PROCESS, "cannot scan /proc");
        log_close();
        return;
    }
    monitor_log_changes(NULL, 0, prev, nprev);

    for (int i = 0; i < seconds; i++) {
        sleep(1);

        if (monitor_read_cpu_sample(&s_cur) != 0) {
            log_msg(LOG_ERROR, LOG_SYSTEM, "cannot read /proc/stat");
            break;
        }
        int ncur = process_scan(cur, MAX_PROCS);
        if (ncur < 0) {
            log_msg(LOG_ERROR, LOG_PROCESS, "cannot scan /proc");
            break;
        }

        unsigned long long dt =
            (s_cur.total > s_prev.total) ? s_cur.total - s_prev.total : 0;
        monitor_apply_process_cpu(cur, ncur, prev, nprev, dt);
        monitor_log_changes(prev, nprev, cur, ncur);

        if (monitor_read_system(&st) == 0) {
            st.cpu_percent   = monitor_cpu_percent(&s_prev, &s_cur);
            st.process_count = ncur;
            monitor_log_thresholds(&st);
        }

        /* Pembacaan sekarang menjadi pembacaan sebelumnya. */
        Process *tmp = prev;
        prev = cur;
        cur  = tmp;
        nprev  = ncur;
        s_prev = s_cur;
    }

    log_msg(LOG_INFO, LOG_SYSTEM, "backend stopped");
    log_close();
}

int main(int argc, char *argv[])
{
    if (argc > 1 && strcmp(argv[1], "--edf-demo") == 0) {
        edf_demo();
        return 0;
    }
    if (argc > 1 && strcmp(argv[1], "--watch") == 0) {
        int secs = (argc > 2) ? atoi(argv[2]) : 15;
        if (secs < 1)    secs = 1;
        if (secs > 3600) secs = 3600;
        watch_mode(secs);
        return 0;
    }

    const char *filter = (argc > 1) ? argv[1] : NULL;

    /* Pembacaan pertama */
    CpuSample s1, s2;
    if (monitor_read_cpu_sample(&s1) != 0) {
        fprintf(stderr, "Gagal membaca /proc/stat\n");
        return 1;
    }
    int nprev = process_scan(prev_list, MAX_PROCS);

    sleep(1);

    /* Pembacaan kedua */
    if (monitor_read_cpu_sample(&s2) != 0) {
        fprintf(stderr, "Gagal membaca /proc/stat\n");
        return 1;
    }
    int ncur = process_scan(cur_list, MAX_PROCS);
    if (nprev < 0 || ncur < 0) {
        perror("process_scan");
        return 1;
    }

    unsigned long long total_delta =
        (s2.total > s1.total) ? s2.total - s1.total : 0;
    monitor_apply_process_cpu(cur_list, ncur, prev_list, nprev, total_delta);
    qsort(cur_list, (size_t)ncur, sizeof(Process), cmp_cpu_desc);

    SystemStats st;
    if (monitor_read_system(&st) != 0) {
        fprintf(stderr, "Gagal membaca /proc/meminfo\n");
        return 1;
    }
    st.cpu_percent   = monitor_cpu_percent(&s1, &s2);
    st.process_count = ncur;

    long up = (long)st.uptime_sec;
    printf("=== SYSTEM ===\n");
    printf("CPU       : %.1f %%  (%d core)\n", st.cpu_percent, st.cpu_cores);
    printf("Memory    : %.1f / %.1f MB (%.1f %%)\n",
           st.mem_used_kb / 1024.0, st.mem_total_kb / 1024.0, st.mem_percent);
    printf("Processes : %d\n", st.process_count);
    printf("Load avg  : %.2f %.2f %.2f\n", st.load1, st.load5, st.load15);
    printf("Uptime    : %ldh %ldm\n\n", up / 3600, (up % 3600) / 60);

    printf("%-7s %-16s %-10s %7s %8s %7s\n",
           "PID", "NAME", "STATE", "CPU(%)", "MEM(MB)", "THREADS");

    int shown = 0;
    for (int i = 0; i < ncur && (filter || shown < SHOW_TOP); i++) {
        const Process *p = &cur_list[i];
        if (filter && !strstr(p->name, filter))
            continue;
        printf("%-7d %-16s %-10s %7.1f %8.1f %7d\n",
               p->pid, p->name, process_state_name(p->state),
               p->cpu_usage, p->memory_kb / 1024.0, p->threads);
        shown++;
    }
    return 0;
}