"""Score each candidate window for 'card present' likelihood.

Read briefs/cuts/bowmanchrome2025.json, extract one frame at the middle of each
card window, and compute a card-likeness score based on the central 60% region:

- card_pixel_ratio: fraction of pixels that are NOT the blue mat color
- center_variance: standard deviation of luminance (cards have varied content)

Filter out windows whose middle frame is mostly blue mat / hands only.
"""

import json
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageStat, ImageFilter

CUTS_PATH = Path("briefs/cuts/bowmanchrome2025.json")
SOURCE = Path("cards/sources/bowmanchrome2025/bowmanchrome2025-1080p.mp4")
WORK = Path("scratch/v5-score")
WORK.mkdir(parents=True, exist_ok=True)

# The mat is a deep blue with white pattern. Sample its color from a known
# empty-mat frame and define a tolerance.
BLUE_MAT_R = 30
BLUE_MAT_G = 45
BLUE_MAT_B = 95
TOLERANCE = 50  # max distance from mat blue to count as "mat"

# Card-present threshold: at least 40% of center pixels are non-mat-blue.
CARD_PIXEL_THRESHOLD = 0.40


def color_distance(px, ref_r, ref_g, ref_b):
    r, g, b = px[:3]
    return ((r - ref_r) ** 2 + (g - ref_g) ** 2 + (b - ref_b) ** 2) ** 0.5


def score_frame(img_path):
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    # Central 60% region — cards land here when held up
    cx0, cx1 = int(w * 0.20), int(w * 0.80)
    cy0, cy1 = int(h * 0.20), int(h * 0.80)
    center = img.crop((cx0, cy0, cx1, cy1))
    center = center.resize((128, 128))

    pixels = list(center.getdata())
    n = len(pixels)
    non_mat = 0
    skin = 0
    for px in pixels:
        r, g, b = px[:3]
        if color_distance(px, BLUE_MAT_R, BLUE_MAT_G, BLUE_MAT_B) > TOLERANCE:
            non_mat += 1
        # Rough skin-tone heuristic: warm tones where R > G > B, R > 100
        if r > 100 and r > g and g > b and (r - b) > 25 and (r - g) < 80:
            skin += 1

    card_ratio = non_mat / n
    skin_ratio = skin / n
    # "Card area" = non-mat that ISN'T skin (so cards, not hands)
    card_area = max(0, card_ratio - skin_ratio)

    return card_ratio, skin_ratio, card_area


def main():
    data = json.loads(CUTS_PATH.read_text())
    segs = data["segments"]
    cards = [s for s in segs if s.get("note", "").startswith("card window")]

    print(f"Scoring {len(cards)} candidate windows...")
    keep = []
    drop = []
    for i, s in enumerate(cards):
        mid = (s["start"] + s["end"]) / 2
        frame_path = WORK / f"frame_{i+1:02d}.jpg"
        subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-ss", f"{mid:.2f}",
                "-i", str(SOURCE),
                "-frames:v", "1",
                "-q:v", "5",
                str(frame_path),
            ],
            check=True,
        )
        card_ratio, skin_ratio, card_area = score_frame(frame_path)
        # Real card: large non-mat area that is NOT skin (i.e. the card itself,
        # not the hand around it). card_area >= 0.35 catches a card occupying
        # at least ~35% of the central region.
        is_card = card_area >= 0.35
        verdict = "KEEP" if is_card else "DROP"
        print(f"  #{i+1:02d} src={s['start']:6.1f}  non_mat={card_ratio:.2f}  skin={skin_ratio:.2f}  card_area={card_area:.2f}  {verdict}")
        if is_card:
            keep.append(s)
        else:
            drop.append(s)

    # Rebuild the cuts JSON: intro + filtered cards + (no headliners in 60s test).
    intro = [s for s in segs if s.get("note", "").startswith("intro")]
    new_segs = intro + keep
    total = sum(s["end"] - s["start"] for s in new_segs)
    out = {
        "comment": f"v6-test — auto-filtered by card-present detection. {len(keep)} cards kept, {len(drop)} dropped. Total {total:.2f}s.",
        "segments": new_segs,
    }
    CUTS_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nKEPT {len(keep)} of {len(cards)} ({100*len(keep)/len(cards):.0f}%)")
    print(f"Total cut duration: {total:.2f}s")


if __name__ == "__main__":
    main()
