#include "utils.h"

#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void sb_init(StrBuf *sb)
{
    sb->data = NULL;
    sb->len  = 0;
    sb->cap  = 0;
}

void sb_free(StrBuf *sb)
{
    free(sb->data);
    sb->data = NULL;
    sb->len  = 0;
    sb->cap  = 0;
}

/* Pastikan ada ruang untuk 'extra' byte tambahan plus '\0'. */
static int sb_reserve(StrBuf *sb, size_t extra)
{
    size_t need = sb->len + extra + 1;
    if (need <= sb->cap)
        return 0;

    size_t ncap = sb->cap ? sb->cap : 256;
    while (ncap < need)
        ncap *= 2;

    char *p = realloc(sb->data, ncap);
    if (!p)
        return -1;
    sb->data = p;
    sb->cap  = ncap;
    return 0;
}

int sb_appendf(StrBuf *sb, const char *fmt, ...)
{
    va_list ap, ap2;
    va_start(ap, fmt);
    va_copy(ap2, ap);
    int need = vsnprintf(NULL, 0, fmt, ap);
    va_end(ap);

    if (need < 0 || sb_reserve(sb, (size_t)need) != 0) {
        va_end(ap2);
        return -1;
    }
    vsnprintf(sb->data + sb->len, (size_t)need + 1, fmt, ap2);
    va_end(ap2);
    sb->len += (size_t)need;
    return 0;
}

static int sb_putc(StrBuf *sb, char c)
{
    if (sb_reserve(sb, 1) != 0)
        return -1;
    sb->data[sb->len++] = c;
    sb->data[sb->len]   = '\0';
    return 0;
}

int sb_append_json_str(StrBuf *sb, const char *s)
{
    if (sb_putc(sb, '"') != 0)
        return -1;

    for (; *s; s++) {
        unsigned char c = (unsigned char)*s;
        int rc;

        switch (c) {
        case '"':  rc = sb_appendf(sb, "\\\""); break;
        case '\\': rc = sb_appendf(sb, "\\\\"); break;
        case '\n': rc = sb_appendf(sb, "\\n");  break;
        case '\r': rc = sb_appendf(sb, "\\r");  break;
        case '\t': rc = sb_appendf(sb, "\\t");  break;
        default:
            if (c < 0x20)
                rc = sb_appendf(sb, "\\u%04x", c);
            else if (c >= 0x7f)
                rc = sb_putc(sb, '?');
            else
                rc = sb_putc(sb, (char)c);
        }
        if (rc != 0)
            return -1;
    }
    return sb_putc(sb, '"');
}

int query_get_ulong(const char *query, const char *key, unsigned long *out)
{
    if (!query || !key)
        return -1;

    size_t klen = strlen(key);
    const char *p = query;

    while (*p) {
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            const char *v = p + klen + 1;
            if (*v < '0' || *v > '9')
                return -1;

            char *end;
            errno = 0;
            unsigned long x = strtoul(v, &end, 10);
            if (errno != 0 || (*end != '\0' && *end != '&'))
                return -1;
            *out = x;
            return 0;
        }
        const char *amp = strchr(p, '&');
        if (!amp)
            break;
        p = amp + 1;
    }
    return -1;
}