# Transparent UI safe-zone guide PNG for DaVinci meme placement (rattleshort pipeline).
# Draws TikTok / IG Reels / YouTube Shorts UI keep-out zones (same rects as
# scratch/rattleshort-safezone-diag.py, 1080x1920 basis x2) + the comp-chip and
# box-tracker footprints from the overlay generator. Alpha background -> drop the PNG
# on the top video track in Resolve as a placement guide, delete before export.
# Usage: python scratch/gen-uiguide-png.py <out.png>
import sys
from PIL import Image, ImageDraw, ImageFont

out_path = sys.argv[1]
S = 2  # 1080x1920 basis -> 2160x3840
W, H = 1080 * S, 1920 * S

PLATFORMS = {
    "TIKTOK": ("#ff3355", [
        (280, 40, 800, 125),      # Following/For You tabs + status
        (948, 760, 1080, 1560),   # right action rail
        (0, 1560, 1080, 1920),    # caption + music + progress
    ]),
    "IG REELS": ("#cc44ff", [
        (930, 55, 1070, 165),     # top-right camera icon
        (945, 950, 1080, 1700),   # right action rail
        (0, 1500, 1080, 1920),    # caption/audio/CTA band
    ]),
    "YT SHORTS": ("#ffcc00", [
        (630, 55, 1080, 150),     # top-right search/camera/kebab strip
        (935, 1050, 1080, 1750),  # right action rail
        (0, 1620, 1080, 1920),    # title/channel/subscribe band
    ]),
}
# Our baked overlay footprints (from gen-rattleshort-overlays.mjs) — memes must dodge these too.
OURS = {
    "BOX TRACKER (OURS)": ("#22ff88", (36, 332, 248, 507)),
    "COMP CHIPS (OURS)":  ("#00e5ff", (730, 175, 960, 568)),
}

def rgb(c): return tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
def z(r): return tuple(v * S for v in r)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26 * S)
small = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 19 * S)

for name, (color, rects) in PLATFORMS.items():
    c = rgb(color)
    for r in rects:
        r = z(r)
        d.rectangle(r, fill=c + (70,), outline=c + (255,), width=3 * S)
        d.text((r[0] + 8 * S, r[1] + 6 * S), name, fill=c + (255,), font=small)

for name, (color, r) in OURS.items():
    c = rgb(color)
    r = z(r)
    d.rectangle(r, outline=c + (255,), width=5 * S)
    for off in range(0, (r[2] - r[0]) + (r[3] - r[1]), 40 * S):  # diagonal hatch
        x0 = max(r[0], r[0] + off - (r[3] - r[1])); y0 = min(r[3], r[1] + off)
        x1 = min(r[2], r[0] + off);                 y1 = max(r[1], r[1] + off - (r[2] - r[0]))
        d.line([(x0, y0), (x1, y1)], fill=c + (120,), width=2 * S)
    d.text((r[0] + 8 * S, r[3] + 8 * S), name, fill=c + (255,), font=small)

# legend, top-left corner (clear of every zone)
d.text((20 * S, 40 * S), "MEME SAFE-ZONE GUIDE", fill=(255, 255, 255, 255), font=font)
ly = 90 * S
for name, (color, _) in list(PLATFORMS.items()) + list(OURS.items()):
    c = rgb(color)
    d.rectangle((20 * S, ly, 50 * S, ly + 22 * S), fill=c + (150,), outline=c + (255,), width=2 * S)
    d.text((60 * S, ly - 2 * S), name, fill=c + (255,), font=small)
    ly += 34 * S
d.text((266 * S, 150 * S), "colored areas = platform UI\nkeep memes out of them\nDELETE THIS LAYER\nBEFORE EXPORT", fill=(255, 255, 255, 230), font=small)

img.save(out_path)
print(f"wrote {out_path} {W}x{H} (transparent)")
