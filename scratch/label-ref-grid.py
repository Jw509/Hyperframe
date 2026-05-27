"""Build a labeled timeline strip of source 1:40-2:45 (frames every 0.5s).
Labels show source timestamp so user references map directly to the grid."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import glob

WORK = Path("scratch/ref-pacing")
COLS = 10
CELL_W = 240
CELL_H = 135
PADDING = 4
START_SEC = 100.0
STEP_SEC = 0.5

frames = sorted(glob.glob(str(WORK / "f_*.jpg")))
n = len(frames)
rows = (n + COLS - 1) // COLS

grid_w = COLS * (CELL_W + PADDING) - PADDING
grid_h = rows * (CELL_H + PADDING) - PADDING
grid = Image.new("RGB", (grid_w, grid_h), "white")
draw = ImageDraw.Draw(grid)

try:
    font = ImageFont.truetype("arial.ttf", 20)
except Exception:
    font = ImageFont.load_default()

for i, fpath in enumerate(frames):
    img = Image.open(fpath).resize((CELL_W, CELL_H))
    col = i % COLS
    row = i // COLS
    x = col * (CELL_W + PADDING)
    y = row * (CELL_H + PADDING)
    grid.paste(img, (x, y))

    src_t = START_SEC + i * STEP_SEC
    mm = int(src_t // 60)
    ss = src_t % 60
    label = f"{mm}:{ss:05.2f}"
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x + 4, y + 4, x + tw + 16, y + th + 12], fill="black")
    draw.text((x + 10, y + 6), label, fill="yellow", font=font)

out = WORK / "ref-grid.jpg"
grid.save(out, quality=85)
print(f"Wrote {out} ({grid_w}x{grid_h}, {n} cells)")
