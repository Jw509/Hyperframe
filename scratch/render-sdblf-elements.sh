#!/usr/bin/env bash
# Render every SDBLF overlay element (counter / comp chips / recap) to alpha ProRes 4444.
# Decoupled pipeline: small canvases only — the 4K source never enters Chrome.
# Run from repo root: bash scratch/render-sdblf-elements.sh
set -u
cd "$(dirname "$0")/../cards" || exit 1
ok=0; fail=0; skip=0
for f in compositions/sdblf-el-*.html; do
  base=$(basename "$f" .html)
  out="renders/${base}.mov"
  if [ -s "$out" ]; then
    echo "SKIP $base (exists)"; skip=$((skip+1)); continue
  fi
  echo "=== RENDER $base ==="
  npx hyperframes render . -c "$f" -o "$out" -q high --fps 60 --format mov --workers 14 > "renders/${base}.renderlog.txt" 2>&1
  if [ $? -eq 0 ] && [ -s "$out" ]; then
    echo "OK   $base"; ok=$((ok+1))
  else
    echo "FAIL $base (see renders/${base}.renderlog.txt)"; fail=$((fail+1))
  fi
done
echo "DONE ok=$ok fail=$fail skip=$skip"
