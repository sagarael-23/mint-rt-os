#include "process.h"

#include <ctype.h>
#include <dirent.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

/* Apakah string berisi angka saja? (nama folder PID di /proc) */
static int is_number(const char *s)
{
    if (*s == '\0')
        return 0;
    for (; *s; s++)
        if (!isdigit((unsigned char)*s))
            return 0;
    return 1;
}

/* Ambil VmRSS (kB) dari /proc/[PID]/status. 0 jika tidak ada (mis. kernel thread). */
static long read_vmrss_kb(int pid)
{
    char path[64];
    char line[256];
    long kb = 0;

    snprintf(path, sizeof(path), "/proc/%d/status", pid);
    FILE *f = fopen(path, "r");
    if (!f)
        return 0;

    while (fgets(line, sizeof(line), f)) {
        if (strncmp(line, "VmRSS:", 6) == 0) {
            sscanf(line + 6, "%ld", &kb);
            break;
        }
    }
    fclose(f);
    return kb;
}

int process_read(int pid, Process *out)
{
    char path[64];
    char buf[1024];

    snprintf(path, sizeof(path), "/proc/%d/stat", pid);
    FILE *f = fopen(path, "r");
    if (!f)
        return -1;               /* proses sudah hilang */

    size_t n = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    if (n == 0)
        return -1;
    buf[n] = '\0';

    /* Nama ada di antara '(' pertama dan ')' TERAKHIR. */
    char *lparen = strchr(buf, '(');
    char *rparen = strrchr(buf, ')');
    if (!lparen || !rparen || rparen < lparen)
        return -1;

    memset(out, 0, sizeof(*out));
    out->pid = pid;

    size_t len = (size_t)(rparen - lparen - 1);
    if (len >= PROC_NAME_MAX)
        len = PROC_NAME_MAX - 1;
    memcpy(out->name, lparen + 1, len);
    out->name[len] = '\0';

    /* Kolom setelah ") ": mulai dari kolom 3 (state). */
    char state;
    int ppid, priority, threads;
    unsigned long long utime, stime, starttime;

    int got = sscanf(rparen + 2,
        "%c %d %*s %*s %*s %*s %*s %*s %*s %*s %*s %llu %llu %*s %*s %d %*s %d %*s %llu",
        &state, &ppid, &utime, &stime, &priority, &threads, &starttime);
    if (got != 7)
        return -1;

    long hz = sysconf(_SC_CLK_TCK);
    if (hz <= 0)
        hz = 100;

    out->state          = state;
    out->ppid           = ppid;
    out->utime          = utime;
    out->stime          = stime;
    out->priority       = priority;
    out->threads        = threads;
    out->start_ticks    = starttime;
    out->execution_time = (double)(utime + stime) / (double)hz;
    out->memory_kb      = read_vmrss_kb(pid);
    out->deadline_ms    = RT_NONE;
    out->remaining_ms   = RT_NONE;
    strcpy(out->rt_status, "NORMAL");
    return 0;
}

int process_scan(Process *list, int max)
{
    DIR *d = opendir("/proc");
    if (!d)
        return -1;

    int count = 0;
    struct dirent *e;

    while (count < max && (e = readdir(d)) != NULL) {
        if (!is_number(e->d_name))
            continue;
        int pid = atoi(e->d_name);
        /* Jika proses hilang di tengah pemindaian, lewati saja. */
        if (process_read(pid, &list[count]) == 0) {
            list[count].id = count;
            count++;
        }
    }
    closedir(d);
    return count;
}

const char *process_state_name(char s)
{
    switch (s) {
    case 'R': return "RUNNING";
    case 'S': return "SLEEPING";
    case 'D': return "DISK_WAIT";
    case 'Z': return "ZOMBIE";
    case 'T':
    case 't': return "STOPPED";
    case 'I': return "IDLE";
    default:  return "UNKNOWN";
    }
}