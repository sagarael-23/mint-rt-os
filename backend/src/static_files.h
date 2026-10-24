#ifndef STATIC_FILES_H
#define STATIC_FILES_H

/* Jalur permintaan aman: diawali '/', tanpa segmen "..", tanpa '%' (jalur
   ter-encode ditolak), tanpa backslash, dan tanpa karakter kontrol.
   Return 1 jika aman, 0 jika tidak. */
int static_is_safe_path(const char *path);

/* Content-Type menurut ekstensi nama berkas. */
const char *static_mime_type(const char *path);

/* 0 jika root adalah folder yang berisi index.html, selain itu -1. */
int static_root_valid(const char *root);

/* Mengirim berkas statis (atau jawaban kesalahan) ke socket fd. Hanya berkas
   biasa di dalam root yang dilayani; tautan simbolik yang keluar dari root
   tidak diikuti. "/" dipetakan ke /index.html. */
void static_serve(int fd, const char *root, const char *path);

#endif