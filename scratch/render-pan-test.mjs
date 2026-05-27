#!/usr/bin/env node
/**
 * Fast iteration loop for tuning keyframed pans.
 * Renders just a 30s window from the LANDSCAPE source with the keyframed
 * crop applied. Edit KEYFRAMES below + re-run for the next iteration.
 *
 *   node scratch/render-pan-test.mjs
 *
 * Output: scratch/pan-test.mp4
 */
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

// ---- EDIT THESE TO ITERATE ----
const WINDOW_START = 402;   // source seconds — start of test clip
const WINDOW_DUR   = 32;    // seconds of clip

// Each keyframe = [source_time_sec, x_shift_from_center_crop]
// 0 = full-centered crop. +100 = shift right 100px. -100 = shift left.
// Linear interpolation between adjacent keyframes.
const KEYFRAMES = [
  [410,   100], // hold default — no shift before clip 10s
  [412,   100], // clip 10s exactly — pan kicks in HERE
  [413,   400], // sharp ramp up
  [414,   700], // PEAK — follow Kyson Brown fully right
  [415.5, 700], // HOLD peak 1.5s longer (was the pan-back too early)
  [416.5, 500], // quick return starts now
  [417.5, 200], // sharp pan-back
  [418.5, 100], // back to default
];

const SOURCE = "C:/Users/J/Desktop/Hobbybox/2026-05-23 19-15-10.mp4";
const FFMPEG = process.platform === "win32" ? "ffmpeg" : "ffmpeg";

// ---- BUILD EXPRESSION ----
// `t` in the ffmpeg filter is the OUTPUT-relative time after -ss seeking.
// So adjust keyframe times by subtracting WINDOW_START.
const kfs = KEYFRAMES.map(([t, x]) => [t - WINDOW_START, x]);

// Build piecewise linear expression as nested if().
// if(lt(t, kfs[0][0]), kfs[0][1],
//   if(lt(t, kfs[1][0]), interpolate from kfs[0] to kfs[1],
//     ...))
function lerpExpr(t1, x1, t2, x2) {
  // x = x1 + (x2-x1) * (t - t1) / (t2 - t1)
  return `${x1}+(${x2}-${x1})*(t-${t1})/(${t2}-${t1})`;
}

function buildExpr(kfs) {
  let expr = `${kfs[kfs.length - 1][1]}`;  // tail default = last value
  for (let i = kfs.length - 1; i >= 1; i--) {
    const [t1, x1] = kfs[i - 1];
    const [t2, x2] = kfs[i];
    expr = `if(lt(t,${t2}),${lerpExpr(t1, x1, t2, x2)},${expr})`;
  }
  // Head: before first keyframe, hold at first value
  expr = `if(lt(t,${kfs[0][0]}),${kfs[0][1]},${expr})`;
  return expr;
}

const xShiftExpr = buildExpr(kfs);
const cropExpr = `(iw-1080)/2 + ${xShiftExpr}`;

// Escape commas for ffmpeg filter context
const cropEscaped = cropExpr.replace(/,/g, "\\,");

const filter = `scale=-2:1920,crop=1080:1920:'${cropEscaped}':0`;

const out = "scratch/pan-test.mp4";
const args = [
  "-y", "-hide_banner",
  "-ss", String(WINDOW_START),
  "-t", String(WINDOW_DUR),
  "-i", SOURCE,
  "-vf", filter,
  "-an",
  "-c:v", "libx264", "-crf", "19", "-preset", "fast",
  "-r", "60",
  "-movflags", "+faststart",
  out,
];

console.log("Keyframes (source time → x-shift):");
KEYFRAMES.forEach(([t, x]) => {
  const mm = Math.floor(t / 60);
  const ss = (t % 60).toString().padStart(2, "0");
  console.log(`  ${mm}:${ss}  →  shift ${x >= 0 ? "+" : ""}${x}`);
});
console.log(`\nWindow: src ${WINDOW_START}-${WINDOW_START + WINDOW_DUR}s (${WINDOW_DUR}s)`);
console.log(`Output: ${out}\n`);
console.log("Filter expression:");
console.log("  " + filter.substring(0, 200) + (filter.length > 200 ? "..." : ""));
console.log("");

const r = spawnSync(FFMPEG, args, { stdio: "inherit" });
if (r.status !== 0) {
  console.error(`\n❌ ffmpeg failed with exit ${r.status}`);
  process.exit(r.status ?? 1);
}

// Print size + duration
try {
  const probe = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration,size",
    "-of", "default=noprint_wrappers=1:nokey=0",
    out,
  ], { encoding: "utf8" });
  console.log("\n" + probe);
} catch (e) {}

console.log(`✓ Done. Open ${out} to verify the pan.`);
