#!/usr/bin/env bash
# Final deliverable: finished 4K/60 MP4 with comps + counter + intro + recap burned onto the footage.
# ROBUST path: render the 4K overlay as a PNG SEQUENCE (no ProRes encode — the single-file 4K ProRes 4444
# encode OOM-crashed at ~frame 11k), then composite the frames straight onto the footage with NVENC on the 5090.
set -e
cd "C:/Users/J/Desktop/EditHyper"
FPS="${FPS:-30}"          # overlay fps; composited onto 60fps footage -> 4K/60 output. Overlays have no fast motion.
CQ="${CQ:-20}"            # NVENC quality (lower = better/bigger)
SRC="cards/sources/DoubleDoubleSignature/SignatureDoubleDouble.mp4"
FRAMES="cards/renders/dd-4k-frames"
OUT="cards/renders/SignatureDoubleDouble_comped.mp4"
RECAP_TAIL=7.5           # footage ends ~13:59; recap plays on black after it

echo "== 1/3 regenerate 4K overlay comp =="
SCALE=2 node scratch/gen-doubledouble-overlays.mjs

echo "== 2/3 render 4K overlay as PNG sequence (14 workers, no fragile ProRes encode) =="
rm -rf "$FRAMES"
( cd cards && npx --yes hyperframes@0.6.33 render -c compositions/final-DoubleDouble-4k.html -f "$FPS" --format png-sequence -o renders/dd-4k-frames --workers 14 --quality standard )

echo "== 3/3 composite PNG frames over footage on the 5090 (NVENC) + black/silence recap tail =="
ffmpeg -y -i "$SRC" -framerate "$FPS" -i "$FRAMES/frame_%06d.png" \
  -filter_complex "[0:v]tpad=stop_duration=${RECAP_TAIL}[bg];[1:v]fps=${FPS}[ov];[bg][ov]overlay=0:0:format=auto[outv];[0:a]apad=pad_dur=${RECAP_TAIL}[au]" \
  -map "[outv]" -map "[au]" \
  -c:v h264_nvenc -preset p7 -rc vbr -cq "$CQ" -b:v 0 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  "$OUT"

echo "DONE -> $OUT"
ls -la "$OUT"
echo "(PNG frames left in $FRAMES — delete after verifying the MP4)"
