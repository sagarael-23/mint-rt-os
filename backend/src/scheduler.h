#ifndef SCHEDULER_H
#define SCHEDULER_H

#define SCHED_MAX_TASKS  64
#define SCHED_MAX_SLICES 1024
#define SCHED_NAME_MAX   32

typedef enum {
    TASK_WAITING,    /* belum waktunya datang */
    TASK_READY,      /* sudah datang, menunggu CPU */
    TASK_RUNNING,    /* sedang dijalankan pada tick ini */
    TASK_COMPLETED
} SchedTaskState;

typedef struct {
    int  id;                      /* sama dengan indeks di array */
    int  pid;                     /* PID Linux terkait, 0 jika task simulasi murni */
    char name[SCHED_NAME_MAX];
    long arrival_ms;
    long exec_ms;                 /* total waktu eksekusi yang dibutuhkan */
    long remaining_ms;
    long deadline_ms;             /* ABSOLUT, jam simulasi */
    long finish_ms;               /* -1 sampai selesai */
    int  missed;                  /* 1 jika deadline terlewati */
    SchedTaskState state;
} SchedTask;

/* Satu potongan eksekusi, untuk visualisasi timeline/Gantt. */
typedef struct {
    int  task_id;
    long start_ms;
    long end_ms;
} SchedSlice;

typedef struct {
    SchedTask  tasks[SCHED_MAX_TASKS];
    int        task_count;
    SchedSlice slices[SCHED_MAX_SLICES];
    int        slice_count;
    long       now_ms;            /* jam simulasi */
    int        running_id;        /* -1 jika idle */
    int        met;
    int        missed;
    int        active;            /* 1 = RUNNING, 0 = STOPPED */
} Scheduler;

void sched_init(Scheduler *s);

/* Tambah task. Return id task, atau -1 jika parameter tidak valid / penuh. */
int  sched_add_task(Scheduler *s, int pid, const char *name,
                    long arrival_ms, long exec_ms, long rel_deadline_ms);

void sched_start(Scheduler *s);
void sched_stop(Scheduler *s);

/* Majukan jam simulasi sebesar 1 ms. Tidak melakukan apa-apa jika STOPPED. */
void sched_tick(Scheduler *s);

/* Jalankan tick sampai semua task selesai atau now_ms mencapai limit_ms. */
void sched_run_until_idle(Scheduler *s, long limit_ms);

/* Pilih task EDF berikutnya. Return id, atau -1 jika tidak ada. */
int  sched_pick_edf(const Scheduler *s);

/* Isi out_ids dengan task READY/RUNNING terurut dari deadline terdekat.
   Return jumlahnya. */
int  sched_queue(const Scheduler *s, int *out_ids, int max);

/* Deadline absolut terdekat di antara task READY/RUNNING, atau -1. */
long sched_next_deadline(const Scheduler *s);

const char *sched_state_name(SchedTaskState st);

#endif