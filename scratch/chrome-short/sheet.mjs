import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue.json","utf8"));
const reframe = process.argv[2] ?? "scratch/chrome-short/reframe_full.mp4";
const outSheet = process.argv[3] ?? "scratch/chrome-short/reframe_sheet.png";
const dir = "scratch/chrome-short/rfframes";
fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
shots.forEach((s,i)=>{
  const mid=((s.start+s.end)/2).toFixed(2);
  const idx=String(i+1).padStart(2,"0");
  execSync(`ffmpeg -y -ss ${mid} -i "${reframe}" -frames:v 1 -vf "scale=210:-1" "${dir}/f_${idx}.png"`,{stdio:"ignore"});
});
const n = fs.readdirSync(dir).filter(f=>f.endsWith(".png")).length;
const cols=6, rows=Math.ceil(n/cols);
execSync(`ffmpeg -y -i "${dir}/f_%02d.png" -vf "tile=${cols}x${rows}:margin=6:padding=6:color=0x222222" -frames:v 1 "${outSheet}"`,{stdio:"inherit"});
console.log(`sheet -> ${outSheet}  (${n} tiles, ${cols}x${rows})`);
shots.forEach((s,i)=>console.log(`${i+1}\t${s.label}\t${s.start}-${s.end}\tcx${s.cx}`));
