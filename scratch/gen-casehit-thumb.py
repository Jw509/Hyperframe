#!/usr/bin/env python
"""Two thumbnail hook overlays in the red-banner brand style (adapts gen-blaster-hook-overlay.py).
Red rounded gradient banner + bold white Arial + heavy black outline, upper third.
Full-canvas 2160x3840 transparent PNG -> overlay at 0:0 on any frame.
  v1: "Hobby Box Case Hit!"
  v2: "Case Hit in a Hobby Box!"
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 2160, 3840
FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
RED_CENTER = (224, 44, 56)
RED_EDGE   = (184, 22, 34)
RED_BORDER = (104, 12, 20, 255)
RADIUS = 58
PAD_X, PAD_Y = 84, 56
CENTER_Y_FRAC = 0.26


def make(lines, out, size=190, spacing=1.06):
    font = ImageFont.truetype(FONT_PATH, size)
    stroke = max(8, size // 12)
    asc, desc = font.getmetrics()
    line_adv = (asc + desc) * spacing
    block_h = line_adv * len(lines)
    block_w = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in lines)

    cx, cy = W // 2, int(H * CENTER_Y_FRAC)
    top = cy - block_h / 2.0
    px0, py0 = cx - block_w / 2 - PAD_X, top - PAD_Y
    px1, py1 = cx + block_w / 2 + PAD_X, top + block_h + PAD_Y
    pw, ph = int(px1 - px0), int(py1 - py0)

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # soft drop shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS, fill=(0, 0, 0, 255))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    shifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shifted.paste(shadow, (0, 20), shadow)
    shifted.putalpha(shifted.split()[3].point(lambda a: int(a * 0.50)))
    canvas = Image.alpha_composite(canvas, shifted)

    # red gradient panel (dark->light->dark vertical sheen)
    grad = Image.new("RGB", (pw, ph), RED_EDGE)
    gd = ImageDraw.Draw(grad)
    for y in range(ph):
        t = y / max(1, ph - 1)
        f = 1.0 - abs(2 * t - 1)
        col = tuple(int(RED_EDGE[i] + (RED_CENTER[i] - RED_EDGE[i]) * f) for i in range(3))
        gd.line([(0, y), (pw, y)], fill=col)
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=RADIUS, fill=255)
    panel = grad.convert("RGBA")
    panel.putalpha(mask)
    canvas.alpha_composite(panel, (int(px0), int(py0)))

    # thin darker-red border
    ImageDraw.Draw(canvas).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS, outline=RED_BORDER, width=5)

    # white text, heavy black outline, centered
    draw = ImageDraw.Draw(canvas)
    y = top
    for t in lines:
        draw.text((cx, y), t, font=font, fill=WHITE, anchor="ma", stroke_width=stroke, stroke_fill=BLACK)
        y += line_adv

    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.save(out)
    print("wrote", out, "panel=%dx%d at (%d,%d)" % (pw, ph, int(px0), int(py0)))


make(["Hobby Box", "Case Hit!"], "scratch/overlay-preview/casehit_v1_overlay.png", size=210)
make(["Case Hit in a", "Hobby Box!"], "scratch/overlay-preview/casehit_v2_overlay.png", size=185)
