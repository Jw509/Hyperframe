// Merge held plateaus -> still-points -> 2x2 nameplate-readable contact sheets + manifest.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const D = "scratch/autocut/catalog/2024BowmanUChrome";
const SRC = "cards/sources/2024BowmanChromeBlaster/2024BowmanUChrome.mp4";
const txt = readFileSync(`${D}/motion.txt`, "utf8");
const T = [], M = [];
let c = null;
for (const l of txt.split("\n")) {
  const f = l.match(/pts_time:([\d.]+)/); if (f) { c = parseFloat(f[1]); continue; }
  const y = l.match(/YAVG=([\d.]+)/); if (y && c !== null) { T.push(c); M.push(parseFloat(y[1])); c = null; }
}
const TH = 6, MINLEN = 0.35, MERGE = 0.8;
const plats = []; let i = 0;
while (i < M.length) {
  if (M[i] < TH) {
    let j = i; while (j < M.length && M[j] < TH) j++;
    const len = T[j - 1] - T[i];
    if (len >= MINLEN) { let lo = i, best = M[i]; for (let k = i; k < j; k++) if (M[k] < best) { best = M[k]; lo = k; } plats.push({ still: T[lo], len }); }
    i = j;
  } else i++;
}
plats.sort((a, b) => a.still - b.still);
const merged = [];
for (const p of plats) { const last = merged[merged.length - 1]; if (last && p.still - last.still < MERGE) { if (p.len > last.len) { last.still = p.still; last.len = p.len; } continue; } merged.push({ ...p }); }
const times = merged.map(m => +m.still.toFixed(2));
console.error(`merged holds: ${times.length}`);
const CW = 1400, CH = 1300, CX = 1250, CY = 850, TS = 780;
const manifest = [];
for (let s = 0; s < times.length; s += 4) {
  const grp = times.slice(s, s + 4);
  const inputs = []; grp.forEach(t => inputs.push("-ss", String(t), "-i", SRC));
  const parts = grp.map((t, k) => `[${k}]crop=${CW}:${CH}:${CX}:${CY},scale=${TS}:-1[v${k}]`);
  let fc = parts.join(";");
  if (grp.length === 4) fc += `;[v0][v1]hstack[t0];[v2][v3]hstack[t1];[t0][t1]vstack[o]`;
  else if (grp.length === 1) fc += `;[v0]copy[o]`;
  else fc += `;${grp.map((_, k) => `[v${k}]`).join("")}hstack=inputs=${grp.length}[o]`;
  const sn = String(s / 4 + 1).padStart(2, "0");
  const out = `${D}/sheet_${sn}.png`;
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", fc, "-map", "[o]", "-frames:v", "1", out], { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) console.error(`sheet ${sn} FAILED:`, (r.stderr || "").toString().slice(0, 160));
  manifest.push({ sheet: s / 4 + 1, file: out, layout: grp.length === 4 ? "TL TR / BL BR" : "L->R", tiles: grp });
}
writeFileSync(`${D}/sheets_manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest.map(m => ({ sheet: m.sheet, layout: m.layout, tiles: m.tiles }))));
