#!/usr/bin/env python
"""Generate a transparent 4K overlay PNG: blue fill + white outline text on a
translucent rounded panel (heading over a smaller price line).
Style reference: user's screenshot. Composited later with a fade by ffmpeg.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2160, 3840

# ---- style config (tweak to taste) -------------------------------------
BLUE        = (43, 110, 226, 255)   # text fill
WHITE       = (255, 255, 255, 255)  # text outline
PANEL       = (255, 255, 255, 105)  # translucent panel (~41% white)
SHADOW      = (6, 14, 30, 150)      # soft drop shadow under text
HEAD_SIZE   = 140
PRICE_SIZE  = 104
HEAD_STROKE = 12
PRICE_STROKE= 8
PAD_X       = 100
PAD_Y       = 78
GAP         = 54                    # gap between heading block and price
RADIUS      = 58                    # panel corner radius
LINE_SP     = 16                    # heading line spacing
SHADOW_OFF  = (0, 7)
SHADOW_BLUR = 7
FONT_PATH   = "scratch/overlay-preview/font.ttf"   # Arial Bold
# ------------------------------------------------------------------------

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--heading", required=True, help="use \\n for line breaks")
ap.add_argument("--price", default="")
ap.add_argument("--cy", type=float, default=0.45, help="panel vertical center as fraction of H")
args = ap.parse_args()

heading = args.heading.replace("\\n", "\n")
price = args.price.strip()

hf = ImageFont.truetype(FONT_PATH, HEAD_SIZE)
pf = ImageFont.truetype(FONT_PATH, PRICE_SIZE)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
m = ImageDraw.Draw(img)

# measure
hb = m.multiline_textbbox((0, 0), heading, font=hf, stroke_width=HEAD_STROKE,
                          align="center", spacing=LINE_SP)
hw, hh = hb[2] - hb[0], hb[3] - hb[1]
if price:
    pb = m.textbbox((0, 0), price, font=pf, stroke_width=PRICE_STROKE)
    pw, ph = pb[2] - pb[0], pb[3] - pb[1]
else:
    pw = ph = 0

gap = GAP if price else 0
content_w = max(hw, pw)
content_h = hh + gap + ph

cx, cy = W / 2, H * args.cy
panel_w = content_w + 2 * PAD_X
panel_h = content_h + 2 * PAD_Y
pl, pt = cx - panel_w / 2, cy - panel_h / 2
content_top = cy - content_h / 2
head_y = content_top
price_y = content_top + hh + gap


def block(d, text, font, xc, ytop, fill, sw, sfill, multiline):
    if multiline:
        bb = d.multiline_textbbox((0, 0), text, font=font, stroke_width=sw,
                                  align="center", spacing=LINE_SP)
    else:
        bb = d.textbbox((0, 0), text, font=font, stroke_width=sw)
    w = bb[2] - bb[0]
    dx, dy = xc - (bb[0] + w / 2), ytop - bb[1]
    if multiline:
        d.multiline_text((dx, dy), text, font=font, fill=fill, align="center",
                         spacing=LINE_SP, stroke_width=sw, stroke_fill=sfill)
    else:
        d.text((dx, dy), text, font=font, fill=fill, stroke_width=sw, stroke_fill=sfill)


# 1) translucent rounded panel
panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(panel).rounded_rectangle([pl, pt, pl + panel_w, pt + panel_h],
                                        radius=RADIUS, fill=PANEL)
img = Image.alpha_composite(img, panel)

# 2) soft drop shadow
ox, oy = SHADOW_OFF
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sh)
block(sd, heading, hf, cx + ox, head_y + oy, SHADOW, HEAD_STROKE, SHADOW, True)
if price:
    block(sd, price, pf, cx + ox, price_y + oy, SHADOW, PRICE_STROKE, SHADOW, False)
sh = sh.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
img = Image.alpha_composite(img, sh)

# 3) crisp blue text with white outline
d = ImageDraw.Draw(img)
block(d, heading, hf, cx, head_y, BLUE, HEAD_STROKE, WHITE, True)
if price:
    block(d, price, pf, cx, price_y, BLUE, PRICE_STROKE, WHITE, False)

img.save(args.out)
print(f"wrote {args.out}  panel={int(panel_w)}x{int(panel_h)} at center y={int(cy)}")
