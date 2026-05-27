// Frame the critical cut-boundary moments to validate the windows.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const SRC = "C:/Users/J/Desktop/Hobbybox/2026-05-23 19-15-10.mp4";
const OUT = "scratch/bowmanchrome2025-windows";

const moments = [
  { label: "intro_box_53",   t: 53 },
  { label: "intro_box_57",   t: 57 },
  { label: "intro_box_62",   t: 62 },
  { label: "stockton_pre",   t: 13 * 60 + 55 },
  { label: "stockton_at",    t: 13 * 60 + 57 },
  { label: "stockton_hold",  t: 13 * 60 + 62 },
  { label: "stockton_late",  t: 13 * 60 + 68 },
  { label: "singleton_pre",  t: 17 * 60 + 58 },
  { label: "singleton_at",   t: 18 * 60 + 1 },
  { label: "singleton_hold", t: 18 * 60 + 6 },
  { label: "singleton_late", t: 18 * 60 + 15 },
];

for (const m of moments) {
  const mm = Math.floor(m.t / 60);
  const ss = Math.floor(m.t % 60).toString().padStart(2, "0");
  const out = join(OUT, `${mm}-${ss}_${m.label}.jpg`);
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", m.t.toFixed(2),
    "-i", SRC,
    "-frames:v", "1",
    "-q:v", "5",
    "-vf", "scale=640:-1",
    out,
  ]);
  process.stdout.write(".");
}
console.log(`\nWrote ${moments.length} frames`);
