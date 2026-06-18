import fs from "fs";
import { spawnSync } from "child_process";

const SOURCE = "cards/sources/chrome/usertracked-h264.mp4";
const OUTPUT = "cards/sources/chrome/usertracked-h264-commons-1p5x.mp4";
const CATALOG = "scratch/chrome-short/catalogue_v2.json";
const TIMELINE_OUT = "scratch/chrome-short/commons-1p5x-timeline.json";
const FILTER_OUT = "scratch/chrome-short/commons-1p5x-filter.txt";
const AUDIT_OUT = "scratch/chrome-short/commons-1p5x-timeline.md";
const SOURCE_DURATION = 133.27;
const COMMON_SPEED = 1.5;

// User-reviewed output times: last card to new pack transition.
const PACK_TRANSITION_OUTPUTS = [
  { pack: 2, outputStart: 20, note: "last card to new pack" },
  { pack: 3, outputStart: 33.8, note: "last card to new pack" },
  { pack: 4, outputStart: 48, note: "last card to new pack" },
  { pack: 5, outputStart: 64, note: "moved 0.5 seconds later" },
  { pack: 6, outputStart: 79, note: "last card to new pack" },
  { pack: 7, outputStart: 92, note: "moved from about 1:35 to 1:32" },
];

const round = (value, places = 6) => Number(value.toFixed(places));
const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const spedShots = catalog.shots
  .filter((shot) => shot.id === null && shot.price === 0 && !shot.label.startsWith("("))
  .map((shot) => ({
    label: shot.label,
    sourceStart: shot.start,
    sourceEnd: shot.end,
    speed: COMMON_SPEED,
  }))
  .sort((a, b) => a.sourceStart - b.sourceStart);

const segments = [];
let cursor = 0;
for (const shot of spedShots) {
  if (shot.sourceStart > cursor) {
    segments.push({ sourceStart: cursor, sourceEnd: shot.sourceStart, speed: 1 });
  }
  segments.push({
    sourceStart: shot.sourceStart,
    sourceEnd: shot.sourceEnd,
    speed: shot.speed,
    label: shot.label,
  });
  cursor = shot.sourceEnd;
}
if (cursor < SOURCE_DURATION) {
  segments.push({ sourceStart: cursor, sourceEnd: SOURCE_DURATION, speed: 1 });
}

let outputCursor = 0;
for (const segment of segments) {
  segment.outputStart = round(outputCursor);
  outputCursor += (segment.sourceEnd - segment.sourceStart) / segment.speed;
  segment.outputEnd = round(outputCursor);
}

const mapSource = (seconds) => {
  const segment =
    segments.find((item) => seconds >= item.sourceStart && seconds < item.sourceEnd) ??
    segments.at(-1);
  return round(segment.outputStart + (seconds - segment.sourceStart) / segment.speed);
};

const packTransitions = PACK_TRANSITION_OUTPUTS;

const timeline = {
  source: SOURCE,
  output: OUTPUT,
  sourceDuration: SOURCE_DURATION,
  outputDuration: round(outputCursor),
  commonSpeed: COMMON_SPEED,
  spedShotCount: spedShots.length,
  spedShots: spedShots.map((shot) => ({
    ...shot,
    outputStart: mapSource(shot.sourceStart),
    outputEnd: mapSource(shot.sourceEnd),
  })),
  packTransitions,
  segments,
};

fs.writeFileSync(TIMELINE_OUT, `${JSON.stringify(timeline, null, 2)}\n`);

const filterParts = segments.map(
  (segment, index) =>
    `[0:v]trim=start=${segment.sourceStart}:end=${segment.sourceEnd},setpts=(PTS-STARTPTS)/${segment.speed}[v${index}]`,
);
const concatInputs = segments.map((_, index) => `[v${index}]`).join("");
filterParts.push(
  `${concatInputs}concat=n=${segments.length}:v=1:a=0,fps=60,format=yuv420p[outv]`,
);
fs.writeFileSync(FILTER_OUT, `${filterParts.join(";\n")}\n`);

const audit = [
  "# Chrome Commons 1.5x Timeline",
  "",
  `- Source: \`${SOURCE}\``,
  `- Output: \`${OUTPUT}\``,
  `- Source duration: ${SOURCE_DURATION.toFixed(3)}s`,
  `- Output video duration: ${timeline.outputDuration.toFixed(3)}s`,
  `- Common-card shots sped to ${COMMON_SPEED}x: ${spedShots.length}`,
  `- Comped cards, pack openings, and fans remain at 1.0x.`,
  "",
  "## Sped Common Cards",
  "",
  "| Card | Source | Output |",
  "|---|---:|---:|",
  ...timeline.spedShots.map(
    (shot) =>
      `| ${shot.label} | ${shot.sourceStart.toFixed(3)}-${shot.sourceEnd.toFixed(3)} | ${shot.outputStart.toFixed(3)}-${shot.outputEnd.toFixed(3)} |`,
  ),
  "",
  "## Pack-Transition SFX",
  "",
  "| Pack | Output | Note |",
  "|---:|---:|---|",
  ...packTransitions.map(
    (transition) =>
      `| ${transition.pack} | ${transition.outputStart.toFixed(3)} | ${transition.note} |`,
  ),
  "",
];
fs.writeFileSync(AUDIT_OUT, `${audit.join("\n")}\n`);

console.log(
  `Prepared ${spedShots.length} common-card speed windows: ${SOURCE_DURATION.toFixed(3)}s -> ${timeline.outputDuration.toFixed(3)}s`,
);
console.log(`Timeline: ${TIMELINE_OUT}`);
console.log(`Audit: ${AUDIT_OUT}`);

if (process.argv.includes("--render")) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-y",
      "-i",
      SOURCE,
      "-filter_complex_script",
      FILTER_OUT,
      "-map",
      "[outv]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "16",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      OUTPUT,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`Rendered accelerated base: ${OUTPUT}`);
}
