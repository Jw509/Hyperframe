import sys
from PIL import Image, ImageDraw

# Remove a WHITE product-shot background while preserving the subject's own white areas,
# by flood-filling transparency inward from the border seeds (only border-connected white
# is removed; interior whites bounded by the box's edges are kept). Then trim to content.
# usage: python remove_white_bg.py <input> <output.png> [thresh=110]
inp = sys.argv[1]
outp = sys.argv[2]
thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 110

im = Image.open(inp).convert("RGBA")
w, h = im.size
seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
         (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
for s in seeds:
    ImageDraw.floodfill(im, s, (0, 0, 0, 0), thresh=thresh)

bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
im.save(outp)
print("saved", outp, "size", im.size)
