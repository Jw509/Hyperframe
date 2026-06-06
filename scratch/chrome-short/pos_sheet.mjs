import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const PROXY = "scratch/chrome-short/proxy.mp4"; // 960x540 full landscape
const dir = "scratch/chrome-short/pos"; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
// draw center (red) + 1/3,2/3 (yellow) vertical lines on a 280-wide tile (scaled from 960)
// 280/960 scale: center x=140, third=93, twothird=187
shots.forEach((s,i)=>{
  const mid=((s.start+s.end)/2).toFixed(2);
  const idx=String(i+1).padStart(2,"0");
  execSync(`ffmpeg -y -ss ${mid} -i "${PROXY}" -frames:v 1 -vf "scale=280:-1,drawbox=x=139:y=0:w=2:h=ih:color=red:t=fill,drawbox=x=93:y=0:w=1:h=ih:color=yellow@0.6:t=fill,drawbox=x=186:y=0:w=1:h=ih:color=yellow@0.6:t=fill" "${dir}/f_${idx}.png"`,{stdio:"ignore"});
});
const n=fs.readdirSync(dir).filter(f=>f.endsWith(".png")).length;
execSync(`ffmpeg -y -i "${dir}/f_%02d.png" -vf "tile=6x8:margin=4:padding=5:color=0x333333" -frames:v 1 "scratch/chrome-short/pos_sheet.png"`,{stdio:"inherit"});
console.log(`pos sheet: ${n} tiles. red=center(1920), yellow=1/3(1280) & 2/3(2560) in 4K coords`);
shots.forEach((s,i)=>console.log(`${i+1}\t${s.label}\t${s.start}-${s.end}`));
