import fs from 'fs';
// Mix SFX onto the bowmanhobby clean comp-overlay render. Video stream copied (fast). Adapts gen-2024bowmanu-sfx.mjs.
// swoosh on VISIBLE pack-change beats, cha-ching on each comp pop (chip start), cost sting on tracker entrance.
// Source cut is SILENT -> anullsrc base (SFX are the only audio).
const comps = JSON.parse(fs.readFileSync('cards/comps/bowmanchrome2025/comps.json', 'utf8'));
const pos = JSON.parse(fs.readFileSync('scratch/bowmanhobby-card-positions.json', 'utf8'));
const V = process.argv[2] === '4k' ? '-4k' : '';      // `node gen-bowmanhobby-sfx.mjs 4k` -> mix onto the 4K render
const VIDEO = `cards/renders/final-bowmanhobby-finalcut-clean${V}.mp4`;
const OUT = `cards/renders/final-bowmanhobby-finalcut-clean${V}-sfx.mp4`;
const DUR = 153.97;                                   // VIDEO 147.27 + ~6.7 recap
const TRACK_START = 6.0;                              // box-cost tracker entrance (matches overlay gen)
const SND = { swap: 'cards/sounds/cardswap.m4a', money: 'cards/sounds/cardmoneysound.m4a', cost: 'cards/sounds/packcostsound.m4a' };
// Volumes -> approved landing levels (raw peaks: swap -24.4, money -32.4, cost -16.5 dB):
//   cost sting ~-8.4 dB (x2.55), cha-ching ~-11.3 dB (x11.36), swoosh ~-15.5 dB (x2.8, subtle under the others).
const VOL = { swap: 2.8, money: 11.36, cost: 2.55 };
// swooshes: pack-change beats in the CLEAN timeline. User-tuned 2026-07-04 (2nd pass): first swoosh 11.0,
// added fanned-pack transitions 17.2 / 56.8 / 61 / 134, 1:46 -> 106.5, end swoosh -> 139.25. Many packs are
// fanned with no on-camera wrapper, so these come from the editor's knowledge of his own pack cuts.
const reveals = [11.0, 17.2, 24, 31, 39, 46, 56.8, 61, 70, 74.8, 79.5, 88, 94, 106.5, 113, 123, 134, 139.25];

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
fs.writeFileSync('scratch/build-sfx-bowmanhobby.sh', cmd + '\n');
const f = x => { const m = Math.floor(x / 60), s = (x % 60).toFixed(1).padStart(4, '0'); return m + ':' + s; };
console.log(`SFX: ${reveals.length} swooshes, ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length}`);
console.log('swooshes:', reveals.map(f).join(' '));
console.log('cha-chings:', pops.map(f).join(' '));
console.log('cost sting:', costs.map(f).join(' '));
console.log('wrote scratch/build-sfx-bowmanhobby.sh ->', OUT);
