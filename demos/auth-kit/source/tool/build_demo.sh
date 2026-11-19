#!/usr/bin/env bash
# Builds the web demo and copies it next to this folder (demos/auth-kit/),
# which GitHub Pages serves at /Portfolio/demos/auth-kit/.
# CanvasKit is not copied: Flutter loads it from Google's CDN (gstatic),
# which keeps the repo ~35 MB lighter. Debug maps/symbols are skipped too.
set -euo pipefail
cd "$(dirname "$0")/.."

flutter build web --release \
  --base-href /Portfolio/demos/auth-kit/ \
  --pwa-strategy=none --no-wasm-dry-run

OUT=..
rm -rf "$OUT/assets" "$OUT/icons"
rm -f "$OUT"/{index.html,main.dart.js,flutter.js,flutter_bootstrap.js,favicon.png,manifest.json,version.json}
(cd build/web && tar cf - \
  --exclude=canvaskit --exclude='*.map' --exclude='*.symbols' \
  --exclude=flutter_service_worker.js --exclude=.last_build_id .) | (cd "$OUT" && tar xf -)
echo "Demo copied to $(cd "$OUT" && pwd)"
