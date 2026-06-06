import fs from "fs";
import { execSync } from "child_process";
// args: src(proxy|4k) out
const srcKind = process.argv[2] ?? "proxy";
const out = process.argv[3] ?? "scratch/chrome-short/track_preview.mp4";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const tk = JSON.parse(fs.readFileSync("scratch/chrome-short/track.json","utf8"));
const traj = tk.traj; const FPS = tk.fps;
const shots = cat.shots;
const is4k = srcKind==="4k";
const src = is4k ? cat.source : "scratch/chrome-short/proxy.mp4";
const SRCW = 3840, SRCH = 2160;       // always reason in 4K coords (traj is 4K)
const NF = Math.round(cat.dur*FPS);
const W = 1216, Hc = 2160;            // full-height 9:16 crop in 4K
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// shot index per frame; boundary = gap midpoint between consecutive shots
const bounds=[];
for(let i=0;i<shots.length-1;i++) bounds.push(Math.round(((shots[i].end+shots[i+1].start)/2)*FPS));
function shotOf(f){
  for(let i=0;i<shots.length;i++){ if(f < (bounds[i]??1e9)) return i; }
  return shots.length-1;
}

// raw cx per frame from traj (4K); fill gaps by interpolation within same shot
const cx=new Array(NF).fill(null);
for(const k in traj){ const f=+k; if(f>=0&&f<NF) cx[f]=traj[k][0]; }
// group frame indices by shot, interpolate/hold within shot
const byShot={};
for(let f=0;f<NF;f++){ (byShot[shotOf(f)] ??= []).push(f); }
for(const si in byShot){
  const fr=byShot[si];
  // collect known points
  const known=fr.filter(f=>cx[f]!=null);
  if(known.length===0){ const def=shots[si].cx; fr.forEach(f=>cx[f]=def); continue; }
  // forward/back fill + linear interp between known
  let lastK=null;
  for(const f of fr){
    if(cx[f]!=null){ if(lastK!=null){ /*interp gap*/ const g=f-lastK; for(let j=1;j<g;j++){ const t=j/g; cx[lastK+j]=cx[lastK]*(1-t)+cx[f]*t; } } lastK=f; }
  }
  // ends
  const first=known[0], last=known[known.length-1];
  for(const f of fr){ if(f<first) cx[f]=cx[first]; if(f>last) cx[f]=cx[last]; }
}
// smooth WITHIN shots only (moving average), do not cross boundaries
const sm=cx.slice();
const win=6;
for(const si in byShot){
  const fr=byShot[si];
  for(let i=0;i<fr.length;i++){
    let s=0,n=0; for(let j=-win;j<=win;j++){ const k=i+j; if(k>=0&&k<fr.length){ s+=cx[fr[k]]; n++; } }
    sm[fr[i]]=s/n;
  }
}
// build sendcmd: x0 per frame
let lines=[];
for(let f=0;f<NF;f++){
  const t=(f/FPS).toFixed(4);
  const sc = is4k?1:0.25;
  const x0 = Math.round(clamp(sm[f]*sc - (W*sc)/2, 0, SRCW*sc - W*sc));
  lines.push(`${t} crop x ${x0};`);
}
const cmdfile = "scratch/chrome-short/track_cmds.txt";
fs.writeFileSync(cmdfile, lines.join("\n"));

const sc=is4k?1:0.25;
const cw=Math.round(W*sc), ch=Math.round(Hc*sc);
const OW=is4k?2160:540, OH=is4k?3840:960;
const enc=is4k?`-c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart`:`-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p`;
const vf=`sendcmd=f='${cmdfile}',crop=${cw}:${ch}:0:0,scale=${OW}:${OH}:flags=lanczos`;
const cmd=`ffmpeg -y -i "${src}" -vf "${vf}" ${enc} -an "${out}"`;
fs.writeFileSync("scratch/chrome-short/track_vf.txt",cmd);
console.log(`frames=${NF} crop=${cw}x${ch} out=${OW}x${OH} src=${srcKind}`);
execSync(cmd,{stdio:"inherit"});
console.log("DONE ->",out);
