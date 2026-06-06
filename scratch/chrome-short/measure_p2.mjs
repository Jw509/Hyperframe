import { execSync } from "child_process";
import fs from "fs";
const S="cards/sources/chrome/CutdownChromeMegaBox.mp4";
const D="scratch/chrome-short/mp2"; fs.rmSync(D,{recursive:true,force:true}); fs.mkdirSync(D,{recursive:true});
// crop 4K region x[1280,2680] (w1400) full height 2160 -> tile 520 wide x 802 tall
// tileX(4Kx)=(x-1280)*520/1400 ; tileY(4Ky)=y*802/2160
const TX=x=>Math.round((x-1280)*520/1400), TY=y=>Math.round(y*802/2160);
const V=[[1600,"cyan"],[1800,"yellow"],[2000,"red"],[2200,"yellow"],[2400,"cyan"]];
const Hh=[[800,"cyan"],[1080,"red"],[1360,"cyan"]];
const g=[...V.map(([x,c])=>`drawbox=x=${TX(x)}:y=0:w=2:h=ih:color=${c}:t=fill`),
        ...Hh.map(([y,c])=>`drawbox=x=0:y=${TY(y)}:w=iw:h=2:color=${c}:t=fill`)].join(",");
const cards=[["Kirk",26],["Downs",27.5],["Barkley",30.5],["Doubs",32.5],["Ewers",34.5],["Montgomery",36.5]];
const files=[];
for(const [n,t] of cards){
  const f=`${D}/${n}.png`;
  execSync(`ffmpeg -y -ss ${t} -i "${S}" -frames:v 1 -vf "crop=1400:2160:1280:0,scale=520:-1,${g}" "${f}"`,{stdio:"ignore"});
  files.push(f);
}
const list=files.map(f=>`-i "${f}"`).join(" ");
const TW=520,TH=802;
const pos=files.map((_,k)=>{const c=k%3,r=Math.floor(k/3);return `${c*TW}_${r*TH}`;}).join("|");
execSync(`ffmpeg -y ${list} -filter_complex "${files.map((_,k)=>`[${k}:v]`).join("")}xstack=inputs=6:layout=${pos}:fill=0x222222[v]" -map "[v]" -frames:v 1 scratch/chrome-short/mp2_sheet.png`,{stdio:"ignore"});
console.log("verticals 4K x: 1600(cyan) 1800(yellow) 2000(RED) 2200(yellow) 2400(cyan)");
console.log("horizontals 4K y: 800(cyan) 1080(RED) 1360(cyan)");
console.log("order: Kirk,Downs,Barkley / Doubs,Ewers,Montgomery");
