import fs from "fs";
import { spawnSync } from "child_process";

const srcKind = process.argv[2] ?? "proxy";
const out =
  process.argv[3] ??
  (srcKind === "4k"
    ? "cards/sources/chrome/CutdownChromeMegaBox-portrait-centered.mp4"
    : "scratch/chrome-short/reveal-aware-preview.mp4");
const catPath =
  process.argv[4] ?? "scratch/chrome-short/catalogue_final.json";

const cat = JSON.parse(
  fs.readFileSync(catPath, "utf8"),
);
const is4k = srcKind === "4k";
const src = is4k ? cat.source : "scratch/chrome-short/proxy.mp4";
const scale = is4k ? 1 : 0.25;
const srcW = Math.round(cat.srcW * scale);
const srcH = Math.round(cat.srcH * scale);
const cropW = Math.round(1068 * scale);
const cropH = Math.round(1900 * scale);
const outW = is4k ? 1080 : 432;
const outH = is4k ? 1920 : 768;
const fps = cat.fps;
const frameCount = Math.round(cat.dur * fps);
const transitionDuration = 0.45;
const transitionEndLead = 0.05;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smoothstep = (value) => value * value * (3 - 2 * value);
const centerOverrides = new Map([
  [1, 1870],
  [23, 1680],
  [25, 1860],
  [34, 1960],
  [35, 1960],
  [36, 1820],
  [37, 1630],
]);

const targets = [
  {
    start: 0,
    end: cat.shots[0].start - transitionDuration - transitionEndLead,
    label: "intro",
    cx: 1250,
    cy: 980,
  },
  ...cat.shots.map((shot, index) => ({
    ...shot,
    cx: centerOverrides.get(index + 1) ?? shot.cx,
    cy: shot.cyTrack ?? shot.cy,
  })),
];

function transitionTo(index) {
  if (index === 0) return null;

  const previous = targets[index - 1];
  const current = targets[index];
  const end = current.start - transitionEndLead;
  const preferredStart = end - transitionDuration;
  const availableStart = Math.min(end, previous.end + 0.02);

  return {
    start: Math.max(preferredStart, availableStart),
    end,
  };
}

function targetAt(time) {
  let index = targets.length - 1;
  for (let i = 1; i < targets.length; i += 1) {
    if (time < targets[i].start) {
      index = i - 1;
      break;
    }
  }

  const nextIndex = Math.min(index + 1, targets.length - 1);
  const transition = transitionTo(nextIndex);
  if (
    nextIndex !== index &&
    transition &&
    time >= transition.start &&
    time < transition.end &&
    transition.end > transition.start
  ) {
    const from = targets[index];
    const to = targets[nextIndex];
    const progress = smoothstep(
      (time - transition.start) / (transition.end - transition.start),
    );
    return {
      cx: from.cx + (to.cx - from.cx) * progress,
      cy: from.cy + (to.cy - from.cy) * progress,
    };
  }

  if (nextIndex !== index && transition && time >= transition.end) {
    return targets[nextIndex];
  }

  return targets[index];
}

const commands = [];
for (let frame = 0; frame < frameCount; frame += 1) {
  const time = frame / fps;
  const target = targetAt(time);
  const x = Math.round(
    clamp(target.cx * scale - cropW / 2, 0, srcW - cropW),
  );
  const y = Math.round(
    clamp(target.cy * scale - cropH / 2, 0, srcH - cropH),
  );

  commands.push(`${time.toFixed(4)} crop x ${x};`);
  commands.push(`${time.toFixed(4)} crop y ${y};`);
}

const commandFile = is4k
  ? "scratch/chrome-short/reveal-aware-4k-cmds.txt"
  : "scratch/chrome-short/reveal-aware-proxy-cmds.txt";
fs.writeFileSync(commandFile, commands.join("\n"));

const filter =
  `sendcmd=f='${commandFile}',` +
  `crop=${cropW}:${cropH}:0:0,` +
  `scale=${outW}:${outH}:flags=lanczos,setsar=1`;

const args = ["-y", "-i", src, "-vf", filter];
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
args.push(out);

console.log(
  `Reveal-aware crop: ${cropW}x${cropH} -> ${outW}x${outH}; ` +
    `${targets.length - 1} catalog moments; source=${srcKind}; catalog=${catPath}`,
);
const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`DONE -> ${out}`);
