#!/usr/bin/env bash
# SFX prep: verify sound assets + measure peaks + extract pack-change candidate frames from the clean cut.
set -e
SND="C:/Users/J/Desktop/EditHyper/cards/sounds"
CLEAN="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025/BowmanHobbyRevampFinalCut-clean.mp4"
O="C:/Users/J/AppData/Local/Temp/claude/C--Users-J-Desktop-EditHyper/54c6005d-af11-44dc-b91d-dfc4d329bbee/scratchpad"
echo "=== sounds dir ==="
ls "$SND"
echo "=== asset peaks ==="
for f in cardswap.m4a cardmoneysound.m4a packcostsound.m4a; do
  echo -n "$f => "
  ffmpeg -hide_banner -i "$SND/$f" -af volumedetect -f null - 2>&1 | grep max_volume
done
echo "=== extract pack-change candidates (idx -> time) ==="
rm -f "$O"/pk_*.jpg
i=0
for t in 5.0 11.0 17.5 24.0 31.45 46.43 56.93 74.93 80.43 94.43 106.90 113.40 122.90 139.90; do
  printf 'pk_%02d = %ss\n' "$i" "$t"
  ffmpeg -y -loglevel error -ss "$t" -i "$CLEAN" -frames:v 1 "$O/pk_$(printf '%02d' $i).jpg"
  i=$((i+1))
done
ffmpeg -y -loglevel error -i "$O/pk_%02d.jpg" -vf "scale=300:533,tile=7x2" "$O/pksheet.jpg"
echo "wrote pksheet.jpg"
