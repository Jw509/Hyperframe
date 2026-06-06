import fs from "node:fs";
import { spawnSync } from "node:child_process";

const sourceKind = process.argv[2] ?? "proxy";
const cutPath =
  process.argv[3] ?? "briefs/cuts/chrome-megabox-containment-test-v1.json";
const output =
  process.argv[4] ?? "scratch/chrome-short/containment-test-v1-guides.mp4";
const showGuides = process.argv.includes("--guides");

const cut = JSON.parse(fs.readFileSync(cutPath, "utf8"));
const is4k = sourceKind === "4k";
const source = is4k ? cut.source : "scratch/chrome-short/proxy.mp4";
const scale = is4k ? 1 : 0.25;
const cropWidth = Math.round(cut.cropWidth * scale);
const cropHeight = Math.round(cut.cropHeight * scale);
const pad = Math.round(cut.verticalPad * scale);
const outputWidth = is4k ? 1080 : 432;
const outputHeight = is4k ? 1920 : 768;
const targetX = cut.referenceGuides.cardCenterX * cut.cropWidth;
const targetY = cut.referenceGuides.cardCenterY * cut.cropHeight;

let xExpression = String(
  Math.round((cut.defaultCenterX - targetX) * scale),
);
let yExpression = String(
  Math.round((pad + cut.defaultCenterY - targetY) * scale),
);

for (const segment of cut.segments.toReversed()) {
  const x = Math.round((segment.centerX - targetX) * scale);
  const y = Math.round((cut.verticalPad + segment.centerY - targetY) * scale);
  const active = `gte(t,${segment.start})*lt(t,${segment.end})`;
  xExpression = `if(${active},${x},${xExpression})`;
  yExpression = `if(${active},${y},${yExpression})`;
}

const filters = [
  `pad=iw:ih+${pad * 2}:0:${pad}:color=black`,
  `fillborders=top=${pad}:bottom=${pad}:mode=${cut.verticalFillMode}`,
  `crop=${cropWidth}:${cropHeight}:'${xExpression}':'${yExpression}'`,
  `scale=${outputWidth}:${outputHeight}:flags=lanczos`,
  "setsar=1",
];

if (showGuides) {
  const left = Math.round(cut.referenceGuides.left * outputWidth);
  const right = Math.round(cut.referenceGuides.right * outputWidth);
  const top = Math.round(cut.referenceGuides.top * outputHeight);
  const bottom = Math.round(cut.referenceGuides.bottom * outputHeight);
  filters.push(
    `drawbox=x=${left}:y=0:w=3:h=ih:color=red:t=fill`,
    `drawbox=x=${right}:y=0:w=3:h=ih:color=red:t=fill`,
    `drawbox=x=0:y=${top}:w=iw:h=3:color=red:t=fill`,
    `drawbox=x=0:y=${bottom}:w=iw:h=3:color=red:t=fill`,
  );
}

const args = [
  "-hide_banner",
  "-y",
  "-i",
  source,
  "-vf",
  filters.join(","),
];

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
console.log(
  `Rendering ${cut.segments.length} locked 2D reframe sections; guides=${showGuides}.`,
);
const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`DONE -> ${output}`);
