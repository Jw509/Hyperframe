# Card-opening catalogue task (2025 Topps Signature Class — 2 mega + 2 blaster)

You are locating specific trading cards inside a window of a 14-minute card-opening video, frame by frame.
The host sits at a "CHASE 4 THE CASE" backdrop and holds each card up toward the camera (usually center
or center-right of frame, in his hands). Cards are shown one at a time, often held for 2–8 seconds.

## Frames
Frames live in `C:\Users\J\Desktop\EditHyper\scratch\dd-probe\frames\` named `f_0001.jpg` … `f_0420.jpg`.
**Timestamp mapping: frame `f_NNNN` is at video time t = (NNNN − 1) × 2 seconds.**
(So f_0001 = 0s, f_0031 = 60s, f_0060 = 118s, etc.) Read every frame in YOUR assigned range, in order.

## Target list
Read `C:\Users\J\Desktop\EditHyper\scratch\dd-probe\target_list.txt`. It has 49 target cards, one per line:
`ID | compfile | player | parallel | $value`. These are the eBay comps we will overlay. Your job is to
find WHEN each target card is held up on screen within your window.

## What to output
Write a JSON object to your assigned output file with three arrays:

```json
{
  "window": "WNN",
  "sightings": [
    {
      "compId": "01",                  // the 2-digit ID from target_list, or null if you see a clear card that matches no target
      "player": "Brock Bowers",
      "tStart": 268,                    // first video-second the card is clearly held/visible
      "tEnd": 274,                      // last video-second it is clearly visible (same as tStart if a single frame)
      "tBest": 271,                     // the second where it is most clearly/fully shown to camera
      "frames": ["f_0135","f_0136","f_0137"],
      "parallelCue": "purple border, /99 visible bottom",  // colors/border/serial/auto/insert cues you can actually see
      "confidence": "high|med|low",
      "note": "Raiders TE, held center 2-handed"
    }
  ],
  "boxOpens": [
    {
      "t": 4,                           // video-second a NEW sealed box/pack is being opened or a fresh unopened stack first appears
      "type": "blaster|mega|unknown",   // mega boxes are larger; read any 'BLASTER'/'MEGA'/'Topps Signature' packaging text you can see
      "evidence": "tearing cellophane on a large sealed box, packaging text 'MEGA'",
      "confidence": "high|med|low"
    }
  ],
  "notes": "anything ambiguous, e.g. two cards on screen at once, or a long stretch of just hands/talking"
}
```

## Matching rules
- Match a sighting to a `compId` when the player (and, if you can read it, the parallel/color/number) line up.
- Several players appear TWICE in the list with different parallels (Andrew Mukuba, Colston Loveland,
  J.J. McCarthy, Kyle Williams, Patrick Mahomes, Cam Ward). If you can't tell which parallel, set the
  `compId` to your best guess but say so in `note` and list the alternative ID. Report BOTH the
  base-looking and the colored-border versions separately if you see the player held up more than once.
- A card you cannot match to any target but that is clearly a held-up card → `compId: null` with a
  description. This helps us catch misses.
- Be conservative with `tStart`/`tEnd`: only count seconds where the card face is actually visible to
  camera, not when it's flipped away or being shuffled.
- Box opens: we expect 4 total across the whole video (2 blaster, 2 mega). In YOUR window report any you see.

Reply with only: count of sightings, count of boxOpens, and any target players you suspect are in your
window but couldn't confirm. The JSON file is the deliverable.
