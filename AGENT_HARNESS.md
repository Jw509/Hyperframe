# EditHyper Agent Harness

This repo now has a small deterministic harness for the failure mode that kept biting the workflow: timestamp instructions in chat getting misread before render.

It is designed to coordinate with these upstream agent skills/tools:

- `browser-use/video-use`: https://github.com/browser-use/video-use
- `heygen-com/hyperframes`: https://github.com/heygen-com/hyperframes

Use `video-use`-style helpers for video inspection, cut validation, filmstrips, transcripts, and self-eval. Use Hyperframes for card price overlays, total cost/return counters, hit markers, and final HTML-rendered video layers.

The rule is simple:

> Do not render directly from natural-language timestamp notes. Turn them into structured instructions, generate an interpretation table, get approval, then apply.

## 1. Write Structured Instructions

For a new project, start with a card catalog before asking for manual timestamp edits. This is the intended primary workflow:

```text
source video
  -> pack windows / rough candidate cuts
  -> card catalog with one row per card
  -> approved cut list keyed to card ids
  -> Hyperframes overlays keyed to card ids
  -> render
```

```powershell
node agent/harness.mjs catalog:init --slug bowmanchrome2025 --cut briefs/cuts/bowmanchrome2025.json --out briefs/catalogs/bowmanchrome2025.json
```

or, if pack windows exist before cuts:

```powershell
node agent/harness.mjs catalog:init --slug bowmanchrome2025 --windows scratch/autocut/windows2.json --out briefs/catalogs/bowmanchrome2025.json
```

The catalog is the shared reference for card names, pack/card index, source timestamps, visual evidence, prices, and later overlay placement.

Manual timestamps are still supported, but they are the correction path, not the main path.

After the user confirms every card row, promote the readable table into the canonical locked catalog:

```powershell
node agent/harness.mjs catalog:from-table --slug bowmanchrome2025 --table briefs/catalogs/bowmanchrome2025.current-draft-list.md --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out briefs/catalogs/bowmanchrome2025.confirmed.json
node agent/harness.mjs catalog:assert-confirmed --catalog briefs/catalogs/bowmanchrome2025.confirmed.json
```

`catalog:assert-confirmed` is the hard gate. It fails unless the catalog has exactly `expected_packs * cards_per_pack` rows, every row is named, every row is locked, and every pack has the configured number of cards.

For sports-card YouTube Shorts, generate the first edit from the confirmed catalog, not from chat notes:

```powershell
node agent/harness.mjs short:build --catalog briefs/catalogs/bowmanchrome2025.confirmed.json --out briefs/cuts/bowmanchrome2025.catalog-short.json
```

Default Shorts pacing is tuned for sports-card reveals: base cards hold `0.85s`, inserts/parallels hold `0.85s`, and hits/autos/numbered cards hold `1.25s`. For cards after the first card in a pack, `short:build` starts the cut at `cutStartSeconds`/`revealStartSeconds` when present; otherwise it backs up from the catalog time by the `--slide-lead` default of `0.22s` to catch the beginning of the slide. Override with `--base-hold`, `--insert-hold`, `--hit-hold`, and `--slide-lead` when a product needs different pacing.

After generating a cut, inspect exact reveal starts before judging the full render:

```powershell
node agent/harness.mjs short:audit-reveals --cut briefs/cuts/bowmanchrome2025.catalog-short.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out-dir scratch/reveal-audit/bowmanchrome2025
```

The reveal audit writes one grid per card id around the segment start, so corrections can be made as `card-### cutStartSeconds = ...` instead of raw chat timestamps.

When catalog times are the card-visible moment instead of the true reveal start, run the motion detector before `short:build`. Detection must use the same portrait/card-centered working source the Short will use; raw landscape footage changes the card/thumb regions and makes slide-start detection unreliable.

```powershell
node agent/harness.mjs short:detect-reveals --catalog briefs/catalogs/bowmanchrome2025.confirmed.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out briefs/catalogs/bowmanchrome2025.reveal-detected.json
node agent/harness.mjs short:review-detections --catalog briefs/catalogs/bowmanchrome2025.reveal-detected.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out-dir scratch/reveal-detection-review/bowmanchrome2025 --mode all
node agent/harness.mjs short:apply-detection-review --catalog briefs/catalogs/bowmanchrome2025.reveal-detected.json --review agent/reviews/bowmanchrome2025-detection-review.json --out briefs/catalogs/bowmanchrome2025.reveal-reviewed.json
node agent/harness.mjs short:build --catalog briefs/catalogs/bowmanchrome2025.reveal-reviewed.json --out briefs/cuts/bowmanchrome2025.motion-short.json
```

`short:detect-reveals` looks for the right-side thumb/card motion plus bottom-card reveal motion, then rejects low-confidence candidates by default. It stores accepted starts as `cutStartSeconds`/`revealStartSeconds` and stores unaccepted candidates as `revealStartCandidateSeconds` for review.
`short:review-detections` creates Markdown and HTML visual sheets with one frame grid per candidate so the user can approve or reject starts by card id before rendering.
`short:apply-detection-review` applies user decisions from `agent/reviews/*.json` into a new catalog while preserving the raw detector output.

Hold-then-slide has two valid shapes:

- Continuous: the clean card hold is immediately before the slide onset, so one clip can hold and then play the upward reveal.
- Split: there is a dead handling gap between the clean card hold and the slide onset, so the cut should emit a readable `hold` clip plus a verified `slide` clip. Do not move the hold forward and skip the readable card just to keep source time continuous.

When the user gives feedback while watching a rendered edit, map those output timestamps back to the cut before changing source timing:

```powershell
node agent/harness.mjs short:map-output --cut briefs/cuts/bowmanchrome2025.motion-short.json --times 0:28,1:44,2:38 --out scratch/render-audit/bowmanchrome2025-output-map.md --context 1
```

Use the mapped card ids/transitions to write `agent/reviews/*.json` corrections. Do not mentally convert render timestamps into source timestamps.

Before a pack-slot catalog, set the product count in the video brief:

```json
{
  "expected_packs": 20,
  "cards_per_pack": 4
}
```

If those fields are missing, `catalog:rewrite-slots` stops and tells Claude/Codex to ask you for them. The harness does not assume `20 x 4` for new videos.

Then generate visual evidence in batches:

```powershell
node agent/harness.mjs catalog:todo --catalog briefs/catalogs/bowmanchrome2025.json --limit 20
node agent/harness.mjs catalog:evidence --catalog briefs/catalogs/bowmanchrome2025.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --only-unknown --limit 20
```

The evidence command attaches one representative still and one 3x3 local time grid to each catalog row, so the agent can identify cards from images and leave a trail.

If a box has a known card count, prefer the pack-slot rewrite:

```powershell
node agent/harness.mjs catalog:rewrite-slots --slug bowmanchrome2025 --cut scratch/autocut/cut-full-v5-final.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out briefs/catalogs/bowmanchrome2025.pack-slots.json --expected-packs 20 --cards-per-pack 4
node agent/harness.mjs catalog:reconcile --catalog briefs/catalogs/bowmanchrome2025.pack-slots.json
node agent/harness.mjs catalog:unassigned --catalog briefs/catalogs/bowmanchrome2025.pack-slots.json
```

This creates the expected card slots from the brief or explicit flags, attaches detected candidates where available, and flags missing or overflow candidates instead of pretending the detected count is correct.

When pack windows exist, pass them into the rewrite so each pack/window becomes a count obligation:

```powershell
node agent/harness.mjs catalog:rewrite-slots --slug bowmanchrome2025 --cut scratch/autocut/cut-full-v5-final.json --windows scratch/autocut/windows2.json --source cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4 --out briefs/catalogs/bowmanchrome2025.pack-slots.windows.json
node agent/harness.mjs catalog:focus --catalog briefs/catalogs/bowmanchrome2025.pack-slots.windows.json
```

Focus rule: every pack open/window must produce the configured number of cards before the next pack begins. If it does not, inspect that source range first.

Create a file in `agent/instructions/`, for example:

```json
{
  "slug": "bowmanchrome2025",
  "defaultTimeline": "source",
  "instructions": [
    {
      "text": "3:34 insert the missing card",
      "operation": "insert_segment",
      "timeline": "source",
      "start": "3:34",
      "duration": "1.8",
      "note": "card: user-specified missing card",
      "locked": true
    }
  ]
}
```

Supported operations:

- `insert_segment`: needs `start` plus either `end` or `duration`
- `remove_segment`: needs `at`
- `replace_start`: needs `at`
- `replace_end`: needs `at`
- `lock_segment`: needs `at`
- `set_note`: needs `at` and `note`
- `noop`: records an instruction without changing the cut

Use `timeline: "source"` for original footage. Use `timeline: "output"` only when the timestamp comes from the rendered edit; the harness maps it back through the current cut list.

## 2. Generate the Interpretation Table

```powershell
node agent/harness.mjs plan --cut briefs/cuts/bowmanchrome2025.json --instructions agent/instructions/example.json
```

The harness prints and saves a table showing:

- original user instruction
- operation
- source/output timeline
- parsed input time
- mapped source time
- affected segment
- planned action

Example: `3:34` is parsed as `214.000s`, not guessed by the model.

## 3. Apply Only After Approval

```powershell
node agent/harness.mjs apply --cut briefs/cuts/bowmanchrome2025.json --plan agent/state/plans/<plan>.json --out briefs/cuts/bowmanchrome2025.reviewed.json --approved
```

The harness validates sorted, non-overlapping segments before writing.

To overwrite the live cut file, set `--out briefs/cuts/bowmanchrome2025.json` only after the table is approved.

## 4. Render

```powershell
node agent/harness.mjs render --slug bowmanchrome2025 --cut briefs/cuts/bowmanchrome2025.json --input portrait --no-audio
```

For sports-card Shorts, `--input` must resolve to the same portrait/card-centered working source used for reveal detection and review. `--input` accepts either a named variant such as `portrait` or an explicit project-relative/absolute video path:

```powershell
node agent/harness.mjs render --slug chrome --cut briefs/cuts/chrome.portrait-calibrated-v4.json --input portrait --out cards/sources/chrome/chrome-portrait-calibrated-v4-full.mp4 --no-audio
node agent/harness.mjs render --slug chrome --cut briefs/cuts/chrome.portrait-calibrated-v4.json --input cards/sources/chrome/chrome-portrait.mp4 --out cards/sources/chrome/chrome-portrait-calibrated-v4-full.mp4 --no-audio
```

When `--input` is provided and the source cannot be found, the render script fails instead of falling back to `briefs/<slug>.json`. This prevents calibrated portrait cuts from accidentally rendering against raw landscape footage.

After rendering, verify dimensions and decode before handing the file to the user:

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json cards/sources/<slug>/<render>.mp4
ffmpeg -hide_banner -loglevel error -i cards/sources/<slug>/<render>.mp4 -f null -
```

## Current Handoffs

If a project is already in progress, read the relevant handoff before changing catalogs or cuts:

- Chrome v4 calibration/render handoff: `agent/state/handoffs/chrome-v4-handoff.md`

## Claude/Codex Contract

Claude and Codex should use `agent/prompts/CLAUDE_CODE_RULES.md` as the local operating rule for timestamp edits. The model can propose cuts and labels, but user-specified timestamp edits must be locked and interpreted by the harness before any render.

For new sports-card videos, the reusable contract is:

1. Ask for pack/card count only if it is missing from `briefs/<slug>.json`.
2. Create pack slots and visual evidence.
3. Fill the catalog with one distinct physical card per row.
4. Promote only confirmed rows into `briefs/catalogs/<slug>.confirmed.json`.
5. Run `short:detect-reveals` if the desired cut point is the slide-up reveal rather than the catalog timestamp, using the canonical portrait/card-centered source.
6. Run `short:review-detections` and correct reveal starts by card id.
7. Apply review decisions with `short:apply-detection-review`.
8. Build the first Short with `short:build`.
9. Run `short:audit-reveals` and correct reveal starts by card id before the final render.
10. Key Hyperframes overlays and counters by `card-id`, never by retyped names/timestamps.

The harness owns timestamp authority. The external skills provide craft and tooling:

- `video-use` patterns: inspect source, build EDLs, render, self-evaluate boundaries, persist project memory.
- Hyperframes patterns: deterministic HTML/CSS/JS compositions, price overlays, counters, recap screens, and rendered visual layers.
