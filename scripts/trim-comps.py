#!/usr/bin/env python3
"""Auto-trim left/right white columns from eBay comp screenshots.

Reads PNGs from cards/comps/<slug>/ and writes trimmed versions to
cards/comps/<slug>-trimmed/. Preserves vertical extent (sold-date/title/price
text stays); only crops horizontal white space wrapping the card photo.

Usage:
    python scripts/trim-comps.py <slug>
e.g.
    python scripts/trim-comps.py selecthangerpack2024
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image


WHITE_THRESHOLD = 248   # pixel is "white" if all channels >= this
PADDING_PX = 6          # tiny breathing room on each side after trim


def find_horizontal_bounds(arr: np.ndarray) -> tuple[int, int]:
    """Return (left, right_exclusive) of the non-white horizontal span."""
    # Reduce to RGB if RGBA
    if arr.ndim == 3 and arr.shape[2] == 4:
        rgb = arr[:, :, :3]
    else:
        rgb = arr
    # A column is "non-white" if it contains any pixel where any channel < threshold
    non_white_per_col = np.any(rgb < WHITE_THRESHOLD, axis=(0, 2))
    cols = np.where(non_white_per_col)[0]
    if len(cols) == 0:
        return 0, arr.shape[1]
    return int(cols[0]), int(cols[-1]) + 1


def trim_image(src_path: Path, dst_path: Path) -> tuple[int, int, int, int]:
    img = Image.open(src_path)
    arr = np.array(img)
    h, w = arr.shape[:2]
    left, right = find_horizontal_bounds(arr)
    left = max(0, left - PADDING_PX)
    right = min(w, right + PADDING_PX)
    cropped = img.crop((left, 0, right, h))
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(dst_path)
    return w, right - left, left, right


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/trim-comps.py <slug>", file=sys.stderr)
        sys.exit(1)
    slug = sys.argv[1]
    project_root = Path(__file__).resolve().parent.parent
    src_dir = project_root / "cards" / "comps" / slug
    dst_dir = project_root / "cards" / "comps" / f"{slug}-trimmed"
    if not src_dir.is_dir():
        print(f"Source not found: {src_dir}", file=sys.stderr)
        sys.exit(1)
    pngs = sorted(p for p in src_dir.iterdir() if p.suffix.lower() == ".png")
    if not pngs:
        print(f"No PNGs in {src_dir}", file=sys.stderr)
        sys.exit(1)
    print(f"Trimming {len(pngs)} PNGs: {src_dir.name} -> {dst_dir.name}")
    for p in pngs:
        w_old, w_new, left, right = trim_image(p, dst_dir / p.name)
        pct = (1 - w_new / w_old) * 100
        print(f"  {p.name:14s} {w_old:>5}w -> {w_new:>5}w  (-{pct:4.0f}%)  crop=[{left},{right}]")


if __name__ == "__main__":
    main()
