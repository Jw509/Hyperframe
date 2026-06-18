import fs from 'fs';

const cut = JSON.parse(fs.readFileSync('briefs/cuts/bowmanchrome2025.catalog-short-v16-final-transition-notes.json','utf8'));
const segs = cut.segments;
const P = 'cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4';
const OUT = 'cards/sources/bowmanchrome2025/bowmanchrome2025-catalog-short-v18.mp4';

// Build ordered clip list [start,end,label] entirely from the portrait source.
const clips = [];
// --- cold-open intro ---
clips.push([21,23,'intro:sealed-box']);
clips.push([26,31,'intro:opening-box']);
clips.push([74,77,'intro:packs-spread']);
clips.push([85,87,'intro:packs-hand']);

// --- v16 segments reconstructed from source, with the 6 hit mods ---
for (let i=0;i<segs.length;i++){
  if (i===33){ clips.push([582.65,591,'KC:Troy33+ext(replaces seg33)']); continue; } // Troy hold+slide+KC ext, continuous
  if (i===70){ clips.push([1055.387,1069,'ERIC:Jayden70+Eric continuous(replaces seg70+71)']); continue; }
  if (i===71){ continue; } // Eric seg71 merged into the i===70 replace
  clips.push([segs[i].start, segs[i].end, `seg${i}:${segs[i].cardName}`]);
  if (i===5)  clips.push([168,174,'ROYER:ext']);
  if (i===21) clips.push([371,377,'ALTMYER:ext']);
  if (i===27) clips.push([420,424,'NORTON:ext']);
  if (i===55) clips.push([835,842,'GUNNER:ext']);
}

// summary
let total=0; clips.forEach(c=>total+=(c[1]-c[0]));
const fmt=x=>{const m=Math.floor(x/60),s=(x%60).toFixed(3).padStart(6,'0');return m+':'+s;};
console.log(`clips: ${clips.length}  | total duration: ${total.toFixed(3)}s (${fmt(total)})`);
console.log('mods present:', clips.filter(c=>/ROYER|ALTMYER|NORTON|KC:|GUNNER|ERIC/.test(c[2])).map(c=>c[2]).join(' | '));
// sanity: any negative/zero-length clip?
const bad = clips.filter(c=>c[1]-c[0]<=0); if(bad.length){console.error('BAD CLIPS',bad); process.exit(1);}

// build ffmpeg command
let inputs='', filt='', cc='';
clips.forEach((c,k)=>{
  inputs += ` -ss ${c[0]} -t ${(c[1]-c[0]).toFixed(3)} -i "${P}"`;
  filt += `[${k}:v]fps=60,setsar=1,setpts=PTS-STARTPTS[c${k}];`;
  cc += `[c${k}]`;
});
filt += `${cc}concat=n=${clips.length}:v=1:a=0[out]`;
const cmd = `ffmpeg -y -hide_banner -loglevel error${inputs} -filter_complex "${filt}" -map "[out]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -an "${OUT}"`;
fs.writeFileSync('scratch/build-v18.sh', cmd+'\n');
console.log('wrote scratch/build-v18.sh ('+cmd.length+' chars), output ->', OUT);
