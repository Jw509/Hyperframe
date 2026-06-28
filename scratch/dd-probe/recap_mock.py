#!/usr/bin/env python3
# Mock of the end payoff / loss-of-investment card (final revealed state) over black.
from PIL import Image, ImageDraw, ImageFont
import os
OUT = r"C:\Users\J\Desktop\EditHyper\scratch\dd-probe\preview\recap_mock.png"
def f(sz, bold=True):
    return ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf", sz)
W, H = 1920, 1080
img = Image.new("RGB", (W, H), (8, 9, 12))
d = ImageDraw.Draw(img)
PW, PH = 560, 470
px, py = (W-PW)//2, (H-PH)//2
d.rounded_rectangle([px, py, px+PW, py+PH], radius=28, fill=(18, 20, 28))
cx = W//2
red, grey, white = (251,106,94), (159,179,200), (255,255,255)
y = py+38
d.text((cx, y), "2 MEGA + 2 BLASTER  ·  DOUBLE DOUBLE", font=f(18), fill=(150,150,160), anchor="ma")
y += 52
# rows
d.text((px+44, y), "BOX COST", font=f(22), fill=(184,184,194), anchor="lm")
d.text((px+PW-44, y), "$191.96", font=f(40), fill=red, anchor="rm")
y += 56
d.text((px+44, y), "CARDS PULLED", font=f(22), fill=(184,184,194), anchor="lm")
d.text((px+PW-44, y), "$112.60", font=f(40), fill=grey, anchor="rm")
y += 44
d.line([px+44, y, px+PW-44, y], fill=(60,62,72), width=1)
y += 34
d.text((cx, y), "L O S S", font=f(20), fill=red, anchor="ma")
y += 40
d.text((cx, y), "-$79.36", font=f(104), fill=red, anchor="ma")
y += 116
d.text((cx, y), "-41.3% ROI", font=f(34), fill=red, anchor="ma")
img.save(OUT)
print("wrote", OUT)
