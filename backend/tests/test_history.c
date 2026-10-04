#include <stdio.h>
#include <string.h>
#include <time.h>
#include "../src/history.h"
#include "../src/autosched.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

static HistorySample mk(double cpu)
{
    HistorySample s;
    memset(&s, 0, sizeof(s));
    s.timestamp = time(NULL);
    s.cpu_percent = cpu;
    return s;
}

static void set_job(AutoJob *j, int pid, const char *name, long ms)
{
    memset(j, 0, sizeof(*j));
    j->pid = pid;
    strncpy(j->name, name, SCHED_NAME_MAX - 1);
    j->exec_ms = ms;
}

int main(void)
{
    static HistorySample out[HISTORY_CAPACITY + 10];
    static AutoJob jobs[4];
    static Scheduler s;
    int order[SCHED_MAX_TASKS];
    int n;
    long demand;

    /* TC-HIST-01: kosong. */
    history_reset();
    CHECK("TC-HIST-01a kosong: count 0", history_count() == 0);
    CHECK("TC-HIST-01b kosong: get_all 0", history_get_all(out, HISTORY_CAPACITY) == 0);

    /* TC-HIST-02: urutan dari terlama ke terbaru. */
    for (int i = 1; i <= 3; i++) {
        HistorySample h = mk(i);
        history_add(&h);
    }
    n = history_get_all(out, HISTORY_CAPACITY);
    CHECK("TC-HIST-02a tiga sampel tersimpan", history_count() == 3);
    CHECK("TC-HIST-02b urutan 1, 2, 3",
          n == 3 && out[0].cpu_percent == 1 && out[1].cpu_percent == 2 &&
          out[2].cpu_percent == 3);

    /* TC-HIST-03: ring buffer berputar setelah 120 sampel. */
    history_reset();
    for (int i = 1; i <= 130; i++) {
        HistorySample h = mk(i);
        history_add(&h);
    }
    n = history_get_all(out, HISTORY_CAPACITY);
    CHECK("TC-HIST-03a hanya 120 tersimpan", history_count() == 120 && n == 120);
    CHECK("TC-HIST-03b terlama 11, terbaru 130",
          out[0].cpu_percent == 11 && out[119].cpu_percent == 130);
    n = history_get_all(out, 5);
    CHECK("TC-HIST-03c max 5 -> lima terbaru (126..130)",
          n == 5 && out[0].cpu_percent == 126 && out[4].cpu_percent == 130);

    /* TC-HIST-04: format waktu HH:MM:SS. */
    {
        char tb[16];
        HistorySample h = mk(0);
        history_format_time(&h, tb, sizeof(tb));
        CHECK("TC-HIST-04 format HH:MM:SS",
              strlen(tb) == 8 && tb[2] == ':' && tb[5] == ':');
    }

    /* TC-HIST-05: panjang siklus bisa diatur (dasar setelan cycleMs). */
    set_job(&jobs[0], 1, "a", 700);   /* id 0 */
    set_job(&jobs[1], 2, "b", 300);   /* id 1 */

    demand = autosched_run_cycle(&s, jobs, 2, 2000);
    n = autosched_order(&s, order, SCHED_MAX_TASKS);
    CHECK("TC-HIST-05a siklus 2000: deadline a=1400, b=600",
          s.tasks[0].deadline_ms == 1400 && s.tasks[1].deadline_ms == 600);
    CHECK("TC-HIST-05b urutan b, a; demand 1000; keduanya MET",
          n == 2 && order[0] == 1 && order[1] == 0 &&
          demand == 1000 && s.met == 2 && s.missed == 0);

    autosched_run(&s, jobs, 2);
    CHECK("TC-HIST-05c siklus bawaan 1000: deadline a=1000, b=600",
          s.tasks[0].deadline_ms == 1000 && s.tasks[1].deadline_ms == 600);

    set_job(&jobs[0], 1, "x", 1500);
    set_job(&jobs[1], 2, "y", 1500);
    demand = autosched_run_cycle(&s, jobs, 2, 2000);
    CHECK("TC-HIST-05d deadline mentok 2000; satu MET, satu MISSED; demand 3000",
          s.tasks[0].deadline_ms == 2000 && s.tasks[1].deadline_ms == 2000 &&
          demand == 3000 && s.met == 1 && s.missed == 1);

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}