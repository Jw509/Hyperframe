#!/usr/bin/env bash
# Full 4K60 RED liquid-glass overlay renders for both OverlayAdditions videos.
# Timing: full opacity from t=0 (immediate), fade out 3.6->4.0s (4s total).
# -t bound to EXACT source duration to avoid a padded frozen tail.
cd /c/Users/J/Desktop/EditHyper

render() {
  SLUG="$1"; FILE="$2"; DUR="$3"
  read PL PT PW PH < "scratch/overlay-preview/${SLUG}_red_geom.txt"
  echo "=== Rendering ${SLUG} (${FILE}.mp4)  panel ${PW}x${PH} @ ${PL},${PT}  dur ${DUR} ==="
  ffmpeg -y -hide_banner -loglevel error -stats \
    -i "cards/sources/OverlayAdditions/${FILE}.mp4" \
    -loop 1 -framerate 60 -i "scratch/overlay-preview/${SLUG}_red_skin.png" \
    -loop 1 -framerate 60 -i "scratch/overlay-preview/${SLUG}_red_mask.png" \
    -t "$DUR" \
    -filter_complex "[0:v]split=2[base][src];[src]crop=${PW}:${PH}:${PL}:${PT},gblur=sigma=26,eq=brightness=0.03:saturation=1.06,format=rgba[reg];[2:v]format=gray[m];[reg][m]alphamerge[glass];[glass]fade=t=out:st=3.6:d=0.4:alpha=1[gf];[base][gf]overlay=${PL}:${PT}[bg];[1:v]format=rgba,fade=t=out:st=3.6:d=0.4:alpha=1[skin];[bg][skin]overlay=0:0[outv]" \
    -map "[outv]" -map 0:a -c:a copy \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart \
    "cards/sources/OverlayAdditions/${FILE}_overlay.mp4"
  echo "=== ${SLUG} exit $? ==="
}

render bowman 2025BowmanChromeHobby 179.114667
render mega   2025ChromeMegaFinalShort 117.546667
echo "ALL_DONE"
