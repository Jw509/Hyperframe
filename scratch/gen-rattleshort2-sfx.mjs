import fs from 'fs';
// Mix SFX onto the rattleshort2 comp-overlay render. Video stream copied (fast). Adapts gen-bowmanhobby-sfx.mjs.
// swoosh on pack-change beats ONLY, cha-ching on each comp pop (chip start), cost sting on tracker entrance,
// recap silent. Source cut is SILENT -> anullsrc base (SFX are the only audio). Approved levels reused
// (silent-master case: raw peaks swap -24.4 / money -32.4 / cost -16.5 dB -> x2.8 / x11.36 / x2.55).
const comps = JSON.parse(fs.readFileSync('cards/comps/rattleshort/comps.json', 'utf8'));
const pos = JSON.parse(fs.readFileSync('scratch/rattleshort2-card-positions.json', 'utf8'));
const VIDEO = 'renders/final-rattleshort2-4k.mp4';
const OUT = 'renders/final-rattleshort2-4k-sfx.mp4';
const DUR = 99.79;                                    // render duration (93.06 video + 6.7 recap + mux pad)
const TRACK_START = 12.8;                             // box-cost tracker entrance (matches overlay gen)
const SND = { swap: 'cards/sounds/cardswap.m4a', money: 'cards/sounds/cardmoneysound.m4a', cost: 'cards/sounds/packcostsound.m4a' };
const VOL = { swap: 2.8, money: 11.36, cost: 2.55 };
// swooshes: 6 pack-changes in Rattleshort2 — timed to the NEW PACK ENTERING FRAME (user correction
// 2026-07-09), NOT the first card out of the pack. Verified at 4fps (pk1..pk6 tiles).
const reveals = [9.3, 25.5, 35.0, 47.0, 61.3, 80.0];

// --- comp-pop cha-chings: chip start (MUST match overlay gen: pos.s + 0.12) ---
const chipStartOf = c => (c.chipStartOutput != null ? c.chipStartOutput : (pos[c.cardId] ? pos[c.cardId].s + 0.12 : null));
const pops = comps.comps.map(chipStartOf).filter(x => x != null).sort((a, b) => a - b);

// --- cost sting: synced to the box-cost tracker entrance ---
const costs = [TRACK_START];

const ms = t => Math.round(t * 1000);
let inputs = `-i "${VIDEO}" -i "${SND.swap}" -i "${SND.money}" -i "${SND.cost}" -f lavfi -t ${DUR} -i anullsrc=r=48000:cl=stereo`;
let fc = '';
fc += `[1:a]asplit=${reveals.length}${reveals.map((_, i) => `[sw${i}]`).join('')};`;
fc += `[2:a]asplit=${pops.length}${pops.map((_, i) => `[cm${i}]`).join('')};`;
fc += `[3:a]asplit=${costs.length}${costs.map((_, i) => `[ct${i}]`).join('')};`;
const labels = [];
reveals.forEach((t, i) => { fc += `[sw${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.swap}[a${i}];`; labels.push(`[a${i}]`); });
pops.forEach((t, i) => { fc += `[cm${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.money}[b${i}];`; labels.push(`[b${i}]`); });
costs.forEach((t, i) => { fc += `[ct${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.cost}[c${i}];`; labels.push(`[c${i}]`); });
labels.push('[4:a]'); // silent base spans full duration
fc += `${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95[mix]`;

const cmd = `ffmpeg -y -hide_banner -loglevel error ${inputs} -filter_complex "${fc}" -map 0:v -map "[mix]" -c:v copy -c:a aac -b:a 192k -t ${DUR} "${OUT}"`;
fs.writeFileSync('scratch/build-sfx-rattleshort2.sh', cmd + '\n');
const f = x => { const m = Math.floor(x / 60), s = (x % 60).toFixed(1).padStart(4, '0'); return m + ':' + s; };
console.log(`SFX: ${reveals.length} swooshes, ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length}`);
console.log('swooshes:', reveals.map(f).join(' '));
console.log('cha-chings:', pops.map(f).join(' '));
console.log('cost sting:', costs.map(f).join(' '));
console.log('wrote scratch/build-sfx-rattleshort2.sh ->', OUT);
