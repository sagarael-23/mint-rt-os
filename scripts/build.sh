#!/usr/bin/env bash
# Membangun backend (C) dan frontend (React) sekaligus.
# Jalankan dari terminal biasa, karena Node.js (nvm) hanya tersedia di sana.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Backend (make) =="
make -C "$ROOT/backend"

echo "== Frontend (npm run build) =="
( cd "$ROOT/frontend" && npm run build )

echo "Selesai. Backend: $ROOT/backend/mint-rt-backend"
echo "         Frontend: $ROOT/frontend/dist"