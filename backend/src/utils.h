#ifndef UTILS_H
#define UTILS_H

#include <stddef.h>

/* Buffer string yang tumbuh otomatis. */
typedef struct {
    char  *data;   /* NULL sampai ada yang ditambahkan */
    size_t len;
    size_t cap;
} StrBuf;

void sb_init(StrBuf *sb);
void sb_free(StrBuf *sb);

/* Tambah teks gaya printf. Return 0 jika berhasil, -1 jika memori habis. */
int sb_appendf(StrBuf *sb, const char *fmt, ...)
    __attribute__((format(printf, 2, 3)));

/* Tambah string JSON lengkap dengan tanda kutip dan escape.
   Byte non-ASCII (>= 0x7f) diganti '?' agar JSON selalu valid. */
int sb_append_json_str(StrBuf *sb, const char *s);

/* Baca parameter angka dari query string ("a=1&since=42").
   Return 0 jika key ditemukan dan nilainya angka valid, selain itu -1. */
int query_get_ulong(const char *query, const char *key, unsigned long *out);

#endif