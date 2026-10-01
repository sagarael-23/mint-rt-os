#include "scheduler.h"
#include "deadline.h"

#include <string.h>

/* Apakah a lebih prioritas daripada b? Deadline lebih dekat menang;
   jika sama, yang datang lebih dulu; jika masih sama, id lebih kecil. */
static int earlier(const SchedTask *a, const SchedTask *b)
{
    if (a->deadline_ms != b->deadline_ms)
        return a->deadline_ms < b->deadline_ms;
    if (a->arrival_ms != b->arrival_ms)
        return a->arrival_ms < b->arrival_ms;
    return a->id < b->id;
}

static int all_completed(const Scheduler *s)
{
    for (int i = 0; i < s->task_count; i++)
        if (s->tasks[i].state != TASK_COMPLETED)
            return 0;
    return 1;
}

void sched_init(Scheduler *s)
{
    memset(s, 0, sizeof(*s));
    s->running_id = -1;
}

int sched_add_task(Scheduler *s, int pid, const char *name,
                   long arrival_ms, long exec_ms, long rel_deadline_ms)
{
    if (s->task_count >= SCHED_MAX_TASKS)
        return -1;
    if (arrival_ms < 0 || exec_ms <= 0 || rel_deadline_ms <= 0)
        return -1;

    SchedTask *t = &s->tasks[s->task_count];
    memset(t, 0, sizeof(*t));
    t->id           = s->task_count;
    t->pid          = pid;
    strncpy(t->name, name, SCHED_NAME_MAX - 1);
    t->name[SCHED_NAME_MAX - 1] = '\0';
    t->arrival_ms   = arrival_ms;
    t->exec_ms      = exec_ms;
    t->remaining_ms = exec_ms;
    t->deadline_ms  = deadline_absolute(arrival_ms, rel_deadline_ms);
    t->finish_ms    = -1;
    t->state        = TASK_WAITING;

    return s->task_count++;
}

void sched_start(Scheduler *s) { s->active = 1; }
void sched_stop(Scheduler *s)  { s->active = 0; }

int sched_pick_edf(const Scheduler *s)
{
    int best = -1;
    for (int i = 0; i < s->task_count; i++) {
        const SchedTask *t = &s->tasks[i];
        if (t->state != TASK_READY && t->state != TASK_RUNNING)
            continue;
        if (best < 0 || earlier(t, &s->tasks[best]))
            best = i;
    }
    return best;
}

int sched_queue(const Scheduler *s, int *out_ids, int max)
{
    int n = 0;
    for (int i = 0; i < s->task_count; i++) {
        const SchedTask *t = &s->tasks[i];
        if (t->state != TASK_READY && t->state != TASK_RUNNING)
            continue;
        if (n >= max)
            break;

        /* Insertion sort: sisipkan i pada posisi yang tepat. */
        int j = n++;
        while (j > 0 && earlier(t, &s->tasks[out_ids[j - 1]])) {
            out_ids[j] = out_ids[j - 1];
            j--;
        }
        out_ids[j] = i;
    }
    return n;
}

long sched_next_deadline(const Scheduler *s)
{
    long best = -1;
    for (int i = 0; i < s->task_count; i++) {
        const SchedTask *t = &s->tasks[i];
        if (t->state != TASK_READY && t->state != TASK_RUNNING)
            continue;
        if (best < 0 || t->deadline_ms < best)
            best = t->deadline_ms;
    }
    return best;
}

void sched_tick(Scheduler *s)
{
    if (!s->active)
        return;

    /* 1. Task yang waktunya datang menjadi READY; cek deadline terlewati. */
    for (int i = 0; i < s->task_count; i++) {
        SchedTask *t = &s->tasks[i];
        if (t->state == TASK_COMPLETED)
            continue;
        if (t->state == TASK_WAITING && s->now_ms >= t->arrival_ms)
            t->state = TASK_READY;
        if (t->state != TASK_WAITING && !t->missed &&
            deadline_time_left(t->deadline_ms, s->now_ms) <= 0) {
            t->missed = 1;
            s->missed++;
        }
    }

    /* 2. Pilih task EDF. */
    int pick = sched_pick_edf(s);

    /* 3. Task yang tadinya RUNNING dikembalikan ke READY (bisa ter-preempt). */
    for (int i = 0; i < s->task_count; i++)
        if (s->tasks[i].state == TASK_RUNNING)
            s->tasks[i].state = TASK_READY;

    s->running_id = -1;

    if (pick >= 0) {
        SchedTask *t = &s->tasks[pick];
        t->state = TASK_RUNNING;
        s->running_id = pick;

        /* Catat potongan eksekusi; gabungkan dengan potongan sebelumnya
           jika task yang sama berjalan tanpa jeda. */
        int merged = 0;
        if (s->slice_count > 0) {
            SchedSlice *last = &s->slices[s->slice_count - 1];
            if (last->task_id == pick && last->end_ms == s->now_ms) {
                last->end_ms++;
                merged = 1;
            }
        }
        if (!merged && s->slice_count < SCHED_MAX_SLICES) {
            SchedSlice sl = { pick, s->now_ms, s->now_ms + 1 };
            s->slices[s->slice_count++] = sl;
        }

        t->remaining_ms--;
        if (t->remaining_ms == 0) {
            t->state     = TASK_COMPLETED;
            t->finish_ms = s->now_ms + 1;
            s->running_id = -1;

            if (!t->missed) {
                if (deadline_is_missed(t->deadline_ms, t->finish_ms)) {
                    t->missed = 1;
                    s->missed++;
                } else {
                    s->met++;
                }
            }
        }
    }

    s->now_ms++;
}

void sched_run_until_idle(Scheduler *s, long limit_ms)
{
    while (!all_completed(s) && s->now_ms < limit_ms)
        sched_tick(s);
}

const char *sched_state_name(SchedTaskState st)
{
    switch (st) {
    case TASK_WAITING:   return "WAITING";
    case TASK_READY:     return "READY";
    case TASK_RUNNING:   return "RUNNING";
    case TASK_COMPLETED: return "COMPLETED";
    default:             return "UNKNOWN";
    }
}