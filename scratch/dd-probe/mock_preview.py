#!/usr/bin/env python3
# Faithful-layout mock: paste the real comp screenshot + draw the cost counter over real source frames,
# at the generator's 1080p coordinates, so we can eyeball placement/size vs the host's footage & memes.
import json, subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = r"C:\Users\J\Desktop\EditHyper"
SRC = os.path.join(ROOT, r"cards\sources\DoubleDoubleSignature\SignatureDoubleDouble.mp4")
COMPDIR = os.path.join(ROOT, r"cards\comps\25Signature2Mega2Blaster")
OUT = os.path.join(ROOT, r"scratch\dd-probe\preview")
os.makedirs(OUT, exist_ok=True)
comps = {c["compId"]: c for c in json.load(open(os.path.join(COMPDIR, "comps.json")))["comps"]}

def font(sz, bold=True):
    p = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
    return ImageFont.truetype(p, sz)

def frame(t):
    fp = os.path.join(OUT, f"src_{t}.jpg")
    subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",SRC,"-frames:v","1","-vf","scale=1920:1080","-y",fp], check=True)
    return Image.open(fp).convert("RGBA")

def rrect(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)

def shadow_card(base, img, x, y, w):
    # comp image with rounded corners + drop shadow
    h = int(img.height * (w/img.width))
    img = img.resize((w, h), Image.LANCZOS).convert("RGBA")
    rad = 14
    mask = Image.new("L", (w, h), 0); ImageDraw.Draw(mask).rounded_rectangle([0,0,w,h], radius=rad, fill=255)
    # shadow
    sh = Image.new("RGBA", base.size, (0,0,0,0)); sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([x, y+8, x+w, y+h+8], radius=rad, fill=(0,0,0,150))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    base.paste(img, (x, y), mask)
    return h

def tag(base, cx, top, name, val, money):
    d = ImageDraw.Draw(base)
    fn, fv = font(15), font(22)
    nw = d.textlength(name, font=fn); vw = d.textlength(val, font=fv)
    padx, gap = 12, 9; h = 36
    w = int(padx*2 + nw + gap + vw)
    x = int(cx - w/2)
    pill = Image.new("RGBA", base.size, (0,0,0,0))
    ImageDraw.Draw(pill).rounded_rectangle([x, top, x+w, top+h], radius=22, fill=(12,14,20,210))
    base.alpha_composite(pill)
    d.text((x+padx, top+h/2), name, font=fn, fill=(255,255,255,255), anchor="lm")
    d.text((x+padx+nw+gap, top+h/2), val, font=fv, fill=((255,210,74,255) if money else (74,222,128,255)), anchor="lm")

def counter(base, cost, pips_filled, pip_types):
    d = ImageDraw.Draw(base)
    x, y, w = 46, 44, 250
    panel = Image.new("RGBA", base.size, (0,0,0,0))
    ImageDraw.Draw(panel).rounded_rectangle([x, y, x+w, y+150], radius=22, fill=(12,14,20,190))
    base.alpha_composite(panel)
    d.text((x+20, y+18), "BOX COST", font=font(14), fill=(255,255,255,184))
    d.text((x+20, y+34), f"${cost:0.2f}", font=font(46), fill=(251,106,94,255))
    # pips
    px, py, pw, gap = x+20, y+104, (w-40-3*7)//4, 7
    for i in range(4):
        col = (251,106,94,255) if pip_types[i]=="mega" else (255,176,32,255)
        bg = (255,255,255,40)
        d.rounded_rectangle([px+i*(pw+gap), py, px+i*(pw+gap)+pw, py+7], radius=4, fill=(col if i<pips_filled else bg))
    d.text((x+20, y+120), f"BOX {pips_filled}/4", font=font(12), fill=(255,255,255,150))

# (time, compId, running_cost, pips_filled). pip order (user): blaster,mega,blaster,mega
PIPS = ["blaster","mega","blaster","mega"]
SHOTS = [
    (146, "01", 29.99, 1),    # Brock Bowers money shot, after blaster #1
    (469, "25", 95.98, 2),    # Donte Thornton (user-placed), after blaster+mega
    (550, "09", 125.97, 3),   # Drake London (worst-case centered card), after b,m,b
    (642, "06", 191.96, 4),   # Lamar Jackson (user-placed), after all 4
]
for t, cid, cost, pf in SHOTS:
    c = comps[cid]
    base = frame(t)
    img = Image.open(os.path.join(COMPDIR, c["file"])).convert("RGBA")
    W = 196; cx = 1920//2; top = 18
    h = shadow_card(base, img, cx-W//2, top, W)
    money = c.get("money", False)
    tag(base, cx, top+h+10, c["player"], f"${c['value']:0.2f}", money)
    counter(base, cost, pf, PIPS)
    op = os.path.join(OUT, f"preview_{t}_{cid}.png")
    base.convert("RGB").save(op, quality=92)
    print("wrote", op)
