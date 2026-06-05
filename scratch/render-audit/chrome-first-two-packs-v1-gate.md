# Reveal Gate

Catalog: briefs/catalogs/chrome.first-two-packs.auto-test.json
Cut: briefs/cuts/chrome.first-two-packs.auto-test-v1.json
Report: scratch/render-audit/chrome-first-two-packs-v1-gate.md

Status: BLOCK
Blockers: 3
Warnings: 8
Thresholds: minHold=1.2s, minSlide=0.55s, maxDefaultSlide=0.7s

| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| blocker | P1C3->P1C4 | card-004 | Davante Adams | same-pack reveal start is not reviewed or detector-accepted | transition=2:25.780, slideEnd=2:26.430, hold=1.50s, slide=0.65s | Run reveal detection/review, or apply a set_seconds review for this card. |
| blocker | P2C1->P2C2 | card-008 | James Cook | pre-slide hold is below 1.2s | transition=3:57.204, slideEnd=4:02.000, hold=0.00s, slide=4.80s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P2C2->P2C3 | card-009 | Art Monk | reveal start came from fallback timing and has not been visually reviewed | transition=4:04.550, slideEnd=4:05.200, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| warning | P1C1->P1C2 | card-002 | Tuli Tuipulotu | uses default slide end instead of reviewed revealEndSeconds | transition=2:04.920, slideEnd=2:05.570, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P1C2->P1C3 | card-003 | Tre Harris III | uses default slide end instead of reviewed revealEndSeconds | transition=2:21.670, slideEnd=2:22.320, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P1C4->P1C5 | card-005 | Jakobi Meyers | uses default slide end instead of reviewed revealEndSeconds | transition=2:35.837, slideEnd=2:36.487, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P1C5->P1C6 | card-006 | Dalton Schultz | uses default slide end instead of reviewed revealEndSeconds | transition=2:45.654, slideEnd=2:46.304, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C2->P2C3 | card-009 | Art Monk | uses default slide end instead of reviewed revealEndSeconds | transition=4:04.550, slideEnd=4:05.200, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C3->P2C4 | card-010 | Patrick Queen | uses default slide end instead of reviewed revealEndSeconds | transition=4:09.804, slideEnd=4:10.454, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C4->P2C5 | card-011 | Deone Walker | uses default slide end instead of reviewed revealEndSeconds | transition=4:13.320, slideEnd=4:13.970, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C5->P2C6 | card-012 | Sam LaPorta | uses default slide end instead of reviewed revealEndSeconds | transition=4:17.470, slideEnd=4:18.120, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
