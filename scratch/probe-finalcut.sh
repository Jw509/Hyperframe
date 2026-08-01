#!/usr/bin/env bash
set -e
V="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025/BowmanHobbyRevampFinalCut.mp4"
O="C:/Users/J/AppData/Local/Temp/claude/C--Users-J-Desktop-EditHyper/54c6005d-af11-44dc-b91d-dfc4d329bbee/scratchpad"
echo "--- video ---"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration -of default=noprint_wrappers=1 "$V"
echo "--- audio ---"
ffmpeg -hide_banner -i "$V" -af volumedetect -f null - 2>&1 | grep -iE "mean_volume|max_volume"
echo "--- sheets ---"
rm -f "$O"/fc_*.jpg
ffmpeg -y -loglevel error -i "$V" -vf "fps=2,scale=360:640,drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='%{pts\:hms}':x=6:y=6:fontsize=38:fontcolor=yellow:box=1:boxcolor=black@0.85,tile=3x6" "$O/fc_%02d.jpg"
ls "$O"/fc_*.jpg | wc -l
