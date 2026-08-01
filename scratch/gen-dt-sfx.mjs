import fs from 'fs';
// Mix SFX onto the DT/BT EP1 pre-cut. Source has near-silent audio (-43.8dB room tone) -> keep it, layer SFX on top.
// No JSON data files exist for this video; event times were detected from the baked overlays (green comp chips + tracker).
const VIDEO = 'cards/sources/Downtown/DT or BT EP1.mp4';
const OUT   = 'cards/renders/Downtown/DT-BT-EP1-sfx.mp4';
const DUR   = 73.088;
const SND = { swap:'cards/sounds/cardswap.m4a', money:'cards/sounds/cardmoneysound.m4a', cost:'cards/sounds/packcostsound.m4a' };
// The three source files have very different intrinsic peaks (swap -24, money -32, cost -16.5 dB),
// so raw multipliers leave the cha-ching inaudible. Use per-sound dB gain to normalize to balanced peaks.
const GAIN_DB = { swap:13, money:22, cost:9 };       // -> in-mix peaks ~ -11 / -10 / -7.5 dB (money dialed back per note)
const SWAP_LEAD = 0.0;                               // place swooshes exactly at the user-specified times

// pack swaps (user-supplied) ; comp chips (green-price entrances) ; cost tracker entrance
const swaps = [16.8, 26.4, 35.9, 44.5, 59.7].map(t => Math.max(0, t - SWAP_LEAD));
const pops  = [8.7,14.2,18.7,20.3,22.5,31.5,33.8,39.6,44.0,52.5,58.5,63.4,65.8];
const costs = [5.3];

const ms = t => Math.round(t*1000);
const inputs = `-i "${VIDEO}" -i "${SND.swap}" -i "${SND.money}" -i "${SND.cost}"`;
let fc = '';
fc += `[1:a]asplit=${swaps.length}${swaps.map((_,i)=>`[sw${i}]`).join('')};`;
fc += `[2:a]asplit=${pops.length}${pops.map((_,i)=>`[cm${i}]`).join('')};`;
fc += `[3:a]asplit=${costs.length}${costs.map((_,i)=>`[ct${i}]`).join('')};`;
const labels = [];
swaps.forEach((t,i)=>{ fc += `[sw${i}]adelay=delays=${ms(t)}:all=1,volume=${GAIN_DB.swap}dB[a${i}];`; labels.push(`[a${i}]`); });
pops.forEach((t,i)=>{ fc += `[cm${i}]adelay=delays=${ms(t)}:all=1,volume=${GAIN_DB.money}dB[b${i}];`; labels.push(`[b${i}]`); });
costs.forEach((t,i)=>{ fc += `[ct${i}]adelay=delays=${ms(t)}:all=1,volume=${GAIN_DB.cost}dB[c${i}];`; labels.push(`[c${i}]`); });
labels.push('[0:a]'); // keep the source audio as the base
fc += `${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95[mix]`;

const cmd = `ffmpeg -y -hide_banner -loglevel error ${inputs} -filter_complex "${fc}" -map 0:v -map "[mix]" -c:v copy -c:a aac -b:a 192k -t ${DUR} "${OUT}"`;
fs.mkdirSync('cards/renders/Downtown', { recursive:true });
fs.writeFileSync('scratch/build-dt-sfx.sh', cmd+'\n');
const f=x=>{const m=Math.floor(x/60),s=(x%60).toFixed(1).padStart(4,'0');return m+':'+s;};
console.log(`SFX: ${swaps.length} swooshes, ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length}`);
console.log('swooshes :', swaps.map(f).join(' '));
console.log('chachings:', pops.map(f).join(' '));
console.log('cost     :', costs.map(f).join(' '));
console.log('wrote scratch/build-dt-sfx.sh ->', OUT);
