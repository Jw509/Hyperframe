// Dense uniform contact sheets cropped to the held-card region, for reading vertical nameplates.
// Usage: node sheets.mjs <start> <end> <step> <perSheetCols> <perSheetRows>
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const D = "scratch/autocut/catalog/Signature2025";
const SRC = "cards/sources/shatteredJtaylor/ShatteredJTaylor.mp4";
const START = parseFloat(process.argv[2] || "6.0");
const END = parseFloat(process.argv[3] || "53.75");
const STEP = parseFloat(process.argv[4] || "1.25");
const COLS = parseInt(process.argv[5] || "2");
const ROWS = parseInt(process.argv[6] || "3");
// crop to the card region of the 2160x3840 portrait frame (generous for riffle drift)
const CX = 250, CY = 1280, CW = 1660, CH = 1960, TW = 600; // tile width after scale
const times = [];
for (let t = START; t <= END + 1e-6; t += STEP) times.push(+t.toFixed(2));
const per = COLS * ROWS;
const manifest = [];
for (let s = 0; s < times.length; s += per) {
  const grp = times.slice(s, s + per);
  const inputs = []; grp.forEach(t => inputs.push("-ss", String(t), "-i", SRC));
  const parts = grp.map((t, k) => `[${k}:v]crop=${CW}:${CH}:${CX}:${CY},scale=${TW}:-1,drawbox=x=0:y=0:w=iw:h=ih:color=white@0.5:t=2[v${k}]`);
  let fc = parts.join(";");
  // build rows then stack
  const rowIds = [];
  for (let r = 0; r < ROWS; r++) {
    const rowCells = [];
    for (let cc = 0; cc < COLS; cc++) { const idx = r * COLS + cc; if (idx < grp.length) rowCells.push(`[v${idx}]`); }
    if (rowCells.length === 0) continue;
    if (rowCells.length === 1) { fc += `;${rowCells[0]}copy[row${r}]`; }
    else { fc += `;${rowCells.join("")}hstack=inputs=${rowCells.length}[row${r}]`; }
    rowIds.push(`[row${r}]`);
  }
  if (rowIds.length === 1) fc += `;${rowIds[0]}copy[o]`;
  else fc += `;${rowIds.join("")}vstack=inputs=${rowIds.length}[o]`;
  const sn = String(Math.floor(s / per) + 1).padStart(2, "0");
  const out = `${D}/cat_${sn}.png`;
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", fc, "-map", "[o]", "-frames:v", "1", out], { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) console.error(`sheet ${sn} FAILED:`, (r.stderr || "").toString().slice(0, 300));
  // layout description: cells row-major with their timestamps
  const layout = [];
  for (let r2 = 0; r2 < ROWS; r2++) { const row = []; for (let cc = 0; cc < COLS; cc++) { const idx = r2 * COLS + cc; if (idx < grp.length) row.push(grp[idx] + "s"); } if (row.length) layout.push(row.join("  |  ")); }
  manifest.push({ sheet: sn, file: out, rows: layout });
}
writeFileSync(`${D}/cat_manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`${times.length} frames -> ${manifest.length} sheets (${COLS}x${ROWS}), grid ${START}..${END} step ${STEP}`);
for (const m of manifest) console.log(`${m.file}\n   ` + m.rows.map((r, i) => `row${i}: ${r}`).join("\n   "));
