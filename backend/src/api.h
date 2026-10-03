#ifndef API_H
#define API_H

#define API_DEFAULT_PORT 8080

/* Jalankan server HTTP pada 127.0.0.1:port sampai menerima SIGINT/SIGTERM.
   Return 0 jika berhenti normal, -1 jika gagal start. */
int api_serve(int port);

#endif