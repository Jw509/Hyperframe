// Detect card-slide events from the cropped motion trace.
// A slide = motion ramps over HI, then falls back under LO (the card settling).
// Prints: slide window, then the quiet stretch that follows (= card on screen, held).
import { readFileSync } from 'node:fs';

const L = readFileSync('scratch/chromebball-motion2.txt', 'utf8').split(/\r?\n/);
const S = [];
let t = null;
for (const l of L) {
  const m = l.match(/pts_time:([\d.]+)/);
  if (m) { t = parseFloat(m[1]); continue; }
  const y = l.match(/YAVG=([\d.]+)/);
  if (y && t !== null) { S.push({ t, y: parseFloat(y[1]) }); t = null; }
}

const HI = parseFloat(process.argv[2] ?? '35');
const LO = parseFloat(process.argv[3] ?? '9');

const events = [];
let i = 0;
while (i < S.length) {
  if (S[i].y >= HI) {
    const start = i;
    let j = i;
    while (j < S.length && S[j].y >= LO) j++;      // ride the slide down to quiet
    const peak = Math.max(...S.slice(start, j).map(s => s.y));
    // back up to where the ramp began (first sample above LO before the HI crossing)
    let b = start;
    while (b > 0 && S[b - 1].y >= LO) b--;
    events.push({ rampFrom: S[b].t, hiAt: S[start].t, settleAt: S[Math.min(j, S.length - 1)].t, peak });
    i = j;
  } else i++;
}

// merge events that are really one messy transition (settle < 0.35s before the next ramp)
const merged = [];
for (const e of events) {
  const prev = merged[merged.length - 1];
  if (prev && e.rampFrom - prev.settleAt < 0.35) {
    prev.settleAt = e.settleAt; prev.peak = Math.max(prev.peak, e.peak);
  } else merged.push({ ...e });
}

console.log('slide#  ramp   settle   quietUntil  dur   peak');
for (let k = 0; k < merged.length; k++) {
  const e = merged[k];
  const next = merged[k + 1];
  const quietUntil = next ? next.rampFrom : S[S.length - 1].t;
  console.log(
    String(k + 1).padStart(5),
    e.rampFrom.toFixed(2).padStart(7),
    e.settleAt.toFixed(2).padStart(7),
    quietUntil.toFixed(2).padStart(10),
    (quietUntil - e.settleAt).toFixed(2).padStart(6),
    e.peak.toFixed(0).padStart(5),
  );
}
