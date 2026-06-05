# Card catalogue brief — bowmanchrome2025

Catalogue every CARD shown in your time-window of a silent Bowman Chrome pack-opening video.
Output a list of each card's NAME and the TIMESTAMP it is shown. This is ground-truth identity
data for later cutting — accuracy of NAME + TIME matters more than anything else.

## The footage
Overhead fixed camera, blue paisley mat, 60fps, silent. Host opens foil packs and shows each card
by sliding it up with the thumb and holding it centered. Cards are Bowman Chrome football: a player
photo, team logo bottom-left, and a NAMEPLATE (player name + school) at the bottom-center of the card.
Some are colored parallels/refractors (shiny/sparkle), inserts (e.g. "GLORY", "MS 5"), or autographs
(on-card signature). Box = 20 packs x 4 cards.

## How to READ a card (critical — this is the whole job)
Thumbnail grids are TOO SMALL to read nameplates. Use them only to FIND moments where a card is held
still and flat. To READ the name, extract a FULL-RES nameplate crop:

    ffmpeg -y -hide_banner -loglevel error -ss <TIME> -i cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 -frames:v 1 -vf "crop=900:1150:90:480,scale=380:-1" scratch/autocut/catalog/w<ID>_<TIME>.png

Then READ that PNG with the Read tool. The nameplate (name + school) is near the bottom of the card.
If the crop misses it (card held high/low), adjust the crop Y offset (the `480`) and re-extract.

## Method
1. Coarse grid to find held-card moments:
   node scratch/autocut/extract-grid.mjs cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 WIN_START WIN_DUR 4 3 6 scratch/autocut/catalog/grid_w<ID>
   Read each grid PNG; note the ~timestamps where a DISTINCT card is held flat & readable.
2. For each distinct card, full-res nameplate crop at its clearest held moment, Read it, record the name.
   - Watch for the SAME card shown twice (a "back-over"/re-show) — that's ONE card, not two. Note the best (clearest, earliest-solo) timestamp.
   - Watch for a card revealed BEHIND another during a slide (e.g. a card sliding up behind the held one) — that's a distinct card; catalogue it too.
3. Identify the pack structure if visible: a foil-tear = a pack boundary. Expect ~4 cards per pack.

## Output
Write scratch/autocut/catalog/cat_w<ID>.json with the Write tool:
  {"window":ID,"start":WIN_START,"end":WIN_END,"cards":[
     {"name":"First Last","school":"School","time":<best held timestamp, sec>,"note":"parallel/insert/auto/base, refractor color, or 'unreadable'"},
     ...
  ]}
Return that JSON as your final message (strict JSON only). For any nameplate you genuinely cannot read,
set name to "UNREADABLE" and note what you can see (uniform color, team, position) so it can be resolved.
Do NOT guess a name you can't read — mark it UNREADABLE.
