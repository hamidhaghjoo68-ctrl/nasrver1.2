#!/usr/bin/env bash
# ------------------------------------------------------------
# Nasr University - one-command updater for the live server
# Run on the server:   cd /root/gamnasr-deploy && bash update.sh
# Options:             --build (force rebuild)    --no-build (skip build)
# ------------------------------------------------------------
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
OPTION="${1:-auto}"
STAMP="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n==> %s\n' "$*"; }
warn() { printf '\n!!  %s\n' "$*"; }

say "Project folder: $APP_DIR"
if [ ! -f package.json ] || [ ! -f server/index.mjs ]; then
  warn "package.json or server/index.mjs is missing here. Upload the new project files into this folder first."
  exit 1
fi
command -v node >/dev/null 2>&1 || { warn "Node.js is not installed on this server."; exit 1; }
command -v npm  >/dev/null 2>&1 || { warn "npm is not installed on this server."; exit 1; }
echo "Node $(node -v) / npm $(npm -v)"

# ---- 1. find the systemd service that runs this folder ----
UNITS=""
DATA_DIR_FOUND=""
PORT_FOUND=""
if command -v systemctl >/dev/null 2>&1; then
  for f in /etc/systemd/system/*.service; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"
    if grep -qs -- "$APP_DIR" "$f" || printf '%s' "$name" | grep -qiE 'nasr'; then
      UNITS="$UNITS $name"
      d="$(grep -oE 'DATA_DIR=[^" ]+' "$f" | head -n1 | cut -d= -f2 || true)"
      [ -n "$d" ] && DATA_DIR_FOUND="$d"
      p="$(grep -oE '(^|[^A-Z_])PORT=[0-9]+' "$f" | head -n1 | grep -oE '[0-9]+' || true)"
      [ -n "$p" ] && PORT_FOUND="$p"
      echo "--- $name ---"
      grep -E 'WorkingDirectory|ExecStart|Environment' "$f" || true
    fi
  done
fi
if [ -n "$UNITS" ]; then say "Service(s) found:$UNITS"; else warn "No systemd service found that mentions this folder."; fi

# ---- 2. back up the data store (users, content, messages) ----
for candidate in "$DATA_DIR_FOUND" "$APP_DIR/server-data" "/root/gamnasr-data"; do
  if [ -n "$candidate" ] && [ -f "$candidate/store.json" ]; then
    mkdir -p "$APP_DIR/backups"
    cp "$candidate/store.json" "$APP_DIR/backups/store-$STAMP.json"
    chmod 600 "$APP_DIR/backups/store-$STAMP.json"
    say "Data folder: $candidate   (backup saved: backups/store-$STAMP.json)"
    break
  fi
done

# ---- 3. install packages ----
say "Installing packages (quick when nothing changed)"
npm install --no-audit --no-fund --loglevel=error

# ---- 4. build only when needed ----
NEED_BUILD=no
if   [ "$OPTION" = "--build" ];    then NEED_BUILD=yes
elif [ "$OPTION" = "--no-build" ]; then NEED_BUILD=no
elif [ ! -f dist/index.html ];     then NEED_BUILD=yes
elif [ -n "$(find src index.html vite.config.ts -type f -newer dist/index.html -print -quit 2>/dev/null)" ]; then NEED_BUILD=yes
fi
if [ "$NEED_BUILD" = yes ]; then
  say "Building the website (npm run build) - this may take a minute"
  npm run build
else
  say "dist/index.html is already newer than the sources - build skipped (use --build to force)"
fi

# ---- 5. restart so the new server code and page hashes are loaded ----
RESTARTED=no
for u in $UNITS; do
  say "Restarting $u"
  if systemctl restart "$u"; then
    RESTARTED=yes
    sleep 2
    systemctl --no-pager --lines=3 status "$u" || true
  else
    warn "Could not restart $u"
  fi
done
if [ "$RESTARTED" = no ] && command -v pm2 >/dev/null 2>&1; then
  say "Restarting pm2 processes"
  pm2 restart all --update-env && RESTARTED=yes || true
fi
if [ "$RESTARTED" = no ]; then
  warn "The Node service was not restarted automatically. Do one of these:"
  echo "   systemctl list-units --type=service | grep -iE 'node|nasr'    -> then: systemctl restart <name>"
  echo "   pm2 restart all"
  echo "   reboot    (last resort; the site returns after boot if the service is enabled)"
fi

# ---- 6. health check ----
say "Health check"
PORT_GUESS="${PORT_FOUND:-${PORT:-3001}}"
if node -e "fetch('http://127.0.0.1:${PORT_GUESS}/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  echo "OK - the API answers on port ${PORT_GUESS}."
else
  warn "The API did not answer on port ${PORT_GUESS} yet. Wait 10 seconds and open the site. Logs: journalctl -u <service-name> -n 50"
fi
say "Finished. Open the site, press Ctrl+F5, then log in to the admin panel again."
