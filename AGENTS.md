# EditHyper Agent Rules

Primary upstream references:

- Video editing skill: https://github.com/browser-use/video-use
- Hyperframes renderer: https://github.com/heygen-com/hyperframes

Before continuing an in-progress project, read the matching handoff in `agent/state/handoffs/` if one exists. Current chrome calibration/render state is documented in `agent/state/handoffs/chrome-v4-handoff.md`.

For each new card-opening project, build a card catalog before final cutting:

1. Confirm the product count. If `briefs/<slug>.json` lacks `expected_packs` and `cards_per_pack`, ask the user: "How many packs/sections are in this video, and how many cards are in each pack/section?"
2. Save the answer in the brief before cataloging.
3. Generate pack windows / rough cut candidates with video-use-style tools.
4. Initialize `briefs/catalogs/<slug>.json` with `node agent/harness.mjs catalog:init` or `catalog:rewrite-slots`.
5. Treat every pack open/window as an obligation to find `cards_per_pack` cards before the next pack begins.
6. If fewer than `cards_per_pack` cards are located, focus on that pack range before asking the user for timestamps.
7. Inspect the whole video and fill one catalog row per distinct card shown.
8. When every row is confirmed, promote the readable table into `briefs/catalogs/<slug>.confirmed.json`:
   - `node agent/harness.mjs catalog:from-table --slug <slug> --table briefs/catalogs/<slug>.current-draft-list.md --source <source.mp4> --out briefs/catalogs/<slug>.confirmed.json`
   - `node agent/harness.mjs catalog:assert-confirmed --catalog briefs/catalogs/<slug>.confirmed.json`
9. If the edit style should start on slide-up reveals, run motion detection against the canonical portrait/card-centered source, not raw landscape footage:
   - `node agent/harness.mjs short:detect-reveals --catalog briefs/catalogs/<slug>.confirmed.json --source cards/sources/<slug>/<slug>-portrait.mp4 --out briefs/catalogs/<slug>.reveal-detected.json`
10. Review the detections visually before rendering:
   - `node agent/harness.mjs short:review-detections --catalog briefs/catalogs/<slug>.reveal-detected.json --source <source.mp4> --out-dir scratch/reveal-detection-review/<slug> --mode all`
11. Apply user review decisions into a reviewed catalog:
   - `node agent/harness.mjs short:apply-detection-review --catalog briefs/catalogs/<slug>.reveal-detected.json --review agent/reviews/<slug>-detection-review.json --out briefs/catalogs/<slug>.reveal-reviewed.json`
12. Generate the first YouTube Short cut from the confirmed or reviewed catalog. For sports-card Shorts, prefer the hold-then-slide transition style:
   - `node agent/harness.mjs short:build --catalog briefs/catalogs/<slug>.reveal-reviewed.json --out briefs/cuts/<slug>.catalog-short.json --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5 --transition-style hold-then-slide --slide-duration 0.65`
13. Use catalog card ids for cut changes and overlay placement.

Sports-card timing rule:

- For the first card in a pack, the edit timestamp is the held-in-hand moment after the fan, not the first wrapper glimpse.
- For every card after the first, the edit timestamp should be the moment the current top card begins sliding up to reveal that card.
- Build sports-card Shorts with `short:build --transition-style hold-then-slide --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5`: for same-pack card reveals, use one continuous hold-through-slide clip only when the clean hold and slide onset are already adjacent in source time. If there is a dead handling gap between the clean card hold and the next slide, split it into a clean `hold` clip plus a verified `slide` clip; do not slide the hold forward and skip the readable card. Never let the next card's hold start earlier than the previous slide ended; avoid source-time rewinds that create stutter.
- When an exact original-video reveal start is known from a source sheet or user review, store it with a `set_seconds` review item and apply it through `short:apply-detection-review`; do not approximate exact timestamps with frame-offset math.
- If a reviewed slide needs to run longer than the default, include `revealEndSeconds` in the review item. If the clean display moment for a card is different from the catalog identity timestamp, include `holdStartSeconds`. If one card needs extra dwell without changing global pacing, use `set_hold` with `holdSeconds`.
- After `short:build` and before any full render, run `node agent/harness.mjs short:gate --catalog briefs/catalogs/<slug>.reveal-reviewed.json --cut briefs/cuts/<slug>.catalog-short.json --out scratch/render-audit/<slug>-reveal-gate.md`. Do not ask the user to watch a full render while the gate reports blockers unless the render is explicitly for debugging.
- Render calibrated sports-card Shorts from the same portrait/card-centered source used for reveal detection and review. Prefer `node agent/harness.mjs render --slug <slug> --cut <cut.json> --input portrait --no-audio`, or pass the explicit portrait source path. Never hand off a raw-landscape render as the production Short.
- When the user gives feedback against a rendered output timestamp, first run `node agent/harness.mjs short:map-output --cut briefs/cuts/<slug>.catalog-short.json --times <MM:SS,...> --context 1`. Convert the mapped segment/card into `agent/reviews/*.json` corrections by card id; do not mentally translate render time to source time.
- If only a fully visible card timestamp is known, keep it as `sourceRepresentative` and let `short:build --slide-lead` create a first-pass reveal start. Exact fixes should be stored as `cutStartSeconds` or `revealStartSeconds`.
- Prefer `short:detect-reveals` over fixed slide-lead timing only when the source is portrait/card-centered and the thumb/card motion is visible in the detector region. It should accept only high-confidence slide/reveal detections and leave low-confidence candidates for review. If the source is raw landscape, create or use the portrait working source first.
- Run `short:review-detections` before rendering from motion detections.
- Apply user decisions with `short:apply-detection-review`; preserve the raw detector catalog.
- Technical card timestamps may be recorded separately, but edit cuts should use the reveal/cut timestamp.

For timestamp-based edit requests, use the in-repo harness before rendering.

Required flow:

1. Convert the user's timestamp notes into `agent/instructions/<slug>-<short-name>.json`.
2. Run `node agent/harness.mjs plan --cut briefs/cuts/<slug>.json --instructions agent/instructions/<file>.json`.
3. Show the generated interpretation table to the user.
4. Apply only after approval with `node agent/harness.mjs apply ... --approved`.
5. Render only from the approved cut JSON.

Do not render directly from natural-language timestamp instructions. User-specified timestamps are authoritative and must become locked structured edits.

Do not render a sports-card short until `catalog:assert-confirmed` passes or the user explicitly asks for a rough draft.

Full details: `AGENT_HARNESS.md`.
