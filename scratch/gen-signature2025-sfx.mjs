import fs from 'fs';
// Mix SFX onto the Signature2025 comp-overlay render. Video stream copied (fast). Adapts gen-2024bowmanu-sfx.mjs.
// This is a PRE-CUT riffle with NO pack structure -> no pack-change swooshes. Approved set here:
//   cost sting on the box-cost tracker entrance + cha-ching on each comp pop. Recap stays silent.
// Unlike the silent-cut reference, this master carries the host's quiet ambient audio, so [0:a] is mixed
// in as the base (SFX sit ON TOP of the ambient) rather than over a silent anullsrc.
const comps = JSON.parse(fs.readFileSync('cards/comps/Signature2025/comps.json', 'utf8'));
const pos = JSON.parse(fs.readFileSync('scratch/signature2025-card-positions.json', 'utf8'));
const V = process.env.VARIANT || '';                 // '' = 1080 master, '-4k' = the native-4K render
const VIDEO = `cards/renders/final-Signature2025${V}.mp4`;
const OUT = `cards/renders/final-Signature2025${V}-sfx.mp4`;
const DUR = 60.52;
const TRACK_START = 5.0;                              // box-cost tracker entrance (matches overlay gen)
const SND = { money: 'cards/sounds/cardmoneysound.m4a', cost: 'cards/sounds/packcostsound.m4a' };
// Gains calibrated to each asset's RAW peak (landed ~-7 dB). Cost sting GOOD at x2.55 (~-7.6 dB). Cha-ching dropped
// 3x per user (x0.85 each, 2026-06-18) -> x11.36 (~-11 dB), well below the sting.
// (cardmoneysound raw peak -32.4 dB; packcostsound raw peak -16.5 dB. host ambient left unchanged.)
const VOL = { money: 11.36, cost: 2.55, host: 1.0 };

// --- comp-pop cha-chings: chip start (MUST match overlay gen: chipStartOutput, else pos.s + 0.12) ---
const chipStartOf = c => (c.chipStartOutput != null ? c.chipStartOutput : (pos[c.cardId] ? pos[c.cardId].s + 0.12 : null));
const pops = comps.comps.map(chipStartOf).filter(x => x != null).sort((a, b) => a - b);

// --- cost sting: synced to the box-cost tracker entrance ---
const costs = [TRACK_START];

const ms = t => Math.round(t * 1000);
// inputs: [0]=video(+host audio), [1]=money, [2]=cost, [3]=silent full-length floor
const inputs = `-i "${VIDEO}" -i "${SND.money}" -i "${SND.cost}" -f lavfi -t ${DUR} -i anullsrc=r=48000:cl=stereo`;
let fc = '';
fc += `[1:a]asplit=${pops.length}${pops.map((_, i) => `[cm${i}]`).join('')};`;
fc += `[2:a]asplit=${costs.length}${costs.map((_, i) => `[ct${i}]`).join('')};`;
const labels = [];
// host ambient as the base (kept, SFX layered over it)
fc += `[0:a]volume=${VOL.host}[host];`; labels.push('[host]');
pops.forEach((t, i) => { fc += `[cm${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.money}[b${i}];`; labels.push(`[b${i}]`); });
costs.forEach((t, i) => { fc += `[ct${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.cost}[c${i}];`; labels.push(`[c${i}]`); });
labels.push('[3:a]'); // silent base spans full duration so the track never drops short
fc += `${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95[mix]`;

const cmd = `ffmpeg -y -hide_banner -loglevel error ${inputs} -filter_complex "${fc}" -map 0:v -map "[mix]" -c:v copy -c:a aac -b:a 192k -t ${DUR} "${OUT}"`;
fs.writeFileSync('scratch/build-sfx-signature2025.sh', cmd + '\n');
const f = x => { const m = Math.floor(x / 60), s = (x % 60).toFixed(1).padStart(4, '0'); return m + ':' + s; };
console.log(`SFX (no swoosh - no pack structure): ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length} (incl host ambient + silent floor)`);
console.log('cha-chings:', pops.map(f).join(' '));
console.log('cost sting:', costs.map(f).join(' '));
console.log('wrote scratch/build-sfx-signature2025.sh ->', OUT);
