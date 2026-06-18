import fs from 'fs';
// Mix SFX onto the locked silent cut. Video stream copied (fast). Event times from the same data the overlay used.
const pos = JSON.parse(fs.readFileSync('scratch/v18-card-positions.json','utf8'));
const comps = JSON.parse(fs.readFileSync('cards/comps/bowmanchrome2025/comps.json','utf8'));
const VIDEO = 'cards/renders/bowmanchrome2025/bowmanchrome2025-v18-final.mp4';
const OUT = 'cards/renders/bowmanchrome2025/bowmanchrome2025-v18-sfx.mp4';
const DUR = 178.9;
const SND = { swap:'cards/sounds/cardswap.m4a', money:'cards/sounds/cardmoneysound.m4a', cost:'cards/sounds/packcostsound.m4a' };
const VOL = { swap:0.45, money:0.80, cost:0.85 };   // first-pass levels; user will tune by ear
const LEAD = 0.12;                                   // swoosh leads the reveal slightly

// --- swooshes: ONLY between packs (each new pack's first card, cardInPack===1) ---
const cut = JSON.parse(fs.readFileSync('briefs/cuts/bowmanchrome2025.catalog-short-v16-final-transition-notes.json','utf8'));
const packStarts = new Set(cut.segments.filter(s=>s.cardInPack===1).map(s=>s.cardId));
const reveals = Object.entries(pos).filter(([id])=>packStarts.has(id)).map(([,p])=>Math.max(0,p.s-LEAD)).sort((a,b)=>a-b);

// --- comp-pop cha-chings: chip start (must match overlay gen) ---
const chipStartOf = c => (c.chipStartOutput != null ? c.chipStartOutput : (pos[c.cardId] ? pos[c.cardId].s + 0.12 : null));
const pops = comps.comps.map(chipStartOf).filter(x=>x!=null).sort((a,b)=>a-b);

// --- cost sting: synced to the box-cost tracker entrance at 10s ---
const costs = [10.0];

const ms = t => Math.round(t*1000);
let inputs = `-i "${VIDEO}" -i "${SND.swap}" -i "${SND.money}" -i "${SND.cost}" -f lavfi -t ${DUR} -i anullsrc=r=48000:cl=stereo`;
let fc = '';
// split each sound into the needed number of copies
fc += `[1:a]asplit=${reveals.length}${reveals.map((_,i)=>`[sw${i}]`).join('')};`;
fc += `[2:a]asplit=${pops.length}${pops.map((_,i)=>`[cm${i}]`).join('')};`;
fc += `[3:a]asplit=${costs.length}${costs.map((_,i)=>`[ct${i}]`).join('')};`;
const labels = [];
reveals.forEach((t,i)=>{ fc += `[sw${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.swap}[a${i}];`; labels.push(`[a${i}]`); });
pops.forEach((t,i)=>{ fc += `[cm${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.money}[b${i}];`; labels.push(`[b${i}]`); });
costs.forEach((t,i)=>{ fc += `[ct${i}]adelay=delays=${ms(t)}:all=1,volume=${VOL.cost}[c${i}];`; labels.push(`[c${i}]`); });
labels.push('[4:a]'); // silent base spans full duration
fc += `${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95[mix]`;

const cmd = `ffmpeg -y -hide_banner -loglevel error ${inputs} -filter_complex "${fc}" -map 0:v -map "[mix]" -c:v copy -c:a aac -b:a 192k -t ${DUR} "${OUT}"`;
fs.writeFileSync('scratch/build-sfx.sh', cmd+'\n');
const f=x=>{const m=Math.floor(x/60),s=(x%60).toFixed(1).padStart(4,'0');return m+':'+s;};
console.log(`SFX: ${reveals.length} swooshes, ${pops.length} cha-chings, ${costs.length} cost sting | amix inputs ${labels.length}`);
console.log(`vols swap=${VOL.swap} money=${VOL.money} cost=${VOL.cost}`);
console.log('first few swooshes:', reveals.slice(0,5).map(f).join(' '));
console.log('cha-chings:', pops.map(f).join(' '));
console.log('wrote scratch/build-sfx.sh ('+cmd.length+' chars) ->', OUT);
