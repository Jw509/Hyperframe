#!/usr/bin/env bash
# Rename rattleshort eBay comp screenshots to slugged filenames (time order in the cut).
set -e
cd "$(dirname "$0")/../cards/comps/rattleshort"
mv "Screenshot 2026-07-09 171611.png" 01-tyreek-hill.png
mv "Screenshot 2026-07-09 171634.png" 02-nico-collins.png
mv "Screenshot 2026-07-09 171734.png" 03-harold-fannin.png
mv "Screenshot 2026-07-09 171804.png" 04-josh-conerly.png
mv "Screenshot 2026-07-09 171837.png" 05-trevor-lawrence.png
mv "Screenshot 2026-07-09 171954.png" 06-paramount-pairings.png
mv "Screenshot 2026-07-09 172022.png" 07-david-njoku.png
mv "Screenshot 2026-07-09 172057.png" 08-tate-ratledge.png
mv "Screenshot 2026-07-09 172220.png" 09-jaxon-smith-njigba.png
mv "Screenshot 2026-07-09 172414.png" 10-breece-hall.png
mv "Screenshot 2026-07-09 172435.png" 11-tyler-warren.png
ls -1
