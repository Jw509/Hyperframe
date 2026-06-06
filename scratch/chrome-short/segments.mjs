import fs from "fs";

const raw = fs.readFileSync("scratch/chrome-short/motion.txt", "utf8").split(/\r?\n/);
const pts = [];
let curT = null;
for (const line of raw) {
  let m = line.match(/pts_time:([0-9.]+)/);
  if (m) { curT = parseFloat(m[1]); continue; }
  m = line.match(/YAVG=([0-9.]+)/);
  if (m && curT != null) { pts.push({ t: curT, y: parseFloat(m[1]) }); curT = null; }
}
pts.sort((a, b) => a.t - b.t);
const ys = pts.map(p => p.y).slice().sort((a, b) => a - b);
const q = p => ys[Math.min(ys.length - 1, Math.floor(p * ys.length))];
console.log(`frames=${pts.length} dur=${pts[pts.length-1].t.toFixed(2)}`);
console.log(`min=${ys[0].toFixed(2)} median=${q(0.5).toFixed(2)} p75=${q(0.75).toFixed(2)} p90=${q(0.9).toFixed(2)} p95=${q(0.95).toFixed(2)} max=${ys[ys.length-1].toFixed(2)}`);

// downsample: max motion per 0.5s bucket -> shows spike pattern
const bucket = 0.5;
const buckets = new Map();
for (const p of pts) {
  const b = Math.floor(p.t / bucket);
  buckets.set(b, Math.max(buckets.get(b) ?? 0, p.y));
}
let row = "";
const keys = [...buckets.keys()].sort((a,b)=>a-b);
console.log("\n0.5s-bucket max-motion (each char: .=<thr ^=spike):");
const THR = parseFloat(process.argv[2] ?? q(0.85).toFixed(2));
console.log(`(threshold for 'moving' = ${THR})`);
for (const k of keys) {
  const v = buckets.get(k);
  row += v >= THR ? "^" : ".";
  if (row.length === 60) { console.log(`${(k*bucket-59*bucket).toFixed(1).padStart(6)}s ${row}`); row=""; }
}
if (row) console.log(row);

// held segments: runs where smoothed motion < THR for >= MINDUR
const MINDUR = 0.6;
// smooth with small window
const W = 4;
const sm = pts.map((p,i)=>{let s=0,n=0;for(let j=-W;j<=W;j++){const k=i+j;if(k>=0&&k<pts.length){s+=pts[k].y;n++;}}return {t:p.t,y:s/n};});
const segs = [];
let st = null;
for (let i=0;i<sm.length;i++){
  const still = sm[i].y < THR;
  if (still && st===null) st = sm[i].t;
  if ((!still || i===sm.length-1) && st!==null){
    const en = sm[i].t;
    if (en-st >= MINDUR) segs.push({start:+st.toFixed(3), end:+en.toFixed(3), dur:+(en-st).toFixed(2)});
    st=null;
  }
}
console.log(`\nHELD SEGMENTS (still>=${MINDUR}s, thr=${THR}): ${segs.length}`);
for (const [i,s] of segs.entries()){
  console.log(`${String(i+1).padStart(2)}  ${s.start.toFixed(2).padStart(7)} -> ${s.end.toFixed(2).padStart(7)}  (${s.dur}s)  mid=${((s.start+s.end)/2).toFixed(2)}`);
}
fs.writeFileSync("scratch/chrome-short/held-segments.json", JSON.stringify(segs,null,2));
