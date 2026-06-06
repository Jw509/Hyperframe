# Card catalogue brief — Topps Chrome Mega Box short

You are cataloguing a trading-card reveal video. Work from project root `C:\Users\J\Desktop\EditHyper`.

**Source video (4K):** `cards/sources/chrome/CutdownChromeMegaBox.mp4` — 3840×2160, 60fps, 133.3s. A hand holds ONE card at a time, centered-ish over a blue patterned mat, then slides it away and shows the next. A small stack of remaining cards is sometimes parked in a corner (usually top-right) — IGNORE that stack; the FEATURED card is the large one held near the center being shown to camera.

**The video shows these 23 known cards** (read `scratch/chrome-short/comps.json` for the full list with id, player, team, parallel, price, and a `visual` description). Your job is to match each held moment to ONE of these 23 by id. The featured card is identified DEFINITIVELY by the player nameplate text at the bottom of the card — read it; do not guess from jersey alone when two cards could be confused (e.g. two Broncos, two Browns, two Jets).

## Method for each held segment (you will be given a list of segments with start/end/mid times)
1. Extract a locator frame at the segment midpoint:
   `ffmpeg -y -ss <mid> -i "cards/sources/chrome/CutdownChromeMegaBox.mp4" -frames:v 1 -vf "scale=1280:-1" scratch/chrome-short/work/loc_<mid>.png`
   Read it. Find the featured card; estimate its bounding box as fractions of frame W(3840)×H(2160).
2. Extract a tight full-res crop of the card to READ THE NAMEPLATE and see the parallel pattern:
   `ffmpeg -y -ss <mid> -i "cards/sources/chrome/CutdownChromeMegaBox.mp4" -frames:v 1 -vf "crop=<cw>:<ch>:<cx0>:<cy0>,scale=640:-1" scratch/chrome-short/work/np_<mid>.png`
   where cx0,cy0,cw,ch (in 4K px) tightly bound the card. Read player name + card # if visible; note parallel (Refractor=rainbow sheen; X-Fractor=checkerboard; Power Players/Future Stars=colored insert; Base=plain silver chrome; Pink X-Fractor=pink checkerboard; Pulsar=swirl).
3. Match to a comps.json id. If the nameplate is unreadable AND visual is ambiguous, set id=null and explain.
4. Record the card CENTER in 4K coords: cx = round(fracX_center*3840), cy = round(fracY_center*2160); plus cardW,cardH in px (the card's pixel size in the 4K frame).

## Merging into shots
Consecutive segments showing the SAME card id are ONE shot. Output one shot per distinct card occurrence with:
- start = first segment's start, end = last segment's end
- the card id/player/parallel/price
- center cx,cy and cardW,cardH from the CLEAREST (longest/most-centered) segment of that shot
- confidence: "high" (nameplate read) / "med" (visual only) / "low"
- note: anything odd (card off-center, partially turned, motion blur, a different card than the 23, etc.)

If a segment shows a card NOT in the 23 (e.g. an extra base card), still report it with id=null, your best player read, and price=0.

## Output
Create the dir first: `mkdir -p scratch/chrome-short/work`.
Return ONLY a JSON array of shot objects (no prose), e.g.:
[{"id":2,"player":"Breece Hall","parallel":"Refractor","price":1.69,"start":13.52,"end":16.17,"cx":1574,"cy":972,"cardW":845,"cardH":1180,"confidence":"high","note":""}]
Order by start time. Coordinates must be integers in 0..3840 / 0..2160.
