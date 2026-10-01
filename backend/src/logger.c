#include "logger.h"

#include <stdarg.h>
#include <stdio.h>
#include <string.h>

static LogEntry      ring[LOG_CAPACITY];
static unsigned long next_seq = 1;
static FILE         *log_file = NULL;
static int           echo_on  = 0;

const char *log_level_name(LogLevel l)
{
    switch (l) {
    case LOG_INFO:  return "INFO";
    case LOG_WARN:  return "WARN";
    case LOG_ERROR: return "ERROR";
    default:        return "?";
    }
}

const char *log_category_name(LogCategory c)
{
    switch (c) {
    case LOG_SYSTEM:    return "SYSTEM";
    case LOG_PROCESS:   return "PROCESS";
    case LOG_SCHEDULER: return "SCHEDULER";
    case LOG_CPU:       return "CPU";
    case LOG_DEADLINE:  return "DEADLINE";
    default:            return "?";
    }
}

void log_format_time(const LogEntry *e, char *buf, size_t n)
{
    struct tm tm;
    localtime_r(&e->timestamp, &tm);
    strftime(buf, n, "%H:%M:%S", &tm);
}

static void write_line(FILE *f, const LogEntry *e)
{
    char tbuf[16];
    log_format_time(e, tbuf, sizeof(tbuf));
    fprintf(f, "[%s] %-5s %-9s %s\n", tbuf,
            log_level_name(e->level), log_category_name(e->category), e->message);
    fflush(f);
}

int log_init(const char *path)
{
    if (log_file) {
        fclose(log_file);
        log_file = NULL;
    }
    if (!path)
        return 0;
    log_file = fopen(path, "a");
    return log_file ? 0 : -1;
}

void log_close(void)
{
    if (log_file) {
        fclose(log_file);
        log_file = NULL;
    }
}

void log_set_echo(int on) { echo_on = on; }

void log_reset(void)
{
    memset(ring, 0, sizeof(ring));
    next_seq = 1;
}

void log_msg(LogLevel level, LogCategory cat, const char *fmt, ...)
{
    LogEntry *e = &ring[(next_seq - 1) % LOG_CAPACITY];

    e->seq       = next_seq;
    e->timestamp = time(NULL);
    e->level     = level;
    e->category  = cat;

    va_list ap;
    va_start(ap, fmt);
    vsnprintf(e->message, LOG_MSG_MAX, fmt, ap);
    va_end(ap);

    next_seq++;

    if (log_file)
        write_line(log_file, e);
    if (echo_on)
        write_line(stdout, e);
}

int log_get_since(unsigned long after_seq, LogEntry *out, int max)
{
    unsigned long last   = next_seq - 1;
    unsigned long oldest = (last > LOG_CAPACITY) ? last - LOG_CAPACITY + 1 : 1;
    unsigned long start  = after_seq + 1;
    if (start < oldest)
        start = oldest;

    int n = 0;
    for (unsigned long q = start; q <= last && n < max; q++)
        out[n++] = ring[(q - 1) % LOG_CAPACITY];
    return n;
}

int log_count(void)
{
    unsigned long last = next_seq - 1;
    return (int)((last > LOG_CAPACITY) ? LOG_CAPACITY : last);
}

unsigned long log_last_seq(void) { return next_seq - 1; }