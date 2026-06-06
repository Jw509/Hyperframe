import fs from "fs";
const cat = JSON.parse(fs.readFileSync("scratch/chrome-short/catalogue.json","utf8"));
// 1-based shot index -> corrected cx (from center-line hcheck of agent-cx reframe)
const fix = {1:1850,3:1600,5:2120,11:1160,15:1380,17:1980,18:1880,20:1180,21:1660,23:1340,25:1140,26:1900,27:1320,30:1920,32:2010,37:1180};
cat.shots.forEach((s,i)=>{ if(fix[i+1]!==undefined){ s.cx=fix[i+1]; }});
fs.writeFileSync("scratch/chrome-short/catalogue_v2.json", JSON.stringify(cat,null,1));
console.log("patched", Object.keys(fix).length, "cx values -> catalogue_v2.json");
