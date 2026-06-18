import fs from "fs";
// 2024 Bowman Chrome U (blaster) overlay generator — adapts scratch/gen-bowman-overlays.mjs.
// Sits on the user's already-cut video (== the 66.56s 4K file; portrait content is centered 9:16
// so object-fit:cover recovers it). comp chip (eBay screenshot + value) top-right per card,
// running box-cost tracker top-left, profit/ROI recap on black at the end.
const comps = JSON.parse(fs.readFileSync("cards/comps/2024BowmanUChrome/comps.json", "utf8"));
const pos = JSON.parse(fs.readFileSync("scratch/2024bowmanu-card-positions.json", "utf8"));
const COST = comps.boxCost;            // 24.99
const VIDEO = 66.56;                   // user's cut duration
const PREVIEW = process.env.PREVIEW === "1";
const RECAP_START = VIDEO;             // recap begins on black right after the last card (Evan Stewart)
const DURATION = PREVIEW ? 18.0 : 73.1; // recap fills VIDEO..73.1 on black
const TRACK_FADE = RECAP_START - 0.4;
const TRACK_START = 8.5;                // box-cost tracker enters as pack 1 cards start (sync to cost sting in post)
const fmt = v => "$" + v.toFixed(2);

// build chips from comps + their on-screen positions, sorted by time
const cards = comps.comps.map(c => {
  const p = pos[c.cardId];
  if (!p) { console.warn("NO POSITION for", c.cardId, c.player); return null; }
  return { ...c, _s: p.s, _e: p.e, name: c.player };
}).filter(Boolean).sort((a, b) => a._s - b._s);

// timing: chip appears just after card lands, holds, clears before next chip
const chipStartOf = c => (c.chipStartOutput != null ? c.chipStartOutput : c._s + 0.12);
for (let i = 0; i < cards.length; i++) {
  const c = cards[i]; const next = cards[i + 1];
  c.start = +chipStartOf(c).toFixed(2);
  let dur = c._e - c.start;
  dur = Math.min(Math.max(dur, 1.1), 3.0);
  if (next) dur = Math.min(dur, chipStartOf(next) - c.start - 0.04);
  c.dur = +Math.max(dur, 0.9).toFixed(2);
}

const saleDivs = cards.map((c, i) => `      <div class="sale-card clip" data-start="${c.start}" data-duration="${c.dur}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="sale-card__comp"><img src="../comps/2024BowmanUChrome/${c.file}" alt="${c.player} ${c.parallel} ${fmt(c.value)}" crossorigin="anonymous" /></div>
${c.label ? `        <div class="sale-card__label">${c.label}</div>\n` : ''}        <div class="sale-card__value">${fmt(c.value)}</div>
      </div>`).join("\n");

const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <title>Final Edit (Shorts) - 2024 Bowman Chrome U</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:1080px; height:1920px; background:#000; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:1080px; height:1920px; }
      #source-video { position:absolute; inset:0; width:1080px; height:1920px; object-fit:cover; object-position:center center; }

      .sale-card { position:absolute; right:12px; top:92px; width:230px; padding:9px 9px 4px; border-radius:20px;
        background:rgba(255,255,255,0.10); backdrop-filter:blur(24px) saturate(140%); -webkit-backdrop-filter:blur(24px) saturate(140%);
        border:1px solid rgba(255,255,255,0.20); box-shadow:0 12px 28px rgba(0,0,0,0.32),inset 0 1px 0 rgba(255,255,255,0.24);
        display:flex; flex-direction:column; align-items:stretch; opacity:0; }
      .sale-card__comp { width:100%; border-radius:13px; overflow:hidden; background:#fff; box-shadow:0 5px 15px rgba(0,0,0,0.22); display:block; }
      .sale-card__comp img { width:100%; height:auto; display:block; }
      .sale-card__label { font-size:15px; font-weight:700; letter-spacing:3px; color:#ffd24a; text-transform:uppercase; text-align:center; margin-top:8px; text-shadow:0 1px 7px rgba(0,0,0,0.6); }
      .sale-card__value { font-size:50px; font-weight:800; color:#fff; line-height:1; letter-spacing:-2px; text-align:center; margin-top:8px; text-shadow:0 2px 12px rgba(0,0,0,0.5); }
      .sale-card__label + .sale-card__value { margin-top:2px; }
      .sale-card[data-money-shot="true"] .sale-card__value { color:#ffd24a; text-shadow:0 2px 16px rgba(255,210,74,0.6); }

      .box-tracker { position:absolute; left:36px; top:140px; width:212px; padding:14px 16px; border-radius:22px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(28px) saturate(140%); -webkit-backdrop-filter:blur(28px) saturate(140%);
        border:1px solid rgba(255,255,255,0.18); box-shadow:0 10px 24px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.22); opacity:0; }
      .box-tracker__label { font-size:12px; font-weight:600; letter-spacing:4px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:4px; line-height:1.25; }
      .box-tracker__value { font-size:32px; font-weight:800; letter-spacing:-1px; line-height:1; text-shadow:0 1px 8px rgba(0,0,0,0.5); font-variant-numeric:tabular-nums; }
      .box-tracker__value--cost { color:#f87171; }
      .box-tracker__value--total { color:#4ade80; }
      .box-tracker__divider { height:1px; background:rgba(255,255,255,0.15); margin:10px 0; }

      .recap-card { position:absolute; left:50%; top:50%; width:420px; padding:30px 34px 34px; border-radius:28px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(28px) saturate(140%); -webkit-backdrop-filter:blur(28px) saturate(140%);
        border:1px solid rgba(255,255,255,0.18); box-shadow:0 14px 36px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.22);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap-card__label { font-size:17px; font-weight:600; letter-spacing:6px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:4px; }
      .recap-card__value { font-size:58px; font-weight:800; color:#fff; line-height:1; letter-spacing:-2px; margin-bottom:20px; text-shadow:0 2px 12px rgba(0,0,0,0.45); font-variant-numeric:tabular-nums; }
      .recap-card__divider { width:70%; height:1px; background:rgba(255,255,255,0.18); margin:0 0 20px; }
      .recap-card__profit-label { font-size:18px; font-weight:700; letter-spacing:8px; color:#fff; text-transform:uppercase; margin-bottom:6px; text-shadow:0 1px 8px rgba(0,0,0,0.5); }
      .recap-card__profit { font-size:96px; font-weight:900; line-height:1; letter-spacing:-3px; font-variant-numeric:tabular-nums; }
      .recap-card__roi { font-size:30px; font-weight:700; letter-spacing:1px; margin-top:14px; font-variant-numeric:tabular-nums; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="final-2024BowmanUChrome" data-width="1080" data-height="1920" data-start="0" data-duration="${DURATION}">
      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" muted playsinline src="../sources/2024BowmanChromeBlaster/2024BowmanUChrome.mp4"></video>

${saleDivs}

      <div id="box-tracker" class="box-tracker clip" data-start="${TRACK_START.toFixed(2)}" data-duration="${(TRACK_FADE - TRACK_START).toFixed(2)}" data-track-index="90">
        <div class="box-tracker__label">Box cost</div><div class="box-tracker__value box-tracker__value--cost">${fmt(COST)}</div>
        <div class="box-tracker__divider"></div>
        <div class="box-tracker__label">Cards pulled<br>total</div><div class="box-tracker__value box-tracker__value--total" id="box-tracker-total">$0.00</div>
      </div>

      <div id="recap-card" class="recap-card clip" data-start="${RECAP_START.toFixed(2)}" data-duration="${(DURATION - RECAP_START).toFixed(2)}" data-track-index="91">
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
            if(money){ tl.fromTo(el,{scale:0.7,opacity:0},{scale:1,opacity:1,duration:POP_IN,ease:"back.out(1.4)",overwrite:"auto"},start); }
            else { tl.fromTo(el,{x:320,opacity:0},{x:0,opacity:1,duration:IN_DUR,ease:"power3.out",overwrite:"auto"},start); }
            tl.to(el,{x:320,opacity:0,duration:OUT_DUR,ease:"power2.in",overwrite:"auto"},start+inD+hold);
            tl.set(el,{opacity:0},start+inD+hold+OUT_DUR);
          });
          const tracker=document.getElementById("box-tracker");
          const totalEl=document.getElementById("box-tracker-total");
          tl.fromTo(tracker,{x:-50,opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${TRACK_START.toFixed(2)});
          const revs=Array.from(document.querySelectorAll(".sale-card.clip")).map(el=>({start:Number(el.getAttribute("data-start")),value:parseFloat(el.getAttribute("data-value"))||0})).sort((a,b)=>a.start-b.start);
          const cs={value:0}; let run=0;
          revs.forEach(({start,value})=>{ const nt=run+value; tl.to(cs,{value:nt,duration:0.6,ease:"power1.out",onUpdate:()=>{totalEl.textContent="$"+cs.value.toFixed(2);}},start); run=nt; });
          tl.to(tracker,{opacity:0,duration:0.4,ease:"power2.in"},${TRACK_FADE.toFixed(2)});
          tl.set(tracker,{opacity:0},${RECAP_START.toFixed(2)});

          const recap=document.getElementById("recap-card");
          const rTot=document.getElementById("recap-total");
          const rPro=document.getElementById("recap-profit");
          const rLab=document.getElementById("recap-profit-label");
          const rRoi=document.getElementById("recap-roi");
          const COST=${COST}; const RS=${RECAP_START.toFixed(2)};
          const finalTotal=run; const profit=finalTotal-COST; const isLoss=profit<0; const roi=profit/COST*100;
          if(isLoss){ rPro.style.color="#f87171"; rPro.style.textShadow="0 4px 24px rgba(248,113,113,0.45)"; rLab.style.color="#f87171"; rLab.textContent="Loss"; rRoi.style.color="#f87171"; }
          else { rPro.style.color="#4ade80"; rPro.style.textShadow="0 4px 24px rgba(74,222,128,0.5)"; rRoi.style.color="#4ade80"; }
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
          window.__timelines["final-2024BowmanUChrome"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;
const OUT_HTML = PREVIEW ? "cards/compositions/final-2024BowmanUChrome-preview.html" : "cards/compositions/final-2024BowmanUChrome.html";
fs.writeFileSync(OUT_HTML, html);
const tot = cards.reduce((s, c) => s + c.value, 0);
console.log(`wrote ${OUT_HTML} : ${cards.length} comp chips, cost ${fmt(COST)}, total ${fmt(tot)}, profit ${fmt(tot - COST)} (${((tot - COST) / COST * 100).toFixed(1)}% ROI), money=${cards.find(c => c.money)?.player}`);
console.log("chip times:", cards.map(c => `${c.name.split(' ')[0]} @${c.start}s/${c.dur}s`).join("  "));
