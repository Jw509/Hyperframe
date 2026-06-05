#!/usr/bin/env node
// Extract the mid-hold frame of every rendered beat and tile -> verify each beat lands on a card.
import { readFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const cut = JSON.parse(readFileSync(process.argv[2] || "scratch/autocut/cut-full-raw.json","utf8"));
const vid = process.argv[3] || "scratch/autocut/FULL-auto-raw.mp4";
const outDir = "scratch/autocut/eval";
if (existsSync(outDir)) rmSync(outDir,{recursive:true,force:true});
mkdirSync(outDir,{recursive:true});

// cumulative cut-time midpoints
let cum = 0; const mids = [];
for (const s of cut.segments){ const d = s.end - s.start; mids.push(cum + d/2); cum += d; }

mids.forEach((m,i)=>{
  const out = `${outDir}/b_${String(i).padStart(3,"0")}.png`;
  spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-ss",String(m),"-i",vid,"-frames:v","1","-vf","scale=160:-1",out],{stdio:"ignore"});
});
const n = readdirSync(outDir).filter(f=>f.endsWith(".png")).length;
// tile 7 cols
const COLS=7, ROWS=8;
spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",`${outDir}/b_%03d.png`,
  "-vf",`tile=${COLS}x${ROWS}:padding=3:margin=3:color=0x202020`,`${outDir}/grid_%02d.png`],{stdio:"inherit"});
console.log(`extracted ${n} beat frames -> ${outDir}/grid_*.png  (${COLS}x${ROWS}, beat index = img*${COLS*ROWS}+row*${COLS}+col)`);
console.log(`beat i -> src time: see cut-full-raw.json segment i`);
