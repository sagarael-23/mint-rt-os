#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include "../src/autosched.h"
#include "../src/logger.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

static void set_proc(Process *p, int pid, const char *name,
                     unsigned long long start,
                     unsigned long long utime, unsigned long long stime)
{
    memset(p, 0, sizeof(*p));
    p->pid = pid;
    strncpy(p->name, name, PROC_NAME_MAX - 1);
    p->start_ticks = start;
    p->utime = utime;
    p->stime = stime;
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
    static AutoJob   jobs[100];
    static Scheduler s;
    int order[SCHED_MAX_TASKS];
    int n, no;
    long demand;

    /* TC-AUTO-01: aturan deadline. */
    CHECK("TC-AUTO-01a deadline = exec * jumlah job",
          autosched_deadline(10, 5, 1000) == 50);
    CHECK("TC-AUTO-01b dibatasi panjang siklus",
          autosched_deadline(300, 5, 1000) == 1000);
    CHECK("TC-AUTO-01c exec lebih panjang dari siklus -> deadline = exec",
          autosched_deadline(1500, 3, 1000) == 1500);
    CHECK("TC-AUTO-01d n_jobs 0 diperlakukan sebagai 1",
          autosched_deadline(10, 0, 1000) == 10);

    /* TC-AUTO-02: pengumpulan job dari dua pembacaan proses. */
    {
        Process prev[4], cur[5];
        long hz = sysconf(_SC_CLK_TCK);

        set_proc(&prev[0], 1, "A", 100, 100, 0);
        set_proc(&prev[1], 2, "B", 200, 50, 50);
        set_proc(&prev[2], 3, "C", 300, 10, 0);
        set_proc(&prev[3], 5, "E", 500, 7, 7);

        set_proc(&cur[0], 1, "A", 100, 105, 0);   /* +5 tick                 */
        set_proc(&cur[1], 2, "B", 200, 50, 50);   /* +0 tick: tidak dipakai  */
        set_proc(&cur[2], 3, "C", 300, 12, 1);    /* +3 tick                 */
        set_proc(&cur[3], 4, "D", 400, 9, 9);     /* baru, belum ada prev    */
        set_proc(&cur[4], 5, "E", 999, 20, 20);   /* PID dipakai ulang       */

        n = autosched_collect(cur, 5, prev, 4, jobs, 100);
        CHECK("TC-AUTO-02a hanya proses yang memakai CPU dan sudah dikenal", n == 2);
        CHECK("TC-AUTO-02b terberat dulu, exec = tick * 1000 / hz",
              n == 2 &&
              jobs[0].pid == 1 && jobs[0].exec_ms == 5 * 1000 / hz &&
              jobs[1].pid == 3 && jobs[1].exec_ms == 3 * 1000 / hz);
    }

    /* TC-AUTO-03: kondisi santai. Job sengaja diberikan tidak berurutan. */
    set_job(&jobs[0], 10, "c", 30);   /* id 0 */
    set_job(&jobs[1], 11, "a", 10);   /* id 1 */
    set_job(&jobs[2], 12, "d", 40);   /* id 2 */
    set_job(&jobs[3], 13, "b", 20);   /* id 3 */
    demand = autosched_run(&s, jobs, 4);
    no = autosched_order(&s, order, SCHED_MAX_TASKS);
    CHECK("TC-AUTO-03a urutan dispatch a, b, c, d (id 1, 3, 0, 2)",
          no == 4 && order[0] == 1 && order[1] == 3 &&
          order[2] == 0 && order[3] == 2);
    CHECK("TC-AUTO-03b demand 100 ms, semua deadline terpenuhi",
          demand == 100 && s.met == 4 && s.missed == 0);
    CHECK("TC-AUTO-03c deadline a=40, b=80, c=120, d=160",
          s.tasks[1].deadline_ms == 40 && s.tasks[3].deadline_ms == 80 &&
          s.tasks[0].deadline_ms == 120 && s.tasks[2].deadline_ms == 160);

    /* TC-AUTO-04: overload. Dua proses 1000 ms + satu proses kecil. */
    set_job(&jobs[0], 20, "hog1", 1000);   /* id 0 */
    set_job(&jobs[1], 21, "hog2", 1000);   /* id 1 */
    set_job(&jobs[2], 22, "small", 20);    /* id 2 */
    demand = autosched_run(&s, jobs, 3);
    no = autosched_order(&s, order, SCHED_MAX_TASKS);
    CHECK("TC-AUTO-04a urutan: small, hog1, hog2 (id 2, 0, 1)",
          no == 3 && order[0] == 2 && order[1] == 0 && order[2] == 1);
    CHECK("TC-AUTO-04b small MET, dua hog MISSED",
          demand == 2020 && s.met == 1 && s.missed == 2 &&
          s.tasks[2].missed == 0 && s.tasks[0].missed == 1 && s.tasks[1].missed == 1);
    CHECK("TC-AUTO-04c selesai: small 20, hog1 1020, hog2 2020",
          s.tasks[2].finish_ms == 20 && s.tasks[0].finish_ms == 1020 &&
          s.tasks[1].finish_ms == 2020);

    /* TC-AUTO-05: tidak ada job. */
    demand = autosched_run(&s, jobs, 0);
    no = autosched_order(&s, order, SCHED_MAX_TASKS);
    CHECK("TC-AUTO-05 tanpa job: demand 0, tanpa order, tanpa met/missed",
          demand == 0 && no == 0 && s.met == 0 && s.missed == 0);

    /* TC-AUTO-06: log engine dibisukan, lalu aktif kembali. */
    log_reset();
    set_job(&jobs[0], 1, "x", 10);
    autosched_run(&s, jobs, 1);
    CHECK("TC-AUTO-06a autosched_run tidak menulis log", log_count() == 0);
    log_msg(LOG_INFO, LOG_SYSTEM, "after");
    CHECK("TC-AUTO-06b log aktif kembali setelah run", log_count() == 1);

    /* TC-AUTO-07: lebih dari SCHED_MAX_TASKS job dipotong. */
    for (int i = 0; i < 100; i++)
        set_job(&jobs[i], 100 + i, "p", 1);
    demand = autosched_run(&s, jobs, 100);
    CHECK("TC-AUTO-07 dipotong ke SCHED_MAX_TASKS job",
          s.task_count == SCHED_MAX_TASKS && demand == SCHED_MAX_TASKS);

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}