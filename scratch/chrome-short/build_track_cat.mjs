import fs from "fs";
const cat=JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const tk=JSON.parse(fs.readFileSync("scratch/chrome-short/track.json","utf8"));
const traj=tk.traj, FPS=tk.fps;
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
const GLOBAL=2060;
const suspects=[];
cat.shots.forEach((s,i)=>{
  const f0=Math.round(s.start*FPS),f1=Math.round(s.end*FPS);
  const xs=[],ys=[];
  for(let f=f0;f<=f1;f++){ if(traj[f]){xs.push(traj[f][0]);ys.push(traj[f][1]);} }
  let cx=med(xs), cy=med(ys);
  let why=null;
  if(cx==null||xs.length<4){cx=GLOBAL;why="few-frames";}
  else if(cx>2620||cx<1050){why="extreme("+cx+")";cx=GLOBAL;}
  if(why) suspects.push(`${i+1} ${s.label} -> ${why}`);
  s.cx=Math.round(cx); s.cyTrack=cy?Math.round(cy):null;
});
fs.writeFileSync("scratch/chrome-short/catalogue_track.json",JSON.stringify(cat,null,1));
console.log("suspects (set to global "+GLOBAL+", verify these):");
suspects.forEach(x=>console.log("  "+x));
console.log("cx values:");
cat.shots.forEach((s,i)=>console.log(`${String(i+1).padStart(2)} ${s.cx}\t${s.label}`));
