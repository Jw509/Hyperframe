#!/usr/bin/env bash
# Per-frame motion energy for chromebball (15 samples/sec, 0.0667s resolution).
# YAVG of the frame-difference image ~= how much moved. Low plateaus = card held still.
set -e
cd "$(dirname "$0")/.."
ffmpeg -hide_banner -loglevel error -i cards/sources/chromebball/ChromeBBall2425.mp4 \
  -vf "fps=15,scale=135:240,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=scratch/chromebball-motion.txt" \
  -f null -
wc -l scratch/chromebball-motion.txt
