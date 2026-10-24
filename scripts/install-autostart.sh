#!/usr/bin/env bash
# Memasang autostart MINT RT OS untuk pengguna ini.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
AUTOSTART_DIR="$HOME/.config/autostart"
STATE_DIR="$HOME/.local/state/mint-rt-os"

if [ ! -x "$ROOT/backend/mint-rt-backend" ]; then
  echo "Backend belum dibangun. Jalankan scripts/build.sh terlebih dulu." >&2
  exit 1
fi

if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  echo "Frontend belum dibangun. Jalankan scripts/build.sh terlebih dulu." >&2
  exit 1
fi

chmod +x "$ROOT"/scripts/*.sh

# Buat direktori state SEBELUM service dijalankan.
mkdir -p "$STATE_DIR" "$UNIT_DIR" "$AUTOSTART_DIR"

# Pasang konfigurasi systemd.
sed "s|@ROOT@|$ROOT|g" "$ROOT/scripts/mint-rt-backend.service" \
  > "$UNIT_DIR/mint-rt-backend.service"

# Buka dashboard otomatis setelah login desktop.
cat > "$AUTOSTART_DIR/mint-rt-os.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=MINT RT OS
Comment=Open the MINT RT OS dashboard (kiosk) after login
Exec=$ROOT/scripts/mint-rt-launch.sh
Terminal=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=3
DESKTOP

systemctl --user daemon-reload
systemctl --user enable --now mint-rt-backend.service

echo "Instalasi autostart berhasil."
echo "Service   : $UNIT_DIR/mint-rt-backend.service"
echo "Desktop   : $AUTOSTART_DIR/mint-rt-os.desktop"
echo "State dir : $STATE_DIR"
echo "Periksa   : systemctl --user status mint-rt-backend.service"
