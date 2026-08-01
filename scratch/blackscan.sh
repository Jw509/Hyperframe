#!/usr/bin/env bash
# Scan for fully-black frames (editing gaps). d=0.015 catches even a single 60fps frame.
set -e
DIR="C:/Users/J/Desktop/EditHyper/cards/sources/bowmanchrome2025"
echo "=== ORIGINAL BowmanHobbyRevampFinalCut.mp4 (your Resolve timeline) ==="
ffmpeg -hide_banner -nostats -i "$DIR/BowmanHobbyRevampFinalCut.mp4" -vf blackdetect=d=0.015:pix_th=0.10 -an -f null - 2>&1 | grep black_start || echo "no black frames"
echo "=== TRIMMED BowmanHobbyRevampFinalCut-trim.mp4 (deliverable base) ==="
ffmpeg -hide_banner -nostats -i "$DIR/BowmanHobbyRevampFinalCut-trim.mp4" -vf blackdetect=d=0.015:pix_th=0.10 -an -f null - 2>&1 | grep black_start || echo "no black frames"
