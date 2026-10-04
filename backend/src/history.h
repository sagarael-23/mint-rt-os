#ifndef HISTORY_H
#define HISTORY_H

#include <stddef.h>
#include <time.h>

#define HISTORY_CAPACITY 120

/* Satu titik data per siklus, untuk grafik di halaman Monitoring. */
typedef struct {
    time_t timestamp;
    double cpu_percent;
    double mem_percent;
    int    process_count;
    int    jobs;           /* job simulasi EDF pada siklus itu */
    int    met;
    int    missed;
    double utilization;    /* demand CPU terhadap panjang siklus, persen */
} HistorySample;

void history_reset(void);
void history_add(const HistorySample *s);
int  history_count(void);

/* Salin sampel dari yang terlama ke terbaru. Jika max lebih kecil dari jumlah
   tersimpan, yang disalin adalah sampel TERBARU sebanyak max. Return jumlahnya. */
int  history_get_all(HistorySample *out, int max);

void history_format_time(const HistorySample *s, char *buf, size_t n);

#endif