#!/usr/bin/env bash
# Menghentikan dashboard (Firefox kiosk) dan backend MINT RT OS.
PROFILE="${XDG_DATA_HOME:-$HOME/.local/share}/mint-rt-os/firefox-profile"

if pkill -f "firefox.*${PROFILE}" 2>/dev/null; then
  echo "Firefox kiosk dihentikan."
else
  echo "Firefox kiosk tidak sedang berjalan."
fi

if systemctl --user stop mint-rt-backend.service 2>/dev/null; then
  echo "Backend dihentikan."
else
  echo "Layanan backend tidak berjalan atau belum terpasang."
fi