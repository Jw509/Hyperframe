#!/usr/bin/env node
/**
 * Cut a source video down to a list of kept segments and concatenate them
 * into a single MP4 with the audio preserved.
 *
 * Usage:
 *   node scripts/cut-source.mjs <slug> [--cut <cuts.json>] [--out <output.mp4>] [--out-suffix <suffix>]
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
const FFPROBE = FFMPEG.replace(/ffmpeg(?:\.exe)?$/i, "ffprobe.exe");

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const args = process.argv.slice(2);
let noAudio = args.includes("--no-audio");
const valueFlags = new Set(["--input", "--cut", "--out", "--out-suffix"]);
const optionValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

// --input <variant|path> picks which source file to cut from. Defaults to
// 1080p landscape. Use "portrait" for the silent 9:16 source the cut editor
// uses, or pass an explicit project-relative/absolute video path.
const inputOpt = optionValue("--input");
const inputLooksLikePath = inputOpt
  ? /[\\/]/.test(inputOpt) || /\.(mp4|mov|mkv|webm)$/i.test(inputOpt)
  : false;
const variant = inputLooksLikePath ? null : (inputOpt || "1080p");
const positional = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (valueFlags.has(arg)) {
    i++;
    continue;
  }
  if (!arg.startsWith("--")) positional.push(arg);
}
const slug = positional[0];
if (!slug) {
  console.error("Usage: node scripts/cut-source.mjs <slug> [--no-audio] [--input <variant>] [--cut <cuts.json>] [--out <output.mp4>] [--out-suffix <suffix>]");
  console.error("  <variant> = '1080p' (landscape, default) or 'portrait' (9:16 silent)");
  console.error("  <path> may be a project-relative or absolute source video path");
  process.exit(1);
}

const cutsPath = optionValue("--cut")
  ? resolve(projectRoot, optionValue("--cut"))
  : resolve(projectRoot, "briefs/cuts", `${slug}.json`);
if (!existsSync(cutsPath)) {
  console.error(`Cuts JSON not found: ${cutsPath}`);
  process.exit(1);
}

let sourcePath = inputLooksLikePath
  ? resolve(projectRoot, inputOpt)
  : resolve(
      projectRoot,
      "cards/sources",
      slug,
      `${slug}-${variant}.mp4`,
    );
if (!existsSync(sourcePath) && !inputOpt) {
  const briefPath = resolve(projectRoot, "briefs", `${slug}.json`);
  if (existsSync(briefPath)) {
    const brief = JSON.parse(readFileSync(briefPath, "utf8"));
    if (brief.source) {
      const sourceFromBrief = String(brief.source).includes("/") || String(brief.source).includes("\\")
        ? resolve(projectRoot, brief.source)
        : resolve(projectRoot, "cards/sources", slug, brief.source);
      if (existsSync(sourceFromBrief)) sourcePath = sourceFromBrief;
    }
  }
}
if (!existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`);
  if (inputOpt) {
    console.error(`--input was provided, so no fallback source was used.`);
  } else {
    console.error(`Also checked briefs/${slug}.json source, if present.`);
  }
  process.exit(1);
}
if (!noAudio && !hasAudioStream(sourcePath)) {
  console.log("Source has no audio stream; rendering video-only.");
  noAudio = true;
}

const outSuffix = optionValue("--out-suffix") || (variant === "1080p" ? "cut" : `cut-${variant || "source"}`);
const outPath = optionValue("--out")
  ? resolve(projectRoot, optionValue("--out"))
  : resolve(projectRoot, "cards/sources", slug, `${slug}-${outSuffix}.mp4`);

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

function hasAudioStream(path) {
  const result = spawnSync(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=index",
    "-of",
    "csv=p=0",
    path,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`ffprobe failed while checking audio stream: ${stderr || `status=${result.status}`}`);
  }
  return result.stdout.trim().length > 0;
}
