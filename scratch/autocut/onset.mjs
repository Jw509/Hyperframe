import { readFileSync } from "node:fs";
const txt=readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[];let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const A=parseFloat(process.argv[2]),B=parseFloat(process.argv[3]);
let onset=null;
for(let i=1;i<T.length;i++){if(T[i]<A||T[i]>B)continue;if(M[i-1]<6&&M[i]>=10){onset=T[i];break;}}
console.log(`${process.argv[4]||""} onset=${onset?onset.toFixed(2):"none"} in [${A},${B}]`);
