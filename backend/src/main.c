#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "process.h"

#define MAX_PROCS 2048
#define SHOW_TOP  15

static Process list[MAX_PROCS];

/* Urutkan dari memori terbesar ke terkecil. */
static int cmp_mem_desc(const void *a, const void *b)
{
    const Process *pa = a;
    const Process *pb = b;
    if (pb->memory_kb > pa->memory_kb) return 1;
    if (pb->memory_kb < pa->memory_kb) return -1;
    return 0;
}

int main(int argc, char *argv[])
{
    const char *filter = (argc > 1) ? argv[1] : NULL;

    int n = process_scan(list, MAX_PROCS);
    if (n < 0) {
        perror("process_scan");
        return 1;
    }
    qsort(list, (size_t)n, sizeof(Process), cmp_mem_desc);

    printf("Total process terbaca: %d\n\n", n);
    printf("%-7s %-16s %-10s %8s %7s %9s\n",
           "PID", "NAME", "STATE", "MEM(MB)", "THREADS", "CPU(s)");

    int shown = 0;
    for (int i = 0; i < n && (filter || shown < SHOW_TOP); i++) {
        const Process *p = &list[i];
        if (filter && !strstr(p->name, filter))
            continue;
        printf("%-7d %-16s %-10s %8.1f %7d %9.2f\n",
               p->pid, p->name, process_state_name(p->state),
               p->memory_kb / 1024.0, p->threads, p->execution_time);
        shown++;
    }
    return 0;
}