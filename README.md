# MINT RT OS

Application-level EDF scheduler and real-time process monitoring
dashboard running on Linux Mint.

## Status
- Kernel Linux tidak dimodifikasi.
- Monitoring proses membaca data nyata dari /proc.
- EDF berjalan di level aplikasi (simulasi), bukan scheduler kernel.

## Stack
- Backend: C (GCC, Make)
- Frontend: React.js, Tailwind CSS, shadcn/ui
- OS: Linux Mint (VirtualBox)

## Struktur
- backend/  : sistem layer (C)
- frontend/ : antarmuka (React)
- docs/     : dokumentasi
