#include <stdio.h>
#include "../src/scheduler.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

static int slice_is(const Scheduler *s, int i, int task, long start, long end)
{
    return i < s->slice_count &&
           s->slices[i].task_id  == task &&
           s->slices[i].start_ms == start &&
           s->slices[i].end_ms   == end;
}

int main(void)
{
    static Scheduler s;
    int q[SCHED_MAX_TASKS];

    /* TC-EDF-01: contoh prompt. Deadline A=100, B=50, C=80 -> urutan B, C, A. */
    sched_init(&s);
    sched_add_task(&s, 0, "A", 0, 20, 100);   /* id 0 */
    sched_add_task(&s, 0, "B", 0, 10, 50);    /* id 1 */
    sched_add_task(&s, 0, "C", 0, 15, 80);    /* id 2 */
    sched_start(&s);
    sched_tick(&s);
    int n = sched_queue(&s, q, SCHED_MAX_TASKS);
    CHECK("TC-EDF-01a antrean terurut B, C, A",
          n == 3 && q[0] == 1 && q[1] == 2 && q[2] == 0);
    CHECK("TC-EDF-01b next deadline = 50", sched_next_deadline(&s) == 50);
    sched_run_until_idle(&s, 1000);
    CHECK("TC-EDF-01c timeline B 0-10, C 10-25, A 25-45",
          s.slice_count == 3 &&
          slice_is(&s, 0, 1, 0, 10) &&
          slice_is(&s, 1, 2, 10, 25) &&
          slice_is(&s, 2, 0, 25, 45));
    CHECK("TC-EDF-01d semua MET", s.met == 3 && s.missed == 0);
    CHECK("TC-EDF-01e jam simulasi berhenti di 45", s.now_ms == 45);

    /* TC-EDF-02: preemption. U datang di t=20 dengan deadline lebih dekat. */
    sched_init(&s);
    sched_add_task(&s, 0, "L", 0, 40, 100);   /* id 0, deadline 100 */
    sched_add_task(&s, 0, "U", 20, 10, 10);   /* id 1, deadline 30  */
    sched_start(&s);
    sched_run_until_idle(&s, 1000);
    CHECK("TC-EDF-02a L 0-20, U 20-30, L 30-50",
          s.slice_count == 3 &&
          slice_is(&s, 0, 0, 0, 20) &&
          slice_is(&s, 1, 1, 20, 30) &&
          slice_is(&s, 2, 0, 30, 50));
    CHECK("TC-EDF-02b keduanya MET", s.met == 2 && s.missed == 0);

    /* TC-EDF-03: overload. Total 60 ms, tetapi deadline 40 dan 50. */
    sched_init(&s);
    sched_add_task(&s, 0, "X", 0, 30, 40);    /* id 0 */
    sched_add_task(&s, 0, "Y", 0, 30, 50);    /* id 1 */
    sched_start(&s);
    sched_run_until_idle(&s, 1000);
    CHECK("TC-EDF-03a X 0-30, Y 30-60",
          s.slice_count == 2 &&
          slice_is(&s, 0, 0, 0, 30) &&
          slice_is(&s, 1, 1, 30, 60));
    CHECK("TC-EDF-03b X MET, Y MISSED",
          s.met == 1 && s.missed == 1 &&
          s.tasks[0].missed == 0 && s.tasks[1].missed == 1);

    /* TC-EDF-04: ada jeda idle sebelum task datang. */
    sched_init(&s);
    sched_add_task(&s, 0, "Z", 10, 5, 20);
    sched_start(&s);
    sched_run_until_idle(&s, 1000);
    CHECK("TC-EDF-04a tidak ada slice saat idle, Z 10-15",
          s.slice_count == 1 && slice_is(&s, 0, 0, 10, 15));
    CHECK("TC-EDF-04b Z MET", s.met == 1 && s.missed == 0);

    /* TC-EDF-05: parameter tidak valid ditolak. */
    sched_init(&s);
    CHECK("TC-EDF-05a exec 0 ditolak", sched_add_task(&s, 0, "bad", 0, 0, 10) == -1);
    CHECK("TC-EDF-05b deadline 0 ditolak", sched_add_task(&s, 0, "bad", 0, 5, 0) == -1);

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}