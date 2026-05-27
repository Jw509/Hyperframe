import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const candidates = JSON.parse(
  readFileSync("scratch/bowmanchrome2025-silences.json", "utf8"),
);

const SRC = "C:/Users/J/Desktop/Hobbybox/2026-05-23 19-15-10.mp4";
const OUT = "scratch/bowmanchrome2025-frames";

// Sample at (silence_end - 1.0s) — host is staring at the card mid-silence.
for (const c of candidates) {
  const t = Math.max(0, c.revealAt - 1.0);
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
      "-q:v", "5",      // jpeg quality 1-31, 5 = decent
      "-vf", "scale=640:-1",  // small frames - we only need to identify the card
      out,
    ]);
    process.stdout.write(".");
  } catch (e) {
    console.error(`\nfailed at ${name}: ${e.message}`);
  }
}
console.log(`\nWrote ${candidates.length} frames to ${OUT}/`);
