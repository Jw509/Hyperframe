#!/usr/bin/env python
"""Liquid-glass overlay generator. Outputs, for one video:
  <prefix>_skin.png  full-frame RGBA: glass tint + top sheen + bright rim + text
  <prefix>_mask.png  PANEL-sized grayscale rounded-rect (alpha mask for backdrop blur)
  <prefix>_geom.txt  "PL PT PW PH" integer panel rect (for ffmpeg crop/overlay)
The actual frosted-glass refraction is done in ffmpeg by blurring the video inside
the panel rect and masking it with <prefix>_mask.png. Text = blue fill + BLACK outline.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H = 2160, 3840

# ---- style config ------------------------------------------------------
BLUE        = (40, 108, 228, 255)   # text fill
OUTLINE     = (0, 0, 0, 255)        # text outline -> BLACK
SHADOW      = (0, 0, 0, 85)         # soft drop shadow
TINT        = (255, 255, 255, 40)   # milky glass tint over the blur
SHEEN_A     = 80                    # top-sheen peak alpha
RIM         = (255, 255, 255, 165)  # bright glass edge
RIM_INNER   = (255, 255, 255, 55)   # faint inner edge
HEAD_SIZE   = 140
PRICE_SIZE  = 104
HEAD_STROKE = 12
PRICE_STROKE= 8
PAD_X       = 104
PAD_Y       = 84
GAP         = 54
RADIUS      = 70
LINE_SP     = 16
SHADOW_OFF  = (0, 6)
SHADOW_BLUR = 8
FONT_PATH   = "scratch/overlay-preview/font.ttf"
# ------------------------------------------------------------------------

ap = argparse.ArgumentParser()
ap.add_argument("--prefix", required=True)
ap.add_argument("--heading", required=True, help="use \\n for line breaks")
ap.add_argument("--price", default="")
ap.add_argument("--cy", type=float, default=0.45)
ap.add_argument("--fill", default=None, help="text fill 'R,G,B'")
ap.add_argument("--outline", default=None, help="text outline 'R,G,B'")
ap.add_argument("--tint", default=None, help="panel tint 'R,G,B,A'")
args = ap.parse_args()
heading = args.heading.replace("\\n", "\n")
price = args.price.strip()


def _rgb(s, a=255):
    p = [int(x) for x in s.split(",")]
    return tuple(p) if len(p) == 4 else (p[0], p[1], p[2], a)


if args.fill:
    BLUE = _rgb(args.fill)
if args.outline:
    OUTLINE = _rgb(args.outline)
if args.tint:
    TINT = _rgb(args.tint)

hf = ImageFont.truetype(FONT_PATH, HEAD_SIZE)
pf = ImageFont.truetype(FONT_PATH, PRICE_SIZE)
probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))

hb = probe.multiline_textbbox((0, 0), heading, font=hf, stroke_width=HEAD_STROKE,
                              align="center", spacing=LINE_SP)
hw, hh = hb[2] - hb[0], hb[3] - hb[1]
if price:
    pb = probe.textbbox((0, 0), price, font=pf, stroke_width=PRICE_STROKE)
    pw, ph = pb[2] - pb[0], pb[3] - pb[1]
else:
    pw = ph = 0
gap = GAP if price else 0
content_w, content_h = max(hw, pw), hh + gap + ph

cx, cy = W / 2, H * args.cy
panel_w, panel_h = content_w + 2 * PAD_X, content_h + 2 * PAD_Y
pl, pt = cx - panel_w / 2, cy - panel_h / 2


def even(v):  # yuv420p crop needs even offsets+sizes; snap to even
    v = int(round(v))
    return v if v % 2 == 0 else v - 1


PL, PT, PW, PH = even(pl), even(pt), even(panel_w), even(panel_h)
content_top = cy - content_h / 2
head_y = content_top
price_y = content_top + hh + gap
rect = [PL, PT, PL + PW, PT + PH]


def block(d, text, font, xc, ytop, fill, sw, sfill, multiline):
    if multiline:
        bb = d.multiline_textbbox((0, 0), text, font=font, stroke_width=sw, align="center", spacing=LINE_SP)
    else:
        bb = d.textbbox((0, 0), text, font=font, stroke_width=sw)
    w = bb[2] - bb[0]
    dx, dy = xc - (bb[0] + w / 2), ytop - bb[1]
    if multiline:
        d.multiline_text((dx, dy), text, font=font, fill=fill, align="center", spacing=LINE_SP,
                         stroke_width=sw, stroke_fill=sfill)
    else:
        d.text((dx, dy), text, font=font, fill=fill, stroke_width=sw, stroke_fill=sfill)


# ---- regional blur mask (PANEL-sized rounded rect, white on black) ------
mask = Image.new("L", (PW, PH), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, PW - 1, PH - 1], radius=RADIUS, fill=255)
mask.save(args.prefix + "_mask.png")

# ---- glass skin (tint + sheen + rim + text) ----------------------------
skin = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# rounded-rect alpha mask (full frame) to clip sheen
clip = Image.new("L", (W, H), 0)
ImageDraw.Draw(clip).rounded_rectangle(rect, radius=RADIUS, fill=255)

# milky tint
tint = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(tint).rounded_rectangle(rect, radius=RADIUS, fill=TINT)
skin = Image.alpha_composite(skin, tint)

# top sheen: vertical gradient strongest at panel top, clipped to rounded rect
sheen = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sheen)
sheen_h = int(PH * 0.55)
for i in range(sheen_h):
    a = int(SHEEN_A * (1 - i / sheen_h) ** 1.4)
    sd.line([(PL, PT + i), (PL + PW, PT + i)], fill=(255, 255, 255, a))
sheen.putalpha(ImageChops.multiply(sheen.getchannel("A"), clip))
skin = Image.alpha_composite(skin, sheen)

# bright rim + faint inner edge
rim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
rd = ImageDraw.Draw(rim)
rd.rounded_rectangle(rect, radius=RADIUS, outline=RIM, width=4)
rd.rounded_rectangle([PL + 6, PT + 6, PL + PW - 6, PT + PH - 6], radius=max(8, RADIUS - 6),
                     outline=RIM_INNER, width=2)
skin = Image.alpha_composite(skin, rim)

# soft drop shadow under text
ox, oy = SHADOW_OFF
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shd = ImageDraw.Draw(sh)
block(shd, heading, hf, cx + ox, head_y + oy, SHADOW, HEAD_STROKE, SHADOW, True)
if price:
    block(shd, price, pf, cx + ox, price_y + oy, SHADOW, PRICE_STROKE, SHADOW, False)
sh = sh.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
skin = Image.alpha_composite(skin, sh)

# crisp blue text with black outline
d = ImageDraw.Draw(skin)
block(d, heading, hf, cx, head_y, BLUE, HEAD_STROKE, OUTLINE, True)
if price:
    block(d, price, pf, cx, price_y, BLUE, PRICE_STROKE, OUTLINE, False)

skin.save(args.prefix + "_skin.png")
with open(args.prefix + "_geom.txt", "w") as f:
    f.write(f"{PL} {PT} {PW} {PH}")
print(f"wrote {args.prefix}_skin/_mask/_geom  panel={PW}x{PH} at ({PL},{PT})")
