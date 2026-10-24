#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <unistd.h>

#include "../src/static_files.h"

static int failures = 0;

#define CHECK(name, cond) do { \
    if (cond) printf("PASS  %s\n", name); \
    else { printf("FAIL  %s\n", name); failures++; } \
} while (0)

static void write_file(const char *path, const char *text)
{
    FILE *f = fopen(path, "w");
    if (f) {
        fputs(text, f);
        fclose(f);
    }
}

/* Memanggil static_serve lewat socketpair dan mengumpulkan jawabannya. */
static size_t fetch(const char *root, const char *path, char *out, size_t cap)
{
    int sv[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sv) != 0)
        return 0;

    static_serve(sv[0], root, path);
    close(sv[0]);

    size_t len = 0;
    ssize_t n;
    while (len < cap - 1 && (n = read(sv[1], out + len, cap - 1 - len)) > 0)
        len += (size_t)n;
    out[len] = '\0';
    close(sv[1]);
    return len;
}

static const char *body_of(const char *resp)
{
    const char *p = strstr(resp, "\r\n\r\n");
    return p ? p + 4 : "";
}

int main(void)
{
    const char *index_body = "<html><body>MINT RT OS</body></html>";
    const char *asset_body = "console.log('mint');";
    const char *secret     = "TOP-SECRET-CONTENT";

    char base[] = "/tmp/mintrt-static-XXXXXX";
    if (!mkdtemp(base)) {
        perror("mkdtemp");
        return 2;
    }

    char site[PATH_MAX], assets[PATH_MAX], outside[PATH_MAX];
    char index_f[PATH_MAX], asset_f[PATH_MAX], secret_f[PATH_MAX], link_f[PATH_MAX];
    snprintf(site, sizeof(site), "%s/site", base);
    snprintf(assets, sizeof(assets), "%s/site/assets", base);
    snprintf(outside, sizeof(outside), "%s/outside", base);
    snprintf(index_f, sizeof(index_f), "%s/site/index.html", base);
    snprintf(asset_f, sizeof(asset_f), "%s/site/assets/app.js", base);
    snprintf(secret_f, sizeof(secret_f), "%s/outside/secret.txt", base);
    snprintf(link_f, sizeof(link_f), "%s/site/leak.txt", base);

    mkdir(site, 0755);
    mkdir(assets, 0755);
    mkdir(outside, 0755);
    write_file(index_f, index_body);
    write_file(asset_f, asset_body);
    write_file(secret_f, secret);
    if (symlink(secret_f, link_f) != 0)
        perror("symlink");

    static char resp[8192];

    /* TC-STA-01: pemeriksaan jalur. */
    CHECK("TC-STA-01a jalur aman diterima",
          static_is_safe_path("/") && static_is_safe_path("/index.html") &&
          static_is_safe_path("/assets/a.js") && static_is_safe_path("/..hidden"));
    CHECK("TC-STA-01b jalur berbahaya ditolak",
          !static_is_safe_path(NULL) && !static_is_safe_path("") &&
          !static_is_safe_path("index.html") && !static_is_safe_path("/../x") &&
          !static_is_safe_path("/a/../b") && !static_is_safe_path("/a/..") &&
          !static_is_safe_path("/%2e%2e/x") && !static_is_safe_path("/a\\b") &&
          !static_is_safe_path("/a\x01" "b"));

    /* TC-STA-02: tipe konten. */
    CHECK("TC-STA-02a tipe konten umum",
          strcmp(static_mime_type("/index.html"), "text/html; charset=utf-8") == 0 &&
          strcmp(static_mime_type("/assets/a.js"), "text/javascript; charset=utf-8") == 0 &&
          strcmp(static_mime_type("/assets/a.css"), "text/css; charset=utf-8") == 0 &&
          strcmp(static_mime_type("/assets/f.woff2"), "font/woff2") == 0 &&
          strcmp(static_mime_type("/favicon.svg"), "image/svg+xml") == 0 &&
          strcmp(static_mime_type("/hero.png"), "image/png") == 0);
    CHECK("TC-STA-02b tipe tidak dikenal, tanpa ekstensi, titik di folder, huruf besar",
          strcmp(static_mime_type("/a.xyz"), "application/octet-stream") == 0 &&
          strcmp(static_mime_type("/README"), "application/octet-stream") == 0 &&
          strcmp(static_mime_type("/dir.v1/file"), "application/octet-stream") == 0 &&
          strcmp(static_mime_type("/A.JS"), "text/javascript; charset=utf-8") == 0);

    /* TC-STA-03: validasi folder. */
    CHECK("TC-STA-03 folder valid harus berisi index.html",
          static_root_valid(site) == 0 && static_root_valid(outside) == -1 &&
          static_root_valid("/nonexistent-dir-xyz") == -1 &&
          static_root_valid(NULL) == -1);

    /* TC-STA-04: "/" melayani index.html. */
    fetch(site, "/", resp, sizeof(resp));
    CHECK("TC-STA-04 / melayani index.html (200, text/html, no-cache)",
          strstr(resp, "HTTP/1.1 200 OK") != NULL &&
          strstr(resp, "Content-Type: text/html; charset=utf-8") != NULL &&
          strstr(resp, "Cache-Control: no-cache") != NULL &&
          strcmp(body_of(resp), index_body) == 0);

    /* TC-STA-05: berkas di /assets/ boleh disimpan lama. */
    fetch(site, "/assets/app.js", resp, sizeof(resp));
    CHECK("TC-STA-05 /assets/app.js (200, JavaScript, immutable)",
          strstr(resp, "HTTP/1.1 200 OK") != NULL &&
          strstr(resp, "Content-Type: text/javascript; charset=utf-8") != NULL &&
          strstr(resp, "immutable") != NULL &&
          strcmp(body_of(resp), asset_body) == 0);

    /* TC-STA-06: tidak ada atau bukan berkas. */
    fetch(site, "/nope.js", resp, sizeof(resp));
    CHECK("TC-STA-06a berkas tidak ada -> 404",
          strstr(resp, "HTTP/1.1 404 Not Found") != NULL);
    fetch(site, "/assets/", resp, sizeof(resp));
    CHECK("TC-STA-06b folder bukan berkas -> 404",
          strstr(resp, "HTTP/1.1 404 Not Found") != NULL);

    /* TC-STA-07: upaya keluar dari folder. */
    fetch(site, "/../outside/secret.txt", resp, sizeof(resp));
    CHECK("TC-STA-07a jalur dengan .. -> 400 dan isi tidak bocor",
          strstr(resp, "HTTP/1.1 400 Bad Request") != NULL &&
          strstr(resp, secret) == NULL);
    fetch(site, "/%2e%2e/outside/secret.txt", resp, sizeof(resp));
    CHECK("TC-STA-07b jalur ter-encode -> 400 dan isi tidak bocor",
          strstr(resp, "HTTP/1.1 400 Bad Request") != NULL &&
          strstr(resp, secret) == NULL);

    /* TC-STA-08: tautan simbolik yang keluar dari folder tidak diikuti. */
    fetch(site, "/leak.txt", resp, sizeof(resp));
    CHECK("TC-STA-08 symlink keluar folder -> 404 dan isi tidak bocor",
          strstr(resp, "HTTP/1.1 404 Not Found") != NULL &&
          strstr(resp, secret) == NULL);

    unlink(link_f);
    unlink(secret_f);
    unlink(asset_f);
    unlink(index_f);
    rmdir(assets);
    rmdir(site);
    rmdir(outside);
    rmdir(base);

    printf("\nHasil: %d tes gagal\n", failures);
    return failures ? 1 : 0;
}