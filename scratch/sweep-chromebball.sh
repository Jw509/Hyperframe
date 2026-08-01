#!/usr/bin/env bash
# Coarse catalogue sweep for chromebball: 1fps contact sheets, 4x3 = 12 frames per sheet.
# Frame k (1-based, global) is at t = k-1 seconds. Sheet N holds frames (N-1)*12+1 .. N*12,
# left-to-right, top-to-bottom.
set -e
cd "$(dirname "$0")/.."
OUT=scratch/chromebball-sheets
rm -rf "$OUT"
mkdir -p "$OUT"
ffmpeg -hide_banner -loglevel error -i cards/sources/chromebball/ChromeBBall2425.mp4 \
  -vf "fps=1,scale=432:768,tile=4x3:margin=8:padding=8:color=0x202020" \
  -q:v 2 "$OUT/sheet-%02d.jpg"
ls -1 "$OUT"
