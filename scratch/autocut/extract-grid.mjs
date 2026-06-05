#!/usr/bin/env node
/**
 * Extract a labeled-by-position filmstrip grid for visual beat-picking.
 * No drawtext (fontconfig segfaults in Git Bash) — cell->time is pure math.
 *
 * Usage: node extract-grid.mjs <src> <start> <dur> <fps> <cols> <rows> <outPrefix>
 * Cell at image P, row r (0-top), col c (0-left): time = start + (P*cols*rows + r*cols + c)/fps
 */
import { spawnSync } from "node:child_process";
const [src, startS, durS, fpsS, colsS, rowsS, prefix] = process.argv.slice(2);
const start = parseFloat(startS), dur = parseFloat(durS), fps = parseFloat(fpsS);
const cols = parseInt(colsS), rows = parseInt(rowsS);
const cellW = 168;
const vf = `fps=${fps},scale=${cellW}:-1,tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`;
const args = ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(start), "-t", String(dur),
  "-i", src, "-vf", vf, `${prefix}_%02d.png`];
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (r.status !== 0) process.exit(1);

const perImg = cols * rows;
const totalFrames = Math.floor(dur * fps);
const nImg = Math.ceil(totalFrames / perImg);
console.log(`grid: ${cols}x${rows} @ ${fps}fps, ${perImg} cells/img, ~${nImg} images`);
console.log(`window: src ${start}s -> ${(start+dur).toFixed(1)}s  (${dur}s, ${totalFrames} frames)`);
console.log(`cell time = ${start} + (img*${perImg} + row*${cols} + col)/${fps}`);
for (let p = 0; p < nImg; p++) {
  const t0 = start + (p*perImg)/fps;
  const t1 = start + Math.min((p+1)*perImg-1, totalFrames-1)/fps;
  console.log(`  ${prefix}_${String(p+1).padStart(2,"0")}.png : src ${t0.toFixed(2)}s -> ${t1.toFixed(2)}s  (row step = ${(cols/fps).toFixed(2)}s, col step = ${(1/fps).toFixed(3)}s)`);
}
