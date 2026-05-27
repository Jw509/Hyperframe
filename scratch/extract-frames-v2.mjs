// Pass 2: cards appear AFTER the silence in this footage.
// Sample at (silence_end + 2.5s) - card is on the mat being held/discussed.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const candidates = JSON.parse(
  readFileSync("scratch/bowmanchrome2025-silences.json", "utf8"),
);

const SRC = "C:/Users/J/Desktop/Hobbybox/2026-05-23 19-15-10.mp4";
const OUT = "scratch/bowmanchrome2025-frames-v2";

for (const c of candidates) {
  const t = c.revealAt + 2.5;
  const mm = Math.floor(c.revealAt / 60);
  const ss = Math.floor(c.revealAt % 60).toString().padStart(2, "0");
  const name = `${mm.toString().padStart(2, "0")}-${ss}_sil${c.silencePrior.toFixed(1)}s.jpg`;
  const out = join(OUT, name);
  try {
    execFileSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", t.toFixed(2),
      "-i", SRC,
      "-frames:v", "1",
      "-q:v", "5",
      "-vf", "scale=640:-1",
      out,
    ]);
    process.stdout.write(".");
  } catch (e) {
    console.error(`\nfailed at ${name}: ${e.message}`);
  }
}
console.log(`\nWrote ${candidates.length} frames to ${OUT}/`);
