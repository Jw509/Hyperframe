# Sports-Card Short — Standard Template

The proven end-to-end pipeline for a card-opening YouTube Short. **Use this for most Shorts.**
Reference build: **bowmanchrome2025 v18** (2026-06-07). Per-video data + decisions live in a plan file
modeled on `briefs/cuts/bowmanchrome2025.v18-inserts.json`.

> **Target:** 1080×1920 portrait, 60fps, **UNDER 3:00** (YouTube Short max = 180s). Cut is silent; SFX added in post.

---

## Reference implementation (adapt per slug)
| Stage | File |
| --- | --- |
| Plan / EDL (decisions, inserts, comps, status) | `briefs/cuts/<slug>.v18-inserts.json` |
| Cut + speed + per-card output positions | `scratch/gen-v18-speed.mjs` → `scratch/build-v18-speed.sh` (also writes `scratch/v18-card-positions.json`) |
| Overlay composition | `scratch/gen-bowman-overlays.mjs` → `cards/compositions/final-<slug>.html` |
| SFX mix | `scratch/gen-sfx.mjs` → `scratch/build-sfx.sh` |
| Title card (glass, outlined) | `cards/compositions/title-card.html` |
| Comp values + mapping | `cards/comps/<slug>/comps.json` (read from eBay screenshots) |
| SFX assets | `cards/sounds/` (cardswap, cardmoneysound, packcostsound) |
| Working source | `cards/sources/<slug>/<slug>-portrait.mp4` (1080×1920, baked pans, silent) |

---

## Pipeline

**0. CATALOGUE FIRST — HARD GATE.** Screenshot + name→timestamp list of every card BEFORE any cutting. Announce it if skipped. (memory: rule_card_catalogue_first)

**1. CUT** from the portrait working source. Per-pack: open → fan → card → card. Cut on the slide **ONSET**, hold through the **SETTLE**. Every card on screen with name readable; **4 cards/pack, no exceptions**. Talk in M:SS, never "src". (memory: cut_method_approved, rule_show_all_cards)

**2. HIT EXTENSIONS.** For each hit, insert extra held footage **between its transition-in and transition-out** (at the segment boundary so BOTH transitions stay intact). Pull the extra footage from the portrait source.
- Extension footage adjacent to the card's clip → **continuous**. Otherwise → **held-to-held match cut** (verify same card + similar position).
- **DRIFT RULE:** never splice rendered-cut OUT-time onto portrait SRC-time *in the middle of a slide* — accumulated frame-rounding causes a few-frame jump. Pull [transition-in card's segment + extension] as ONE continuous portrait extract, or splice only at held moments / hard cuts.

**3. SPEED PASS** to fit under 3:00. **1.5×** for non-hit, non-3rd-card cards; **1×** for hits + the 3rd card of each pack + the intro. Per-clip `setpts=(PTS-STARTPTS)/speed,fps=60`. Shave hit-extension tails if needed to clear 3:00 with room for the recap and the final card.

**4. COLD-OPEN INTRO** (prepend ~12s): sealed box → opening/cutting → packs spread → packs in hand.

**5. OVERLAYS** (HyperFrames, "chrome" pattern):
- Per-card **comp chip** (eBay sold screenshot + bold value) animating in top-right as each card shows. **Inset its right edge from the frame edge — keep right edge ≤~90% width (1080-base `right:120px` / 4K `right:240px`), NOT hugging the corner — TikTok/Reels action rail sits on the right ~10%.** (changed 2026-06-19)
- Running **box-value tracker** ("price overlay") top-left: box cost (red) + cards-pulled total (green, counts up). Enters when you want it (synced to the cost sting). **Position its top edge at ~17% of frame height (1080-base `top:332px` / 4K `top:664px`), NOT up against the top corner — TikTok/Reels UI obstructs the top ~10%.** (changed 2026-06-18)
- Center **profit/loss recap** at the end (box cost / cards value / profit-or-loss / ROI). Loss = red, profit = green.
- **Money shot** = highest comp (memory: money_shot) → pop-in + gold value.
- Comp values from `comps.json`. **No "Recent sale" label** — the screenshot conveys it (memory: feedback_subtitle). Use a **"Closest comp"** label only for an eBay *listing* (not a sale).
- Duplicate-name players: place each comp on the correct parallel instance (confirm placement with the user). Total is unaffected by which instance.

**6. SFX** (ffmpeg mix in post, video stream copied — ~1 min/pass): **swoosh on PACK CHANGES only** (each new pack's first card, `cardInPack===1`); **cha-ching on each comp pop**; **cost sting once** with the price-overlay entrance; **recap silent**. (memory: sfx_style_approved)

**7. TITLE CARD** (optional): glass card like the recap but larger, centered, pops in early (e.g. 0:03–0:07). White text with a **light-blue box-font outline** (`-webkit-text-stroke` + `paint-order: stroke fill`). "[Year Product Box]" / "Price Paid $X".

**8. HANDOFF + FINAL TOUCHES.** Deliver the SFX render → user edits in DaVinci Resolve (memes / music / voiceover / 4K). Then composite final touch-ups (title card, end images) **on top of the user's export**, **`-c:a copy`** so music/voiceover is untouched. End images (e.g. top hits) go above the recap, **level and evenly spaced**.

---

## ⚠️ ONE-OFF TO AVOID — CARD-FLIP REVEALS
On bowmanchrome2025 the host flipped some hits front→back→front (e.g. the Altmyer image variation) and held two cards at once. This **complicated hit extensions** (match-cuts from non-matching source moments, two cards in frame, harder comp/chip sync). **Going forward the host keeps each card single-side, held in one spot** — so hit extensions stay clean (continuous or simple held-to-held match cuts). Treat any flip as a one-off needing extra care.

---

## Gotchas log
- `ffmpeg volumedetect`: do NOT pass `-v error` — it suppresses the level output.
- Mixing many one-shot SFX: `amix=inputs=N:normalize=0` (sum, don't average) + `asplit` + `adelay` per copy + `alimiter`.
- `cardInPack` comes from the catalog, **not** card-number mod 4 (hits can be c4).
- Moving a baked overlay element's timing needs an overlay re-render (~7 min). SFX & ffmpeg overlays are cheap (video stream copied).
- A baked element's color (e.g. comp money) can't be cleanly recolored on a flattened export — change it in the composition + re-render, or leave it.
- 4K alpha: HyperFrames can't combine `--resolution` upscaling with `--format mov/webm` alpha — author the composition natively at 2160×3840 instead.
- Always output to non-destructive paths; keep the silent master separate from the SFX/edit versions.
