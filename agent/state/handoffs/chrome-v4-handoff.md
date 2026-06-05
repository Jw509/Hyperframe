# Chrome Current Handoff

Updated: 2026-06-05

Purpose: this is the current handoff for the `chrome` sports-card Short. Start here before changing chrome cuts. The filename still says `v4` because `AGENTS.md` points to this handoff, but the active checkpoint is now v5.

## Current Status

- Product count is confirmed: 7 packs x 6 cards = 42 cards.
- Current confirmed/reviewed catalog: `briefs/catalogs/chrome.portrait-reveal-calibrated-v5.json`.
- Current cut JSON: `briefs/cuts/chrome.portrait-calibrated-v5.json`.
- Current full rendered test: `cards/sources/chrome/chrome-portrait-calibrated-v5-full.mp4`.
- Current full reveal gate: `scratch/render-audit/chrome-portrait-calibrated-v5-full-gate.md`.
- v5 render-feedback review file: `agent/reviews/chrome-v4-render-feedback.json`.
- v5 review summary: `briefs/catalogs/chrome.portrait-reveal-calibrated-v5.review-summary.md`.
- v5 changed-area output sheets:
  - `scratch/render-audit/chrome-v5-render-feedback-review/output-038-052-4fps.jpg`
  - `scratch/render-audit/chrome-v5-render-feedback-review/output-064-100-2fps.jpg`

Verified v5 full render:

- Source used: `cards/sources/chrome/chrome-portrait.mp4`.
- Output dimensions: 1080x1920.
- Output duration: 99.05s.
- Decode check passed.
- Reveal gate passed with 0 blockers and 1 warning.

## Source Discipline

Use the portrait/card-centered working source for reveal detection, visual review, gates, and Short rendering:

```powershell
cards/sources/chrome/chrome-portrait.mp4
```

The raw source is still present:

```powershell
cards/sources/chrome/chromepack.mp4
```

Do not run production reveal detection on the raw landscape source. Do not render the calibrated Short from raw landscape footage.

Render from the current cut with either of these forms:

```powershell
node agent/harness.mjs render --slug chrome --cut briefs/cuts/chrome.portrait-calibrated-v5.json --input portrait --out cards/sources/chrome/chrome-portrait-calibrated-v5-full.mp4 --no-audio
node agent/harness.mjs render --slug chrome --cut briefs/cuts/chrome.portrait-calibrated-v5.json --input cards/sources/chrome/chrome-portrait.mp4 --out cards/sources/chrome/chrome-portrait-calibrated-v5-full.mp4 --no-audio
```

`scripts/cut-source.mjs` supports `--input <variant|path>` and refuses to fall back to `briefs/<slug>.json` when an explicit `--input` is provided.

## Gate Result

Latest gate command:

```powershell
node agent/harness.mjs short:gate --catalog briefs/catalogs/chrome.portrait-reveal-calibrated-v5.json --cut briefs/cuts/chrome.portrait-calibrated-v5.json --out scratch/render-audit/chrome-portrait-calibrated-v5-full-gate.md --min-slide 0.5
```

Result: PASS, 0 blockers, 1 warning.

Remaining warning to check during user review:

- `P5C1->P5C2`, `card-026` Bijan Robinson: pre-slide hold is below 1.2s. Evidence: transition `9:00.925`, slideEnd `9:01.800`, hold `0.93s`, slide `0.88s`.

This is not a blocker because it was human-reviewed; only adjust it if the rendered output feels rushed.

## V5 Render Feedback Fixes

The user reviewed v4 and reported that several reveal slides were wrong or nearly skipped. These corrections were converted to structured review items in `agent/reviews/chrome-v4-render-feedback.json`, applied to the v4 catalog, then rebuilt into v5.

Applied v5 corrections:

| Card ID | Reveal | Before | After | Notes |
|---|---|---:|---:|---|
| `card-018` | Mason Graham -> Amon-Ra St. Brown | `6:11.654` | `6:11.254` | moved earlier to visible slide |
| `card-021` | Brian Thomas Jr. -> Drake Maye | `7:54.137` | `7:49.737` | detector was late |
| `card-022` | Drake Maye -> Kenny Clark | `8:03.320` | `7:59.720` | detector was late |
| `card-029` | Gunnar Helm -> Princely Umanmielen | `9:16.204` | `9:13.804` | moved from shimmer to true reveal |
| `card-030` | Princely Umanmielen -> T.J. Hockenson | `9:27.988` | `9:25.388` | moved from shimmer to true reveal |
| `card-032` | Lamar Jackson -> Jake Browning | `10:24.454` | `10:23.854` | start a few frames earlier |
| `card-034` | Christian Kirk -> Leonard Floyd | `10:33.970` | `10:33.570` | start at visible slide |
| `card-035` | Leonard Floyd -> Xavier Watts | `10:37.887` | `10:35.887` | fixed near-skip of Xavier |
| `card-040` | Ashton Jeanty -> Jared Verse | n/a | `11:38.254` | manual swipe correction |

The v5 render is about four seconds longer than v4 because these corrected slides now play instead of jumping to late detector points.

## Known Manual/Reviewed Reveal Decisions

Important review files:

- `agent/reviews/chrome-calibration-v1-user-review.json`
- `agent/reviews/chrome-calibration-v2-user-review.json`
- `agent/reviews/chrome-calibration-v3-transition-fixes.json`
- `agent/reviews/chrome-calibration-v4-card005-wide.json`
- `agent/reviews/chrome-v4-render-feedback.json`

Important calibrated exceptions:

- `card-003` Tre Harris III: manual exception. User said this was a numbered card put to the back. Use source `2:16` to `2:20` for Tre Harris coming out.
- `card-005` Jakobi Meyers: v4 wide review accepted. Current start/end are approximately `2:34.970` to `2:36.470`.
- `card-006` Dalton Schultz: current start/end are approximately `2:42.729` to `2:43.929`.
- `card-012` Sam LaPorta: current start/end are approximately `4:15.620` to `4:16.620`.
- `card-027`: start is reviewed, settle/end was not fully visible in an earlier sheet. Recheck only if the render looks wrong.
- `card-040` Jared Verse: manual/weird slide exception. The v5 manual swipe correction is source `11:38.254` to `11:39.254`; do not use it as normal training evidence.

## If The User Reviews The Full Render

The user may give feedback in output/render timestamps. Do not mentally convert those to source time.

1. Map output timestamps back through the current cut:

```powershell
node agent/harness.mjs short:map-output --cut briefs/cuts/chrome.portrait-calibrated-v5.json --times <MM:SS,...> --out scratch/render-audit/chrome-v5-user-feedback-map.md --context 1
```

2. Convert the mapped card ids/transitions into a review file such as:

```powershell
agent/reviews/chrome-v5-render-feedback.json
```

3. Apply to the current reviewed catalog:

```powershell
node agent/harness.mjs short:apply-detection-review --catalog briefs/catalogs/chrome.portrait-reveal-calibrated-v5.json --review agent/reviews/chrome-v5-render-feedback.json --out briefs/catalogs/chrome.portrait-reveal-calibrated-v6.json
```

4. Rebuild, gate, and render from the new catalog:

```powershell
node agent/harness.mjs short:build --catalog briefs/catalogs/chrome.portrait-reveal-calibrated-v6.json --out briefs/cuts/chrome.portrait-calibrated-v6.json --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5 --transition-style hold-then-slide --slide-duration 0.65
node agent/harness.mjs short:gate --catalog briefs/catalogs/chrome.portrait-reveal-calibrated-v6.json --cut briefs/cuts/chrome.portrait-calibrated-v6.json --out scratch/render-audit/chrome-portrait-calibrated-v6-full-gate.md --min-slide 0.5
node agent/harness.mjs render --slug chrome --cut briefs/cuts/chrome.portrait-calibrated-v6.json --input portrait --out cards/sources/chrome/chrome-portrait-calibrated-v6-full.mp4 --no-audio
```

5. Verify render dimensions and decode before handing it back:

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json cards/sources/chrome/chrome-portrait-calibrated-v6-full.mp4
ffmpeg -hide_banner -loglevel error -i cards/sources/chrome/chrome-portrait-calibrated-v6-full.mp4 -f null -
```

## Harness Notes

- `scripts/cut-source.mjs` was hardened so `--input cards/sources/chrome/chrome-portrait.mp4` works as an explicit path.
- `scripts/cut-source.mjs` no longer silently falls back to `briefs/<slug>.json` when an explicit `--input` is missing or wrong.
- `agent/harness.mjs short:detect-reveals` writes the detection source to the catalog top-level `source`.
- `agent/harness.mjs short:apply-detection-review` preserves the reveal-detection source into reviewed catalogs.
- The current v5 catalog top-level source is `cards/sources/chrome/chrome-portrait.mp4`.
