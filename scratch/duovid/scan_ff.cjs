// Detect fast-forward / face-cam-absent gaps by sampling the avg color of the
// top-left PIP window region over time. Blue damask (cam absent) => B >> R,G.
// Input: a raw rgb24 file produced by ffmpeg (one 3-byte sample per frame at FPS).
const fs = require("fs");
const path = process.argv[2];
const FPS = Number(process.argv[3] || 4);
const THRESH = Number(process.argv[4] || 8); // warmth (R-B) BELOW which = cam absent
const MINSAMP = 2;   // require >=0.5s
const MERGEGAP = 4;  // merge gaps <1s apart

const data = fs.readFileSync(path);
const n = Math.floor(data.length / 3);
const score = new Array(n);
for (let i = 0; i < n; i++) {
  score[i] = data[i*3] - data[i*3+2];   // warmth = R - B (people+couch = warm)
}
const T = i => i / FPS;

// sanity: print blue score at known points (8s intro=present, 13s FF=absent)
[8, 13, 20, 200, 700, 900, 1300, 1500].forEach(s => {
  const i = Math.round(s * FPS);
  if (i < n) console.error(`t=${s}s rgb=(${data[i*3]},${data[i*3+1]},${data[i*3+2]}) warmth=${score[i]}`);
});

let segs = [], st = -1;
for (let i = 0; i < n; i++) {
  const ff = score[i] < THRESH;
  if (ff && st < 0) st = i;
  if (!ff && st >= 0) { if (i - st >= MINSAMP) segs.push([st, i]); st = -1; }
}
if (st >= 0 && n - st >= MINSAMP) segs.push([st, n]);

const merged = [];
for (const [a, b] of segs) {
  if (merged.length && a - merged[merged.length-1][1] <= MERGEGAP) merged[merged.length-1][1] = b;
  else merged.push([a, b]);
}

console.error(`\nFPS=${FPS} THRESH=${THRESH}  -> ${merged.length} absent gaps`);
let total = 0;
for (const [a, b] of merged) { const s = T(a), e = T(b); let mn = 999; for (let k=a;k<b;k++) mn = Math.min(mn, score[k]); total += (e - s); console.log(`${s.toFixed(2)}\t${e.toFixed(2)}\t${(e-s).toFixed(2)}\tminWarmth=${mn}`); }
console.error(`total absent: ${total.toFixed(1)}s of ${T(n).toFixed(0)}s`);
