import fs from 'fs';
// Mix SFX onto the final comp-overlay render. Video stream copied (fast). Adapts scratch/gen-sfx.mjs.
// swoosh on PACK CHANGES only (each pack's first card), cha-ching on each comp pop, cost sting on tracker entrance.
const packs = JSON.parse(fs.readFileSync('scratch/autocut/catalog/2024BowmanUChrome/PACKS.json', 'utf8'));
const comps = JSON.parse(fs.readFileSync('cards/comps/2024BowmanUChrome/comps.json', 'utf8'));
const pos = JSON.parse(fs.readFileSync('scratch/2024bowmanu-card-positions.json', 'utf8'));
const VIDEO = 'cards/renders/final-2024BowmanUChrome.mp4';
const OUT = 'cards/renders/final-2024BowmanUChrome-sfx.mp4';
const DUR = 73.121;
const TRACK_START = 8.5;                              // box-cost tracker entrance (matches overlay gen)
const SND = { swap: 'cards/sounds/cardswap.m4a', money: 'cards/sounds/cardmoneysound.m4a', cost: 'cards/sounds/packcostsound.m4a' };
const VOL = { swap: 0.45, money: 0.80, cost: 0.85 };  // first-pass levels; tune by ear
// --- swooshes: at the PACK PULL-IN / cut-to-next-pack moment (user-specified 2026-06-13), not the
//     first-card settle. Pack 1 = initial open (kept); packs 2-7 = the cut to the next pack (earlier). ---
const reveals = [8.9, 16.1, 25.9, 33.8, 39.8, 47.0, 58.9];

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
fs.writeFileSync('scratch/build-sfx-2024bowmanu.sh', cmd + '\n');
const f = x => { const m = Math.floor(x / 60), s = (x % 60).toFixed(1).padStart(4, '0'); return m + ':' + s; };
console.log(`SFX: ${reveals.length} swooshes, ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length}`);
console.log('swooshes:', reveals.map(f).join(' '));
console.log('cha-chings:', pops.map(f).join(' '));
console.log('cost sting:', costs.map(f).join(' '));
console.log('wrote scratch/build-sfx-2024bowmanu.sh ->', OUT);
