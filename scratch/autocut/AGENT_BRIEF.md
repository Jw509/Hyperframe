# Beat-picker brief — bowmanchrome2025 card-opening auto-cut

You are picking the cut beats for ONE time-window of a silent sports-card pack-opening video,
by LOOKING at extracted frame grids. Your output is a list of keep-segments in SOURCE seconds.

## The footage
Overhead, fixed-camera shot on a blue paisley mat. One person rips Bowman Chrome packs and shows
each card. No audio. A **reveal** = a card slides UP into frame (a thumb pushes it up from the
bottom), then is held high, centered, and readable for ~1 second before the next card.

Box = 20 packs × 4 cards. Cards are chrome (shiny), some have a big silver/white "B" logo design,
some are colored parallels/refractors, a few are autographs or inserts (the "hits").

## Your job
For your window only, output keep-segments `{start, end, note}` (SOURCE seconds), one per distinct
card/beat shown. Follow these rules, in priority order:

1. **IN-point = the SLIDE-START.** Set `start` at the frame where the card BEGINS moving up, so the
   upward slide plays after the cut. Do NOT start after the card is already settled (that "blinks").
   Read the grid carefully: find where the card is low/entering, that frame's time = start.
2. **Hold long enough.** `end` = ~0.9–1.3s after the card settles for normal cards; ~2s for a
   feature/insert/auto/"hit" or a pack-rip moment. Never less than ~0.8s on a real card.
3. **Show EVERY distinct card.** Do not skip any card that gets presented in your window.
4. **Keep continuous fan/swap windows FLOWING.** If several cards are swapped in-hand continuously
   (a fan, or cards shuffled while held), do NOT chop each settled card into its own beat — that
   blinks. Make ONE flowing segment that spans the continuous motion, cutting only on a true
   slide-start. Separate beats are for separate slide-up reveals.
5. **Skip dead time.** Do NOT make a segment where no card is on screen: empty mat, hands resting,
   sorting/stacking, reaching for the next pack, packaging-only. Those gaps get dropped.
6. **Stay inside your window.** Every `start` and `end` must be within [WIN_START, WIN_END].
   It's fine to have fewer beats if your window is mostly dead time or one long flowing sequence.

Report the RAW slide-start you observe — do NOT add any correction offset; that is applied later.

## How to see the footage
Run (from repo root) to make 5fps grids (each cell = 0.2s across, 1.2s down):

    node scratch/autocut/extract-grid.mjs cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 WIN_START WIN_DUR 5 6 6 scratch/autocut/grids/wID

It prints the exact cell→time mapping and the list of PNGs. Then READ each PNG with the Read tool
and study it. Cell time = WIN_START + (imageIndex*36 + row*6 + col)/5, where row 0 = top, col 0 = left.
If a beat is ambiguous, re-extract just that sub-range at higher fps (e.g. fps=10) to pin the slide-start.

## Output
Write your result to `scratch/autocut/beats/win_ID.json` (use the Write tool) as:

    { "window": ID, "start": WIN_START, "end": WIN_END,
      "segments": [ { "start": 0.0, "end": 0.0, "note": "what card / why" }, ... ] }

Then return that same JSON as your final message (strict JSON, no prose around it).
Sanity-check: segments sorted ascending, non-overlapping, each 0.8–2.5s (a flowing fan may be longer),
all within the window.
