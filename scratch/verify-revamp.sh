#!/usr/bin/env bash
# Verify the SFX mix: audio stream present, levels sane, and event onsets at expected times.
set -e
OUT="C:/Users/J/Desktop/EditHyper/cards/renders/final-bowmanhobby-finalcut-clean-sfx.mp4"
echo "--- audio stream ---"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels -show_entries format=duration -of default=noprint_wrappers=1 "$OUT"
echo "--- levels (max near limiter, mean low = mostly silence w/ SFX) ---"
ffmpeg -hide_banner -i "$OUT" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
echo "--- SFX onsets (sound resumes after silence) ---"
ffmpeg -hide_banner -nostats -i "$OUT" -af silencedetect=n=-45dB:d=0.25 -f null - 2>&1 | grep -oE "silence_end: [0-9.]+" | head -50
