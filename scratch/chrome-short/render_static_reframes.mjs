import fs from "node:fs";
import { spawnSync } from "node:child_process";

const sourceKind = process.argv[2] ?? "proxy";
const cutPath =
  process.argv[3] ??
  "briefs/cuts/chrome-megabox-static-reframe-v1.approved.json";
const output =
  process.argv[4] ??
  (sourceKind === "4k"
    ? "cards/sources/chrome/CutdownChromeMegaBox-portrait-static-reframed.mp4"
    : "scratch/chrome-short/static-reframed-preview.mp4");

const cut = JSON.parse(fs.readFileSync(cutPath, "utf8"));
const is4k = sourceKind === "4k";
const source = is4k ? cut.source : "scratch/chrome-short/proxy.mp4";
const scale = is4k ? 1 : 0.25;
const cropWidth = Math.round(cut.cropWidth * scale);
const cropHeight = Math.round(cut.cropHeight * scale);
const outputWidth = is4k ? 1080 : 432;
const outputHeight = is4k ? 1920 : 768;

const reframed = cut.segments.filter(
  (segment) => segment.centerX !== cut.defaultCenterX,
);
let xExpression = String(
  Math.round((cut.defaultCenterX - cut.cropWidth / 2) * scale),
);

for (const segment of reframed.toReversed()) {
  const x = Math.round((segment.centerX - cut.cropWidth / 2) * scale);
  xExpression =
    `if(gte(t,${segment.start})*lt(t,${segment.end}),${x},${xExpression})`;
}

const filter =
  `crop=${cropWidth}:${cropHeight}:'${xExpression}':0,` +
  `scale=${outputWidth}:${outputHeight}:flags=lanczos,setsar=1`;
const args = ["-hide_banner", "-y", "-i", source, "-vf", filter];

if (is4k) {
  args.push(
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
  );
} else {
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-an",
  );
}

args.push(output);
console.log(`Rendering ${reframed.length} locked reframe sections; no animation.`);
const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`DONE -> ${output}`);
