#!/usr/bin/env bash
# Composite each red hook banner over a hero frame from the finished video -> upload-ready
# thumbnails. Full 2160x3840 plus a 1080x1920 copy (smaller file for upload dialogs).
#   youtube -> pack-in-hand at 6.0s   ("cards to buy" = product forward)
#   tiktok  -> Stephon Castle money card at 25.0s — the instant it lands, BEFORE its comp chip
#              pops at 25.07. The chip lives at y160-891 and the banner at y712-1245, so any
#              frame with the chip up has it sliced in half by the banner.
set -u
cd "$(dirname "$0")/.." || exit 1
F=cards/renders/chromebball_final_captioned_sfx.mp4
O=cards/renders

thumb () {  # variant frame_time
  ffmpeg -y -hide_banner -loglevel error -ss "$2" -i "$F" \
    -i "scratch/overlay-preview/chromebball_hook_$1.png" \
    -filter_complex "[0:v][1:v]overlay=0:0[v]" -map "[v]" -frames:v 1 \
    "$O/chromebball_thumb_$1.png"
  ffmpeg -y -hide_banner -loglevel error -i "$O/chromebball_thumb_$1.png" \
    -vf scale=1080:1920 "$O/chromebball_thumb_${1}_1080.png"
  echo "  $O/chromebball_thumb_$1.png  (frame @ ${2}s)"
}
thumb youtube 6.0
thumb tiktok 25.0
ls -la "$O"/chromebball_thumb_*.png
