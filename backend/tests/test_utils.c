#include <stdio.h>
#include <string.h>
#include "../src/utils.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

static int json_equals(const char *input, const char *expected)
{
    StrBuf sb;
    sb_init(&sb);
    int rc = sb_append_json_str(&sb, input);
    int ok = (rc == 0 && sb.data && strcmp(sb.data, expected) == 0);
    sb_free(&sb);
    return ok;
}

int main(void)
{
    StrBuf sb;
    unsigned long v = 0;

    sb_init(&sb);
    sb_appendf(&sb, "x=%d", 42);
    sb_appendf(&sb, "-%s", "ok");
    CHECK("TC-UTL-01 sb_appendf menggabung teks",
          sb.data && strcmp(sb.data, "x=42-ok") == 0 && sb.len == 7);
    sb_free(&sb);

    sb_init(&sb);
    for (int i = 0; i < 100; i++)
        sb_appendf(&sb, "0123456789");
    CHECK("TC-UTL-02 buffer tumbuh otomatis",
          sb.data && sb.len == 1000 && strlen(sb.data) == 1000);
    sb_free(&sb);

    CHECK("TC-UTL-03 escape kutip, backslash, newline",
          json_equals("a\"b\\c\nd", "\"a\\\"b\\\\c\\nd\""));
    CHECK("TC-UTL-04 karakter kontrol jadi \\u0001",
          json_equals("\x01", "\"\\u0001\""));
    CHECK("TC-UTL-05 byte non-ASCII diganti '?'",
          json_equals("caf\xc3\xa9", "\"caf??\""));
    CHECK("TC-UTL-06 string kosong",
          json_equals("", "\"\""));

    CHECK("TC-UTL-07a query since=5",
          query_get_ulong("since=5", "since", &v) == 0 && v == 5);
    CHECK("TC-UTL-07b query di tengah parameter lain",
          query_get_ulong("a=1&since=42&b=2", "since", &v) == 0 && v == 42);
    CHECK("TC-UTL-07c key harus persis (xsince bukan since)",
          query_get_ulong("xsince=9", "since", &v) == -1);
    CHECK("TC-UTL-07d nilai bukan angka ditolak",
          query_get_ulong("since=abc", "since", &v) == -1);
    CHECK("TC-UTL-07e query NULL ditolak",
          query_get_ulong(NULL, "since", &v) == -1);

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}