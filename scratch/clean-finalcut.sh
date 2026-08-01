#!/usr/bin/env bash
# Composite the two case-hit banners onto a thumbnail frame (sealed-box opening shot).
set -e
CLEAN="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025/BowmanHobbyRevampFinalCut-clean.mp4"
O="C:/Users/J/Desktop/EditHyper/scratch/overlay-preview"
ffmpeg -y -loglevel error -ss 0.7 -i "$CLEAN" -frames:v 1 "$O/thumb_frame.png"
ffmpeg -y -loglevel error -i "$O/thumb_frame.png" -i "$O/casehit_v1_overlay.png" -filter_complex "overlay=0:0" -frames:v 1 "$O/casehit_v1_thumb.jpg"
ffmpeg -y -loglevel error -i "$O/thumb_frame.png" -i "$O/casehit_v2_overlay.png" -filter_complex "overlay=0:0" -frames:v 1 "$O/casehit_v2_thumb.jpg"
echo "wrote casehit_v1_thumb.jpg + casehit_v2_thumb.jpg"
