// Audit a cut JSON for the 3 recurring failures:
//  1. NO-SWIPE: a card beat whose start is AFTER its slide already began (motion already high/peaked at start)
//  2. NO-FAN: a pack (open beat after a big gap) with no fan beat before its first card
//  3. cards starting cold but with the onset well after start (cut too early, dead lead-in)
import { readFileSync } from "node:fs";
const txt=readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[];let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const mAt=(t)=>{ let lo=0,hi=T.length-1; while(lo<hi){const mid=(lo+hi)>>1; if(T[mid]<t)lo=mid+1; else hi=mid;} return M[lo]||0; };
const win=(a,b)=>{const o=[];for(let i=0;i<T.length;i++){if(T[i]>=a&&T[i]<=b)o.push(M[i]);}return o;};
const seg=JSON.parse(readFileSync(process.argv[2]||"scratch/autocut/cut-full-v3-final.json","utf8")).segments;
const fmtOut=(()=>{let cum=0;return seg.map(s=>{const o=cum;cum+=s.end-s.start;return o;});})();
const out=(i)=>{const t=fmtOut[i];return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;};
const isCard=(n)=>/card|hit|auto|refractor|reveal|c\d/i.test(n)&&!/open|fan/i.test(n);
let noswipe=0,early=0,nofan=0,prevEnd=-99;
const probs=[];
seg.forEach((s,i)=>{
  const gap=s.start-prevEnd;
  // pack boundary
  if(gap>15){ // new pack open expected
    const isOpen=/open/i.test(s.note);
    // does a fan exist before the first card of this pack?
    let j=i, sawFan=false, sawCard=false;
    while(j<seg.length && (seg[j].start-(j>i?seg[j-1].end:prevEnd))<15 || j===i){
      if(/fan/i.test(seg[j].note))sawFan=true;
      if(isCard(seg[j].note)){sawCard=true;break;}
      j++; if(j-i>6)break;
    }
    if(!sawFan){ nofan++; probs.push(`NOFAN  pack@out${out(i)} src${s.start.toFixed(0)} (${s.note.slice(0,24)})`); }
  }
  if(isCard(s.note)){
    // slide-onset check: look at motion in [start-0.8, start+0.6]
    const pre=win(s.start-0.8,s.start);     // before the cut
    const post=win(s.start,s.start+0.6);    // after the cut
    const mStart=mAt(s.start);
    const preMax=Math.max(0,...pre), postMax=Math.max(0,...post);
    // NO-SWIPE: motion already high at/just before start AND not still rising much after => slide already happened
    if(preMax>14 && mStart>11 && postMax<preMax+2){ noswipe++; probs.push(`NOSWIPE out${out(i)} src${s.start.toFixed(1)} preMax=${preMax.toFixed(0)} mStart=${mStart.toFixed(0)} postMax=${postMax.toFixed(0)} (${s.note.slice(0,26)})`); }
    // EARLY/dead: motion stays low for >0.5s after start (cut before the slide)
    else { const firstRise=post.findIndex(m=>m>12); if(firstRise>9){ early++; probs.push(`EARLY  out${out(i)} src${s.start.toFixed(1)} (dead ${(firstRise/15).toFixed(1)}s lead-in) (${s.note.slice(0,24)})`);} }
  }
  prevEnd=s.end;
});
const cards=seg.filter(s=>isCard(s.note)).length;
console.log(`AUDIT ${process.argv[2]||"v3"}: ${seg.length} beats, ${cards} card beats`);
console.log(`  NO-SWIPE (cut after slide started): ${noswipe}`);
console.log(`  EARLY (dead lead-in before slide):  ${early}`);
console.log(`  NO-FAN (pack open w/o fan):          ${nofan}`);
console.log("");
probs.forEach(p=>console.log("  "+p));
