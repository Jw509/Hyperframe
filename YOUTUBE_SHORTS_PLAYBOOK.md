# YouTube Shorts — Editing Playbook

Every editing principle and technical lesson learned building the card-opening Shorts pipeline. Use this as a reference for any future Shorts work, regardless of subject matter.

---

## 1. Output specs

| Setting | Value | Why |
|---|---|---|
| Resolution | **1080 × 1920** | YouTube Shorts vertical |
| Frame rate | **60 fps** | Source filmed at 60 → rendering at 30 stutters fast motion (hand swaps, card flips) |
| Container / codec | MP4 / H.264 + AAC | Universal playback, YouTube re-encodes anyway |
| Aspect ratio | 9:16 portrait | The whole point of Shorts |
| Total length | **45–60 seconds** | Under 60s loops naturally; YouTube favors completion ratio over watch time |
| File size for ~60s | ~80–170 MB | At CRF 19 / 60fps / 1080p |

---

## 2. Source video → Shorts conversion

The dominant challenge: most footage is filmed **16:9 landscape**, but Shorts are **9:16 portrait**. You're throwing away 56% of the pixels no matter what.

### Spectrum of solutions, best to worst

1. **Reshoot in portrait** *(if possible)* — phone propped vertical, no cropping decisions. Eliminates every problem on this list.
2. **Keyframed pan within `object-fit: cover` crop** *(realistic fix for existing landscape footage)*. Source at `transform: scale(1.10–1.15)` gives ~±140px of vertical pan room. During specific overlay windows, animate `y` to push the subject out of the overlay zone, then back. Reads as cinematography, not a hack.
3. **Subject-tracking auto-reframe** — Premiere/DaVinci's "Auto Reframe" feature. Quality varies; good for talking heads, mixed for hands-and-objects content.
4. **Static off-center crop** — lock the 9:16 window to one third of the 16:9 frame. Only works if subject is consistently in that part of the frame.
5. **Blurred background letterbox** — show 16:9 in middle, blurred copy filling top/bottom. Loses 60% of vertical real estate to filler. Reads as low-effort.
6. **Branded letterbox / split layout** — top half source, bottom half branding/stats panel. Niche use case.

### Practical settings for #2 (the realistic default)

```css
#source-video {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 1920px;
  object-fit: cover;
  object-position: center center;
}
```

```js
gsap.set("#source-video", { scale: 1.15, transformOrigin: "center center" });
// Per problem reveal:
tl.to("#source-video", { y: 80, duration: 0.5, ease: "power2.inOut" }, revealStart - 0.3);
tl.to("#source-video", { y: 0, duration: 0.5, ease: "power2.inOut" }, revealStart + revealDur + 0.1);
```

`scale(1.15)` is the sweet spot — enough vertical pan range without aggressive edge cropping.

### Pre-encode the source

Always re-encode 4K (or anything > 1080p) source to 1080p H.264 **before** rendering:

```bash
ffmpeg -i source.mp4 -vf scale=1920:1080 -c:v libx264 -crf 19 -preset fast -r 60 -c:a copy source-1080p.mp4
```

Two reasons:
- **Node's `readFileSync` has a 2 GB Buffer ceiling.** A 4K 60fps 100s source is ~2.3 GB. Hyperframes' headless server throws `ERR_FS_FILE_TOO_LARGE` (range requests work around it, but you'll see warnings flood the render log).
- **Render speed.** Rendering from a 1080p source is ~2× faster than from 4K, with zero output-quality difference (you're cropping/scaling to 1080p anyway).

---

## 3. Safe zones — the iPhone Dynamic Island problem

iPhones with notches/Dynamic Island clip a chunk of the screen top. UI elements (likes, comments, profile pic) eat bottom real estate.

| Zone | Pixels (in 1080×1920) | Status |
|---|---|---|
| Top notch / Dynamic Island | y = 0–130 | **Hidden on iPhones** — never put critical content here |
| Bottom UI | y = 1700–1920 | **Covered by YouTube UI** in the Shorts player |
| Safe zone | y = 130–1700 | Your real canvas |

**Practical rules:**
- Overlay containers start at `top: 150px` or below
- Critical text (values, labels) stays inside the safe zone
- Background source can extend edge-to-edge (it'll be hidden behind notch/UI, not clipped from your composition)

---

## 4. Overlay design — liquid glass

Modern Shorts read as "premium" when overlays use **frosted/liquid glass** aesthetic. Translucent panels with backdrop blur.

### CSS template

```css
.overlay {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;  /* 24-28px for chunky rounded corners */
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  padding: 16px;
}
```

### What makes the glass effect work

- `backdrop-filter` **does render correctly** in Hyperframes' headless Chromium. Confirmed.
- The blur is most visible against **high-chroma-variation backgrounds**. Uniform-color backgrounds (a single-color mat, a sky) smear into more uniform color — blur is "working" but invisible.
- Light tint (`0.08` alpha) keeps the glass subtle. Heavier tints (`0.15+`) start looking like a translucent box, not glass.
- Inset highlight (`inset 0 1px 0 ...`) sells the "real glass" feel.

### Typography

- **White text by default.** Translucent backgrounds make any color text harder to read, especially small text. White + subtle text-shadow is the safe pattern.
- **Money colors** only on the dollar amounts, not the labels: `#4ade80` (green) for profit/earned, `#f87171` (red) for cost/spent.
- **Heavy weights** (700–900) for value/headline text. At small sizes in Shorts viewports, anything lighter than 700 reads weak.
- **Wide letter-spacing** (4–8px) on small uppercase labels for that "broadcast caption" feel.

### Gold/brand accent

`#d4a017` works as a single brand accent (dot, accent line, dot under label). Used sparingly. Don't tint entire text in brand colors against translucent — washes out on mixed backgrounds.

---

## 5. Animation patterns

### Reveal in/out

Single direction slide + opacity. The direction tells a story:
- **Slide in from edge → slide back out same edge** = "side-drawer UX". Card slides in from the right, holds, slides back out to the right. Reads as "this is information arriving and leaving."
- **Slide down + fade in → slide up + fade out** = "tooltip / callout". Good for top-anchored elements.
- **Scale + fade in (back.out ease) → fade out** = "this is the big moment." Use for end recap, never for routine reveals.

### Duration sweet spots

| Animation | Duration | Ease |
|---|---|---|
| Slide-in for routine reveals | **0.3s** | `power3.out` |
| Slide-out for routine reveals | **0.4s** | `power2.in` |
| Scale-pop for climactic reveal | **0.7s** | `back.out(1.4)` |
| Source pan in/out | **0.5s each** | `power2.inOut` |

### Hold times

| Type | Hold | Total visible (in + hold + out) |
|---|---|---|
| Normal reveal | 1.8s | 2.5s |
| Money shot (highlighted reveal) | 4.0s | 4.7s |
| End recap | 3-5s after count-ups land | 5-7s total |

### Reveal onset delay

**Show the subject naked for ~1.0s before dropping the overlay on it.** Viewer needs to register what they're seeing before the overlay adds metadata. Without the delay, the overlay feels like a label slapped onto an unread page.

```
brief reveal time: 0:18.0  (when card is shown in source)
overlay data-start:  0:19.0  (1.0s later)
```

The "lateness" is intentional. Without it, the overlay covers the subject before the viewer has parsed what they're looking at.

---

## 6. Persistent HUD elements

For content with running state (running total, score, timer, etc.), use a **persistent corner card**:

```
Top-left corner, y ≥ 150, width ~200px:

┌──────────────┐
│ LABEL_1      │
│ $VALUE_1     │  ← red color
│              │
│ ─────────    │
│              │
│ LABEL_2      │
│ $VALUE_2     │  ← green color
└──────────────┘
```

### Counter animation pattern

**Animate count-ups, don't snap.** Use GSAP tweens on a state object with `onUpdate`:

```js
const counterState = { value: 0 };
tl.to(counterState, {
  value: newTotal,
  duration: 0.6,
  ease: "power1.out",
  onUpdate: () => {
    el.textContent = "$" + counterState.value.toFixed(2);
  },
}, startTime);
```

The count-up reads as "look at this number going up" — much more compelling than a snap.

### Color coding

Universal convention:
- **Red (`#f87171`)** = money spent / cost / loss
- **Green (`#4ade80`)** = money earned / profit / gain

Viewers parse the colors before they read the numbers. Don't violate the convention.

---

## 7. End recap — the closing moment

The final 5-7 seconds of a Short have outsized importance. They're what people see right before they decide to like, comment, share, or scroll. Design them deliberately.

### What goes in the recap

- The headline result (profit, score, total)
- Comparison numbers (cost vs. earned, before vs. after)
- A single emotional beat (the big number in big type with color)

### Recap design choices

1. **Center the recap on screen** for maximum focal weight. No competing content.
2. **Make typography 1.5–2× larger than mid-video overlays.** This is the climax — give it space.
3. **Stage the reveal:** card fades in → totals count up → profit row fades in just before its count-up → profit counts up to final value. Each stage gets 0.5–1.5s.
4. **Fade in the profit row just before its count-up animation starts.** Showing "+$0.00" sitting idle for 1-2 seconds reads as a glitch. Hide it, then bring it in right when the value starts moving.
5. **White label, money-color value.** Label "PROFIT" or "TOTAL" stays white (legible on any backdrop). Only the dollar amount gets the green/red treatment.

### Recap requires runway

Compute: recap appears at time T, takes ~5 seconds to animate through. Source video must run until at least T + 5. If your cuts produce a video that ends at T + 2, either:
- Extend the last source-segment cut to give the recap runway
- Speed up recap animations (riskier)

**Don't end the source video while the recap is mid-animation.**

---

## 8. Cuts & pacing

### Manual cut list beats auto-detect

Silence detection (`ffmpeg silencedetect`) finds plausible cut candidates but produces choppy or arbitrary edits without human direction. **Write the cut list yourself** as you watch the source:

```
keep 0:00 to 0:0.5
cut 0:0.6 to 0:3.8
keep 0:3.9 to 0:5.0
cut 0:5.0 to 0:10.4
keep 0:10.5 to 0:12.6
...
```

Save as JSON for reusable scripting:

```json
{
  "segments": [
    { "start": 0.0,  "end": 0.5,  "note": "intro hint" },
    { "start": 3.9,  "end": 5.0,  "note": "intro hint" },
    { "start": 16.7, "end": 21.2, "note": "first comp reveal" },
    ...
  ]
}
```

### Cross-check reveal moments against cuts

Before running the cut, walk every overlay's source timestamp against the cut list. Any reveal moment that falls in a cut zone needs resolution:
- **Extend the nearby keep** to cover the reveal moment (most common fix)
- **Move the reveal** to a different source moment
- **Drop the reveal** if the content isn't worth preserving

### Quick cuts for retention

For "B-roll" content (non-headline beats), use **0.4–0.7s flashes**:
- Each flash = one identifiable subject
- Hard cut between them — no fades
- Optional SFX (cardswap, transition whoosh) on each flash to mask the hard cut audibly

Pattern: rapid sequence of 3–6 quick flashes interspersed between headline beats. Keeps retention high without padding watch time.

### Smoothing fumble moments

If the subject hesitates, fumbles, or pauses mid-motion in the source, **cut around the pause** to make it look like continuous motion:
- Identify the hesitation (e.g., user moves card halfway, stops, then completes the motion)
- Cut the static portion
- The two adjacent motion clips concatenate into "one smooth move"

This works because the human eye reads motion as continuous if the start and end positions match closely.

### Pre-cut via ffmpeg, not in-composition

Pre-cutting the source via ffmpeg `trim`+`atrim`+`concat filter_complex` is far more reliable than:
- Multiple `<video>` elements in the composition
- `currentTime` manipulation via JS

Both alternatives have edge cases (codec switching, seek lag, browser quirks under headless render). One linear `<video>` element playing a pre-cut source is the durable pattern.

---

## 9. Audio

### Default: strip source audio, add SFX + music separately

Raw source audio (mic noise, breathing, ambient room) usually hurts more than helps in a Short. Best workflow:

1. **Strip source audio** from the cut MP4 via ffmpeg `-an`. **Don't rely on `muted` attribute** on the `<video>` element — Hyperframes still includes source audio in the rendered output. Strip it at the cut step.
2. **Add SFX** (transition sounds, money chimes, swap effects) as `<audio>` elements on the composition timeline.
3. **Add music in post** — drop the rendered MP4 into a DAW or video editor and lay a music bed underneath. Don't try to mix music in Hyperframes.

### Hyperframes `<audio>` element requirements

```html
<audio
  id="sfx-1"
  class="clip"
  data-start="8.20"
  data-duration="0.53"
  data-track-index="13"
  src="../sounds/cardswap.m4a"
></audio>
```

- **`id` is REQUIRED.** Without it, the audio renders SILENT (lint catches this).
- `class="clip"` + `data-start` + `data-duration` + `data-track-index` like any timed element.
- Each audio gets a unique `data-track-index` even if temporally non-overlapping. Easier than reasoning about audio-vs-video track conflicts.

### SFX volume

The SFX files I work with typically run hot — peaks at 0 dB and loud transients. In post, expect to **drop SFX by 3–6 dB** in the music mix so they sit under the bed rather than punching through.

### Verify the audio actually rendered

After render:
```bash
ffmpeg -i output.mp4 -af volumedetect -f null NUL 2>&1 | grep volume
```
- `mean_volume: -91 dB` and `max_volume: -91 dB` = truly silent (digital silence)
- Anything else = audio is in there. If you expected silence, investigate.

---

## 10. Iteration loop

Building a Short visual is iterative. Plan for multiple render passes.

### Per-iteration ritual

1. Apply change to composition
2. `npm run check` (lint) — fixing errors here is cheaper than discovering them during render
3. Render with `--fps 60 --format mp4 -o renders/<slug>/final-vN.mp4`
4. Sample 3-5 frames at key timestamps via `ffmpeg -ss T -i v.mp4 -frames:v 1 -update 1 frame.png`
5. View frames, decide next change

### Don't watch the whole video for visual fixes

A 60s video at 60fps is 3600 frames. You don't need to watch all 60 seconds to know if an overlay landed correctly — sample the 3-5 frames around each critical moment. Faster, less destructive to focus.

### Save every version

Keep `final-v1.mp4`, `final-v2.mp4`, … through the project. Comparing v17 to v18 to v19 is how you know whether a change actually helped. Disk space is free; deleting versions is permanent.

### Version naming conventions

`final-v<N>.mp4` is fine for solo work. The brain remembers "v8 was where the recap centered" better than `final-2026-05-22T14-03-rev3.mp4`.

---

## 11. Hyperframes-specific notes

If you're using HeyGen Hyperframes (the framework I built this with), the platform-specific rules:

### Required attributes on timed elements

```html
<div class="clip" data-start="..." data-duration="..." data-track-index="...">
```

All four are needed: `class="clip"`, `data-start`, `data-duration`, `data-track-index`. Lint enforces this.

### Source video audio handling

```html
<!-- Video carries source audio to render output: -->
<video data-has-audio="true" ...>

<!-- Video is silent: -->
<video muted ...>
```

Lint rejects videos that have neither. **Note:** `muted` doesn't actually strip audio from the rendered MP4 — it's a hint only. To truly mute, strip audio from the source MP4 itself via ffmpeg `-an`.

### CSS centering interferes with GSAP

```css
/* DON'T mix CSS translate with GSAP transforms: */
.overlay { transform: translateX(-50%); }  /* breaks */

/* Center via GSAP xPercent so animations compose correctly: */
gsap.set(".overlay", { xPercent: -50 });
tl.to(".overlay", { x: 80, ... }, t);
```

GSAP overwrites the whole `transform` property when it animates `x`/`y`/`scale`. CSS translate gets stomped. Use `xPercent`/`yPercent` for static centering, then `x`/`y` for animation.

### Animation determinism

Hyperframes seeks each frame independently during render. State must be reproducible from any timeline position:
- **Use tweens, not callbacks** for state changes — `tl.to(state, { value: 100, onUpdate: ... }, t)` is reproducible at any seek; `tl.add(() => state.value = 100, t)` only fires during forward playback.
- **`onUpdate` callbacks DO fire during seek** — so animated counters render correctly at any frame.
- **No `Date.now()`, no `Math.random()`** in composition logic. Anything non-deterministic breaks the parallel-render workers.

### Timeline registration

GSAP timeline must be paused and registered:

```js
const tl = gsap.timeline({ paused: true });
// ... build timeline ...
window.__timelines = window.__timelines || {};
window.__timelines["composition-id"] = tl;
```

Hyperframes drives the timeline frame-by-frame from this registration.

### Track index uniqueness

Two clips with overlapping `data-start`/`data-duration` ranges on the **same track index** are a lint error. Give every overlapping clip its own unique track index even if you don't care about layering. Audio elements: still give each its own track index.

### Composition file size warning

Hyperframes warns at ~350 lines. Just a warning, doesn't block rendering. If you exceed it, consider splitting via `data-composition-src` sub-compositions — but for one-off per-video files, the warning is safe to ignore.

---

## 12. Tooling shortcuts

Small scripts that paid for themselves many times over:

| Script | What it does | When to use |
|---|---|---|
| `scripts/cut-source.mjs` | Reads `briefs/cuts/<slug>.json`, ffmpeg-cuts the source video to spec, outputs `<slug>-cut.mp4`. Supports `--no-audio` flag. | Every per-video cut iteration. |
| `scripts/trim-comps.py` | Auto-trims left/right white space from eBay/reference screenshots via PIL. Outputs to a `-trimmed/` subfolder. | Once per video, after dropping screenshots in. |
| ffmpeg frame extraction | `ffmpeg -ss T -i v.mp4 -frames:v 1 -update 1 frame.png` | Verifying overlay timing without watching the whole video. |
| ffmpeg volume detect | `ffmpeg -i v.mp4 -af volumedetect -f null NUL` | Verifying audio is actually silent (or actually present). |

---

## 13. Pivots that didn't work, and why

Saved here so future iterations don't repeat the experiments:

### DaVinci Resolve Free + FCPXML
Tried importing pre-rendered title MOVs into Resolve via FCPXML. **Clip-linking is unreliable** on free Resolve on Windows — the "clip not found" dialog appears even with correctly-named files in the same folder as the FCPXML.

### DaVinci Resolve Free + Python API
Tried the `DaVinciResolveScript` external API. **Free Resolve silently blocks** external scripting — `scriptapp("Resolve")` returns `None` despite the DLL loading. The "External scripting using = Local" preference Blackmagic docs reference doesn't exist in free.

### In-app Resolve Scripts menu
Works but adds friction (every iteration requires re-opening Resolve and clicking a menu item). The Hyperframes-only pipeline avoids this entirely.

### Single overlay with all info (early attempt)
Tried cramming comp screenshot + value + label + animation into one giant overlay. Looked busy at small (mobile) sizes. **Separate compact elements** with consistent positioning works better.

### "Muted" attribute as audio control
Believed `<video muted>` would strip audio from render output. **It doesn't** — strip audio from the source MP4 itself.

---

## 14. Defaults worth memorizing

If you're starting fresh on a new Shorts project, these are the safe defaults:

```
Resolution:           1080 × 1920
FPS:                  60
Source pre-encode:    1080p H.264, CRF 19, 60fps, AAC audio (or -an for silent)
Overlay top edge:     y = 150 (notch-safe)
Overlay aesthetic:    Liquid glass — bg 0.08 / border 0.18 / blur 28px / radius 24px
Reveal onset:         at + 1.0s (subject seen naked first)
Slide in/out:         0.3s / 0.4s
Hold:                 1.8s normal / 4.0s money shot
Recap position:       center, scale 1.5× the normal overlay
Recap animations:     fade in card 0.7s → total count 1.4s → profit fade-in 0.5s → profit count 1.2s
Total video length:   45–60s
Audio in source:      strip via ffmpeg -an; add SFX as <audio> elements; add music in post
```

Deviate from these only when the content demands it.
