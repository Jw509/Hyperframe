#!/usr/bin/env node
/**
 * Render a cut from a segments JSON to an explicit output path (video-only).
 * Mirrors scripts/cut-source.mjs trim+concat, but with parameterized I/O so it
 * never overwrites the pipeline's fixed-path working files.
 *
 * Usage: node render-cut.mjs <segments.json> <input.mp4> <output.mp4>
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [segPath, inPath, outPath] = process.argv.slice(2);
if (!segPath || !inPath || !outPath) {
  console.error("Usage: node render-cut.mjs <segments.json> <input.mp4> <output.mp4>");
  process.exit(1);
}
for (const p of [segPath, inPath]) {
  if (!existsSync(p)) { console.error(`Not found: ${p}`); process.exit(1); }
}

const { segments } = JSON.parse(readFileSync(segPath, "utf8"));
if (!Array.isArray(segments) || segments.length === 0) {
  console.error("segments[] missing or empty"); process.exit(1);
}

const parts = [];
const labels = [];
let total = 0;
segments.forEach(({ start, end }, i) => {
  const dur = end - start;
  if (dur <= 0) { console.error(`Segment ${i + 1} non-positive: ${start}-${end}`); process.exit(1); }
  total += dur;
  parts.push(`[0:v]trim=${start}:${end},setpts=PTS-STARTPTS[v${i}]`);
  labels.push(`[v${i}]`);
});
parts.push(`${labels.join("")}concat=n=${segments.length}:v=1:a=0[outv]`);

console.log(`Cutting ${segments.length} segments, expected ${total.toFixed(2)}s (video-only)`);

const args = [
  "-y", "-i", inPath,
  "-filter_complex", parts.join(";"),
  "-map", "[outv]",
  "-c:v", "libx264", "-crf", "19", "-preset", "fast", "-r", "60", "-an",
  outPath,
];
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (r.status !== 0) { console.error(`ffmpeg exit ${r.status}`); process.exit(r.status ?? 1); }
console.log(`\nDone -> ${outPath}\n${(statSync(outPath).size / 1048576).toFixed(1)} MB, ${total.toFixed(2)}s, ${segments.length} cuts`);
