#include "autosched.h"
#include "logger.h"

#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* Terberat dulu; jika sama, PID kecil dulu (urutan stabil). */
static int cmp_exec_desc(const void *a, const void *b)
{
    const AutoJob *ja = a;
    const AutoJob *jb = b;
    if (jb->exec_ms != ja->exec_ms)
        return (jb->exec_ms > ja->exec_ms) ? 1 : -1;
    return ja->pid - jb->pid;
}

int autosched_collect(const Process *cur, int ncur,
                      const Process *prev, int nprev,
                      AutoJob *out, int max)
{
    long hz = sysconf(_SC_CLK_TCK);
    if (hz <= 0)
        hz = 100;

    int n = 0;
    for (int i = 0; i < ncur && n < max; i++) {
        for (int j = 0; j < nprev; j++) {
            if (prev[j].pid != cur[i].pid ||
                prev[j].start_ticks != cur[i].start_ticks)
                continue;

            unsigned long long a = cur[i].utime + cur[i].stime;
            unsigned long long b = prev[j].utime + prev[j].stime;
            if (a > b) {
                long ms = (long)((a - b) * 1000ULL / (unsigned long long)hz);
                if (ms > 0) {
                    out[n].pid = cur[i].pid;
                    strncpy(out[n].name, cur[i].name, SCHED_NAME_MAX - 1);
                    out[n].name[SCHED_NAME_MAX - 1] = '\0';
                    out[n].exec_ms = ms;
                    n++;
                }
            }
            break;
        }
    }

    qsort(out, (size_t)n, sizeof(AutoJob), cmp_exec_desc);
    return n;
}

long autosched_deadline(long exec_ms, int n_jobs, long cycle_ms)
{
    if (n_jobs < 1)
        n_jobs = 1;

    long d   = exec_ms * n_jobs;
    long cap = (exec_ms > cycle_ms) ? exec_ms : cycle_ms;
    return (d > cap) ? cap : d;
}

long autosched_run_cycle(Scheduler *s, const AutoJob *jobs, int n, long cycle_ms)
{
    if (n > SCHED_MAX_TASKS)
        n = SCHED_MAX_TASKS;
    if (cycle_ms < 1)
        cycle_ms = AUTO_CYCLE_MS;

    log_set_muted(1);

    sched_init(s);
    long demand = 0;
    for (int i = 0; i < n; i++) {
        long d = autosched_deadline(jobs[i].exec_ms, n, cycle_ms);
        if (sched_add_task(s, jobs[i].pid, jobs[i].name, 0, jobs[i].exec_ms, d) >= 0)
            demand += jobs[i].exec_ms;
    }
    sched_start(s);
    sched_run_until_idle(s, cycle_ms * 10);

    log_set_muted(0);
    return demand;
}

long autosched_run(Scheduler *s, const AutoJob *jobs, int n)
{
    return autosched_run_cycle(s, jobs, n, AUTO_CYCLE_MS);
}

int autosched_order(const Scheduler *s, int *out, int max)
{
    int seen[SCHED_MAX_TASKS] = { 0 };
    int n = 0;

    for (int i = 0; i < s->slice_count && n < max; i++) {
        int id = s->slices[i].task_id;
        if (!seen[id]) {
            seen[id] = 1;
            out[n++] = id;
        }
    }
    for (int id = 0; id < s->task_count && n < max; id++)
        if (!seen[id])
            out[n++] = id;

    return n;
}