"""Build a labeled grid of v5 candidate windows so the user can call out drops."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import glob

WORK = Path("scratch/v5-windows")
COLS = 6
CELL_W = 320
CELL_H = 180
PADDING = 6

frames = sorted(glob.glob(str(WORK / "seq_*.jpg")))
n = len(frames)
rows = (n + COLS - 1) // COLS

grid_w = COLS * (CELL_W + PADDING) - PADDING
grid_h = rows * (CELL_H + PADDING) - PADDING
grid = Image.new("RGB", (grid_w, grid_h), "white")
draw = ImageDraw.Draw(grid)

try:
    font = ImageFont.truetype("arial.ttf", 36)
except Exception:
    font = ImageFont.load_default()

for i, fpath in enumerate(frames):
    img = Image.open(fpath).resize((CELL_W, CELL_H))
    col = i % COLS
    row = i // COLS
    x = col * (CELL_W + PADDING)
    y = row * (CELL_H + PADDING)
    grid.paste(img, (x, y))
    # Label with index (1-based)
    label = str(i + 1)
    # Box behind text for legibility
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x + 4, y + 4, x + tw + 20, y + th + 20], fill="black")
    draw.text((x + 12, y + 8), label, fill="yellow", font=font)

out = WORK / "grid-labeled.jpg"
grid.save(out, quality=85)
print(f"Wrote {out} ({grid_w}x{grid_h}, {n} cells)")
