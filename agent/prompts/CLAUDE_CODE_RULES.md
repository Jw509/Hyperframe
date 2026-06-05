# EditHyper Agent Harness Rules

Upstream skills/tools this repo is meant to coordinate with:

- `browser-use/video-use`: https://github.com/browser-use/video-use
- `heygen-com/hyperframes`: https://github.com/heygen-com/hyperframes

Before continuing an existing project, check `agent/state/handoffs/` for a current handoff. For the active chrome calibration/render, read `agent/state/handoffs/chrome-v4-handoff.md` before changing any catalog, cut, review file, or render.

When the user gives timestamp instructions, do not render directly from chat prose.

Required flow:

0. For a new project, create/update `briefs/catalogs/<slug>.json` first and prefer catalog card ids over manual timestamps.
1. Convert the user's notes into `agent/instructions/<slug>-<short-name>.json`.
2. Run `node agent/harness.mjs plan --cut briefs/cuts/<slug>.json --instructions agent/instructions/<file>.json`.
3. Show the interpretation table to the user before applying or rendering.
4. Only after the user approves the table, run `node agent/harness.mjs apply ... --approved`.
5. Render only from the approved cut JSON.

Rules:

- `MM:SS` parsing is deterministic. `3:34` is `214.000s`.
- User-specified edits must become `locked: true`.
- For sports-card videos, do not build the final Short from rough visual guesses. Promote the confirmed table with `catalog:from-table`, pass `catalog:assert-confirmed`, then build cuts with `short:build --base-hold 1.5 --insert-hold 1.5 --hit-hold 1.5 --transition-style hold-then-slide`.
- Sports-card edit timing uses the held-in-hand shot after the fan for the first card in a pack, then the first upward slide/reveal motion for each later card. It is not the first wrapper glimpse.
- Hold-then-slide means same-pack cards should show a clean readable hold, then the upward reveal motion. Use one continuous hold-through-slide clip only when those moments are adjacent in source time. If there is a dead handling gap between the clean card hold and the slide-up, split it into a `hold` clip plus a verified `slide` clip; do not slide the hold forward and skip the readable card. Never rewind source time when moving from a slide into the next card's hold.
- If the user wants the thumb/card slide moment, run `short:detect-reveals` against the confirmed catalog before `short:build`, but only on the canonical portrait/card-centered source. Do not run the reveal detector on raw landscape footage unless it has first been cropped/normalized to the same framing the Short will use. Accept high-confidence `cutStartSeconds` and review low-confidence candidates.
- Run `short:review-detections` to create a visual sheet before rendering from a reveal-detected catalog.
- Convert user visual-review notes into `agent/reviews/<slug>-detection-review.json`, then run `short:apply-detection-review` and continue from the reviewed catalog. When the user or a timestamped source sheet gives an exact reveal start, record it with `set_seconds` against the original source video time. Use `revealEndSeconds` for a longer slide window, `holdStartSeconds` when the clean display hold differs from the catalog identity timestamp, and `set_hold`/`holdSeconds` for one-card hold fixes.
- After `short:build`, run `short:gate --catalog <reviewed-catalog> --cut <cut-json>` before asking the user to watch a full render. Fix blockers first unless the render is explicitly for debugging.
- Render calibrated sports-card Shorts from the same portrait/card-centered working source used for reveal detection and review. Prefer `node agent/harness.mjs render --slug <slug> --cut <cut-json> --input portrait --no-audio`, or pass the explicit portrait source path. If an explicit `--input` is missing or wrong, the render script should fail rather than fall back to raw landscape footage.
- After `short:build`, run `short:audit-reveals` when reveal timing is in question and correct by card id using `cutStartSeconds` or `revealStartSeconds`.
- If the user gives feedback from the rendered video timeline, run `short:map-output --cut <cut-json> --times <MM:SS,...> --context 1` first. Treat the map as timestamp authority, then write card-id review decisions; do not convert render timestamps mentally.
- If a timestamp is ambiguous, mark the instruction as `noop` with a note and ask before rendering.
- Source timeline and output timeline must be explicit. Use `source` unless the user clearly says they are watching the rendered video.
- Claude/Codex may suggest unlocked edits, but may not alter locked edits without explicit user approval.
- If the harness table does not match the user's intent, fix the instruction JSON and regenerate the plan.
- Use video-use-style inspection/self-eval for cut quality, but use this harness for timestamp authority.
- Use Hyperframes for overlays/counters/rendered composition work, after approved cuts are stable.
