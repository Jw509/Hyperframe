#!/usr/bin/env python
"""Generate the 2-second title-hook overlay for JdartBlasta.mp4.
Style: red rounded banner + bold white text with heavy black outline
(matches user's red-overlay brand / reference image).
Full-canvas 2160x3840 transparent PNG -> overlaid at 0:0 in ffmpeg, enabled 0-2s.
Text (verbatim): "Are These The Best Blaster Boxes to Buy in 2026?"
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2160, 3840
OUT = "scratch/overlay-preview/blaster_hook_overlay.png"

FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"   # Arial Bold — matches reference banner text
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)

# Red banner palette (vivid scarlet with a subtle center sheen + darker edge)
RED_CENTER = (224, 44, 56)
RED_EDGE   = (184, 22, 34)
RED_BORDER = (104, 12, 20, 255)

# Controlled wrap; words stay exactly as typed, all white (no accent), balanced lines.
LINES = ["Are These The", "Best Blaster Boxes", "to Buy in 2026?"]
SIZE = 150
SPACING = 1.06          # tight line-height like the reference
CENTER_Y_FRAC = 0.255   # upper third, clear of the top platform UI
PAD_X, PAD_Y = 78, 52   # text inset inside the red panel
RADIUS = 58
STROKE = max(8, SIZE // 12)

font = ImageFont.truetype(FONT_PATH, SIZE)
asc, desc = font.getmetrics()
line_adv = (asc + desc) * SPACING
block_h = line_adv * len(LINES)
block_w = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in LINES)

cx = W // 2
cy = int(H * CENTER_Y_FRAC)
top = cy - block_h / 2.0

# panel rect (hugs the text block + padding)
px0, py0 = cx - block_w / 2 - PAD_X, top - PAD_Y
px1, py1 = cx + block_w / 2 + PAD_X, top + block_h + PAD_Y
pw, ph = int(px1 - px0), int(py1 - py0)

canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# --- soft drop shadow under the panel ---
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS, fill=(0, 0, 0, 255))
shadow = shadow.filter(ImageFilter.GaussianBlur(34))
shifted = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shifted.paste(shadow, (0, 20), shadow)
shifted.putalpha(shifted.split()[3].point(lambda a: int(a * 0.50)))
canvas = Image.alpha_composite(canvas, shifted)

# --- red gradient panel (dark->light->dark vertical sheen) ---
grad = Image.new("RGB", (pw, ph), RED_EDGE)
gd = ImageDraw.Draw(grad)
for y in range(ph):
    t = y / max(1, ph - 1)
    f = 1.0 - abs(2 * t - 1)            # 0 at edges, 1 at vertical center
    col = tuple(int(RED_EDGE[i] + (RED_CENTER[i] - RED_EDGE[i]) * f) for i in range(3))
    gd.line([(0, y), (pw, y)], fill=col)
mask = Image.new("L", (pw, ph), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=RADIUS, fill=255)
panel = grad.convert("RGBA")
panel.putalpha(mask)
canvas.alpha_composite(panel, (int(px0), int(py0)))

# --- thin darker-red border for definition ---
ImageDraw.Draw(canvas).rounded_rectangle([px0, py0, px1, py1], radius=RADIUS,
                                         outline=RED_BORDER, width=5)

# --- white text with heavy black outline, centered ---
draw = ImageDraw.Draw(canvas)
y = top
for t in LINES:
    draw.text((cx, y), t, font=font, fill=WHITE, anchor="ma",
              stroke_width=STROKE, stroke_fill=BLACK)
    y += line_adv

import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
canvas.save(OUT)
print("wrote", OUT, canvas.size,
      "panel=%dx%d at (%d,%d)" % (pw, ph, int(px0), int(py0)))
