# Beat-picker brief v2 — APPROVED cutting method (bowmanchrome2025)

You cut the card-reveals for ONE pack-window of a silent Bowman Chrome pack-opening video.
Output keep-segments in SOURCE seconds. The user approved this exact method as "perfect" — follow it precisely.

## The footage
Overhead fixed camera, blue paisley mat. Host rips a foil pack, fans the cards out, then shows each
card by sliding it up with the thumb. Box = 20 packs x 4 cards. Source is 60fps, silent.
Reference for the slide look: `references/mosaic25retail.mp4` (card held -> thumb pushes next card up
from the bottom -> it slides up to replace -> settles).

## The per-pack structure (the rhythm)
1. **ONE opening beat ~1.0-1.3s** — the sealed pack held up to camera (or the clear tear moment).
   NOT two opening cuts. NOT a low-motion lull between rip actions.
2. **ONE fan beat ~1.2-1.5s** — the cards fanned out right after opening. Its OWN beat. Do NOT count
   the time a card was visible in the fan toward that card's later hold.
3. **Then one beat per distinct card**: card -> card -> card.
Some windows are mid-pack (no fresh open/fan) or a fan/feature — adapt: if there's no opening or fan
in your window, just do the card beats. Not every window has all three.

## How to place each CARD beat (the crux — user reads this at the frame level)
- **Cut at the SLIDE ONSET** — the frame the thumb BEGINS pushing the card up. Show the beginning of
  the slide, never mid-slide.
- **Hold THROUGH the settle** — the card slides up, comes to rest centered, and holds. Total ~1.5-2.0s
  (slide + settle hold). Do NOT cut at the motion peak (that flashes the card ~0.1s = a blink).
- Drop the "previous card brought back over the next" moment — cut before it.
- **Show every distinct card** that settles. Missing one is the #1 failure. Don't merge two real
  card reveals into one beat; don't chop one card's slide into two.

## Tools (run from repo root)
1. **Slide-event detector (frame-accurate candidates):**
       node scratch/autocut/slide-events.mjs WIN_START WIN_END
   It prints candidate beats: `in=<onset>` (the cut IN), `settle=<rest>`, `peak`. These onsets/settles
   are pinned to the 60fps motion curve — trust them for slide timing. It may MISS a card (low-motion
   swap) or add a false one (a re-grip) — that's what your eyes are for.
2. **Readable frame grids (classify + catch misses):**
       node scratch/autocut/extract-grid.mjs cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 WIN_START WIN_DUR 6 3 6 scratch/autocut/grids/zID
   3 columns = legible. Cell time = WIN_START + (img*18 + row*3 + col)/6 (row step 0.5s, col step 0.167s).
   READ every PNG it makes. Identify: the open, the fan, and each distinct card. Cross-check against the
   detector list — if you SEE a card settle that the detector missed, add it (find its onset from a
   `node scratch/autocut/fine.mjs <a> <b>` motion dump: onset = where motion rises from ~3-5 into a burst).

## Method
- Start from the detector's candidate beats. For each, set start = onset, end = settle + ~0.4s (so the
  rest reads), trimmed so total hold is ~1.5-2.0s and it doesn't run into the next onset.
- Add the opening beat and the fan beat if your window contains them (from the grids).
- Add any card the detector missed; drop any false (re-grip / card-back-only / previous-card-comeback).
- Skip dead time (empty mat, sorting, reaching). 

## Output
Write `scratch/autocut/beats2/win_ID.json` with the Write tool:
   {"window":ID,"start":WIN_START,"end":WIN_END,"segments":[{"start":0.0,"end":0.0,"note":"open|fan|card: desc"}, ...]}
Then return that same JSON as your final message (strict JSON only). Sanity: sorted ascending,
non-overlapping, each in-window; card beats ~1.5-2.0s, open ~1.0-1.3s, fan ~1.2-1.5s.
