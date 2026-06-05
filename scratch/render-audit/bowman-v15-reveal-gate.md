# Reveal Gate

Catalog: briefs/catalogs/bowmanchrome2025.reveal-reviewed-v15-render-notes.json
Cut: briefs/cuts/bowmanchrome2025.catalog-short-v15-render-notes.json
Report: scratch/render-audit/bowman-v15-reveal-gate.md

Status: PASS
Blockers: 0
Warnings: 37
Thresholds: minHold=1.2s, minSlide=0.55s, maxDefaultSlide=0.7s

| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| warning | P1C1->P1C2 | card-002 | Billy Edwards Jr. | uses default slide end instead of reviewed revealEndSeconds | transition=1:50.300, slideEnd=1:50.950, hold=1.30s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P1C3->P1C4 | card-004 | Jadan Baugh | uses default slide end instead of reviewed revealEndSeconds | transition=1:57.300, slideEnd=1:57.950, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C2->P2C3 | card-007 | Joe Royer | uses default slide end instead of reviewed revealEndSeconds | transition=2:46.837, slideEnd=2:47.487, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P2C3->P2C4 | card-008 | Aidan Chiles | uses default slide end instead of reviewed revealEndSeconds | transition=2:57.854, slideEnd=2:58.504, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P3C2->P3C3 | card-011 | Harrison Wallace III | uses default slide end instead of reviewed revealEndSeconds | transition=3:42.537, slideEnd=3:43.187, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P3C3->P3C4 | card-012 | Trey'Dez Green | uses default slide end instead of reviewed revealEndSeconds | transition=3:48.687, slideEnd=3:49.337, hold=1.80s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P4C1->P4C2 | card-014 | Pofele Ashlock | uses default slide end instead of reviewed revealEndSeconds | transition=4:14.687, slideEnd=4:15.337, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P4C3->P4C4 | card-016 | Mario Craver | uses default slide end instead of reviewed revealEndSeconds | transition=4:25.650, slideEnd=4:26.300, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P5C2->P5C3 | card-019 | Michael Van Buren Jr. | uses default slide end instead of reviewed revealEndSeconds | transition=5:05.537, slideEnd=5:06.187, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P5C3->P5C4 | card-020 | Jacory Barney Jr. | uses default slide end instead of reviewed revealEndSeconds | transition=5:13.854, slideEnd=5:14.504, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C1->P6C2 | card-022 | Katin Houser | uses default slide end instead of reviewed revealEndSeconds | transition=5:46.550, slideEnd=5:47.200, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P6C3->P6C4 | card-024 | Eli Holstein | uses default slide end instead of reviewed revealEndSeconds | transition=5:51.550, slideEnd=5:52.200, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P7C1->P7C2 | card-026 | Kyson Brown | uses default slide end instead of reviewed revealEndSeconds | transition=6:40.887, slideEnd=6:41.537, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P7C2->P7C3 | card-027 | Jamarion Wilcox | uses default slide end instead of reviewed revealEndSeconds | transition=6:52.671, slideEnd=6:53.321, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P8C1->P8C2 | card-030 | Anthony Hill Jr. | pre-slide hold is below 1.2s | transition=7:59.750, slideEnd=8:00.400, hold=0.75s, slide=0.65s | This is human-reviewed; recheck only if the render still feels rushed. |
| warning | P8C1->P8C2 | card-030 | Anthony Hill Jr. | uses default slide end instead of reviewed revealEndSeconds | transition=7:59.750, slideEnd=8:00.400, hold=0.75s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P8C2->P8C3 | card-031 | Marcel Reed | uses default slide end instead of reviewed revealEndSeconds | transition=8:03.250, slideEnd=8:03.900, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P8C3->P8C4 | card-032 | Michael Taaffe | uses default slide end instead of reviewed revealEndSeconds | transition=8:08.337, slideEnd=8:08.987, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P9C3->P9C4 | card-036 | Jykeem Williams | uses default slide end instead of reviewed revealEndSeconds | transition=9:58.704, slideEnd=9:59.354, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P11C1->P11C2 | card-042 | Quintrevion Wisner | uses default slide end instead of reviewed revealEndSeconds | transition=11:02.820, slideEnd=11:03.470, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P11C2->P11C3 | card-043 | Alonza Barnett III | uses default slide end instead of reviewed revealEndSeconds | transition=11:06.270, slideEnd=11:06.920, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P11C3->P11C4 | card-044 | Trey White | uses default slide end instead of reviewed revealEndSeconds | transition=11:10.787, slideEnd=11:11.437, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P12C2->P12C3 | card-047 | Jadan Baugh | uses default slide end instead of reviewed revealEndSeconds | transition=11:41.337, slideEnd=11:41.987, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P12C3->P12C4 | card-048 | Jay Haynes | uses default slide end instead of reviewed revealEndSeconds | transition=11:47.354, slideEnd=11:48.004, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P13C1->P13C2 | card-050 | Talyn Taylor | uses default slide end instead of reviewed revealEndSeconds | transition=12:23.787, slideEnd=12:24.437, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P14C2->P14C3 | card-055 | Jovantae Barnes | uses default slide end instead of reviewed revealEndSeconds | transition=13:27.237, slideEnd=13:27.887, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P15C1->P15C2 | card-058 | LaNorris Sellers | uses default slide end instead of reviewed revealEndSeconds | transition=14:40.720, slideEnd=14:41.370, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P15C2->P15C3 | card-059 | Anthony Hill Jr. | uses default slide end instead of reviewed revealEndSeconds | transition=14:43.904, slideEnd=14:44.554, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P15C3->P15C4 | card-060 | Josh Cameron | uses default slide end instead of reviewed revealEndSeconds | transition=14:46.521, slideEnd=14:47.171, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P16C3->P16C4 | card-064 | Darian Mensah | uses default slide end instead of reviewed revealEndSeconds | transition=15:41.854, slideEnd=15:42.504, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P17C1->P17C2 | card-066 | Haynes King | uses default slide end instead of reviewed revealEndSeconds | transition=16:34.550, slideEnd=16:35.200, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P17C2->P17C3 | card-067 | Luke Altmyer | uses default slide end instead of reviewed revealEndSeconds | transition=16:37.550, slideEnd=16:38.200, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P17C3->P17C4 | card-068 | Boubacar Traore | uses default slide end instead of reviewed revealEndSeconds | transition=16:41.770, slideEnd=16:42.420, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P19C1->P19C2 | card-074 | Jerrick Gibson | pre-slide hold is below 1.2s | transition=18:29.800, slideEnd=18:30.800, hold=0.80s, slide=1.00s | This is human-reviewed; recheck only if the render still feels rushed. |
| warning | P19C3->P19C4 | card-076 | Houston Clement | uses default slide end instead of reviewed revealEndSeconds | transition=18:39.837, slideEnd=18:40.487, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P20C1->P20C2 | card-078 | Harrison Wallace III | uses default slide end instead of reviewed revealEndSeconds | transition=19:14.154, slideEnd=19:14.804, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
| warning | P20C3->P20C4 | card-080 | Jaden Nixon | uses default slide end instead of reviewed revealEndSeconds | transition=19:37.521, slideEnd=19:38.171, hold=1.50s, slide=0.65s | If this transition snaps, add revealEndSeconds for the next card. |
