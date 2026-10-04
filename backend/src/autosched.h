#ifndef AUTOSCHED_H
#define AUTOSCHED_H

#include "process.h"
#include "scheduler.h"

#define AUTO_CYCLE_MS     1000    /* panjang siklus simulasi */
#define AUTO_RUN_LIMIT_MS 10000   /* batas jam simulasi per siklus */

typedef struct {
    int  pid;
    char name[SCHED_NAME_MAX];
    long exec_ms;      /* waktu CPU NYATA yang dipakai pada siklus terakhir */
} AutoJob;

/* Bandingkan dua pembacaan proses; hasilkan satu job untuk setiap proses yang
   memakai CPU di antara keduanya (proses yang sama = PID dan start_ticks sama).
   Hasil diurutkan dari yang terberat. 'out' harus cukup besar untuk semua proses.
   Return jumlah job. */
int autosched_collect(const Process *cur, int ncur,
                      const Process *prev, int nprev,
                      AutoJob *out, int max);

/* Deadline relatif simulasi: jatah bandwidth sama (1/n_jobs), jadi
   deadline = exec * n_jobs, dibatasi panjang siklus (atau exec jika exec > siklus). */
long autosched_deadline(long exec_ms, int n_jobs, long cycle_ms);

/* Bangun jadwal baru di *s dari jobs (maksimal SCHED_MAX_TASKS job terberat),
   semua tiba di t=0, lalu jalankan EDF sampai selesai. Log engine dibisukan.
   Return total waktu eksekusi (demand) dalam ms. */
long autosched_run(Scheduler *s, const AutoJob *jobs, int n);

/* Urutan dispatch (id task) menurut timeline; task yang tidak pernah berjalan
   ditaruh di belakang. Return jumlah entri. */
int autosched_order(const Scheduler *s, int *out, int max);

#endif