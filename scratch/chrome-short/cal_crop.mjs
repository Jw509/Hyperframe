import fs from "fs";
import { execSync } from "child_process";
// args: src(proxy|4k) out
const srcKind = process.argv[2] ?? "proxy";
const out = process.argv[3] ?? "scratch/chrome-short/cal_preview.mp4";
const is4k = srcKind === "4k";
const src = is4k ? "cards/sources/chrome/CutdownChromeMegaBox.mp4" : "scratch/chrome-short/proxy.mp4";
const FPS = 60, DUR = 133.27, NF = Math.round(DUR*FPS);

// crop window (4K coords): 9:16, a bit shorter than full height for vertical room
const W = 1068, H = 1900;            // 1068:1900 = 0.562
const SRCW = 3840, SRCH = 2160;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---- FIRST-PASS calibration (4K source-center coords). x=horizontal center, y=vertical center ----
// Sections: static hold per pack, drifting right to follow the host. ~0.5s ramp at each boundary.
const sections = [
  {s:0.0,  e:6.4,   x:1250, y:980},   // intro: box/slice/open (held left + a bit high)
  {s:7.2,  e:24.8,  x:1600, y:1080},  // pack 1 cards
  {s:25.6, e:49.4,  x:1650, y:1080},  // pack 2 cards
  {s:50.2, e:70.4,  x:1750, y:1080},  // pack 3 cards
  {s:71.8, e:91.4,  x:1800, y:1080},  // pack 4 cards
  {s:92.2, e:107.4, x:1850, y:1040},  // pack 5 cards
  {s:108.8,e:116.4, x:1720, y:980},   // pack 6 (held high/left)
  {s:117.2,e:133.3, x:2150, y:1150},  // pack 7 (already-correct zone)
];
// Fans: brief center-left crop to keep the spread in frame (user: fans at ~7,40,71,108)
const fans = [
  {t:7.0,  x:1450, y:1060, dur:1.6},
  {t:40.0, x:1430, y:1060, dur:1.6},
  {t:71.0, x:1400, y:1060, dur:1.6},
  {t:108.0,x:1450, y:1060, dur:1.6},
];

// build keyframe list
const kf = [];
for (const sec of sections){ kf.push([sec.s,sec.x,sec.y]); kf.push([sec.e,sec.x,sec.y]); }
for (const f of fans){
  const a=f.t-0.4, b=f.t+f.dur, c=f.t+f.dur+0.4;
  // sample section value just before/after for smooth return
  kf.push([a, valAt(a).x, valAt(a).y]);
  kf.push([f.t, f.x, f.y]);
  kf.push([b, f.x, f.y]);
  kf.push([c, valAt(c).x, valAt(c).y]);
}
function valAt(t){
  // nearest section (or interpolate within gaps handled by kf sort later); simple: find covering/closest section
  let best=sections[0], bd=1e9;
  for(const s of sections){ const m=(s.s+s.e)/2; if(t>=s.s&&t<=s.e) return {x:s.x,y:s.y}; const d=Math.min(Math.abs(t-s.s),Math.abs(t-s.e)); if(d<bd){bd=d;best=s;} }
  return {x:best.x,y:best.y};
}
kf.sort((a,b)=>a[0]-b[0]);

function interp(t){
  if(t<=kf[0][0]) return [kf[0][1],kf[0][2]];
  if(t>=kf[kf.length-1][0]) return [kf[kf.length-1][1],kf[kf.length-1][2]];
  for(let i=0;i<kf.length-1;i++){ const [t0,x0,y0]=kf[i],[t1,x1,y1]=kf[i+1]; if(t>=t0&&t<=t1){ const u=t1>t0?(t-t0)/(t1-t0):0; return [x0+(x1-x0)*u, y0+(y1-y0)*u]; } }
  return [kf[0][1],kf[0][2]];
}

const sc = is4k?1:0.25;
const cw=Math.round(W*sc), ch=Math.round(H*sc);
let lines=[];
for(let f=0;f<NF;f++){
  const t=f/FPS;
  let [x,y]=interp(t);
  const x0=Math.round(clamp(x*sc-cw/2,0,SRCW*sc-cw));
  const y0=Math.round(clamp(y*sc-ch/2,0,SRCH*sc-ch));
  lines.push(`${t.toFixed(4)} crop x ${x0};`);
  lines.push(`${t.toFixed(4)} crop y ${y0};`);
}
const cmdfile="scratch/chrome-short/cal_cmds.txt";
fs.writeFileSync(cmdfile,lines.join("\n"));
const OW=1080, OH=1920;
const enc=is4k?`-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart`:`-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p`;
const vf=`sendcmd=f='${cmdfile}',crop=${cw}:${ch}:0:0,scale=${OW}:${OH}:flags=lanczos`;
const cmd=`ffmpeg -y -i "${src}" -vf "${vf}" ${enc} -an "${out}"`;
console.log(`crop ${cw}x${ch} -> ${OW}x${OH}, sections=${sections.length} fans=${fans.length}`);
execSync(cmd,{stdio:"inherit"});
console.log("DONE ->",out);
