// Turn the motion trace into "card is held still" windows.
import { readFileSync } from 'node:fs';

const txt = readFileSync('scratch/chromebball-motion.txt', 'utf8').split(/\r?\n/);
const samples = [];
let t = null;
for (const line of txt) {
  const m = line.match(/pts_time:([\d.]+)/);
  if (m) { t = parseFloat(m[1]); continue; }
  const v = line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
  if (v && t !== null) { samples.push({ t, y: parseFloat(v[1]) }); t = null; }
}

const THRESH = parseFloat(process.argv[2] ?? '1.2');   // motion energy considered "still"
const MINDUR = parseFloat(process.argv[3] ?? '0.55');  // shortest hold we care about

const holds = [];
let run = null;
for (const s of samples) {
  if (s.y < THRESH) {
    if (!run) run = { s: s.t, e: s.t, peak: s.y };
    else { run.e = s.t; run.peak = Math.max(run.peak, s.y); }
  } else if (run) {
    if (run.e - run.s >= MINDUR) holds.push(run);
    run = null;
  }
}
if (run && run.e - run.s >= MINDUR) holds.push(run);

console.log(`samples=${samples.length} thresh=${THRESH} holds=${holds.length}`);
for (const h of holds) {
  console.log(`${h.s.toFixed(2)}  ->  ${h.e.toFixed(2)}   (${(h.e - h.s).toFixed(2)}s)`);
}
