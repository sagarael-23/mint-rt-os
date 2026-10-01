#ifndef LOGGER_H
#define LOGGER_H

#include <stddef.h>
#include <time.h>

#define LOG_CAPACITY 500
#define LOG_MSG_MAX  160

typedef enum { LOG_INFO, LOG_WARN, LOG_ERROR } LogLevel;

typedef enum {
    LOG_SYSTEM,
    LOG_PROCESS,
    LOG_SCHEDULER,
    LOG_CPU,
    LOG_DEADLINE
} LogCategory;

typedef struct {
    unsigned long seq;        /* nomor urut, mulai dari 1 */
    time_t        timestamp;  /* jam dinding */
    LogLevel      level;
    LogCategory   category;
    char          message[LOG_MSG_MAX];
} LogEntry;

/* Buka file log (mode append). path NULL = hanya memori.
   Return 0 jika berhasil, -1 jika file gagal dibuka (log tetap di memori). */
int  log_init(const char *path);
void log_close(void);

/* 1 = cetak juga setiap log ke layar. */
void log_set_echo(int on);

/* Kosongkan buffer dan reset nomor urut (dipakai oleh tes). */
void log_reset(void);

/* Catat satu kejadian, gaya printf. */
void log_msg(LogLevel level, LogCategory cat, const char *fmt, ...)
    __attribute__((format(printf, 3, 4)));

/* Salin entri dengan seq > after_seq, urut dari yang terlama, maksimal max.
   Return jumlah yang disalin. */
int  log_get_since(unsigned long after_seq, LogEntry *out, int max);

int           log_count(void);      /* jumlah entri yang tersimpan */
unsigned long log_last_seq(void);   /* seq terakhir, 0 jika kosong */

const char *log_level_name(LogLevel l);
const char *log_category_name(LogCategory c);
void        log_format_time(const LogEntry *e, char *buf, size_t n);

#endif