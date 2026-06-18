# Reframe the intro "packs spread" clip (output 7-10s) to center the box, then splice into the final.
# Re-crops from the LANDSCAPE source (74-77s) at crop offset 1069 (vs the portrait source's too-far-left baked crop).
L="cards/sources/bowmanchrome2025/bowmanchrome2025-1080p.mp4"
ffmpeg -y -hide_banner -loglevel error -ss 74 -t 3 -i "$L" -vf "scale=-2:1920,crop=1080:1920:1069:0,setsar=1,fps=60" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -an scratch/reframe/packs_centered.mp4
F="cards/renders/bowmanchrome2025/bowmanchrome2025-v18-sfx.mp4"
ffmpeg -y -hide_banner -loglevel error -i "$F" -i scratch/reframe/packs_centered.mp4 -filter_complex "[0:v]trim=0:7,setpts=PTS-STARTPTS[v1];[1:v]setpts=PTS-STARTPTS[v2];[0:v]trim=10,setpts=PTS-STARTPTS[v3];[v1][v2][v3]concat=n=3:v=1[vout]" -map "[vout]" -map 0:a -c:a copy -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 "${F%.mp4}-reframed.mp4"
