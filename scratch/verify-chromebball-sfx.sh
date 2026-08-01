#!/usr/bin/env bash
# Windowed level check on the finished mix. silencedetect misses sub-ambient SFX, so probe each
# SFX time directly and compare against control windows that should hold nothing.
set -u
cd "$(dirname "$0")/.." || exit 1
F=cards/renders/chromebball_final_captioned_sfx.mp4
probe () {  # label start dur
  v=$(ffmpeg -hide_banner -ss "$2" -t "$3" -i "$F" -af volumedetect -f null - 2>&1 | grep max_volume | sed 's/.*max_volume: //')
  printf '%-28s %7ss  max %s\n' "$1" "$2" "$v"
}
echo "--- swooshes (pack changes) ---"
for t in 11.23 19.7 32.83 43.65 52.6 63.8 73.5 94.2; do probe "swoosh" "$t" 0.6; done
echo "--- cost sting ---"
probe "sting" 12.9 1.2
echo "--- cha-chings (comp pops) ---"
for t in 13.07 25.07 55.12 65.37 81.72 100.82; do probe "chaching" "$t" 0.7; done
echo "--- voiceover ---"
probe "VO intro" 0.0 4.7
probe "VO outro" 101.0 4.6
echo "--- controls (must be near-silent) ---"
probe "gap 28-31" 28.0 3.0
probe "gap 76-80" 76.0 4.0
probe "RECAP (must be silent)" 104.6 6.0
