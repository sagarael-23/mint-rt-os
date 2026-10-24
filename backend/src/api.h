#ifndef API_H
#define API_H

#define API_DEFAULT_PORT 8080

/* Jalankan server HTTP pada 127.0.0.1:port sampai menerima SIGINT/SIGTERM.
   Jika static_root tidak NULL, folder itu (hasil build frontend, harus berisi
   index.html) ikut disajikan untuk permintaan GET di luar /api/.
   Return 0 jika berhenti normal, -1 jika gagal start. */
int api_serve(int port, const char *static_root);

#endif