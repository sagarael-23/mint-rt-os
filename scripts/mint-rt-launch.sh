#!/usr/bin/env bash
# Membuka dashboard MINT RT OS di Firefox layar penuh (kiosk) setelah backend siap.
# Dipanggil otomatis saat login (lihat install-autostart.sh).
# MINT_RT_MODE=windowed membuka jendela biasa (berguna saat debugging).
set -u

PORT="${MINT_RT_PORT:-8080}"
URL="http://127.0.0.1:${PORT}/"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mint-rt-os"
PROFILE="${XDG_DATA_HOME:-$HOME/.local/share}/mint-rt-os/firefox-profile"
MODE="${MINT_RT_MODE:-kiosk}"

mkdir -p "$STATE_DIR" "$PROFILE"
log() { echo "$(date '+%F %T') $*" >> "$STATE_DIR/launch.log"; }

log "launcher start (mode=$MODE)"

# Jangan membuka dua jendela jika launcher terpanggil dua kali.
if pgrep -f "firefox.*${PROFILE}" >/dev/null 2>&1; then
  log "firefox with this profile is already running; exit"
  exit 0
fi

# Pastikan backend berjalan lewat systemd (abaikan kesalahan jika belum terpasang).
systemctl --user start mint-rt-backend.service >/dev/null 2>&1 || true

# Tunggu backend siap (sampai sekitar 30 detik).
ready=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 1 "${URL}api/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.5
done
if [ "$ready" -eq 1 ]; then
  log "backend ready"
else
  log "backend NOT ready after 30 s; opening the browser anyway"
fi

# Preferensi profil khusus kiosk: tanpa layar sambutan, tanpa dialog pemulihan
# sesi, dan tanpa sambungan spekulatif.
cat > "$PROFILE/user.js" <<'EOF'
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("startup.homepage_welcome_url", "");
user_pref("startup.homepage_welcome_url.additional", "");
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("network.http.speculative-parallel-limit", 0);
user_pref("network.prefetch-next", false);
user_pref("network.dns.disablePrefetch", true);
EOF

if [ "$MODE" = "windowed" ]; then
  log "starting firefox (windowed)"
  exec firefox --no-remote --profile "$PROFILE" --new-window "$URL"
fi

log "starting firefox (kiosk)"
exec firefox --no-remote --profile "$PROFILE" --kiosk "$URL"