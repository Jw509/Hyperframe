import fs from "fs";
import { execSync } from "child_process";
// args: src(proxy|4k) out
const srcKind = process.argv[2] ?? "proxy";
const out = process.argv[3] ?? "scratch/chrome-short/tight_centered.mp4";
const CAT = process.env.CAT || "scratch/chrome-short/catalogue_centered.json";
const cat = JSON.parse(fs.readFileSync(CAT,"utf8"));
const shots = cat.shots;
const is4k = srcKind==="4k";
const src = is4k ? "cards/sources/chrome/CutdownChromeMegaBox.mp4" : "scratch/chrome-short/proxy.mp4";
const FPS=60, DUR=133.27, NF=Math.round(DUR*FPS);
const W=1040, H=1849;            // tight 9:16 crop (4K), card ~74% like v5
const FW=1216, FH=2160;          // full-height 9:16 crop for fans (max width in 9:16)
const SRCW=3840, SRCH=2160;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// fan windows: full-height center crop on the spread (rule #6)
const fans=[ {s:5.6,e:9.2,cx:1500}, {s:38.8,e:42.2,cx:1450}, {s:69.8,e:73.2,cx:1450}, {s:106.8,e:110.4,cx:1500} ];
function fanAt(t){ return fans.find(f=>t>=f.s&&t<=f.e); }
// Voronoi boundaries (reposition during the slide between cards)
const bounds=[]; for(let i=0;i<shots.length-1;i++) bounds.push(((shots[i].end+shots[i+1].start)/2));
function shotOf(t){ for(let i=0;i<shots.length;i++){ if(t<(bounds[i]??1e9)) return i; } return shots.length-1; }
const sc=is4k?1:0.25;
let lines=[];
for(let f=0;f<NF;f++){
  const t=f/FPS; const fn=fanAt(t);
  let cw,ch,cxc,cyc;
  if(fn){ cw=Math.round(FW*sc); ch=Math.round(FH*sc); cxc=fn.cx; cyc=1080; }
  else { const s=shots[shotOf(t)]; cw=Math.round(W*sc); ch=Math.round(H*sc); cxc=s.cx; cyc=s.cy; }
  const x0=Math.round(clamp(cxc*sc-cw/2,0,SRCW*sc-cw));
  const y0=Math.round(clamp(cyc*sc-ch/2,0,SRCH*sc-ch));
  lines.push(`${t.toFixed(4)} crop w ${cw};`);
  lines.push(`${t.toFixed(4)} crop h ${ch};`);
  lines.push(`${t.toFixed(4)} crop x ${x0};`);
  lines.push(`${t.toFixed(4)} crop y ${y0};`);
}
const cmdfile="scratch/chrome-short/tight_cmds.txt"; fs.writeFileSync(cmdfile,lines.join("\n"));
const OW=is4k?1080:540, OH=is4k?1920:960;
const enc=is4k?`-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart`:`-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p`;
const vf=`sendcmd=f='${cmdfile}',crop=${Math.round(W*sc)}:${Math.round(H*sc)}:0:0,scale=${OW}:${OH}:flags=lanczos`;
console.log(`tight crop ${Math.round(W*sc)}x${Math.round(H*sc)} (fans full-height) -> ${OW}x${OH}, shots=${shots.length}, fans=${fans.length}`);
execSync(`ffmpeg -y -i "${src}" -vf "${vf}" ${enc} -an "${out}"`,{stdio:"inherit"});
console.log("DONE ->",out);
