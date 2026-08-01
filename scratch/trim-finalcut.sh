#!/usr/bin/env bash
# Remove 28.5s-29.5s (1.0s, 60 frames @60fps) from inside the Barnes X-Fractor hold. Re-encode 4K HEVC.
set -e
SRC="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025/BowmanHobbyRevampFinalCut.mp4"
OUT="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025/BowmanHobbyRevampFinalCut-trim.mp4"
ffmpeg -y -loglevel error -i "$SRC" -filter_complex "[0:v]trim=0:28.5,setpts=PTS-STARTPTS[a];[0:v]trim=start=29.5,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[out]" -map "[out]" -an -c:v hevc_nvenc -preset p5 -cq 19 -pix_fmt yuv420p -tag:v hvc1 "$OUT"
echo "--- trimmed duration ---"
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,duration -show_entries format=duration -of default=noprint_wrappers=1 "$OUT"
