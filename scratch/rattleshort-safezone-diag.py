# Safe-zone diagnostic for rattleshort overlays (TikTok / IG Reels / YouTube Shorts).
# Draws each platform's UI keep-out regions (1080x1920 basis) over a real frame,
# plus the proposed tracker + comp-chip boxes, and reports any rect intersections.
# Usage: python scratch/rattleshort-safezone-diag.py <frame.png> <out.png>
import sys
from PIL import Image, ImageDraw, ImageFont

frame_path, out_path = sys.argv[1], sys.argv[2]

# Platform UI keep-out rects (x0,y0,x1,y1) at 1080x1920, from published creator
# safe-area guidance + the validated ui-safezone standard (2026-06/07 sessions).
PLATFORMS = {
    "TikTok": ("#ff3355", [
        (280, 40, 800, 125),      # Following/For You tabs + status
        (948, 760, 1080, 1560),   # right action rail (avatar/like/comment/share/disc)
        (0, 1560, 1080, 1920),    # caption + music + progress
    ]),
    "IG Reels": ("#cc44ff", [
        (930, 55, 1070, 165),     # top-right camera icon
        (945, 950, 1080, 1700),   # right action rail
        (0, 1500, 1080, 1920),    # caption/audio/CTA band
    ]),
    "YT Shorts": ("#ffcc00", [
        (630, 55, 1080, 150),     # top-right search/camera/kebab strip
        (935, 1050, 1080, 1750),  # right action rail
        (0, 1620, 1080, 1920),    # title/channel/subscribe band
    ]),
}

# Proposed overlay boxes (validated safe-zone standard, 1080 base px)
CHIP_W, CHIP_H = 230, 393          # width fixed; height = padded eBay screenshot + value
OVERLAYS = {
    "box-tracker": ("#22ff88", (36, 332, 36 + 212, 332 + 175)),
    "comp-chip":   ("#00e5ff", (1080 - 120 - CHIP_W, 175, 1080 - 120, 175 + CHIP_H)),
}

def intersect(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    return (x1 - x0, y1 - y0) if (x1 > x0 and y1 > y0) else None

img = Image.open(frame_path).convert("RGB").resize((1080, 1920))
ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26)
except OSError:
    font = ImageFont.load_default()

for name, (color, rects) in PLATFORMS.items():
    rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    for r in rects:
        d.rectangle(r, fill=rgb + (60,), outline=rgb + (255,), width=3)
        d.text((r[0] + 8, r[1] + 6), name, fill=rgb + (255,), font=font)

report = []
for name, (color, rect) in OVERLAYS.items():
    rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    d.rectangle(rect, outline=rgb + (255,), width=6)
    d.text((rect[0] + 8, rect[1] - 34), name, fill=rgb + (255,), font=font)
    for pname, (_, prects) in PLATFORMS.items():
        for pr in prects:
            hit = intersect(rect, pr)
            if hit:
                report.append(f"OVERLAP {name} x {pname} rect {pr}: {hit[0]}x{hit[1]}px")

Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB").save(out_path)
print("\n".join(report) if report else "CLEAR: no overlay intersects any platform UI region")
for name, (_, rect) in OVERLAYS.items():
    print(f"{name}: ({rect[0]},{rect[1]})-({rect[2]},{rect[3]})  1080x1920 basis")
