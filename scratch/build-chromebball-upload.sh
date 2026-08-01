#!/usr/bin/env bash
# Upload-safe H.264 copies of both cuts, at 4K and 1080p.
# Usage: bash scratch/build-chromebball-upload.sh [4k|1080|both]
#
# Why these exist: the masters are HEVC, and that broke two things.
#   1. iOS "Couldn't Save"  -> NVENC tags HEVC as hev1; Apple only accepts hvc1. Fixed on the
#      masters themselves with -tag:v hvc1 (lossless remux).
#   2. Instagram web "could not be read by your browser" -> IG's uploader decodes the file IN the
#      browser, and Chrome on Windows cannot decode HEVC at all. No tag fixes that; only a codec
#      change does. H.264 decodes everywhere.
#
# RESOLUTION IS A SEPARATE CHOICE FROM CODEC — H.264 does 4K fine:
#   4k    - full 2160x3840. Use for YouTube, which keeps the extra detail in its transcode.
#   1080  - 2160x3840 downscaled (no crop; both are 9:16). Reels/TikTok re-encode to ~1080p
#           anyway, so this uploads ~3.5x faster for the same delivered quality there.
# +faststart puts the moov atom first so a browser can read the header without the whole file.
# Bitrate is CAPPED, not quality-targeted: -cq with -b:v 0 chased the glittery chrome background
# to ~23 Mbps at 1080p (302 MB), far past anything a platform keeps.
set -u
cd "$(dirname "$0")/.." || exit 1
MODE="${1:-both}"
O=cards/renders

enc () {  # variant label scale bitrate maxrate bufsize
  echo "=== $1 $2 ==="
  ffmpeg -y -hide_banner -loglevel error -stats -i "$O/chromebball_final_$1.mp4" \
    -vf "scale=$3:flags=lanczos" \
    -c:v h264_nvenc -preset p5 -rc vbr -b:v "$4" -maxrate "$5" -bufsize "$6" \
    -profile:v high -pix_fmt yuv420p \
    -movflags +faststart -c:a aac -b:a 192k \
    "$O/chromebball_upload_$1_$2.mp4"
}

for v in tiktok youtube; do
  [ "$MODE" = "4k"   ] || [ "$MODE" = "both" ] && enc "$v" 4k   2160:3840 32M 40M 60M
  [ "$MODE" = "1080" ] || [ "$MODE" = "both" ] && enc "$v" 1080 1080:1920 10M 14M 20M
done
ls -la "$O"/chromebball_upload_*.mp4
