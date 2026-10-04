#include "history.h"

#include <string.h>

static HistorySample ring[HISTORY_CAPACITY];
static unsigned long total = 0;      /* jumlah sampel yang pernah ditambahkan */

void history_reset(void)
{
    memset(ring, 0, sizeof(ring));
    total = 0;
}

void history_add(const HistorySample *s)
{
    ring[total % HISTORY_CAPACITY] = *s;
    total++;
}

int history_count(void)
{
    return (total > HISTORY_CAPACITY) ? HISTORY_CAPACITY : (int)total;
}

int history_get_all(HistorySample *out, int max)
{
    int n = history_count();
    if (n > max)
        n = max;

    unsigned long first = total - (unsigned long)n;
    for (int i = 0; i < n; i++)
        out[i] = ring[(first + (unsigned long)i) % HISTORY_CAPACITY];
    return n;
}

void history_format_time(const HistorySample *s, char *buf, size_t n)
{
    struct tm tm;
    localtime_r(&s->timestamp, &tm);
    strftime(buf, n, "%H:%M:%S", &tm);
}