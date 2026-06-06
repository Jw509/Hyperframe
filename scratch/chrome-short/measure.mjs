import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const P = "scratch/chrome-short/proxy.mp4";
const dir = "scratch/chrome-short/meas"; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
// central crop on proxy: x 220..740 (=4K 880..2960), full height; scale to 640 wide
// grid (scaled coords): red center x=320 y=332; cyan x=222(1600),419(2240); yellow x=129(1300),511(2540); faint horiz y=246(800),418(1360)
const g = "drawbox=x=319:y=0:w=2:h=ih:color=red:t=fill,drawbox=x=0:y=331:w=iw:h=2:color=red:t=fill,"
        + "drawbox=x=222:y=0:w=1:h=ih:color=cyan@0.7:t=fill,drawbox=x=419:y=0:w=1:h=ih:color=cyan@0.7:t=fill,"
        + "drawbox=x=129:y=0:w=1:h=ih:color=yellow@0.6:t=fill,drawbox=x=511:y=0:w=1:h=ih:color=yellow@0.6:t=fill";
shots.forEach((s,i)=>{
  const mid=((s.start+s.end)/2).toFixed(2);
  execSync(`ffmpeg -y -ss ${mid} -i "${P}" -frames:v 1 -vf "crop=520:540:220:0,scale=640:-1,${g}" "${dir}/m${String(i+1).padStart(2,"0")}.png"`,{stdio:"ignore"});
});
function sheet(a,b,out){
  const files=[]; for(let i=a;i<=b;i++) files.push(`${dir}/m${String(i).padStart(2,"0")}.png`);
  const list=files.map(f=>`-i "${f}"`).join(" ");
  const n=files.length, cols=4;
  const lay=files.map((_,k)=>{const c=k%cols,r=Math.floor(k/cols);return `${c===0?0:c+'*'+'in_w'}_${r===0?0:r+'*'+'in_h'}`;});
  // simpler: use xstack with fixed tile size (640x664)
  const TW=640, TH=664;
  const pos=files.map((_,k)=>{const c=k%cols,r=Math.floor(k/cols);return `${c*TW}_${r*TH}`;}).join("|");
  execSync(`ffmpeg -y ${list} -filter_complex "${files.map((_,k)=>`[${k}:v]`).join("")}xstack=inputs=${n}:layout=${pos}:fill=0x333333[v]" -map "[v]" -frames:v 1 "${out}"`,{stdio:"ignore"});
  console.log(out,"=",a,"-",b);
}
sheet(1,15,"scratch/chrome-short/meas_A.png");
sheet(16,30,"scratch/chrome-short/meas_B.png");
sheet(31,43,"scratch/chrome-short/meas_C.png");
console.log("RED=center(1920,1080) CYAN=1600/2240 YELLOW=1300/2540 (4K x). featured card center -> read x.");
shots.forEach((s,i)=>console.log(`${i+1}\t${s.label}`));
