#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "process.h"
#include "monitor.h"
#include "scheduler.h"

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
    sched_init(&s);
    sched_add_task(&s, 0, "Task A", 0, 20, 100);
    sched_add_task(&s, 0, "Task B", 0, 10, 50);
    sched_add_task(&s, 0, "Task C", 0, 15, 80);
    sched_start(&s);
    sched_run_until_idle(&s, 1000);

    printf("=== EDF DEMO (simulasi tingkat aplikasi, jam simulasi) ===\n");
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

int main(int argc, char *argv[])
{
    const char *filter = (argc > 1) ? argv[1] : NULL;

        if (argc > 1 && strcmp(argv[1], "--edf-demo") == 0) {
        edf_demo();
        return 0;
    }

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