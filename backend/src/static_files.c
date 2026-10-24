#include "static_files.h"

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <unistd.h>

static int send_all(int fd, const char *data, size_t len)
{
    size_t off = 0;
    while (off < len) {
        ssize_t w = send(fd, data + off, len - off, MSG_NOSIGNAL);
        if (w < 0) {
            if (errno == EINTR)
                continue;
            return -1;
        }
        off += (size_t)w;
    }
    return 0;
}

static void send_error(int fd, int status, const char *reason, const char *json)
{
    char head[256];
    size_t len = strlen(json);
    int n = snprintf(head, sizeof(head),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Content-Length: %zu\r\n"
        "Cache-Control: no-store\r\n"
        "Connection: close\r\n\r\n",
        status, reason, len);
    if (send_all(fd, head, (size_t)n) == 0)
        send_all(fd, json, len);
}

int static_is_safe_path(const char *path)
{
    if (!path || path[0] != '/')
        return 0;

    for (const char *p = path; *p; p++) {
        if (*p == '%' || *p == '\\')
            return 0;
        if ((unsigned char)*p < 0x20 || *p == 0x7f)
            return 0;
    }

    /* Tolak segmen ".." (".." sebagai bagian nama lain, mis. "..a", boleh). */
    const char *seg = path;
    while (*seg) {
        while (*seg == '/')
            seg++;
        const char *end = seg;
        while (*end && *end != '/')
            end++;
        if ((size_t)(end - seg) == 2 && seg[0] == '.' && seg[1] == '.')
            return 0;
        seg = end;
    }
    return 1;
}

const char *static_mime_type(const char *path)
{
    static const struct {
        const char *ext;
        const char *type;
    } map[] = {
        { ".html",  "text/html; charset=utf-8" },
        { ".js",    "text/javascript; charset=utf-8" },
        { ".mjs",   "text/javascript; charset=utf-8" },
        { ".css",   "text/css; charset=utf-8" },
        { ".json",  "application/json" },
        { ".map",   "application/json" },
        { ".svg",   "image/svg+xml" },
        { ".png",   "image/png" },
        { ".jpg",   "image/jpeg" },
        { ".jpeg",  "image/jpeg" },
        { ".webp",  "image/webp" },
        { ".ico",   "image/x-icon" },
        { ".woff2", "font/woff2" },
        { ".woff",  "font/woff" },
        { ".txt",   "text/plain; charset=utf-8" },
    };

    const char *slash = strrchr(path, '/');
    const char *dot   = strrchr(path, '.');
    if (!dot || (slash && dot < slash))
        return "application/octet-stream";

    for (size_t i = 0; i < sizeof(map) / sizeof(map[0]); i++)
        if (strcasecmp(dot, map[i].ext) == 0)
            return map[i].type;
    return "application/octet-stream";
}

int static_root_valid(const char *root)
{
    struct stat st;
    char index_path[PATH_MAX];

    if (!root || stat(root, &st) != 0 || !S_ISDIR(st.st_mode))
        return -1;
    snprintf(index_path, sizeof(index_path), "%s/index.html", root);
    return (stat(index_path, &st) == 0 && S_ISREG(st.st_mode)) ? 0 : -1;
}

void static_serve(int fd, const char *root, const char *path)
{
    struct timeval tv = { 2, 0 };
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));

    if (!static_is_safe_path(path)) {
        send_error(fd, 400, "Bad Request", "{\"error\":\"bad path\"}");
        return;
    }

    char root_real[PATH_MAX];
    if (!realpath(root, root_real)) {
        send_error(fd, 500, "Internal Server Error",
                   "{\"error\":\"static folder unavailable\"}");
        return;
    }

    const char *rel = (strcmp(path, "/") == 0) ? "/index.html" : path;

    char candidate[PATH_MAX];
    if (snprintf(candidate, sizeof(candidate), "%s%s", root_real, rel)
        >= (int)sizeof(candidate)) {
        send_error(fd, 404, "Not Found", "{\"error\":\"not found\"}");
        return;
    }

    /* realpath mengikuti tautan simbolik; hasilnya harus tetap di dalam root. */
    char resolved[PATH_MAX];
    if (!realpath(candidate, resolved)) {
        send_error(fd, 404, "Not Found", "{\"error\":\"not found\"}");
        return;
    }
    size_t rl = strlen(root_real);
    if (strncmp(resolved, root_real, rl) != 0 || resolved[rl] != '/') {
        send_error(fd, 404, "Not Found", "{\"error\":\"not found\"}");
        return;
    }

    int file = open(resolved, O_RDONLY);
    if (file < 0) {
        send_error(fd, 404, "Not Found", "{\"error\":\"not found\"}");
        return;
    }
    struct stat st;
    if (fstat(file, &st) != 0 || !S_ISREG(st.st_mode)) {
        close(file);
        send_error(fd, 404, "Not Found", "{\"error\":\"not found\"}");
        return;
    }

    /* Berkas di /assets/ bernama dengan hash isi, jadi aman disimpan lama.
       Berkas lain (index.html) selalu dicek ulang agar build baru langsung terpakai. */
    int immutable = (strncmp(rel, "/assets/", 8) == 0);

    char head[512];
    int hl = snprintf(head, sizeof(head),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %lld\r\n"
        "Cache-Control: %s\r\n"
        "X-Content-Type-Options: nosniff\r\n"
        "X-Frame-Options: DENY\r\n"
        "Referrer-Policy: no-referrer\r\n"
        "Connection: close\r\n\r\n",
        static_mime_type(resolved), (long long)st.st_size,
        immutable ? "public, max-age=31536000, immutable" : "no-cache");

    if (send_all(fd, head, (size_t)hl) == 0) {
        char buf[16384];
        ssize_t n;
        while ((n = read(file, buf, sizeof(buf))) > 0)
            if (send_all(fd, buf, (size_t)n) != 0)
                break;
    }
    close(file);
}