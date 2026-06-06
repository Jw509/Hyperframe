import fs from "fs";
import { execSync } from "child_process";
// args: src(proxy|4k) out
const srcKind = process.argv[2] ?? "proxy";
const out = process.argv[3] ?? "scratch/chrome-short/perpack2.mp4";
const is4k = srcKind==="4k";
const src = is4k ? "cards/sources/chrome/CutdownChromeMegaBox.mp4" : "scratch/chrome-short/proxy.mp4";
const FPS=60, DUR=133.27, NF=Math.round(DUR*FPS);
const W=1126, H=2000;            // card ~68% width, slight vertical room for per-pack cy
const SRCW=3840, SRCH=2160;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// PER-PACK centers (cx, cy) — switch position between packs to keep each pack in the box.
// cy target = card vertical center ~54% of output. Recenter smoothly at pack boundaries.
const kf=[
  [0,1400,1050],[4.6,1400,1050],        // intro box
  [5.4,1800,1100],[24.6,1800,1100],     // P1
  [25.4,1980,950],[39.6,1980,950],      // P2 (held high+right)
  [40.4,1800,1050],[55.6,1800,1050],    // P3
  [56.4,1800,1080],[70.6,1800,1080],    // P4
  [71.4,1800,1120],[88.6,1800,1120],    // P5
  [89.4,1800,1080],[107.6,1800,1080],   // P6
  [108.4,2010,1200],[DUR,2010,1200],    // P7 (held low+right)
];
const smooth=u=>u*u*(3-2*u);
function at(t){
  if(t<=kf[0][0]) return [kf[0][1],kf[0][2]];
  if(t>=kf[kf.length-1][0]) return [kf[kf.length-1][1],kf[kf.length-1][2]];
  for(let i=0;i<kf.length-1;i++){ const[t0,x0,y0]=kf[i],[t1,x1,y1]=kf[i+1]; if(t>=t0&&t<=t1){ const u=t1>t0?(t-t0)/(t1-t0):0; const e=smooth(u); return [x0+(x1-x0)*e, y0+(y1-y0)*e]; } }
  return [kf[0][1],kf[0][2]];
}
const sc=is4k?1:0.25;
const cw=Math.round(W*sc), ch=Math.round(H*sc);
const TY=0.54; // card vertical target fraction
let lines=[];
for(let f=0;f<NF;f++){
  const t=f/FPS; const [cx,cy]=at(t);
  const x0=Math.round(clamp(cx*sc-cw/2,0,SRCW*sc-cw));
  const y0=Math.round(clamp(cy*sc-TY*ch,0,SRCH*sc-ch));
  lines.push(`${t.toFixed(4)} crop x ${x0};`);
  lines.push(`${t.toFixed(4)} crop y ${y0};`);
}
const cmdfile="scratch/chrome-short/static_cmds.txt"; fs.writeFileSync(cmdfile,lines.join("\n"));
const OW=is4k?1080:540, OH=is4k?1920:960;
const enc=is4k?`-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart`:`-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p`;
const vf=`sendcmd=f='${cmdfile}',crop=${cw}:${ch}:0:0,scale=${OW}:${OH}:flags=lanczos`;
console.log(`PER-PACK (cx,cy), crop ${cw}x${ch} -> ${OW}x${OH}, keyframes=${kf.length}`);
execSync(`ffmpeg -y -i "${src}" -vf "${vf}" ${enc} -an "${out}"`,{stdio:"inherit"});
console.log("DONE ->",out);
