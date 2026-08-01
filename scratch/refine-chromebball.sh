#!/usr/bin/env bash
# 4fps refine tiles around each comped card, to pin settle/exit times.
# Tile k (1-based, left-to-right then top-to-bottom) is at t = START + (k-1)*0.25
set -e
cd "$(dirname "$0")/.."
SRC=cards/sources/chromebball/ChromeBBall2425.mp4
OUT=scratch/chromebball-sheets
shot () { # name start dur rows
  ffmpeg -hide_banner -loglevel error -ss "$2" -t "$3" -i "$SRC" \
    -vf "fps=4,scale=300:533,tile=6x$4:margin=6:padding=6:color=0x202020" \
    -q:v 2 -frames:v 1 "$OUT/ref$1.jpg"
}
shot C 12.5  6.0 4
shot D 24.5  6.0 4
shot E 36.5  4.5 3
shot F 43.0  9.0 6
shot G 52.5  9.5 7
shot H 81.0  4.5 3
shot I 89.0  3.5 3
shot J 94.5 10.0 7
ls -1 "$OUT" | grep '^ref'
