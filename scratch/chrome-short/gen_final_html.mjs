import fs from "fs";
const OV = "scratch/chrome-short/ov";
const man = JSON.parse(fs.readFileSync(`${OV}/manifest.json`, "utf8"));
const comps = Object.fromEntries(JSON.parse(fs.readFileSync("scratch/chrome-short/comps.json","utf8")).map(c=>[c.id,c]));
const COMPDIR = "cards/comps/Topps Chrome Short J1";
const CLEAN = "cards/comps/chrome-short";
fs.mkdirSync(CLEAN,{recursive:true});

const reveals = man.reveals;
const COST = man.cost;            // 69.99
const VIDEO = 133.27;
const fmt = v => "$" + v.toFixed(2);
const moneyId = reveals.reduce((m,r)=> r.price>m.price?r:m, reveals[0]).id;  // highest comp = money shot

// copy comp screenshots to clean names + build sale-card timing
const cards = reveals.map((r,i)=>{
  const c = comps[r.id]; let img="";
  if (c && c.file && fs.existsSync(`${COMPDIR}/${c.file}`)) {
    const dst = `r${String(i+1).padStart(2,"0")}.png`;
    fs.copyFileSync(`${COMPDIR}/${c.file}`, `${CLEAN}/${dst}`);
    img = `../comps/chrome-short/${dst}`;
  }
  const next = reveals[i+1];
  const start = +(r.start + 0.18).toFixed(2);
  let dur = r.end - r.start - 0.18;
  dur = Math.min(Math.max(dur, 1.3), 3.0);
  if (next) dur = Math.min(dur, (next.start + 0.18) - start - 0.05);  // don't overlap next chip
  dur = +Math.max(dur, 1.0).toFixed(2);
  return { ...r, idx:i+1, img, start, dur, money: r.id===moneyId };
});

const RECAP_START = 130.0;
const DURATION = 135.8;
const TRACK_FADE = RECAP_START - 0.4;

const saleDivs = cards.map(c => `      <div id="title-${c.idx}-card" class="sale-card clip" data-start="${c.start}" data-duration="${c.dur}" data-track-index="${c.idx}"${c.money?' data-money-shot="true"':''}>
${c.img?`        <div class="sale-card__comp"><img src="${c.img}" alt="comp" crossorigin="anonymous" /></div>\n`:''}        <div class="sale-card__label">Recent sale</div>
        <div class="sale-card__value">${fmt(c.price)}</div>
      </div>`).join("\n");

const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <title>Final Edit (Shorts) - chrome mega box</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:1080px; height:1920px; background:#000; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:1080px; height:1920px; }
      #source-video { position:absolute; inset:0; width:1080px; height:1920px; object-fit:cover; object-position:center center; }

      .sale-card { position:absolute; right:6px; top:132px; width:202px; padding:12px; border-radius:22px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(24px) saturate(140%); -webkit-backdrop-filter:blur(24px) saturate(140%);
        border:1px solid rgba(255,255,255,0.18); box-shadow:0 10px 26px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.22);
        display:flex; flex-direction:column; align-items:stretch; opacity:0; }
      .sale-card__comp { width:100%; aspect-ratio:0.70; border-radius:15px; overflow:hidden; background:#fff; margin-bottom:12px; box-shadow:0 5px 15px rgba(0,0,0,0.2); }
      .sale-card__comp img { width:100%; height:100%; object-fit:contain; display:block; }
      .sale-card__label { font-size:19px; font-weight:700; letter-spacing:4px; color:#fff; text-transform:uppercase; text-align:center; margin-top:2px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:7px; text-shadow:0 1px 7px rgba(0,0,0,0.55); }
      .sale-card__label::before { content:""; display:inline-block; width:7px; height:7px; border-radius:50%; background:#d4a017; box-shadow:0 0 9px rgba(212,160,23,0.75); }
      .sale-card__value { font-size:56px; font-weight:800; color:#fff; line-height:1; letter-spacing:-2px; text-align:center; text-shadow:0 2px 12px rgba(0,0,0,0.45); }

      .box-tracker { position:absolute; left:40px; top:150px; width:210px; padding:14px 16px; border-radius:22px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(28px) saturate(140%); -webkit-backdrop-filter:blur(28px) saturate(140%);
        border:1px solid rgba(255,255,255,0.18); box-shadow:0 10px 24px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.22); opacity:0; }
      .box-tracker__row { display:flex; flex-direction:column; }
      .box-tracker__label { font-size:12px; font-weight:600; letter-spacing:4px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:4px; line-height:1.25; }
      .box-tracker__value { font-size:32px; font-weight:800; letter-spacing:-1px; line-height:1; text-shadow:0 1px 8px rgba(0,0,0,0.5); font-variant-numeric:tabular-nums; }
      .box-tracker__value--cost { color:#f87171; }
      .box-tracker__value--total { color:#4ade80; }
      .box-tracker__divider { height:1px; background:rgba(255,255,255,0.15); margin:10px 0; }

      .recap-card { position:absolute; left:50%; top:50%; width:400px; padding:30px 34px 34px; border-radius:28px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(28px) saturate(140%); -webkit-backdrop-filter:blur(28px) saturate(140%);
        border:1px solid rgba(255,255,255,0.18); box-shadow:0 14px 36px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.22);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap-card__label { font-size:17px; font-weight:600; letter-spacing:6px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:4px; }
      .recap-card__value { font-size:58px; font-weight:800; color:#fff; line-height:1; letter-spacing:-2px; margin-bottom:20px; text-shadow:0 2px 12px rgba(0,0,0,0.45); font-variant-numeric:tabular-nums; }
      .recap-card__divider { width:70%; height:1px; background:rgba(255,255,255,0.18); margin:0 0 20px; }
      .recap-card__profit-label { font-size:18px; font-weight:700; letter-spacing:8px; color:#fff; text-transform:uppercase; margin-top:4px; margin-bottom:6px; text-shadow:0 1px 8px rgba(0,0,0,0.5); }
      .recap-card__profit { font-size:100px; font-weight:900; color:#4ade80; line-height:1; letter-spacing:-3px; text-shadow:0 4px 24px rgba(74,222,128,0.5); font-variant-numeric:tabular-nums; }
      .recap-card__roi { font-size:30px; font-weight:700; letter-spacing:1px; margin-top:14px; color:#f87171; font-variant-numeric:tabular-nums; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="final-chrome" data-width="1080" data-height="1920" data-start="0" data-duration="${DURATION}">
      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" muted playsinline src="../sources/chrome/usertracked-h264.mp4"></video>

${saleDivs}

      <div id="box-tracker" class="box-tracker clip" data-start="3.70" data-duration="${(TRACK_FADE-3.7).toFixed(2)}" data-track-index="90">
        <div class="box-tracker__row"><div class="box-tracker__label">Box cost</div><div class="box-tracker__value box-tracker__value--cost">${fmt(COST)}</div></div>
        <div class="box-tracker__divider"></div>
        <div class="box-tracker__row"><div class="box-tracker__label">Cards pulled<br>total</div><div class="box-tracker__value box-tracker__value--total" id="box-tracker-total">$0.00</div></div>
      </div>

      <div id="recap-card" class="recap-card clip" data-start="${RECAP_START.toFixed(2)}" data-duration="${(DURATION-RECAP_START).toFixed(2)}" data-track-index="91">
        <div class="recap-card__label">Box cost</div>
        <div class="recap-card__value">${fmt(COST)}</div>
        <div class="recap-card__divider"></div>
        <div class="recap-card__label">Cards value</div>
        <div class="recap-card__value" id="recap-total">$0.00</div>
        <div class="recap-card__divider"></div>
        <div class="recap-card__profit-label" id="recap-profit-label">Profit</div>
        <div class="recap-card__profit" id="recap-profit">+$0.00</div>
        <div class="recap-card__roi" id="recap-roi"></div>
      </div>

      <script>
        (function () {
          const IN_DUR=0.3, OUT_DUR=0.4, POP_IN=0.7;
          const tl = gsap.timeline({ paused:true });
          gsap.set(".sale-card.clip", { transformOrigin:"100% 0%" });

          document.querySelectorAll(".sale-card.clip").forEach((el)=>{
            const start=Number(el.getAttribute("data-start"));
            const dur=Number(el.getAttribute("data-duration"));
            const money=el.getAttribute("data-money-shot")==="true";
            const inD=money?POP_IN:IN_DUR;
            const hold=Math.max(0.2,dur-inD-OUT_DUR);
            if(money){
              tl.fromTo(el,{scale:0.7,opacity:0},{scale:1,opacity:1,duration:POP_IN,ease:"back.out(1.4)"},start);
            } else {
              tl.fromTo(el,{x:320,opacity:0},{x:0,opacity:1,duration:IN_DUR,ease:"power3.out"},start);
            }
            tl.to(el,{x:320,opacity:0,duration:OUT_DUR,ease:"power2.in"},start+inD+hold);
          });

          const tracker=document.getElementById("box-tracker");
          const totalEl=document.getElementById("box-tracker-total");
          tl.fromTo(tracker,{x:-50,opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},3.7);
          const revs=Array.from(document.querySelectorAll(".sale-card.clip")).map(el=>({start:Number(el.getAttribute("data-start")),value:parseFloat(el.querySelector(".sale-card__value").textContent.replace(/[^0-9.]/g,""))||0})).sort((a,b)=>a.start-b.start);
          const cs={value:0}; let run=0;
          revs.forEach(({start,value})=>{ const nt=run+value; tl.to(cs,{value:nt,duration:0.6,ease:"power1.out",onUpdate:()=>{totalEl.textContent="$"+cs.value.toFixed(2);}},start); run=nt; });
          tl.to(tracker,{opacity:0,duration:0.4,ease:"power2.in"},${TRACK_FADE.toFixed(2)});

          const recap=document.getElementById("recap-card");
          const rTot=document.getElementById("recap-total");
          const rPro=document.getElementById("recap-profit");
          const rLab=document.getElementById("recap-profit-label");
          const rRoi=document.getElementById("recap-roi");
          const COST=${COST};
          const RS=${RECAP_START.toFixed(2)};
          const finalTotal=run; const profit=finalTotal-COST; const isLoss=profit<0;
          const roi=profit/COST*100;
          if(isLoss){ rPro.style.color="#f87171"; rPro.style.textShadow="0 4px 24px rgba(248,113,113,0.45)"; rLab.style.color="#f87171"; rLab.textContent="Loss"; rRoi.style.color="#f87171"; }
          else { rRoi.style.color="#4ade80"; }
          gsap.set(recap,{xPercent:-50,yPercent:-50,transformOrigin:"center center"});
          gsap.set([rLab,rPro,rRoi],{opacity:0,y:16});
          tl.fromTo(recap,{opacity:0,scale:0.88},{opacity:1,scale:1,duration:0.7,ease:"back.out(1.4)"},RS);
          const rts={value:0};
          tl.to(rts,{value:finalTotal,duration:1.4,ease:"power2.out",onUpdate:()=>{rTot.textContent="$"+rts.value.toFixed(2);}},RS+0.4);
          tl.to([rLab,rPro,rRoi],{opacity:1,y:0,duration:0.5,ease:"power3.out",stagger:0.08},RS+1.85);
          const rps={value:0};
          tl.to(rps,{value:profit,duration:1.2,ease:"power2.out",onUpdate:()=>{const v=rps.value;rPro.textContent=(v>=0?"+":"-")+"$"+Math.abs(v).toFixed(2);}},RS+2.1);
          rRoi.textContent=(roi>=0?"+":"")+roi.toFixed(1)+"% ROI";

          window.__timelines=window.__timelines||{};
          window.__timelines["final-chrome"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;
fs.writeFileSync("cards/compositions/final-chrome.html", html);
console.log(`wrote final-chrome.html : ${cards.length} sale cards, cost ${fmt(COST)}, total ${fmt(man.total)}, dur ${DURATION}s, money=${moneyId}`);
console.log("copied", fs.readdirSync(CLEAN).length, "comp pngs to", CLEAN);
