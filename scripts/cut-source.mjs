#!/usr/bin/env node
/**
 * Cut a source video down to a list of kept segments and concatenate them
 * into a single MP4 with the audio preserved.
 *
 * Usage:
 *   node scripts/cut-source.mjs <slug>
 *
 * Reads segments from a JSON file at briefs/cuts/<slug>.json shaped like:
 *   { "segments": [{ "start": 0.0, "end": 0.5 }, ...] }
 *
 * Input:  cards/sources/<slug>/<slug>-1080p.mp4
 * Output: cards/sources/<slug>/<slug>-cut.mp4
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FFMPEG =
  "C:/Users/J/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const args = process.argv.slice(2);
const noAudio = args.includes("--no-audio");
// --input <variant> picks which source file to cut from. Defaults to 1080p
// landscape. Use "portrait" for the silent 9:16 source the cut editor uses.
const inputIdx = args.indexOf("--input");
const variant = inputIdx >= 0 ? args[inputIdx + 1] : "1080p";
const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--input");
if (!slug) {
  console.error("Usage: node scripts/cut-source.mjs <slug> [--no-audio] [--input <variant>]");
  console.error("  <variant> = '1080p' (landscape, default) or 'portrait' (9:16 silent)");
  process.exit(1);
}

const cutsPath = resolve(projectRoot, "briefs/cuts", `${slug}.json`);
if (!existsSync(cutsPath)) {
  console.error(`Cuts JSON not found: ${cutsPath}`);
  process.exit(1);
}

const sourcePath = resolve(
  projectRoot,
  "cards/sources",
  slug,
  `${slug}-${variant}.mp4`,
);
if (!existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`);
  process.exit(1);
}

const outSuffix = variant === "1080p" ? "cut" : `cut-${variant}`;
const outPath = resolve(
  projectRoot,
  "cards/sources",
  slug,
  `${slug}-${outSuffix}.mp4`,
);

const data = JSON.parse(readFileSync(cutsPath, "utf8"));
const segments = data.segments;
if (!Array.isArray(segments) || segments.length === 0) {
  console.error("`segments` array missing or empty");
  process.exit(1);
}

// Build filter_complex: per-segment trim (+ atrim if audio kept), then concat
const filterParts = [];
const inputLabels = [];
let totalDur = 0;
for (let i = 0; i < segments.length; i++) {
  const { start, end } = segments[i];
  const dur = end - start;
  if (dur <= 0) {
    console.error(`Segment ${i + 1} has non-positive duration: ${start}-${end}`);
    process.exit(1);
  }
  totalDur += dur;
  filterParts.push(
    `[0:v]trim=${start}:${end},setpts=PTS-STARTPTS[v${i}]`,
  );
  if (!noAudio) {
    filterParts.push(
      `[0:a]atrim=${start}:${end},asetpts=PTS-STARTPTS[a${i}]`,
    );
    inputLabels.push(`[v${i}][a${i}]`);
  } else {
    inputLabels.push(`[v${i}]`);
  }
}
filterParts.push(
  noAudio
    ? `${inputLabels.join("")}concat=n=${segments.length}:v=1:a=0[outv]`
    : `${inputLabels.join("")}concat=n=${segments.length}:v=1:a=1[outv][outa]`,
);
const filterComplex = filterParts.join(";");

console.log(`Cutting ${segments.length} segments from ${sourcePath}${noAudio ? " (no audio)" : ""}`);
console.log(`Expected output duration: ${totalDur.toFixed(2)}s`);

const ffmpegArgs = [
  "-y",
  "-i", sourcePath,
  "-filter_complex", filterComplex,
  "-map", "[outv]",
  "-c:v", "libx264",
  "-crf", "19",
  "-preset", "fast",
  "-r", "60",
];
if (noAudio) {
  ffmpegArgs.push("-an");
} else {
  ffmpegArgs.push("-map", "[outa]", "-c:a", "aac", "-b:a", "192k");
}
ffmpegArgs.push(outPath);

const r = spawnSync(FFMPEG, ffmpegArgs, { stdio: "inherit" });
if (r.status !== 0) {
  console.error(`ffmpeg failed with exit ${r.status}`);
  process.exit(r.status ?? 1);
}

const size = statSync(outPath).size;
console.log(
  `\nDone. ${outPath}\n${(size / 1024 / 1024).toFixed(1)} MB, ${totalDur.toFixed(2)}s, ${segments.length} segments`,
);
