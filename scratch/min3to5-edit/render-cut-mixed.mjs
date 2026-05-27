#!/usr/bin/env node
/**
 * Per-segment extract -> lossless concat (video-use Hard Rule 2 style).
 * Each segment defaults to the portrait source; a segment may set
 *   "source":"landscape" + "cropX":"<ffmpeg x-expr>"  to re-crop/pan from the
 * wider 1920-wide source (scaled to 1920 tall). Used for the keyframed fan pans.
 *
 * Usage: node render-cut-mixed.mjs <cuts.json> <portrait.mp4> <landscape.mp4> <out.mp4>
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";

const [cutsPath, portraitPath, landscapePath, outPath] = process.argv.slice(2);
if (!cutsPath || !portraitPath || !landscapePath || !outPath) {
  console.error("Usage: node render-cut-mixed.mjs <cuts.json> <portrait.mp4> <landscape.mp4> <out.mp4>");
  process.exit(1);
}
const { segments } = JSON.parse(readFileSync(cutsPath, "utf8"));
const tmpDir = resolve(dirname(outPath), "_tmp_mixed");
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const COMMON = ["-c:v", "libx264", "-crf", "19", "-preset", "fast", "-pix_fmt", "yuv420p",
  "-r", "60", "-video_track_timescale", "60000", "-an"];

const parts = [];
let total = 0;
segments.forEach((s, i) => {
  const dur = +(s.end - s.start).toFixed(3);
  total += dur;
  const out = resolve(tmpDir, `seg_${String(i).padStart(3, "0")}.mp4`);
  let input, vf;
  if (s.source === "landscape") {
    input = landscapePath;
    const x = s.cropX || "(iw-1080)/2";
    vf = `scale=-2:1920,crop=w=1080:h=1920:x='${x}':y=0,setpts=PTS-STARTPTS`;
  } else {
    input = portraitPath;
    vf = `setpts=PTS-STARTPTS`;
  }
  const args = ["-y", "-ss", String(s.start), "-t", String(dur), "-i", input,
    "-vf", vf, ...COMMON, out];
  const r = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) { console.error(`segment ${i} (src ${s.start}) failed`); process.exit(1); }
  parts.push(out);
  if (s.source === "landscape") console.log(`  [landscape pan] seg ${i}: ${s.start}-${s.end}`);
});

const listPath = resolve(tmpDir, "list.txt");
writeFileSync(listPath, parts.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
let cc = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath], { stdio: "inherit" });
if (cc.status !== 0) {
  console.error("concat -c copy failed; retrying with re-encode");
  cc = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, ...COMMON, outPath], { stdio: "inherit" });
}
if (cc.status !== 0) process.exit(1);
rmSync(tmpDir, { recursive: true, force: true });
console.log(`done -> ${outPath} (${total.toFixed(1)}s, ${segments.length} segments)`);
