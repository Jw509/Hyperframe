# Reveal Gate

Catalog: briefs/catalogs/chrome.portrait-reveal-calibrated-v5.json
Cut: briefs/cuts/chrome.portrait-calibrated-v5.json
Report: scratch/render-audit/chrome-portrait-calibrated-v5-full-gate.md

Status: PASS
Blockers: 0
Warnings: 1
Thresholds: minHold=1.2s, minSlide=0.5s, maxDefaultSlide=0.7s

| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| warning | P5C1->P5C2 | card-026 | Bijan Robinson | pre-slide hold is below 1.2s | transition=9:00.925, slideEnd=9:01.800, hold=0.93s, slide=0.88s | This is human-reviewed; recheck only if the render still feels rushed. |
