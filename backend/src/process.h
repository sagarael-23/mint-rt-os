#ifndef PROCESS_H
#define PROCESS_H

#define PROC_NAME_MAX 64
#define RT_NONE (-1)   /* penanda: tidak ada deadline RT */

typedef struct {
    int       id;              /* indeks di daftar */
    int       pid;
    int       ppid;
    char      name[PROC_NAME_MAX];
    char      state;           /* R S D Z T I ... dari /proc */
    double    cpu_usage;       /* persen, diisi di Phase 4 */
    long      memory_kb;       /* VmRSS */
    int       threads;
    int       priority;
    unsigned long long utime;  /* tick CPU user mode */
    unsigned long long stime;  /* tick CPU kernel mode */
    unsigned long long start_ticks;
    double    execution_time;  /* detik CPU = (utime+stime)/CLK_TCK */
    long      deadline_ms;     /* RT_NONE = bukan deadline Linux asli */
    long      remaining_ms;    /* RT_NONE = tidak ada */
    char      rt_status[16];   /* "NORMAL" untuk proses Linux biasa */
} Process;

/* Baca satu proses. Return 0 jika berhasil, -1 jika gagal. */
int process_read(int pid, Process *out);

/* Pindai /proc. Return jumlah proses terbaca, -1 jika error. */
int process_scan(Process *list, int max);

/* Ubah kode state (misal 'S') menjadi teks (misal "SLEEPING"). */
const char *process_state_name(char s);

#endif