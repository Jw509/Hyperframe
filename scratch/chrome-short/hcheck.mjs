import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue.json","utf8"));
const R = process.argv[2] || "scratch/chrome-short/reframe_full.mp4";
const OUT = process.argv[3] || "scratch/chrome-short/hcheck_sheet.png";
const dir = "scratch/chrome-short/hc"; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
shots.forEach((s,i)=>{
  const mid=((s.start+s.end)/2).toFixed(2);
  const idx=String(i+1).padStart(2,"0");
  // 240 wide tile, red vertical center line at x=120, plus thirds in faint
  execSync(`ffmpeg -y -ss ${mid} -i "${R}" -frames:v 1 -vf "scale=240:-1,drawbox=x=119:y=0:w=2:h=ih:color=red:t=fill,drawbox=x=79:y=0:w=1:h=ih:color=yellow@0.5:t=fill,drawbox=x=159:y=0:w=1:h=ih:color=yellow@0.5:t=fill" "${dir}/f_${idx}.png"`,{stdio:"ignore"});
});
const n=fs.readdirSync(dir).filter(f=>f.endsWith(".png")).length;
const cols=6, rows=Math.ceil(n/cols);
execSync(`ffmpeg -y -i "${dir}/f_%02d.png" -vf "tile=${cols}x${rows}:margin=4:padding=6:color=white" -frames:v 1 "${OUT}"`,{stdio:"inherit"});
console.log(`hcheck -> ${n} tiles ${cols}x${rows}`);
