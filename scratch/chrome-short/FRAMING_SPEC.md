# Chrome Mega Box (CutdownChromeMegaBox) — framing spec

Source: `cards/sources/chrome/CutdownChromeMegaBox.mp4` (3840x2160, 60fps, 133.27s) — a NEW chrome break (different cards than the old chrome-portrait pipeline; do not reuse that calibration).

## Method (per user, after many iterations)
- Output **1080x1920**, no upscaling (a 9:16 slice of 4K landscape is ~1215px native; downscale, never upscale).
- **Per-pack static center** (cx AND cy). The host moves cards around, but a pack is *generally* in one spot, so switch the center between packs (reposition smoothly at the pack-open, masked by the rip). A mid-pack cut to recenter an outlier card is acceptable.
- Card should sit in the user's "red-line box": centered horizontally, vertical center ~54-58%, card ~64-68% of frame width. Reference: the user's annotated Cam Ward frame.
- NO per-frame tracking (nauseating), NO per-card snapping with wrong centers, NO per-reveal pan-y. Don't change the user's cut.
- Fans: full-height (widest 9:16) center crop so the spread shows; the wider per-pack crop already helps.

## Why static-per-pack (not single static like bowman/select)
bowman/select/chrome-portrait hosts held every card in the SAME spot -> one static crop worked. THIS host moves each card (P1 diag: Tillman high/small, McMillan low). So per-pack (and occasional mid-pack) centering is required.

## Current calibration (v7) — crop 1126x2000 (card ~68%), per-pack (cx,cy), TY=0.54
Pack boundaries (user confirmed "close enough"): intro 0-5, P1 5-25, P2 25-40, P3 40-56, P4 56-71, P5 71-89, P6 89-108, P7 108-133.

| Pack | cx | cy | note |
|---|---|---|---|
| intro/box | 1400 | 1050 | center the case (held left) |
| P1 | 1800 | 1100 | |
| P2 | 1980 | 950 | held high+right; still a bit high at H=2000 (clamped) |
| P3 | 1800 | 1050 | |
| P4 | 1800 | 1080 | |
| P5 | 1800 | 1120 | |
| P6 | 1800 | 1080 | |
| P7 | 2010 | 1200 | held low+right |

Build: `node scratch/chrome-short/reframe_static.mjs 4k <out>` (reads the keyframes inline). Renders to `cards/renders/chrome/framing-test-v7-perpack-vert.mp4`.

## Overlay placement (this video — user-tracked source `Choopedownportrait tracked2.mp4`, 2160x3840)
- Source for overlays: `cards/sources/chrome/usertracked-h264.mp4` (h264 transcode of the user's HEVC, for Chrome).
- Composition: `cards/compositions/final-chrome.html`, rendered `--resolution portrait-4k --fps 60 --quality high`.
- The user's cards are held CENTER-LEFT and LARGE (fill the frame), so the select-style right-mid sale card CLIPS the card's top-right corner. Correct placement for THIS framing: **comp chip TOP-RIGHT CORNER** (`right:6px; top:132px; width:202px` in the 1080 composition), which lands in the clear blue mat right of the center-left card. Tracker top-left, recap center.
- Lesson: comp placement depends on how big/where the host holds cards. Big center-left cards => top-right corner. Smaller/centered cards (select/bowman) => right-mid. Verify with a footprint mockup on several comped cards before rendering.
- Puka data fix: there are TWO Puka Nacua cards — the comped **Power Players green insert ($1.65) is at ~0:59 (P4)**; the ~1:38 gold one is a common. (comp screenshot `Screenshot 2026-06-03 133241.png`.)
- Data corrections from cataloguing: "Josh Downs" (not Josiah), "Donovan Edwards" (the P5 Jets #40 common).

## Open items
- P2 vertical still slightly high (host holds that pack high; would need a tighter crop just for P2).
- User to confirm v7 framing, then overlays: comp chip (right margin), running total tracker (top-left), end recap (cost/value/profit-loss + ROI), Shough comp chip pop at 1:07.
- Overlay value data: `scratch/chrome-short/comps.json` (23 comps, total $43.69); box cost $69.99; ROI -37.6%.
