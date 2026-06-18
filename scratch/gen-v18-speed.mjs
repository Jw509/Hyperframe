import fs from 'fs';
const cut = JSON.parse(fs.readFileSync('briefs/cuts/bowmanchrome2025.catalog-short-v16-final-transition-notes.json','utf8'));
const segs = cut.segments;
const P = 'cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4';
const OUT = 'cards/sources/bowmanchrome2025/bowmanchrome2025-catalog-short-v18-under3.mp4';
const hits = new Set(['card-007','card-023','card-028','card-035','card-056','card-072']);
const FAST = 1.5;

// clip = [start, end, speed, label]
const clips = [];
const add=(a,b,sp,l,id)=>clips.push([a,b,sp,l,id]);

// intro (1x, not cards)
add(21,23,1,'intro:sealed'); add(26,31,1,'intro:open'); add(74,77,1,'intro:spread'); add(85,87,1,'intro:hand');

for (let i=0;i<segs.length;i++){
  if (i===33){ // KC: Troy(c2 -> fast) + KC ext(1x), split at the reveal (same source point, no skip)
    add(582.65,585.15,FAST,'KC:Troy c2','card-034'); add(585.15,590,1,'KC:ext (-1s)','card-035'); continue; // KC ext 591->590
  }
  if (i===70){ add(1055.387,1068,1,'ERIC:Jayden c3 + Eric hit (-1s)','card-072'); continue; } // Eric 1069->1068
  if (i===71){ continue; }
  // Gunner (card-018) reveal 0.5s earlier: trim Dawson's hold (-0.75s src) + extend Gunner's start (-0.75s src). Net 0 -> Van Buren and everything after UNCHANGED.
  if (i===16){ add(298.47,300.05,FAST,'seg16 Dawson Pendergrass c1 (hold trimmed -0.5s out)','card-017'); continue; }
  if (i===17){ add(303.287,306.187,FAST,'seg17 Gunner Stockton c2 (start extended; reveal 0.5s earlier)','card-018'); continue; }
  const s=segs[i]; const isHit=hits.has(s.cardId);
  const sp=(isHit||s.cardInPack===3)?1:FAST;
  add(s.start,s.end,sp,`seg${i} ${s.cardName} c${s.cardInPack}${isHit?' HIT':''}`,s.cardId);
  if (i===5)  add(168,172,1,'ROYER:ext (-2s total)','card-007');   // 174->172 (shaved another 1s for end pack-return room)
  if (i===21) add(371,377,1,'ALTMYER:ext','card-023');         // UNCHANGED (no shave)
  if (i===27) add(420,423,1,'NORTON:ext (-1s)','card-028');   // 424->423
  if (i===55) add(835,841,1,'GUNNER:ext (-1s)','card-056');   // 842->841
}

let total=0, n1=0, nF=0, d1=0, dF=0;
clips.forEach(c=>{ const od=(c[1]-c[0])/c[2]; total+=od; if(c[2]===1){n1++;d1+=(c[1]-c[0]);}else{nF++;dF+=(c[1]-c[0]);} });
const fmt=x=>{const m=Math.floor(x/60),s=(x%60).toFixed(2).padStart(5,'0');return m+':'+s;};
console.log(`clips: ${clips.length} | 1x: ${n1} clips (${d1.toFixed(1)}s) | ${FAST}x: ${nF} clips (${dF.toFixed(1)}s src -> ${(dF/FAST).toFixed(1)}s out)`);
console.log(`PROJECTED TOTAL: ${total.toFixed(2)}s = ${fmt(total)}  ${total<180?'(UNDER 3:00 ✓)':'(OVER 3:00 ✗)'}`);

// export per-card OUTPUT positions from the SAME clip list (single source of truth for the overlay generator)
let _t=0; const pos={};
clips.forEach(c=>{ const od=(c[1]-c[0])/c[2]; const id=c[4]; if(id){ if(!pos[id])pos[id]={s:+_t.toFixed(3),e:+(_t+od).toFixed(3),name:(segs.find(x=>x.cardId===id)||{}).cardName||id}; else pos[id].e=+(_t+od).toFixed(3);} _t+=od; });
fs.writeFileSync('scratch/v18-card-positions.json', JSON.stringify(pos,null,1));
console.log(`wrote scratch/v18-card-positions.json (matches cut, ${Object.keys(pos).length} cards, ends ${_t.toFixed(2)}s)`);

// build ffmpeg cmd
let inputs='', filt='', cc='';
clips.forEach((c,k)=>{
  inputs += ` -ss ${c[0]} -t ${(c[1]-c[0]).toFixed(3)} -i "${P}"`;
  filt += `[${k}:v]setpts=(PTS-STARTPTS)/${c[2]},fps=60,setsar=1[c${k}];`;
  cc += `[c${k}]`;
});
filt += `${cc}concat=n=${clips.length}:v=1:a=0[out]`;
const cmd = `ffmpeg -y -hide_banner -loglevel error${inputs} -filter_complex "${filt}" -map "[out]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 60 -an "${OUT}"`;
fs.writeFileSync('scratch/build-v18-speed.sh', cmd+'\n');
console.log('wrote scratch/build-v18-speed.sh -> '+OUT);
