import fs from "fs";
import { execSync } from "child_process";

// args: mode(full|fixed)  src(proxy|4k)  out.mp4  [previewScale]
const mode = process.argv[2] ?? "full";
const srcKind = process.argv[3] ?? "proxy";
const out = process.argv[4] ?? "scratch/chrome-short/reframe_preview.mp4";

const catPath = process.env.CAT || "scratch/chrome-short/catalogue.json";
const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
const shots = cat.shots;

const is4k = srcKind === "4k";
const src = is4k ? cat.source : "scratch/chrome-short/proxy.mp4";
const SRCW = is4k ? 3840 : 960;
const SRCH = is4k ? 2160 : 540;
const sc = is4k ? 1 : 0.25; // proxy scale factor

// crop window in source px
let W, H, fixedY = null;
if (mode === "full") {
  H = SRCH;                       // full height
  W = Math.round(H * 9 / 16);
} else {
  // fixed: shorter height, centered vertically on cy
  H = Math.round((is4k ? 1900 : 1900 * sc));
  W = Math.round(H * 9 / 16);
}
if (W % 2) W += 1;

// boundaries = midpoints between consecutive shot centers in time
const START = process.env.START ? parseFloat(process.env.START) : null;
const DUR = process.env.DUR ? parseFloat(process.env.DUR) : null;
const off = START ?? 0;
const mids = shots.map(s => (s.start + s.end) / 2);
const bounds = [];
for (let i = 0; i < shots.length - 1; i++) bounds.push(((shots[i].end + shots[i + 1].start) / 2) - off);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function x0(s) { return Math.round(clamp(s.cx * sc - W / 2, 0, SRCW - W)); }
function y0(s) {
  if (mode === "full") return 0;
  return Math.round(clamp(s.cy * sc - H / 2, 0, SRCH - H));
}

// build piecewise-constant expr over t
function expr(vals) {
  // vals[i] active in [bounds[i-1], bounds[i])
  let parts = [];
  for (let i = 0; i < vals.length; i++) {
    const lo = i === 0 ? -1 : bounds[i - 1];
    const hi = i === vals.length - 1 ? 1e9 : bounds[i];
    let cond;
    if (i === 0) cond = `lt(t,${hi.toFixed(3)})`;
    else if (i === vals.length - 1) cond = `gte(t,${lo.toFixed(3)})`;
    else cond = `(gte(t,${lo.toFixed(3)})*lt(t,${hi.toFixed(3)}))`;
    parts.push(`${vals[i]}*${cond}`);
  }
  return parts.join("+");
}

const xs = shots.map(x0);
const ys = shots.map(y0);
const xexpr = expr(xs);
const yexpr = mode === "full" ? "0" : expr(ys);

// output size
const OW = is4k ? 1080 : 432;   // native 9:16 slice downscaled to 1080w (no upscale)
const OH = is4k ? 1920 : 768;

const vf = `crop=${W}:${H}:x='${xexpr}':y='${yexpr}',scale=${OW}:${OH}:flags=lanczos`;
fs.writeFileSync("scratch/chrome-short/last_vf.txt", vf);

const enc = is4k
  ? `-c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart`
  : `-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p`;
const seek = START != null ? `-ss ${START} ${DUR != null ? `-t ${DUR}` : ""}` : "";
const cmd = `ffmpeg -y ${seek} -i "${src}" -vf "${vf}" ${enc} -an "${out}"`;
console.log(`mode=${mode} src=${srcKind} crop=${W}x${H} out=${OW}x${OH}`);
console.log(`shots=${shots.length} bounds=${bounds.length}`);
execSync(cmd, { stdio: "inherit" });

// write midpoint times for contact sheet
fs.writeFileSync("scratch/chrome-short/mids.json", JSON.stringify(mids));
console.log("DONE ->", out);
