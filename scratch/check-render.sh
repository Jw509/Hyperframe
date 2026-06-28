#!/usr/bin/env bash
# READ-ONLY monitor for the DoubleDouble 4K final render. Reports progress / stall / done / failed.
# DONE is detected ONLY by the render script's final "DONE -> " marker (NOT mere file existence — ffmpeg
# writes the moov index last, so a growing partial file is not done).
LOG="C:/Users/J/AppData/Local/Temp/claude/C--Users-J-Desktop-EditHyper/60f8b1f5-a155-4f88-b55f-93495870ca3e/tasks/bywaklrdo.output"
OUT="C:/Users/J/Desktop/EditHyper/cards/renders/SignatureDoubleDouble_comped.mp4"
STATE="C:/Users/J/Desktop/EditHyper/scratch/dd-probe/.render_lastframe"
TOT=25410
[ -f "$LOG" ] || { echo "NO LOG yet (path: $LOG)"; exit 0; }
clean(){ sed 's/\x1b\[[0-9;]*m//g' "$LOG" | tr '\r' '\n'; }
gpu=$(nvidia-smi --query-gpu=utilization.gpu,utilization.encoder --format=csv,noheader 2>/dev/null | head -1)

if clean | grep -qE "DONE -> "; then
  echo "DONE — $OUT ($(du -h "$OUT" 2>/dev/null | cut -f1))"; exit 0
fi
if clean | grep -qiE "Render failed|Encoding failed|FATAL"; then
  echo "FAILED:"; clean | grep -iE "fail" | grep -ivE "studio_missing|no-fail" | tail -2; exit 0
fi
# composite stage (step 3): ffmpeg prints time=HH:MM:SS and there's no /25410 there
ctime=$(clean | grep -oE "time=[0-9:.]+" | tail -1 | sed 's/time=//')
if clean | grep -qE "== 3/3|compositing" || [ -n "$ctime" ]; then
  echo "compositing on GPU — ${ctime:-starting} of ~14:07 (GPU $gpu)"; exit 0
fi
# overlay capture stage (step 2)
cur=$(clean | grep -oE "frame [0-9]+/$TOT" | tail -1 | grep -oE "[0-9]+" | head -1); cur=${cur:-0}
prev=$(cat "$STATE" 2>/dev/null || echo 0); echo "$cur" > "$STATE"
if [ "$cur" -ge "$TOT" ]; then
  echo "overlay capture COMPLETE ($cur/$TOT) — writing frames / starting composite (GPU $gpu)"
elif [ "$cur" -gt 0 ] && [ "$cur" -le "$prev" ]; then
  echo "POSSIBLE STALL — frame $cur/$TOT unchanged since last check (prev $prev). GPU $gpu"
else
  echo "rendering overlay — frame $cur/$TOT ($((cur*100/TOT))%, +$((cur-prev)) since last). GPU $gpu"
fi
