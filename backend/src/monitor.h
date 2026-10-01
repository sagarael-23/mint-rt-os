#ifndef MONITOR_H
#define MONITOR_H

#include "process.h"

/* Satu cuplikan waktu CPU dari baris pertama /proc/stat. */
typedef struct {
    unsigned long long total;  /* semua tick (user..steal) */
    unsigned long long idle;   /* idle + iowait */
} CpuSample;

typedef struct {
    double cpu_percent;        /* diisi dari dua CpuSample */
    int    cpu_cores;
    long   mem_total_kb;
    long   mem_available_kb;
    long   mem_used_kb;        /* total - available */
    double mem_percent;
    int    process_count;      /* diisi pemanggil */
    double load1, load5, load15;
    double uptime_sec;
} SystemStats;

/* Baca satu cuplikan CPU. Return 0 jika berhasil. */
int monitor_read_cpu_sample(CpuSample *out);

/* Hitung CPU% sistem dari dua cuplikan. */
double monitor_cpu_percent(const CpuSample *prev, const CpuSample *cur);

/* Isi memori, load average, uptime, dan jumlah core. Return 0 jika berhasil. */
int monitor_read_system(SystemStats *out);

/* Isi cpu_usage setiap proses di cur dengan membandingkannya dengan prev.
   total_delta = selisih CpuSample.total antara dua pembacaan. */
void monitor_apply_process_cpu(Process *cur, int ncur,
                               const Process *prev, int nprev,
                               unsigned long long total_delta);

/* Bandingkan dua daftar proses; catat proses muncul, hilang, dan perubahan
   state bermakna (ZOMBIE/STOPPED). Jika nprev <= 0, hanya catat ringkasan awal. */
void monitor_log_changes(const Process *prev, int nprev,
                         const Process *cur, int ncur);

/* Catat peringatan saat CPU/memori melewati ambang, dan saat kembali normal. */
void monitor_log_thresholds(const SystemStats *st);                               

#endif