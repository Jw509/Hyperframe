import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const COMPOSITION = "cards/compositions/final-chrome-speed-commons.html";
const SOURCE_RENDER = "cards/renders/chrome/final-comps-4k-commons-1p5x-v5-visual.mp4";
const OUTPUT_RENDER = "cards/renders/chrome/final-comps-4k-commons-1p5x-sfx-v5.mp4";
const FILTER_OUT = "scratch/chrome-short/commons-1p5x-sfx-v5-filter.txt";

const html = fs.readFileSync(COMPOSITION, "utf8");
const durationMatch = html.match(
  /data-composition-id="final-chrome-speed-commons"[^>]+data-duration="([^"]+)"/,
);
if (!durationMatch) throw new Error("Could not find composition duration");
const duration = Number(durationMatch[1]);

const audioTags = [...html.matchAll(/<audio\s+([^>]+)>/g)].map((match) => {
  const attrs = match[1];
  const read = (name) => {
    const value = attrs.match(new RegExp(`${name}="([^"]+)"`))?.[1];
    if (!value) throw new Error(`Missing ${name} in audio tag: ${attrs}`);
    return value;
  };
  const src = path.resolve(path.dirname(COMPOSITION), read("src"));
  return {
    id: read("id"),
    start: Number(read("data-start")),
    duration: Number(read("data-duration")),
    src,
  };
});

if (audioTags.length === 0) throw new Error("No audio cues found");

const args = ["-hide_banner", "-y", "-i", SOURCE_RENDER];
for (const cue of audioTags) args.push("-i", cue.src);

const filterParts = audioTags.map((cue, index) => {
  const delayMs = Math.round(cue.start * 1000);
  return `[${index + 1}:a]adelay=${delayMs}|${delayMs},apad,atrim=duration=${duration}[a${index + 1}]`;
});
const mixInputs = audioTags.map((_, index) => `[a${index + 1}]`).join("");
filterParts.push(
  `${mixInputs}amix=inputs=${audioTags.length}:duration=longest:normalize=0,atrim=duration=${duration}[aout]`,
);
fs.writeFileSync(FILTER_OUT, `${filterParts.join(";\n")}\n`);

args.push(
  "-filter_complex_script",
  FILTER_OUT,
  "-map",
  "0:v:0",
  "-map",
  "[aout]",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-movflags",
  "+faststart",
  OUTPUT_RENDER,
);

console.log(`Muxing ${audioTags.length} cues onto approved visuals`);
for (const cue of audioTags) {
  console.log(`${cue.start.toFixed(2)}s ${cue.id}`);
}

const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Wrote ${OUTPUT_RENDER}`);
