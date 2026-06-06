import fs from "fs";
import { execSync } from "child_process";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const PROXY = "scratch/chrome-short/proxy.mp4";
const dir = "scratch/chrome-short/pos2"; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const shots = cat.shots;
// tile 420 wide (from 960). 4K x -> tile x: tx = (x4k/3840)*420
const TW=420; const X=p=>Math.round(p*TW);
// lines at 4K: 1280,1920(center),2560 + 1600,2240
const lines = [[0.333,"yellow@0.55",1],[0.5,"red",2],[0.667,"yellow@0.55",1],[0.4167,"cyan@0.4",1],[0.5833,"cyan@0.4",1]];
const draw = lines.map(([f,c,w])=>`drawbox=x=${X(f)}:y=0:w=${w}:h=ih:color=${c}:t=fill`).join(",");
shots.forEach((s,i)=>{
  const mid=((s.start+s.end)/2).toFixed(2);
  execSync(`ffmpeg -y -ss ${mid} -i "${PROXY}" -frames:v 1 -vf "scale=${TW}:-1,${draw}" "${dir}/f_${String(i+1).padStart(2,"0")}.png"`,{stdio:"ignore"});
});
// two sheets: 1-24, 25-43
function sheet(a,b,out){
  const files=[]; for(let i=a;i<=b;i++) files.push(`${dir}/f_${String(i).padStart(2,"0")}.png`);
  const list=files.map(f=>`-i "${f}"`).join(" ");
  const n=files.length, cols=4, rows=Math.ceil(n/cols);
  execSync(`ffmpeg -y ${list} -filter_complex "${files.map((_,k)=>`[${k}:v]`).join("")}xstack=inputs=${n}:layout=${gridLayout(n,cols,TW)}:fill=0x333333[v]" -map "[v]" -frames:v 1 "${out}"`,{stdio:"ignore"});
}
function gridLayout(n,cols,tw){
  const th=Math.round(tw*9/16); // 236
  const pos=[]; for(let k=0;k<n;k++){const c=k%cols,r=Math.floor(k/cols); pos.push(`${c===0?'0':`${c*tw}`}_${r===0?'0':`${r*th}`}`);}
  return pos.join("|");
}
sheet(1,24,"scratch/chrome-short/pos2_A.png");
sheet(25,43,"scratch/chrome-short/pos2_B.png");
console.log("pos2 A(1-24) B(25-43). red=center1920 yellow=1280/2560 cyan=1600/2240 (4K x)");
shots.forEach((s,i)=>console.log(`${i+1}\t${s.label}`));
