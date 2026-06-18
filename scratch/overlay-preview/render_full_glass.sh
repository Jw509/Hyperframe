#!/usr/bin/env bash
# Full 4K60 liquid-glass overlay renders for both OverlayAdditions videos.
cd /c/Users/J/Desktop/EditHyper

render() {
  SLUG="$1"; FILE="$2"; DUR="$3"
  read PL PT PW PH < "scratch/overlay-preview/${SLUG}_glass_geom.txt"
  echo "=== Rendering ${SLUG} (${FILE}.mp4)  panel ${PW}x${PH} @ ${PL},${PT} ==="
  ffmpeg -y -hide_banner -loglevel error -stats \
    -i "cards/sources/OverlayAdditions/${FILE}.mp4" \
    -loop 1 -framerate 60 -i "scratch/overlay-preview/${SLUG}_glass_skin.png" \
    -loop 1 -framerate 60 -i "scratch/overlay-preview/${SLUG}_glass_mask.png" \
    -t "$DUR" \
    -filter_complex "[0:v]split=2[base][src];[src]crop=${PW}:${PH}:${PL}:${PT},gblur=sigma=26,eq=brightness=0.03:saturation=1.06,format=rgba[reg];[2:v]format=gray[m];[reg][m]alphamerge[glass];[glass]fade=t=in:st=0.5:d=0.5:alpha=1,fade=t=out:st=3.6:d=0.4:alpha=1[gf];[base][gf]overlay=${PL}:${PT}[bg];[1:v]format=rgba,fade=t=in:st=0.5:d=0.5:alpha=1,fade=t=out:st=3.6:d=0.4:alpha=1[skin];[bg][skin]overlay=0:0[outv]" \
    -map "[outv]" -map 0:a -c:a copy \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart \
    "cards/sources/OverlayAdditions/${FILE}_overlay.mp4"
  echo "=== ${SLUG} exit $? ==="
}

render bowman 2025BowmanChromeHobby 180
render mega   2025ChromeMegaFinalShort 118
echo "ALL_DONE"
