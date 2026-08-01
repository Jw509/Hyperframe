#!/usr/bin/env bash
# Render the bowmanhobby comp overlay. Args: $1=composition html (in compositions/), $2=output mp4 (in renders/)
# Runs from the cards/ project dir. 1080p by default (comp authored at S=1); pass a 4k html for true 4K.
set -e
cd "C:/Users/J/Desktop/EditHyper/cards"
npx --yes hyperframes@0.6.33 render . -c "compositions/$1" -o "renders/$2" -q high --fps 60 --gpu --workers 14
