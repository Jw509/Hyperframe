import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const S = "cards/sources/chrome/CutdownChromeMegaBox.mp4";
const dir = "scratch/chrome-short/audit"; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// pack -> shot indices (1-based) in catalogue_v2 (skip 7,8 = pack/fan transitions)
const packs = {
  P1:[1,2,3,4,5,6],
  P2:[9,10,11,12,13,14],
  P3:[15,16,17,18,19,20],
  P4:[21,22,23,24,25],           // + Shough two-up (handled below)
  P5:[26,27,28,29,30,31],
  P6:[32,33,34,35,36,37],
  P7:[38,39,40,41,42,43],
};
// per-pack centers (corrected) — wide crop so cards are captured regardless of small drift
const PC={P1:[1800,1100],P2:[1980,950],P3:[1800,1050],P4:[1800,1080],P5:[1800,1120],P6:[1800,1080],P7:[2010,1200]};
function cropCard(mid, cx, cy, outp){
  const W=1300,H=1500;
  const x0=Math.round(clamp(cx-W/2,0,3840-W));
  const y0=Math.round(clamp(cy-H/2,0,2160-H));
  execSync(`ffmpeg -y -ss ${mid.toFixed(2)} -i "${S}" -frames:v 1 -vf "crop=${W}:${H}:${x0}:${y0},scale=380:-1" "${outp}"`,{stdio:"ignore"});
}
for(const [pk,idxs] of Object.entries(packs)){
  const files=[]; const [pcx,pcy]=PC[pk];
  idxs.forEach((idx,j)=>{
    const s=shots[idx-1]; const mid=(s.start+s.end)/2;
    const f=`${dir}/${pk}_${j+1}.png`; cropCard(mid,pcx,pcy,f); files.push(f);
  });
  if(pk==="P4"){ // Shough two-up ~67s, left card
    const f=`${dir}/${pk}_6.png`; cropCard(67.3, 1380, 1050, f); files.push(f);
  }
  const list=files.map(f=>`-i "${f}"`).join(" ");
  const n=files.length, TW=380, TH=Math.round(380*1500/1300);
  const pos=files.map((_,k)=>{const c=k%3,r=Math.floor(k/3);return `${c*TW}_${r*TH}`;}).join("|");
  execSync(`ffmpeg -y ${list} -filter_complex "${files.map((_,k)=>`[${k}:v]`).join("")}xstack=inputs=${n}:layout=${pos}:fill=0x333333[v]" -map "[v]" -frames:v 1 "scratch/chrome-short/audit_${pk}.png"`,{stdio:"ignore"});
  console.log(`audit_${pk}.png : ${idxs.map(i=>shots[i-1].label).join(", ")}${pk==="P4"?", Tyler Shough":""}`);
}
