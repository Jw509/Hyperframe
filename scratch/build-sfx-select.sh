#!/usr/bin/env bash
# SFX post-mix for selecthangerpack2024.
# Approved style (memory: sfx_style_approved): comp cha-ching on EACH comp pop
# + one pack-cost sting with the price-overlay entrance. NO swoosh. Recap silent.
# The rendered master (v23) is silent; this rebuilds only the audio and copies
# the video stream (fast, ~1 min). Tweak the *_MS values below to re-time SFX.
set -euo pipefail
cd "$(dirname "$0")/../cards"   # -> cards/ (project root for relative paths)

VER="${1:-v23}"   # render version to mix, e.g. ./build-sfx-select.sh v24
IN=renders/selecthangerpack2024/final-${VER}.mp4
OUT=renders/selecthangerpack2024/final-${VER}-sfx.mp4
MONEY=sounds/cardmoneysound.m4a   # comp cha-ching (~0.68s)
COST=sounds/packcostsound.m4a     # pack-cost sting (~1.17s)

# Comp-pop times = each reveal's data-start in the composition (ms).
COMP_MS=(5800 10700 17800 20700 24900 27000 29800 32100 35400 40000)
# Pack-cost / price-overlay entrance (ms).
COST_MS=3700
# Pad the audio to the video's full length so the two streams match.
VID_DUR=52.705

N=${#COMP_MS[@]}

# asplit the cha-ching into one copy per comp pop...
split="[1:a]asplit=${N}"
for i in $(seq 0 $((N - 1))); do split+="[m$i]"; done
split+=";"

# ...delay each copy to its comp-pop time, collect the labels to mix.
delays=""
mixlabels=""
for i in $(seq 0 $((N - 1))); do
  delays+="[m$i]adelay=${COMP_MS[$i]}|${COMP_MS[$i]}[a$i];"
  mixlabels+="[a$i]"
done

# Pack-cost sting (input 2), one copy at the overlay entrance.
delays+="[2:a]adelay=${COST_MS}|${COST_MS}[c0];"
mixlabels+="[c0]"

NMIX=$((N + 1))
# normalize=0 => sum at full level (SFX never overlap, so no clipping); limiter
# is a safety net; apad makes the audio span the whole video.
filter="${split}${delays}${mixlabels}amix=inputs=${NMIX}:normalize=0:dropout_transition=0[mx];[mx]alimiter=limit=0.95,apad=whole_dur=${VID_DUR}[outa]"

ffmpeg -y -hide_banner -i "$IN" -i "$MONEY" -i "$COST" \
  -filter_complex "$filter" \
  -map 0:v -map "[outa]" -c:v copy -c:a aac -b:a 192k "$OUT"

echo "Wrote $OUT"
