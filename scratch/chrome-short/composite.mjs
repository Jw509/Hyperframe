import fs from "fs";
import { execSync } from "child_process";

// args: reframeVideo out START DUR  [final]
const reframe = process.argv[2];
const out = process.argv[3];
const START = parseFloat(process.argv[4] ?? "0");
const DUR = process.argv[5] ? parseFloat(process.argv[5]) : null;
const FINAL = process.argv[6] === "final";
const rangeEnd = DUR != null ? START + DUR : 1e9;
const OV = "scratch/chrome-short/ov";
const man = JSON.parse(fs.readFileSync(`${OV}/manifest.json`, "utf8"));
const reveals = man.reveals;
const VEND = 133.27;
const pad = n => String(n).padStart(2, "0");

// total-value intervals (top element persists, updates at each reveal)
const totals = [{ file: "total_00.png", a: 0, b: reveals[0].start }];
for (let i = 0; i < reveals.length; i++)
  totals.push({ file: `total_${pad(i + 1)}.png`, a: reveals[i].start, b: i + 1 < reveals.length ? reveals[i + 1].start : 1e9 });
// bottom bars
const bars = reveals.map((r, i) => ({ file: `bar_${pad(i + 1)}.png`, a: r.start, b: r.end }));

const overlaps = o => o.a < rangeEnd && o.b > START;
const items = [];
for (const t of totals) if (overlaps(t)) items.push({ ...t, x: 70, y: 90, kind: "total" });
for (const b of bars) if (overlaps(b)) items.push({ ...b, x: 0, y: 3080, kind: "bar" });

// inputs
let inputs = `-i "${reframe}"`;
for (const it of items) inputs += ` -loop 1 -i "${OV}/${it.file}"`;
if (FINAL) inputs += ` -loop 1 -i "${OV}/roi.png"`;

// filter graph
let fc = [];
let prev = "0:v";
const ROI_DUR = 4;
if (FINAL) { fc.push(`[0:v]tpad=stop_mode=clone:stop_duration=${ROI_DUR}[base]`); prev = "base"; }
items.forEach((it, k) => {
  const idx = k + 1;
  const a = Math.max(0, it.a - START);
  const b = Math.min(rangeEnd - START, it.b - START);
  const fo = Math.max(a + 0.2, b - 0.3);
  const fd = 0.3;
  // slight upward slide for bars
  const yexpr = it.kind === "bar" ? `${it.y}+50*max(0\\,1-(t-${a.toFixed(2)})/0.35)` : `${it.y}`;
  fc.push(`[${idx}:v]format=rgba,fade=t=in:st=${a.toFixed(2)}:d=${fd}:alpha=1,fade=t=out:st=${fo.toFixed(2)}:d=${fd}:alpha=1[o${idx}]`);
  fc.push(`[${prev}][o${idx}]overlay=${it.x}:y='${yexpr}':enable='between(t,${(a - 0.05).toFixed(2)},${(b + 0.05).toFixed(2)})'[v${idx}]`);
  prev = `v${idx}`;
});

// ROI outro (final only): video extended by tpad; fade ROI in over the held last frame
if (FINAL) {
  const ridx = items.length + 1; // roi.png is last input
  const ra = VEND - START;
  fc.push(`[${ridx}:v]format=rgba,fade=t=in:st=${ra.toFixed(2)}:d=0.6:alpha=1[roi]`);
  fc.push(`[${prev}][roi]overlay=0:0:enable='gte(t,${(ra - 0.05).toFixed(2)})'[vroi]`);
  prev = "vroi";
}

const last = prev;
const enc = FINAL
  ? `-c:v libx265 -preset slow -crf 17 -pix_fmt yuv420p -tag:v hvc1`
  : `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`;
const cmd = `ffmpeg -y ${inputs} -filter_complex "${fc.join(";")}" -map "[${last}]" ${enc} -an "${out}"`;
fs.writeFileSync("scratch/chrome-short/last_composite_cmd.txt", cmd);
console.log(`overlays: ${items.length} (range ${START}..${rangeEnd === 1e9 ? "end" : rangeEnd})`);
execSync(cmd, { stdio: "inherit" });
console.log("DONE ->", out);
