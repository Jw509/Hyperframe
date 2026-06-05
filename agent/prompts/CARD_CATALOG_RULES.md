# EditHyper Card Catalog Rules

At the beginning of each card-opening project, create or update `briefs/catalogs/<slug>.json`.

If the project is already in progress, read the matching handoff in `agent/state/handoffs/` before cataloging, reviewing, rebuilding, or rendering. Current chrome v4 state is in `agent/state/handoffs/chrome-v4-handoff.md`.

Goal:

- Identify every distinct card shown, plus classify non-card beats that matter for editing.
- Record when it appears in source time.
- Preserve visual evidence so later corrections can reference a card id instead of a manual timestamp.
- Use the catalog as the bridge between cuts and Hyperframes overlays.

Workflow:

1. Confirm product count first:
   - If `briefs/<slug>.json` lacks `expected_packs` and `cards_per_pack`, ask the user: "How many packs/sections are in this video, and how many cards are in each pack/section?"
   - Save the answer in the brief before running `catalog:rewrite-slots`.
2. Initialize the catalog from pack windows or rough cuts:
   - `node agent/harness.mjs catalog:init --slug <slug> --windows scratch/autocut/windows2.json`
   - or `node agent/harness.mjs catalog:init --slug <slug> --cut briefs/cuts/<slug>.json`
   - for known box counts, prefer `node agent/harness.mjs catalog:rewrite-slots --slug <slug> --cut <approved-cut.json>`
3. Generate evidence in batches:
   - `node agent/harness.mjs catalog:todo --catalog briefs/catalogs/<slug>.json --limit 20`
   - `node agent/harness.mjs catalog:evidence --catalog briefs/catalogs/<slug>.json --source cards/sources/<slug>/<slug>-portrait.mp4 --only-unknown --limit 20`
4. Create the review packet:
   - `node agent/harness.mjs catalog:review --catalog briefs/catalogs/<slug>.json --only-unknown --limit 20`
5. Inspect the generated stills/grids using video-use-style visual review.
6. Fill in `beatType`, `name`, `pack`, `cardInPack`, `variant`, `isHit`, `confidence`, and `evidence`.
7. Lock entries only after the user confirms or the card is visually unambiguous.
8. Validate with `node agent/harness.mjs catalog:validate --catalog briefs/catalogs/<slug>.json`.
9. Once all rows are confirmed, promote the readable table into a locked canonical catalog:
   - `node agent/harness.mjs catalog:from-table --slug <slug> --table briefs/catalogs/<slug>.current-draft-list.md --source <source.mp4> --out briefs/catalogs/<slug>.confirmed.json`
   - `node agent/harness.mjs catalog:assert-confirmed --catalog briefs/catalogs/<slug>.confirmed.json`
10. If the product should use slide-up reveal starts, run motion detection before building. Use the canonical portrait/card-centered source (`cards/sources/<slug>/<slug>-portrait.mp4`) so the detector sees the same framing as the Short:
   - `node agent/harness.mjs short:detect-reveals --catalog briefs/catalogs/<slug>.confirmed.json --source cards/sources/<slug>/<slug>-portrait.mp4 --out briefs/catalogs/<slug>.reveal-detected.json`
11. Generate visual review sheets for motion detections:
   - `node agent/harness.mjs short:review-detections --catalog briefs/catalogs/<slug>.reveal-detected.json --source <source.mp4> --out-dir scratch/reveal-detection-review/<slug> --mode all`
12. Apply user review decisions into a reviewed catalog:
   - `node agent/harness.mjs short:apply-detection-review --catalog briefs/catalogs/<slug>.reveal-detected.json --review agent/reviews/<slug>-detection-review.json --out briefs/catalogs/<slug>.reveal-reviewed.json`
13. Build the first sports-card YouTube Short cut from the confirmed or reviewed catalog with hold-then-slide timing:
   - `node agent/harness.mjs short:build --catalog briefs/catalogs/<slug>.reveal-reviewed.json --out briefs/cuts/<slug>.catalog-short.json --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5 --transition-style hold-then-slide --slide-duration 0.65`
14. Run the reveal gate before asking the user to watch a full render:
   - `node agent/harness.mjs short:gate --catalog briefs/catalogs/<slug>.reveal-reviewed.json --cut briefs/cuts/<slug>.catalog-short.json --out scratch/render-audit/<slug>-reveal-gate.md`
15. If the user reviews a render and gives output timestamps, map them before changing any cut:
   - `node agent/harness.mjs short:map-output --cut briefs/cuts/<slug>.catalog-short.json --times <MM:SS,...> --out scratch/render-audit/<slug>-output-map.md --context 1`
   - Convert the mapped card/transition into `agent/reviews/*.json` decisions by card id, then rebuild/gate/render.

Pack-slot rule:

- If the product has a known count, create exactly that many card rows.
- Every pack open/window is an obligation: locate `cards_per_pack` cards before the next pack begins.
- If a pack has fewer than `cards_per_pack` located cards, run `catalog:focus` and inspect that source range before asking the user for timestamps.
- Missing rows should stay as `locatorStatus: "missing_candidate"` until located.
- Extra detections should go in `unassignedCandidates`; do not force them into the wrong pack/card slot.
- Run `catalog:reconcile` and `catalog:unassigned` before asking the user for manual timestamps.

Cutting policy:

- Do not rely on manual timestamps as the primary interface.
- Prefer card ids, pack/card numbers, and catalog rows.
- For the first card in a pack, edit timestamps should target the held-in-hand moment after the fan, not the first wrapper glimpse.
- For each later card in the pack, edit timestamps should target the first upward slide/reveal motion for that card.
- Sports-card Shorts should use `short:build --transition-style hold-then-slide --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5`: for same-pack card reveals, show a clean readable hold, then continue through the upward slide/reveal. Use one continuous clip only when the hold and slide are adjacent in source time. If there is a dead handling gap between the clean hold and the slide, split it into a `hold` clip plus a verified `slide` clip; do not move the hold forward and skip the readable card. Never start the next card's hold earlier than the previous slide ended, because source-time rewinds create visible stutter.
- If the catalog only has the fully visible card moment, keep it as `sourceRepresentative`; the first-pass Short can use `--slide-lead`, and exact corrections should be saved as `cutStartSeconds` or `revealStartSeconds`.
- When possible, run `short:detect-reveals` to track right-side thumb/card motion plus bottom-card reveal changes. Detection should run on portrait/card-centered footage, not raw landscape. Do not auto-apply low-confidence candidates as final cut starts.
- Run `short:review-detections` and use the review sheet before treating motion-detected starts as final.
- Store user visual-review decisions in `agent/reviews/*.json` and apply them with `short:apply-detection-review`. Use `set_seconds` when an exact original-video reveal start is known, add `revealEndSeconds` when the slide needs to play past the default end, add `holdStartSeconds` when the clean held-card display differs from the catalog identity timestamp, and use `set_hold`/`holdSeconds` for one-card dwell corrections.
- Run `short:gate` after `short:build`; treat blockers as "needs review before a full user-facing render" unless the render is explicitly a debugging render.
- Render with the same portrait/card-centered source used for reveal detection and review. Use `node agent/harness.mjs render --slug <slug> --cut <cut-json> --input portrait --no-audio` or pass the explicit portrait source path.
- Render-output timestamps are not source timestamps. Use `short:map-output` to map them to the current cut segment/card before writing review decisions.
- If a fully visible technical card timestamp differs from the edit timestamp, record it separately and keep the edit timestamp as `sourceRepresentative`.
- Set `beatType` to `box`, `open`, `fan`, `card`, `hit`, `recap`, `dead`, or `unknown`.
- Only rows with `beatType: "card"` or `beatType: "hit"` need player/card names.
- User timestamp corrections still go through `agent/harness.mjs plan`.
- Learned cut style should come from confirmed catalog rows plus approved cut JSON, not from ad hoc chat memory.

Hyperframes policy:

- Price overlays and total cost/return counters should read from catalog/overlay data keyed by card id.
- Do not duplicate card names and timestamps manually inside composition HTML when a catalog exists.
