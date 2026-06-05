# Reveal Gate

Catalog: briefs/catalogs/chrome.portrait-reveal-calibrated-v2.json
Cut: briefs/cuts/chrome.portrait-calibrated-v2.json
Report: scratch/render-audit/chrome-portrait-calibrated-v2-gate-minslide050.md

Status: PASS
Blockers: 0
Warnings: 17
Thresholds: minHold=1.2s, minSlide=0.5s, maxDefaultSlide=0.7s

| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| warning | P3C1->P3C2 | card-014 | Josh Downs | uses default slide end instead of reviewed revealEndSeconds | transition=5:30.654, slideEnd=5:31.304, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P3C2->P3C3 | card-015 | CeeDee Lamb | uses default slide end instead of reviewed revealEndSeconds | transition=5:35.337, slideEnd=5:35.987, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P3C3->P3C4 | card-016 | Theo Johnson | uses default slide end instead of reviewed revealEndSeconds | transition=5:43.921, slideEnd=5:44.571, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P3C5->P3C6 | card-018 | Amon-Ra St. Brown | uses default slide end instead of reviewed revealEndSeconds | transition=6:11.654, slideEnd=6:12.304, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P4C2->P4C3 | card-021 | Drake Maye | uses default slide end instead of reviewed revealEndSeconds | transition=7:54.137, slideEnd=7:54.787, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P4C3->P4C4 | card-022 | Kenny Clark | uses default slide end instead of reviewed revealEndSeconds | transition=8:03.320, slideEnd=8:03.970, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P4C4->P4C5 | card-023 | Danny Stutsman | pre-slide hold is below 1.2s | transition=8:03.800, slideEnd=8:04.925, hold=0.00s, slide=1.13s | This is human-reviewed; recheck only if the render still feels rushed. |
| warning | P5C1->P5C2 | card-026 | Bijan Robinson | pre-slide hold is below 1.2s | transition=9:00.925, slideEnd=9:01.800, hold=0.93s, slide=0.88s | This is human-reviewed; recheck only if the render still feels rushed. |
| warning | P5C3->P5C4 | card-028 | Gunnar Helm | uses default slide end instead of reviewed revealEndSeconds | transition=9:09.487, slideEnd=9:10.137, hold=1.49s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P5C4->P5C5 | card-029 | Princely Umanmielen | uses default slide end instead of reviewed revealEndSeconds | transition=9:16.204, slideEnd=9:16.854, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P5C5->P5C6 | card-030 | T.J. Hockenson | uses default slide end instead of reviewed revealEndSeconds | transition=9:27.988, slideEnd=9:28.638, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C1->P6C2 | card-032 | Jake Browning | uses default slide end instead of reviewed revealEndSeconds | transition=10:24.454, slideEnd=10:25.104, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C3->P6C4 | card-034 | Leonard Floyd | uses default slide end instead of reviewed revealEndSeconds | transition=10:33.970, slideEnd=10:34.620, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C4->P6C5 | card-035 | Xavier Watts | uses default slide end instead of reviewed revealEndSeconds | transition=10:37.887, slideEnd=10:38.537, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C5->P6C6 | card-036 | Matt Gay | uses default slide end instead of reviewed revealEndSeconds | transition=10:40.504, slideEnd=10:41.154, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P7C2->P7C3 | card-039 | Ashton Jeanty | uses default slide end instead of reviewed revealEndSeconds | transition=11:28.404, slideEnd=11:29.054, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P7C4->P7C5 | card-041 | Seth Henigan | uses default slide end instead of reviewed revealEndSeconds | transition=11:43.371, slideEnd=11:44.021, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
