#include <stdio.h>
#include <string.h>
#include "../src/logger.h"
#include "../src/scheduler.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

int main(void)
{
    static LogEntry out[1000];
    int n;

    /* TC-LOG-01: urutan dan pengambilan berdasarkan seq. */
    log_reset();
    log_msg(LOG_INFO, LOG_SYSTEM, "first");
    log_msg(LOG_WARN, LOG_CPU, "second");
    log_msg(LOG_ERROR, LOG_PROCESS, "third");
    CHECK("TC-LOG-01a jumlah 3, seq terakhir 3",
          log_count() == 3 && log_last_seq() == 3);
    n = log_get_since(0, out, 1000);
    CHECK("TC-LOG-01b get_since(0) -> 3 entri berurutan",
          n == 3 && out[0].seq == 1 && out[1].seq == 2 && out[2].seq == 3 &&
          strcmp(out[0].message, "first") == 0);
    n = log_get_since(2, out, 1000);
    CHECK("TC-LOG-01c get_since(2) -> hanya seq 3",
          n == 1 && out[0].seq == 3 && out[0].level == LOG_ERROR);
    n = log_get_since(3, out, 1000);
    CHECK("TC-LOG-01d get_since(3) -> kosong", n == 0);

    /* TC-LOG-02: pemformatan printf. */
    log_reset();
    log_msg(LOG_INFO, LOG_PROCESS, "%s (PID %d) detected", "firefox", 1234);
    n = log_get_since(0, out, 1000);
    CHECK("TC-LOG-02 format pesan",
          n == 1 && strcmp(out[0].message, "firefox (PID 1234) detected") == 0);

    /* TC-LOG-03: ring buffer berputar setelah 500 entri. */
    log_reset();
    for (int i = 1; i <= 600; i++)
        log_msg(LOG_INFO, LOG_SYSTEM, "msg %d", i);
    CHECK("TC-LOG-03a hanya 500 tersimpan, seq terakhir 600",
          log_count() == 500 && log_last_seq() == 600);
    n = log_get_since(0, out, 1000);
    CHECK("TC-LOG-03b entri tertua seq 101, terbaru seq 600",
          n == 500 && out[0].seq == 101 && out[499].seq == 600);
    n = log_get_since(590, out, 1000);
    CHECK("TC-LOG-03c get_since(590) -> 10 entri mulai seq 591",
          n == 10 && out[0].seq == 591);

    /* TC-LOG-04: pesan terlalu panjang dipotong dengan aman. */
    {
        char big[300];
        memset(big, 'x', sizeof(big) - 1);
        big[sizeof(big) - 1] = '\0';
        log_reset();
        log_msg(LOG_INFO, LOG_SYSTEM, "%s", big);
        n = log_get_since(0, out, 1000);
        CHECK("TC-LOG-04 pesan dipotong ke LOG_MSG_MAX-1",
              n == 1 && strlen(out[0].message) == LOG_MSG_MAX - 1);
    }

    /* TC-LOG-05: nama level dan kategori. */
    CHECK("TC-LOG-05 nama level/kategori",
          strcmp(log_level_name(LOG_WARN), "WARN") == 0 &&
          strcmp(log_category_name(LOG_DEADLINE), "DEADLINE") == 0);

    /* TC-LOG-06: scheduler menghasilkan log (skenario overload X/Y). */
    {
        static Scheduler s;
        int deadline_warns = 0;
        log_reset();
        sched_init(&s);
        sched_add_task(&s, 0, "X", 0, 30, 40);
        sched_add_task(&s, 0, "Y", 0, 30, 50);
        sched_start(&s);
        sched_run_until_idle(&s, 1000);

        n = log_get_since(0, out, 1000);
        for (int i = 0; i < n; i++)
            if (out[i].category == LOG_DEADLINE && out[i].level == LOG_WARN &&
                strstr(out[i].message, "Y") != NULL)
                deadline_warns++;

        CHECK("TC-LOG-06a log pertama: scheduler started",
              n > 0 && strstr(out[0].message, "started") != NULL);
        CHECK("TC-LOG-06b tepat 6 entri log",
              n == 6);
        CHECK("TC-LOG-06c satu WARN DEADLINE untuk Y",
              deadline_warns == 1);
    }

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}