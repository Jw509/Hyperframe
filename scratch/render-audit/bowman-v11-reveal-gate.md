# Reveal Gate

Catalog: briefs/catalogs/bowmanchrome2025.reveal-reviewed-v11-user-notes.json
Cut: briefs/cuts/bowmanchrome2025.catalog-short-v11-user-notes.json
Report: scratch/render-audit/bowman-v11-reveal-gate.md

Status: BLOCK
Blockers: 16
Warnings: 0
Thresholds: minHold=1.2s, minSlide=0.55s, maxDefaultSlide=0.7s

| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| blocker | P6C2->P6C3 | card-023 | Luke Altmyer | pre-slide hold is below 1.2s | transition=5:47.300, slideEnd=5:47.950, hold=0.10s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P7C3->P7C4 | card-028 | Adrian Norton | same-pack reveal start is not reviewed or detector-accepted | transition=6:57.780, slideEnd=6:58.430, hold=1.50s, slide=0.65s | Run reveal detection/review, or apply a set_seconds review for this card. |
| blocker | P8C1->P8C2 | card-030 | Anthony Hill Jr. | pre-slide hold is below 1.2s | transition=7:59.750, slideEnd=8:00.400, hold=0.75s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P9C1->P9C2 | card-034 | Troy Stellato | reveal start came from fallback timing and has not been visually reviewed | transition=9:42.780, slideEnd=9:43.430, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| blocker | P9C2->P9C3 | card-035 | KC Concepcion | pre-slide hold is below 1.2s | transition=9:43.950, slideEnd=9:44.600, hold=0.52s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P10C1->P10C2 | card-038 | Kaidon Salter | reveal start came from fallback timing and has not been visually reviewed | transition=10:31.780, slideEnd=10:32.430, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| blocker | P10C2->P10C3 | card-039 | Behren Morton | pre-slide hold is below 1.2s | transition=10:33.337, slideEnd=10:33.987, hold=0.91s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P10C3->P10C4 | card-040 | Danny O'Neil | same-pack reveal start is not reviewed or detector-accepted | transition=10:38.780, slideEnd=10:39.430, hold=1.50s, slide=0.65s | Run reveal detection/review, or apply a set_seconds review for this card. |
| blocker | P12C1->P12C2 | card-046 | LeShon Williams | reveal start came from fallback timing and has not been visually reviewed | transition=11:38.780, slideEnd=11:39.430, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| blocker | P13C3->P13C4 | card-052 | Taylor Tatum | reveal start came from fallback timing and has not been visually reviewed | transition=12:38.780, slideEnd=12:39.430, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| blocker | P16C2->P16C3 | card-063 | Quintrevion Wisner | pre-slide hold is below 1.2s | transition=15:29.804, slideEnd=15:30.454, hold=0.67s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P18C1->P18C2 | card-070 | Malik Rutherford | reveal start came from fallback timing and has not been visually reviewed | transition=17:26.780, slideEnd=17:27.430, hold=0.78s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
| blocker | P18C1->P18C2 | card-070 | Malik Rutherford | pre-slide hold is below 1.2s | transition=17:26.780, slideEnd=17:27.430, hold=0.78s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P18C2->P18C3 | card-071 | Jayden Virgin-Morgan | same-pack reveal start is not reviewed or detector-accepted | transition=17:33.780, slideEnd=17:34.430, hold=1.50s, slide=0.65s | Run reveal detection/review, or apply a set_seconds review for this card. |
| blocker | P19C1->P19C2 | card-074 | Jerrick Gibson | pre-slide hold is below 1.2s | transition=18:29.550, slideEnd=18:30.200, hold=0.55s, slide=0.65s | Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional. |
| blocker | P19C2->P19C3 | card-075 | Gunner Stockton | reveal start came from fallback timing and has not been visually reviewed | transition=18:32.780, slideEnd=18:33.430, hold=1.50s, slide=0.65s | Review this transition visually and store set_seconds if the fallback is wrong. |
