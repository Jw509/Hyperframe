import fs from "fs";
const cat=JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue_v2.json","utf8"));
const tk=JSON.parse(fs.readFileSync("scratch/chrome-short/track.json","utf8"));
const inits=tk.inits;
cat.shots.forEach((s,i)=>{
  const it=inits[String(i+1)];
  if(it && it.box){ const[x,y,w,h]=it.box; s.cx=Math.round((x+w/2)*4); s.cyTrack=Math.round((y+h/2)*4); }
});
fs.writeFileSync("scratch/chrome-short/catalogue_init.json",JSON.stringify(cat,null,1));
console.log("init-center cx values:");
cat.shots.forEach((s,i)=>console.log(`${String(i+1).padStart(2)} ${s.cx}\t${s.label}`));
