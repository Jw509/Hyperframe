#!/usr/bin/env python
"""Red-banner hook overlays + thumbnails for chromebball.

Style is the approved one (memory: hook_title_overlay_style): solid scarlet rounded banner with
a centre sheen and drop shadow, bold white Arial with a heavy black outline, upper third.
Adapted from scratch/gen-blaster-hook-overlay.py, with the font size auto-fitted to the text so
each hook fills the banner instead of being hand-tuned per line.

Two variants:
  youtube - "Best Basketball Cards to Buy 2026?"
  tiktok  - "Is Topps Unlicensed Worth Buying?"  (this one also gets baked into the video)

Each writes a full-canvas 2160x3840 transparent PNG for ffmpeg to overlay at 0:0.
"""
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2160, 3840
OUT_DIR = "scratch/overlay-preview"

FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
RED_CENTER = (224, 44, 56)
RED_EDGE = (184, 22, 34)
RED_BORDER = (104, 12, 20, 255)

SPACING = 1.06
CENTER_Y_FRAC = 0.255      # upper third — clears the top platform UI AND the captions at y~2300
PAD_X, PAD_Y = 78, 52
RADIUS = 58
MAX_BLOCK_W = 1760         # widest the text block may get, so the panel stays inside the frame

VARIANTS = {
    "youtube": ["Best Basketball", "Cards to Buy 2026?"],
    "tiktok": ["Is Topps Unlicensed", "Worth Buying?"],
}


def fit_font(lines):
    """Largest size whose widest line still fits MAX_BLOCK_W."""
    for size in range(230, 60, -2):
        f = ImageFont.truetype(FONT_PATH, size)
        if max(f.getbbox(t)[2] - f.getbbox(t)[0] for t in lines) <= MAX_BLOCK_W:
            return f, size
    raise SystemExit("text will not fit")


def build(lines, out_path):
    font, size = fit_font(lines)
    stroke = max(8, size // 12)
    asc, desc = font.getmetrics()
    line_adv = (asc + desc) * SPACING
    block_h = line_adv * len(lines)
    block_w = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in lines)

    cx, cy = W // 2, int(H * CENTER_Y_FRAC)
    top = cy - block_h / 2.0
    px0, py0 = cx - block_w / 2 - PAD_X, top - PAD_Y
    px1, py1 = cx + block_w / 2 + PAD_X, top + block_h + PAD_Y
    pw, ph = int(px1 - px0), int(py1 - py0)

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # soft drop shadow under the panel
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS, fill=(0, 0, 0, 255))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    shifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shifted.paste(shadow, (0, 20), shadow)
    shifted.putalpha(shifted.split()[3].point(lambda a: int(a * 0.50)))
    canvas = Image.alpha_composite(canvas, shifted)

    # red panel with a vertical centre sheen
    grad = Image.new("RGB", (pw, ph), RED_EDGE)
    gd = ImageDraw.Draw(grad)
    for y in range(ph):
        f = 1.0 - abs(2 * (y / max(1, ph - 1)) - 1)
        gd.line([(0, y), (pw, y)],
                fill=tuple(int(RED_EDGE[i] + (RED_CENTER[i] - RED_EDGE[i]) * f) for i in range(3)))
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=RADIUS, fill=255)
    panel = grad.convert("RGBA")
    panel.putalpha(mask)
    canvas.alpha_composite(panel, (int(px0), int(py0)))

    ImageDraw.Draw(canvas).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS,
                                             outline=RED_BORDER, width=5)

    draw = ImageDraw.Draw(canvas)
    y = top
    for t in lines:
        draw.text((cx, y), t, font=font, fill=WHITE, anchor="ma",
                  stroke_width=stroke, stroke_fill=BLACK)
        y += line_adv

    canvas.save(out_path)
    print(f"wrote {out_path}  font={size}  panel={pw}x{ph} at ({int(px0)},{int(py0)}) "
          f"spans y {int(py0)}-{int(py1)} (captions sit at y~2300, clear)")


os.makedirs(OUT_DIR, exist_ok=True)
for name, lines in VARIANTS.items():
    build(lines, f"{OUT_DIR}/chromebball_hook_{name}.png")
