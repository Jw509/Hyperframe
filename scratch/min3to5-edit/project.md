# video-use sessions — bowmanchrome2025 style test

## Session 1 — 2026-05-26

**Goal:** Re-attempt the user's fast-cut card-opening style (pack rip → fan → thumb-slide → ~0.9s card hold → thumb-slide) on source minute 3–5 (180–300s) of `bowmanchrome2025-portrait.mp4`, output to a non-destructive path. Guide = `briefs/cuts/bowmanchrome2025rough-cuts.json`.

**Strategy:** Silent footage, so audio-first methodology N/A — used visual drill-down (ffmpeg labeled/clean grids; `drawtext` segfaults in Git Bash via broken fontconfig, so unlabeled grids with fixed row=10s / cell mapping). Coarse 1fps overview of 180–300, then 5fps drill on the two long rough windows (215–224s, 297–307s).

**Decisions:**
- Dropped dead lead-in 180–201.8s (rough cut drops it too).
- 215.5–224.3 long window = refractor fan + 2 cards + start of next Bowman pack rip → split into 4 short beats.
- 297.6–307 long window = 4 distinct cards (green/pink/gray/purple); only the green (~297.4) falls before the 300s/5:00 boundary → kept just that.
- Other beats taken from rough-cut marks, trimmed to ~1.0–1.2s holds.

**Output:** `cards/renders/bowmanchrome2025/styletest-min3to5-v1.mp4` — 26.10s, 23 cuts, 1080×1920@60, silent. Cut list: `scratch/min3to5-edit/cut-min3to5-v1.json`. Re-render: `node scratch/min3to5-edit/render-cut.mjs <cuts.json> <portrait.mp4> <out.mp4>`.

**Self-eval:** Most beats land on clear cards; pack-rip + fans read well; ~2–3 beats catch the card mid-slide (on-style). No dead/black/audio issues; duration matches EDL.

**Outstanding (await user feedback):** Is ~1.1s/card the right pace or tighter to 0.9s? Beat selection good? Want the 180–201 lead-in or extend past 300 to finish the green→pink→gray→purple run? Per-card precision can be improved by drilling each medium window (246–264s) at 5fps.

## Session 2 — 2026-05-26

**Feedback:** v1 "pretty good for a start" but reveals need to capture the thumb sliding the card UP. Reference: reveal at output 2:23 in `bowmanchrome2025-cut-portrait.mp4` (= source seg38 411.767–423.27, the Kyson Brown baked-pan card).

**Key finding:** The reveal = card starts LOW, thumb slides it UP into frame, THEN ~0.9s hold. v1's error: picked tight sub-windows that started AFTER the card was up, chopping the slide. **Fix: use the live-cut (`briefs/cuts/bowmanchrome2025.json`, 87 segs) IN-points — they already mark each reveal's slide-up start** (that's why the user's cut-portrait reveals look right). Trim from the END to tighten, not the front.

**v2 output:** `cards/renders/bowmanchrome2025/styletest-min3to5-v2.mp4` — 32.33s, 26 cuts, extends to ~308 to finish green/pink/gray/purple run. Verified at 10fps: slide-up motion now present. Cut list `scratch/min3to5-edit/cut-min3to5-v2.json`.

**BLOCKERS for full video:** (1) "Coleman" appears nowhere in the repo — cannot locate Kevin Coleman Jr's pack/autograph to study its keyframing; need timestamp from user. (2) Baked-in pans in portrait source per PIPELINE.md: 412–418 (Kyson Brown), 649–656 & 684–691 (fan pan-lefts) — autograph may be one of these or elsewhere. (3) "Show every card" rule means the ~20 multi-card long windows (>5s) each need 5fps drilling to split into per-card reveals — full pass should go pack-by-pack (consider parallel sub-agents).

## Session 3 — 2026-05-26

**Feedback:** v2 "much better." Two fixes: (a) the beat at ~8s was too quick (0.8s) — should be held like cut-portrait 1:12; (b) Kevin Coleman Jr is at cut-portrait **2:16**.

**Fixes/findings:**
- v3 (`cut-min3to5-v3.json` → `styletest-min3to5-v3.mp4`): lengthened that beat to ~2s. Confirmed at 1:12 the held card is shown ~3s.
- **The big "B" logo card = Bowman Chrome CARD design, NOT a pack wrapper.** The beat I'd called "pack rip" is actually **Harrison Wallace III (Ole Miss)** at source ~224. Real pack-rips (foil wrappers) are elsewhere — don't confuse. Lesson: feature/held cards want ~2s; don't flash important beats <1s.
- **Kevin Coleman Jr pack:** cut-portrait 2:16 → source ≈ 396s (live-cut seg36, 393.814–396.66). The pack's autograph keyframing = the baked **follow-pan at source 412–418** (cut-portrait ≈2:19–2:26; PIPELINE.md's "Kyson Brown card moving right"). Cutting from the portrait source preserves this pan automatically as long as that window is kept.

## Session 4 — 2026-05-26

**Feedback:** v3 "much closer." New direction: use attached reference photo (card held HIGH, centered, fully readable — Pueo Ashlock Hawaii w/ Jovantae Barnes OU + X-fractor behind) as the **reveal money-frame** — each card beat must land on and hold that clear presentation. Also: **PAUSE the full-video render** (deferred), and **extend working window +40s** → now source 180–348.

**Output:** v4 = `cut-min3to5-v4.json` → `styletest-min3to5-v4.mp4` (46.08s, 34 cuts). New beats 27–34 cover 308–348, timed to land on held-up frames; verified at 3fps most land clean. Soft spot: ~336s beat catches a white card-back/handling moment (uncertain card). Per-card drill grids for 308–348: drillC (308–328), drillD (328–348) in scratch/min3to5-edit/.

**Reveal rule refined:** slide-up → LAND ON the held-high readable frame (photo) → hold. Don't cut before the card is fully presented.

## Session 5 — 2026-05-26

**Feedback (granular):** v4 transitions split into two kinds — GOOD where I cut on a backbone slide-start IN-point (card visibly slides up after the cut, ~0.4s, e.g. out 3.8s "perfect"); BAD "blinks" where I split a continuous multi-card window at a settled-card point (card already up, no motion, e.g. out 5.1s). Also: some cuts 0.25s too early; some cards (e.g. pack-2 card4) blink off too fast — hold longer.

**ROOT CAUSE:** over-splitting continuous **fan/swap** windows at settled-card points chops out the thumb-slide → blink. The dramatic slide-up-from-bottom is a *specific* action, not present for every card (many are held & swapped in-hand). Confirmed via 10fps output grid: perfect = cut→slide-up; blink = cut→already-up.

**FIX (v5 = `cut-min3to5-v5.json` → `styletest-min3to5-v5.mp4`, 47.1s, 22 cuts):** keep multi-card/fan windows FLOWING (continuous, cut only on backbone slide-start IN-points so the slide plays); tight-cut only true single-card slide reveals. Trade-off: fan windows run ~4-5s (less blink, slightly less tight). Verified pack-1 fan now flows.

**Open:** (1) tension between "show every card + tight 0.9s + slide on every card" — true slide-on-every-card needs per-card slide-start frames (grid precision ~0.1-0.2s; may need user to mark in cut-editor for taste-critical spots). (2) "second pack" +0.25s notes: reverted those cuts to backbone IN-points; need user's v5 output timestamps to fine-tune. (3) user has "more" feedback coming.

## Session 6 — 2026-05-26 — FULL VIDEO

**Green-lit the whole video.** New global rule: **I cut ~0.3s too early on reveals — shift cut-in +0.3s for EVERY card except the first card of each pack** (first card anchored to pack-rip, leave as-is).

**Execution:** `scratch/min3to5-edit/make-full-cut.mjs` transforms the 87-seg backbone (`briefs/cuts/bowmanchrome2025.json`): start += 0.3 unless preceding gap > threshold (=new pack). Threshold **12s → 19 packs** (≈ the 20-pack box; erring toward shifting more since under-shift is the flagged failure). Window ends unchanged → preserves flow + slides + the Coleman auto-pan (seg38 now 412.067–423.27, covers the baked 412–418 pan).

**Output:** `scratch/min3to5-edit/cut-FULL-v1.json` → `cards/renders/bowmanchrome2025/full-stylecut-v1.mp4` (~437s / 7.3min, 87 cuts). Render kicked off in background.

**To self-eval when render done:** spot-check several reveals (did +0.3 land them on the slide?), confirm Coleman auto-pan rides through, check duration ≈437s, scan a few pack-1-of-pack first cards.

**RESULT (render done, exit 0):** `full-stylecut-v1.mp4` = 436.9s (7:17), 87 cuts, 1080×1920@60, 703 MB. Self-eval PASSED: (a) early within-pack reveals show card motion at transitions (not blinks); (b) Coleman auto-pan rides through at output ~2:10–2:13 (card pans across frame). Coleman pack starts output 2:02; auto-pan seg at output 130.5s. Awaiting user review for next round (likely per-pack tightening / specific-spot tuning; pack-boundary heuristic = gap>12s gave 19, may miss a boundary or two).

## Session 7 — 2026-05-26 — APPROVED + fan fix + style LOCKED

**v1 approved "absolute cinema."** Style now LOCKED & documented in `PIPELINE.md` → "Cut style — LOCKED". Only notes were two fans (out 3:27, 3:42 in v1 = source ~653, ~688) cropped off-left.

**Fan fix (v2):** both fans were first-of-pack (host fans the pack open) and sit left-of-center in the landscape frame. Re-cropped just those 2 segments from the landscape 1080p source with a keyframed LEFT pan (X ramps to -400; tested -400 vs -650, -400 is centered). New tool `render-cut-mixed.mjs` (per-segment extract + concat, supports per-segment source+cropX). Other 85 segments identical to v1.

**Output:** `cut-FULL-v2.json` → `cards/renders/bowmanchrome2025/full-stylecut-v2.mp4` (441.6s / 7:21, 87 cuts). Verified: fan1 pans left to reveal Tennessee card fan; fan2 reframes the clipped spread. fan2 reads as pack-wrapper-then-cards — confirm it's the exact moment meant.

## Session 8 — 2026-05-26 — fans: static (not pan)

**Feedback on v2:** fans don't need a moving pan — just center the camera on the fan for that one cut, hard-cut back to normal next. Fan1: show the fan then SKIP the redundant shot right after, go to the next. Fan2: too early — the camera-left moment is at output 3:46 (= v2 source ~688.8, the #22 card held left), hold ~1s, cut back.

**v3 (`cut-FULL-v3.json` → `full-stylecut-v3.mp4`, 434.8s/7:15, 86 segments):** fans = STATIC center-left crop (cropX `(iw-1080)/2-400`, no ramp). fan1 src 653-656.3; removed the 656.05-658.447 shot; fan2 retimed to src 688-689.8. Verified: fan1 static fan→hard cut to normal; fan2 left #22 card ~1.8s→hard cut to normal. Style doc + memory updated: fans are STATIC center-left, not a pan. fan2 is a single left-framed card (per the 3:46 note) — flag if a wider spread elsewhere was meant.
