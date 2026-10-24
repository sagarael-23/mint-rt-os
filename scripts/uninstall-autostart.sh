#!/usr/bin/env bash
# Menghapus autostart MINT RT OS. Folder proyek tidak diubah.
set -u

systemctl --user disable --now mint-rt-backend.service 2>/dev/null || true
rm -f "$HOME/.config/systemd/user/mint-rt-backend.service" \
      "$HOME/.config/autostart/mint-rt-os.desktop"
systemctl --user daemon-reload

echo "Autostart MINT RT OS dihapus."