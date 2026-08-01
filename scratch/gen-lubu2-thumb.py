#!/usr/bin/env python
"""Shorts thumbnail for ToppsChromeBlackLubu2.
Box frame background + brand red rounded banner, bold white Arial text
with heavy black outline (same style as the hook overlays).
Text (verbatim): "I spent 320$ on 13 Cards"
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE = "scratch/lubu2-thumb-base.png"
OUT_4K = "cards/sources/ChromeBlackJ/ToppsChromeBlackLubu2-thumb-4k.png"
OUT_HD = "cards/sources/ChromeBlackJ/ToppsChromeBlackLubu2-thumb.png"

FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
RED_CENTER = (224, 44, 56)
RED_EDGE = (184, 22, 34)
RED_BORDER = (104, 12, 20, 255)

LINES = ["I spent 320$", "on 13 Cards"]
SIZE = 300
SPACING = 1.06
CENTER_Y_FRAC = 0.135  # top of frame
PAD_X, PAD_Y = 70, 55
RADIUS = 70
STROKE = max(8, SIZE // 12)

canvas = Image.open(BASE).convert("RGBA")
W, H = canvas.size

font = ImageFont.truetype(FONT_PATH, SIZE)
asc, desc = font.getmetrics()
line_adv = (asc + desc) * SPACING
block_h = line_adv * len(LINES)
block_w = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in LINES)

cx = W // 2
cy = int(H * CENTER_Y_FRAC)
top = cy - block_h / 2.0
px0, py0 = cx - block_w / 2 - PAD_X, top - PAD_Y
px1, py1 = cx + block_w / 2 + PAD_X, top + block_h + PAD_Y
pw, ph = int(px1 - px0), int(py1 - py0)

shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS, fill=(0, 0, 0, 255))
shadow = shadow.filter(ImageFilter.GaussianBlur(34))
shifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shifted.paste(shadow, (0, 20), shadow)
shifted.putalpha(shifted.split()[3].point(lambda a: int(a * 0.50)))
canvas = Image.alpha_composite(canvas, shifted)

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

ImageDraw.Draw(canvas).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS,
                                         outline=RED_BORDER, width=6)

draw = ImageDraw.Draw(canvas)
y = top
for t in LINES:
    draw.text((cx, y), t, font=font, fill=WHITE, anchor="ma",
              stroke_width=STROKE, stroke_fill=BLACK)
    y += line_adv

canvas = canvas.convert("RGB")
canvas.save(OUT_4K)
canvas.resize((1080, 1920), Image.LANCZOS).save(OUT_HD)
print("wrote", OUT_4K, "and", OUT_HD, "panel=%dx%d" % (pw, ph))
