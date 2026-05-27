# EditHyper Pipeline — Design Notes

> **Box structure note:** 2025 Bowman Chrome University Hobby box = **20 packs × 4 cards = 80 cards total**. Earlier assumption of 12 packs × 5 cards was wrong (corrected by user). Always verify pack count from the box face in the source video before estimating cuts.



Living doc for how the card-opening video pipeline is built and why. Updated as decisions change.

---

## Setup (new machine)

This repo holds the **pipeline code only** — the heavy source footage and renders are gitignored. After cloning, drop your own source video into the matching folders (`EditHyper/<slug>.mp4`, `cards/sources/<slug>/`).

### Prerequisites

- **Node.js** 18+ — runs `npx hyperframes` and the `scripts/*.mjs` build tools
- **Python** 3.10+ — runs the `video-use` helpers and `scripts/*.py`
- **ffmpeg / ffprobe** on PATH — Windows: `winget install Gyan.FFmpeg` · macOS: `brew install ffmpeg` · Linux: `sudo apt install ffmpeg`
- **git**

### Agent skills

The pipeline is driven by two Claude Code skill sets that install into `~/.claude/skills/` (global — intentionally not committed to this repo). Install both, then **restart Claude Code** so it discovers them.

**1. HeyGen Hyperframes** — title compositions, rendering, GSAP/Three/Lottie, etc.:

```bash
npx skills add heygen-com/hyperframes -g --skill '*' --agent claude-code -y --copy
```

**2. browser-use video-use** — transcript-driven cut detection + filmstrip/waveform helpers:

```bash
# Windows (Git Bash or PowerShell), macOS, Linux — clone straight into the skills dir
git clone https://github.com/browser-use/video-use "$HOME/.claude/skills/video-use"
python -m pip install -e "$HOME/.claude/skills/video-use"   # or: uv sync, if you have uv
```

Optional: `video-use` transcription needs an ElevenLabs key — copy `.env.example` to `.env` inside `~/.claude/skills/video-use/` and set `ELEVENLABS_API_KEY=...`.

**Verify:** `npx skills list -g` shows both skill sets, and `ffprobe -version` prints a version.

---

## Current state (2026-05-25 — bowmanchrome2025 video)

**Pipeline pivoted from "AI auto-detect cuts" → "user-driven cut editor + AI does crops/overlays".** After 12 iterations of failed auto-cut attempts (v1-v12) the user took over cut editing via a local HTML tool I built. This works much better — AI is good at framing/overlays/scripting, bad at judging editing taste.

### Source

- **Original:** `C:/Users/J/Desktop/Hobbybox/2026-05-23 19-15-10.mp4` — 20:05, 20.17 GB, 1920×1080 60fps with audio
- **Reasons to skip:** audio quality issue from recording, so the user pivoted from landscape long-form → silent Shorts
- **Box:** 2025 Bowman Chrome University Hobby (20 packs × 4 cards = 80 cards), box cost $210

### Active pipeline files

| Path | What |
|---|---|
| `cards/sources/bowmanchrome2025/bowmanchrome2025-1080p.mp4` | 2.1 GB landscape re-encode (kept for reference) |
| **`cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4`** | **2.57 GB silent portrait 1080×1920 — THE working source. Has keyframed pans baked in (see below).** |
| `cards/sources/bowmanchrome2025/bowmanchrome2025-cut-portrait.mp4` | 735 MB / 7:37 / 87 segments — current rendered rough cut (regenerated whenever cuts JSON updates) |
| `briefs/cuts/bowmanchrome2025.json` | live cuts file consumed by `cut-source.mjs` |
| `briefs/cuts/bowmanchrome2025-558test-cuts.json` | early 33-cut snapshot (backup) |
| `briefs/cuts/bowmanchrome2025rough-cuts.json` | 87-cut rough snapshot (backup) |
| `briefs/cuts/bowmanchrome2025pan-cuts.json` | 88-cut snapshot with Kyson Brown insert added (backup) |
| `cut-editor.html` | local browser-based cut editor — http://127.0.0.1:8081/cut-editor.html |
| `scratch/render-pan-test.mjs` | fast pan-iteration helper — renders 30s test clip in ~30s |
| `scripts/cut-source.mjs` | now supports `--input portrait` flag (defaults to `1080p` for backward compat) |

### Portrait crop spec (baked into the portrait MP4)

ffmpeg filter, applied during the 20-min portrait re-render:
```
scale=-2:1920,crop=1080:1920:'(iw-1080)/2 + <X(t)>':0
```
Where `X(t)` is a piecewise linear function:

| Source window | X shift | Why |
|---|---|---|
| 0 → 410s | +100 | Default — host's mat is offset, +100 keeps cards centered |
| 410-412 | +100 (hold) | Pre-pan buffer |
| 412-413 | ramp +100 → +400 | Kyson Brown card starts moving right |
| 413-414 | ramp +400 → +700 | Peak follow |
| 414-415.5 | hold +700 | Card displayed off-right |
| 415.5-416.5 | ramp +700 → +500 | Return starts |
| 416.5-417.5 | ramp +500 → +200 | Sharp pan-back |
| 417.5-418.5 | ramp +200 → +100 | Settled at default |
| 649-656 | 0 (centered) | Fan #1 pan-left |
| 684-691 | 0 (centered) | Fan #2 pan-left |
| Everywhere else | +100 | Default |

### Cut editor workflow (current)

1. User opens http://127.0.0.1:8081/cut-editor.html (served via `npx http-server -p 8081`)
2. Loads portrait MP4 by default
3. Marks cuts with `I` (Cut Start) / `O` (Cut End) / Enter (Add Cut)
4. **localStorage auto-save** on every cut add/delete (survives tab close)
5. Exports JSON with smart filename (`bowmanchrome2025-cuts-YYYYMMDD-HHMM-Ncuts.json`)
6. User saves exported file to `briefs/cuts/bowmanchrome2025.json` (overwriting)
7. AI runs `node scripts/cut-source.mjs bowmanchrome2025 --input portrait --no-audio`
8. Output at `cards/sources/bowmanchrome2025/bowmanchrome2025-cut-portrait.mp4` — user verifies in any player

### Pan iteration loop (fast)

Re-rendering the full 20-min portrait takes ~25 min. For tuning pan keyframes:
1. Edit `KEYFRAMES` array in `scratch/render-pan-test.mjs`
2. Run `node scratch/render-pan-test.mjs`
3. Output `scratch/pan-test.mp4` (~30s clip) ready in ~30s
4. User confirms timing/peak/return rate
5. Once locked, bake into full portrait re-render

### Identified cards (so far, by user during cut editing)

Pack 1: Junior Vandross (Toledo), Billy Edwards Jr (Wisconsin), Jaovantae Barnes (OU silver refractor), Jadan Baugh (Florida)
Pack 2: DeSean Bishop (Tennessee), **Joe Royer (Cincinnati gold sparkle — HIT)**, Aiden Chiles
Pack 3: Luke Hasz, Harrison Wallace III, Trey Dez Green
Pack 4: LJ Martins (+ 3 more TBD)
Pack 5: College Rule Playbook (Georgia insert), Michael Van Buren (Mississippi State), purple insert (TBD player)
Pack 6+: Kyson Brown (Kentucky), AUSTIN (Akron — **possible AUTO HIT**), more TBD

**Also from earlier identification:** Eric Singleton Jr (Auburn blue sparkle AUTO), Adrian Norton (gold sparkle AUTO at src 80s).

### Next planned work

| Item | Status |
|---|---|
| User finishes cut editing | In progress (87 cuts so far, 7:37 rough) |
| **SFX system** (trash-insert sting, money-shot chime, comp ding, box-cost reveal) | Pending |
| **Meme/humor pop-up overlay system** | Pending |
| Phase 2 keyframed pans (other off-center moments) | Triggered as user calls them out |
| Re-add sale-card overlays + tracker + recap (from earlier playbook) once cuts are locked | Pending |

### Important rules locked in `memory/rule_show_all_cards.md`

- Every card must be shown (no exceptions)
- No audio anywhere (strip source + no SFX in render output)
- Cut rhythm: ~0.7s pack open + fan + cards (~1s each, hits longer)
- Thumb is the slide marker
- Recurring failure mode #1: skip first card of pack — structurally blocked in build script
- Recurring failure mode #2: include "put it back over next card" shot — auto-buffered 7s after headliners

---

## Strategy: chat-driven Hyperframes, no DaVinci

**Originally:** Render title overlays as standalone ProRes 4444 MOVs via HyperFrames, drop them onto a V2 track in DaVinci Resolve over the source on V1, edit cuts manually in Resolve.

**What broke:**
- **FCPXML import:** Resolve couldn't link the staged clips (`The clip was not found` dialog kept appearing). Path-resolution bug in free Resolve on Windows.
- **Resolve Python API (`build_resolve.py`):** `bmd.scriptapp("Resolve")` returns `None` silently on free Resolve, even with Resolve running and the `fusionscript.dll` loadable. The "External scripting using = Local" preference Blackmagic docs reference doesn't exist in the free version. Confirmed 2026-05-22.
- **In-app Workspace → Scripts → Edit menu:** Works, but adds friction (manual click after every brief change) and still requires Resolve to be running to preview.

**Pivoted to (2026-05-22):** Skip DaVinci entirely. Per-video chat brief → I build a single HyperFrames composition that ingests the source video, lays title overlays on top, and renders one final MP4. Iteration happens in chat — not in a Resolve timeline.

**Why this is better for this workflow:**
- One renderer, one output format, no clip-linking pain.
- Per-video CSS/JS tweaks are trivial (just edit the composition).
- Deterministic — same brief always produces the same MP4.
- No 2nd app required for preview; the rendered MP4 plays anywhere.

**What's dead:**
- `scripts/build_resolve.py` (removed)
- `projects/<slug>/<slug>.fcpxml` (removed)
- FCPXML emitter in `scripts/build-edit.mjs` (removed)
- Any "drop MOVs into Resolve V2" step in `WORKFLOW.md` (removed)

---

## Repo research (2026-05-22)

Pulled patterns from two upstream projects before designing v2 of the composition:

### [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)

**Key things we were doing wrong / didn't know:**

1. **Source-video audio:** the cards CLAUDE.md said "Videos use `muted` with a separate `<audio>` element." That's the multi-clip pattern. For a single source video that should carry its own audio through to the render, the right pattern is **drop the `muted` attribute and add `data-has-audio="true"`** on the `<video>`. Lint enforces this — it errors if a video has `data-start` but is neither muted nor declared audible.

2. **`--fps` flag** controls frame-sampling precision during capture. Default is 30. Use `--fps 60` for source video that's 60fps; rendering at 30fps from a 60fps source visibly stutters in fast motion.

3. **Determinism:** Animations must use registered runtimes on `window.__timelines` (GSAP), `window.__hfLottie`, `window.__hfAnime` etc. Wall-clock timing (setTimeout, requestAnimationFrame for animation, Date.now) breaks frame-accurate seeking.

4. **Layering:** Stack via `data-track-index` (higher index = on top of lower). Don't put two clips on the same track at overlapping times — lint catches it.

5. **`backdrop-filter` works in render.** Chromium's blur-the-background filter renders correctly in Hyperframes' headless capture. Effect is most visible when the source content behind has chroma variation (uniform backgrounds smear into more uniform backgrounds — the blur is "working" but invisible).

### [browser-use/video-use](https://github.com/browser-use/video-use)

**Patterns to steal when we add cuts:**

1. **Transcript-first cut detection.** Don't try to analyze raw frames — that's 30,000 frames × 1,500 tokens of noise. Run source audio through a word-level transcriber (ElevenLabs Scribe is what they use), let the LLM reason over packed transcript text. Cuts land on word boundaries and silence gaps.
2. **Silence detection** via `ffmpeg silencedetect` is the cheapest signal for "where could this cut?"
3. **Visual validation on demand.** Render filmstrip + waveform PNG at decision points so the agent can "see" the section it's about to cut.
4. **Modular ffmpeg chains** for color grades / fades / effects, applied per segment.
5. **Parallel animation rendering** via sub-agents — one per overlay.

---

## Current state (v14, 2026-05-22)

**Final render:** `cards/renders/selecthangerpack2024/final-v14.mp4` — 1080×1920 / 60fps / 108.8s

**Composition file:** `cards/compositions/final-selecthangerpack2024.html` (per-video, generated from the brief)

### Three overlay components

```
┌─────────────────────────┐
│ [Pack tracker]          │  ← top-left, persistent from t=8s
│ ┌──────────┐            │     PACK COST $19.99 (red)
│ │PACK COST │            │     CARDS PULLED TOTAL $0.00 (green)
│ │$19.99    │            │     counts up at each reveal
│ │PULLED    │            │
│ │$42.70    │            │
│ └──────────┘            │
│                         │
│              [Sale card]│  ← right edge, mid-screen
│              ┌────────┐ │     visible per-reveal only
│              │ comp   │ │     slides in from off-screen right
│              │ ⬤ SALE  │ │     slides back out same direction
│              │ $25    │ │
│              └────────┘ │
│                         │
│      [hand + card here] │  ← source video plays through
│                         │
└─────────────────────────┘

At end (t=96.8s to 108.8s):
- Tracker fades out at 96.4s
- Recap card slides in mid-left:
  PACK COST $19.99
  TOTAL $42.70
  PROFIT (white label) +$22.71 (green amount)
```

### Locked design decisions

| Concern | Decision | Reason |
|---|---|---|
| Aspect ratio | 1080×1920 portrait | YouTube Shorts. User wants flexibility to also cut landscape later from the same 16:9 source. |
| Framerate | 60fps | Source is 60fps; rendering at 30fps stutters hand motion. |
| Source crop | `object-fit: cover` on 1080×1920 box from 1920×1080 source | Center-crops sides. Cards held centered in frame, so action is preserved. |
| Source zoom | `scale(1.15)` base on `#source-video` | Gives ±144 vertical pan room without exposing letterbox at any pan amount we use. |
| iPhone notch safety | Overlays start at y≥150 | Below the Dynamic Island safe zone (~top 130px on modern iPhones). |
| Title onset delay | `at + 1.0s` | Viewer sees the card naked for 1 full second before the overlay drops on it. Mitigates overlay covering the top edge of the card. |
| Sale-card position | Right edge, mid-screen vertical (`left: 819, top: 580`, width 221) | Hand wraps around the card from the left, so the right side is mostly clear. Doesn't compete with the centered cards. |
| Sale-card animation | Slide in from `x: +320` (off-screen right) over 0.5s with `power3.out`. Slide out the same way over 0.4s with `power2.in` | Reads as "side-drawer" UX. |
| Tracker position | Top-left, persistent | Traditional scoreboard position. Notch-safe. |
| Tracker colors | PACK COST in `#f87171` red, CARDS PULLED TOTAL in `#4ade80` green | Intuitive spent-vs-earned read at a glance. |
| Recap position | Mid-left, vertically centered | Card stays visible (cards centered in frame). |
| Recap labels | "PROFIT" label white, dollar amount green | Green label washes out on green/yellow backgrounds. White label always readable; only the money color carries. |
| Profit row reveal | Hidden initially, fades + slides in 0.25s before count-up starts | Avoids "+$0.00 sitting idle" beat that read as a glitch. |
| Glass aesthetic | `bg: rgba(255,255,255,0.08)`, `border: rgba(255,255,255,0.18)`, `backdrop-filter: blur(24-28px) saturate(140%)`, `border-radius: 24-28px`, soft shadow + inset highlight | Matches the user's reference image (frosted/liquid glass). Light tint keeps text legible. |
| Comp screenshot bg | Solid white inside its rounded box | The eBay screenshot is the proof element. Opaque on glass card for max readability. |
| Pan + shrink (severe reveals) | `data-pan-y="80"` on reveals 2, 5, 7, 8. `data-shrink="0.75"` on reveals 5, 7 | These have cards held high in frame or two cards stacked. Pan pushes source content down; shrink reduces overlay footprint. Both ease in/out smoothly. |

### Per-video workflow (current)

1. User drops source video at `EditHyper/<slug>.mp4`.
2. User captures eBay sold-listing screenshots, drops them in `cards/comps/<slug>/`.
3. User writes brief at `briefs/<slug>.json` (`source`, `reveals[]`, `box_cost`, `intro_end`, `money_shot`, `comp_image`).
4. Claude:
   a. **Re-encodes source to 1080p** in `cards/sources/<slug>/<slug>-1080p.mp4`. Required — 4K source would hit Node's 2GB `readFileSync` buffer ceiling and throw `ERR_FS_FILE_TOO_LARGE` during render. Also speeds up render.
   b. **Trims comp PNGs** via `python scripts/trim-comps.py <slug>` → produces `cards/comps/<slug>-trimmed/` with horizontal white space removed.
   c. **Writes `cards/compositions/final-<slug>.html`** baked from the brief data (per-reveal sale-cards, tracker totals, recap, pan/shrink tags).
   d. **Lints**: `npm run check` (from `cards/`). Fix any errors before render.
   e. **Renders**: `npx hyperframes render -c compositions/final-<slug>.html --format mp4 --fps 60 -o renders/<slug>/final-vN.mp4` (from `cards/`).
   f. **Spot-checks** with ffmpeg frame extraction at key reveal timestamps.
5. User watches output, gives notes in chat. Claude regenerates v(N+1).

### Hyperframes-specific learnings (in addition to the repo notes above)

- **CSS centering vs GSAP centering.** CSS `transform: translateX(-50%)` interferes with GSAP transform animations (GSAP overwrites the whole transform property). Instead: use `gsap.set(el, { xPercent: -50 })` for centering, then animate `x` / `y` / `scale` freely. GSAP composes them internally.
- **transform-origin** matters for scale + slide animations. We use `"50% 0%"` (top center) on overlays that slide down/up so they shrink toward the top edge rather than drifting. For right-edge overlays we use `"100% 0%"` (top-right) so shrink anchors to the visible edge.
- **GSAP timeline must be registered on `window.__timelines["<composition-id>"]` and paused** at construction. Hyperframes seeks the timeline frame-by-frame during render.
- **GSAP `onUpdate` callbacks fire during seek**, so animated counters (running total, profit) render correctly at any frame — no need for special handling.
- **Don't use callbacks (`tl.add(fn, t)`) for state changes** if the state needs to be deterministic per-frame. Use tweens instead. Tweens are reproducible from any seek position; callbacks are only fired during forward playback.
- **Animation runtime: GSAP only here.** Anime.js / WAAPI / CSS animations are also supported by Hyperframes if needed, each on its own `window.__hf*` global.

---

## Cuts workflow (v16, 2026-05-22)

The source video gets pre-cut by ffmpeg before Hyperframes renders. Composition references the cut version. Overlay timestamps are remapped from source-time to cut-time.

### Why pre-cut vs in-composition

Pre-cutting via ffmpeg keeps the composition logic simple — one `<video>` element plays linearly from start to finish. Multiple stacked `<video>` elements or `currentTime` manipulation would each have edge cases (codec switching, seek lag, browser quirks under headless render).

### Pipeline

1. User writes manual cut list in chat: "keep 0:00-0:0.5, cut 0:0.6-0:3.8, keep 0:3.9-0:5, …"
2. Claude saves it to `briefs/cuts/<slug>.json`:
   ```json
   {
     "segments": [
       { "start": 0.0,  "end": 0.5,  "note": "intro hint" },
       { "start": 3.9,  "end": 5.0,  "note": "intro hint" },
       { "start": 16.7, "end": 21.2, "note": "reveal 1 @ src 18.8" },
       ...
     ]
   }
   ```
3. Run `node scripts/cut-source.mjs <slug>` — produces `cards/sources/<slug>/<slug>-cut.mp4` via ffmpeg `trim`+`atrim`+`concat` filter_complex. Re-encoded H.264 / AAC, 60fps.
4. Build a cut-timeline remap table:
   - Walk segments in order, accumulating cumulative cut-time at each segment boundary
   - For any source-time T inside segment i (src `start_i`–`end_i`, cumulative cut start `C_i`): cut-time = `C_i + (T - start_i)`
   - Source times outside any kept segment have no cut-time and need user resolution (extend a keep, move the reveal, or drop it)
5. Update composition with the new source path + remapped `data-start` for each reveal, the tracker, the recap, and the JS `RECAP_START` constant.
6. Lint + render. Output duration matches sum of segment durations.

### Files

- `scripts/cut-source.mjs` — reusable cut-runner; reads `briefs/cuts/<slug>.json`, writes `cards/sources/<slug>/<slug>-cut.mp4`
- `briefs/cuts/<slug>.json` — per-video cut definition; each segment has optional `note` for self-documentation
- `cards/sources/<slug>/<slug>-cut.mp4` — generated cut source; what the composition references

### Gotchas

- **Reveal moments inside cut zones.** Easy to miss. Always cross-check each reveal timestamp against the segment list before running the cut. Cleanest fix is to extend a nearby keep range to cover the reveal moment (we did this for reveal 3 — extended `0:43.0-0:45.1` to `0:43.0-0:45.3` to cover the `0:45.2` pop).
- **The recap needs runway.** Recap starts after the last reveal fades and holds 5+ seconds. Make sure the final kept segment leaves enough source-time after the last reveal so the cut-version still has space for the recap card.
- **Hard cuts in the source are visible.** When two non-adjacent source segments concat, you get a hand-position jump or audio chirp. Match-cut energy is high in card-opening videos so it usually reads as "intentional jump cut" — but if it looks bad, the fix is in the cut list (pick segments that visually flow into each other).

---

## Sound effects (v17, 2026-05-22)

Three SFX baked in via `<audio>` elements on the composition timeline. Files live at `cards/sounds/`:

| File | Triggered when | Duration | Plays |
|---|---|---|---|
| `cardswap.m4a` | Each non-comp quick-cut intro segment | 0.52s | 3× (cut 0.0, 0.5, 1.6) |
| `packcostsound.m4a` | Pack-cost tracker fades in | 1.17s | 1× (cut 3.7) |
| `cardmoneysound.m4a` | Each sale-card pops up | 0.68s | 10× (one per reveal) |

Audio elements are `class="clip"` with their own `data-start` / `data-duration` / `data-track-index`. They use the same Hyperframes timeline clock as everything else, so they stay synced under seek.

---

## v17 → v18 backlog

In rough priority order:
1. **Identify non-comp quick-cut moments inside long kept segments.** Currently `cardswap` only fires on the existing intro snippets. If there are other non-comp card flashes between reveals (inside the bigger kept ranges), the user needs to specify those source timestamps so I can either cut around them or add cardswap SFX at those moments.
2. **Auto silence-detect cuts.** `ffmpeg silencedetect` on source audio, treat long silences as cut candidates, propose cut list to user before manually writing one.
3. **Tighten money shot.** Brief slow-zoom or held freeze when `money_shot: true` lands, not just a longer overlay hold.
4. **Music bed.** Soft generic instrumental under the source audio during non-reveal stretches, ducked when commentary kicks in.
5. **Generalize per-video.** Bake the composition generation into `scripts/build-edit.mjs` so a new brief drives composition generation, comp trimming, source re-encode, cut application, and render in one command. Currently the composition is hand-written per video.
