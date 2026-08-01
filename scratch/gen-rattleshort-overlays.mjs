import fs from "fs";
// Topps Signature Class 2025 (Rattleshort) overlay generator — adapts scratch/gen-bowmanhobby-overlays.mjs.
// Sits on the host's re-timed cut Rattleshort2.mp4 (native portrait 2160x3840 60fps, 93.06s, SILENT
// track -> source stays muted). 11 comped cards (scratch/rattleshort2-card-positions.json). Comp chip (eBay
// screenshot + value) top-right per card, running box-cost tracker top-left, profit/ROI recap on black.
//
// SAFE-ZONES (TikTok / Reels / YouTube Shorts) — verified by scratch/rattleshort-safezone-diag.py
// (2026-07-09): tracker top-left at top:332 (~17% down, clears top bars); comp chips inset right:120
// and top:175 — the older top:150 standard GRAZED the IG Reels top-right camera icon region by ~15px
// in the diagnostic, so chips sit 25px lower here. Chip bottom (~570) clears all right action rails.
//
// SCALE (argv[2], default 1): 1 -> author at 1080x1920. 2 -> native 2160x3840 true 4K (source used
// 1:1, no upscaling). Pass as argv: `node scratch/gen-rattleshort-overlays.mjs 2` (never env).
const S = +(process.argv[2] || 1);
const z = n => n * S;                      // scale a px value
const comps = JSON.parse(fs.readFileSync("cards/comps/rattleshort/comps.json", "utf8"));
const pos = JSON.parse(fs.readFileSync("scratch/rattleshort2-card-positions.json", "utf8"));
const COST = comps.boxCost;            // 29.99
const VIDEO = 93.06;                   // Rattleshort2.mp4 duration
const PREVIEW = process.env.PREVIEW === "1";
const BARE = process.env.BARE === "1";  // tracker-only render (omit comp chips) — position/UX check
const RECAP_START = VIDEO;             // recap begins on black right after the last card (Hampton)
const DURATION = process.env.DUR ? +process.env.DUR : (PREVIEW ? 26.0 : VIDEO + 6.7);
const TRACK_FADE = RECAP_START - 0.4;
const TRACK_START = 12.8;              // box-cost tracker enters as the first card shows (~13.0s)
const fmt = v => "$" + v.toFixed(2);
const W = z(1080), H = z(1920);

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

const saleDivs = BARE ? "" : cards.map((c, i) => `      <div id="chip-${c.cardId}" class="sale-card clip" data-start="${c.start}" data-duration="${c.dur}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="sale-card__comp"><img src="../comps/rattleshort/${c.file}" alt="${c.player} ${c.parallel} ${fmt(c.value)}" crossorigin="anonymous" /></div>
${c.label ? `        <div class="sale-card__label">${c.label}</div>\n` : ''}        <div class="sale-card__value">${fmt(c.value)}</div>
      </div>`).join("\n");

const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <title>Final Edit (Shorts) - Topps Signature Class Rattleshort${S > 1 ? " (4K)" : ""}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:${W}px; height:${H}px; background:#000; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:${W}px; height:${H}px; }
      #source-video { position:absolute; inset:0; width:${W}px; height:${H}px; object-fit:cover; object-position:center center; }

      .sale-card { position:absolute; right:${z(120)}px; top:${z(175)}px; width:${z(230)}px; padding:${z(9)}px ${z(9)}px ${z(4)}px; border-radius:${z(20)}px;
        background:rgba(255,255,255,0.10); backdrop-filter:blur(${z(24)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(24)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.20); box-shadow:0 ${z(12)}px ${z(28)}px rgba(0,0,0,0.32),inset 0 ${z(1)}px 0 rgba(255,255,255,0.24);
        display:flex; flex-direction:column; align-items:stretch; opacity:0; }
      .sale-card__comp { width:100%; border-radius:${z(13)}px; overflow:hidden; background:#fff; box-shadow:0 ${z(5)}px ${z(15)}px rgba(0,0,0,0.22); display:block; }
      .sale-card__comp img { width:100%; height:auto; display:block; }
      .sale-card__label { font-size:${z(15)}px; font-weight:700; letter-spacing:${z(3)}px; color:#ffd24a; text-transform:uppercase; text-align:center; margin-top:${z(8)}px; text-shadow:0 ${z(1)}px ${z(7)}px rgba(0,0,0,0.6); }
      .sale-card__value { font-size:${z(50)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-2)}px; text-align:center; margin-top:${z(8)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.5); }
      .sale-card__label + .sale-card__value { margin-top:${z(2)}px; }
      .sale-card[data-money-shot="true"] .sale-card__value { color:#ffd24a; text-shadow:0 ${z(2)}px ${z(16)}px rgba(255,210,74,0.6); }

      .box-tracker { position:absolute; left:${z(36)}px; top:${z(332)}px; width:${z(212)}px; padding:${z(14)}px ${z(16)}px; border-radius:${z(22)}px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(10)}px ${z(24)}px rgba(0,0,0,0.28),inset 0 ${z(1)}px 0 rgba(255,255,255,0.22); opacity:0; }
      .box-tracker__label { font-size:${z(12)}px; font-weight:600; letter-spacing:${z(4)}px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:${z(4)}px; line-height:1.25; }
      .box-tracker__value { font-size:${z(32)}px; font-weight:800; letter-spacing:${z(-1)}px; line-height:1; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); font-variant-numeric:tabular-nums; }
      .box-tracker__value--cost { color:#f87171; }
      .box-tracker__value--total { color:#4ade80; }
      .box-tracker__divider { height:${z(1)}px; background:rgba(255,255,255,0.15); margin:${z(10)}px 0; }

      .recap-card { position:absolute; left:50%; top:50%; width:${z(420)}px; padding:${z(30)}px ${z(34)}px ${z(34)}px; border-radius:${z(28)}px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(14)}px ${z(36)}px rgba(0,0,0,0.35),inset 0 ${z(1)}px 0 rgba(255,255,255,0.22);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap-card__label { font-size:${z(17)}px; font-weight:600; letter-spacing:${z(6)}px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:${z(4)}px; }
      .recap-card__value { font-size:${z(58)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-2)}px; margin-bottom:${z(20)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.45); font-variant-numeric:tabular-nums; }
      .recap-card__divider { width:70%; height:${z(1)}px; background:rgba(255,255,255,0.18); margin:0 0 ${z(20)}px; }
      .recap-card__profit-label { font-size:${z(18)}px; font-weight:700; letter-spacing:${z(8)}px; color:#fff; text-transform:uppercase; margin-bottom:${z(6)}px; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); }
      .recap-card__profit { font-size:${z(96)}px; font-weight:900; line-height:1; letter-spacing:${z(-3)}px; font-variant-numeric:tabular-nums; }
      .recap-card__roi { font-size:${z(30)}px; font-weight:700; letter-spacing:${z(1)}px; margin-top:${z(14)}px; font-variant-numeric:tabular-nums; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="final-rattleshort2" data-width="${W}" data-height="${H}" data-start="0" data-duration="${DURATION}">
      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" muted playsinline src="../sources/rattleshort/Rattleshort2.mp4"></video>

${saleDivs}

      <div id="box-tracker" class="box-tracker clip" data-start="${TRACK_START.toFixed(2)}" data-duration="${(Math.min(TRACK_FADE, DURATION) - TRACK_START).toFixed(2)}" data-track-index="90">
        <div class="box-tracker__label">Box cost</div><div class="box-tracker__value box-tracker__value--cost">${fmt(COST)}</div>
        <div class="box-tracker__divider"></div>
        <div class="box-tracker__label">Cards pulled<br>total</div><div class="box-tracker__value box-tracker__value--total" id="box-tracker-total">$0.00</div>
      </div>

      <div id="recap-card" class="recap-card clip" data-start="${RECAP_START.toFixed(2)}" data-duration="${Math.max(0.1, DURATION - RECAP_START).toFixed(2)}" data-track-index="91">
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
          const SCL=${S};
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
            else { tl.fromTo(el,{x:${z(320)},opacity:0},{x:0,opacity:1,duration:IN_DUR,ease:"power3.out",overwrite:"auto"},start); }
            tl.to(el,{x:${z(320)},opacity:0,duration:OUT_DUR,ease:"power2.in",overwrite:"auto"},start+inD+hold);
            tl.set(el,{opacity:0},start+inD+hold+OUT_DUR);
          });
          const tracker=document.getElementById("box-tracker");
          const totalEl=document.getElementById("box-tracker-total");
          tl.fromTo(tracker,{x:${z(-50)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${TRACK_START.toFixed(2)});
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
          if(isLoss){ rPro.style.color="#f87171"; rPro.style.textShadow="0 "+(4*SCL)+"px "+(24*SCL)+"px rgba(248,113,113,0.45)"; rLab.style.color="#f87171"; rLab.textContent="Loss"; rRoi.style.color="#f87171"; }
          else { rPro.style.color="#4ade80"; rPro.style.textShadow="0 "+(4*SCL)+"px "+(24*SCL)+"px rgba(74,222,128,0.5)"; rRoi.style.color="#4ade80"; }
          gsap.set(recap,{xPercent:-50,yPercent:-50,transformOrigin:"center center"});
          gsap.set([rLab,rPro,rRoi],{opacity:0,y:${z(16)}});
          tl.fromTo(recap,{opacity:0,scale:0.88},{opacity:1,scale:1,duration:0.7,ease:"back.out(1.4)"},RS);
          const rts={value:0};
          tl.to(rts,{value:finalTotal,duration:1.4,ease:"power2.out",onUpdate:()=>{rTot.textContent="$"+rts.value.toFixed(2);}},RS+0.4);
          tl.to([rLab,rPro,rRoi],{opacity:1,y:0,duration:0.5,ease:"power3.out",stagger:0.08},RS+1.85);
          const rps={value:0};
          tl.to(rps,{value:profit,duration:1.2,ease:"power2.out",onUpdate:()=>{const v=rps.value;rPro.textContent=(v>=0?"+":"-")+"$"+Math.abs(v).toFixed(2);}},RS+2.1);
          rRoi.textContent=(roi>=0?"+":"")+roi.toFixed(1)+"% ROI";

          window.__timelines=window.__timelines||{};
          window.__timelines["final-rattleshort2"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;
const OUT_HTML = PREVIEW ? "cards/compositions/final-rattleshort2-preview.html"
  : BARE ? `cards/compositions/final-rattleshort2${S > 1 ? "-4k" : ""}-bare.html`
  : (S > 1 ? "cards/compositions/final-rattleshort2-4k.html" : "cards/compositions/final-rattleshort2.html");
fs.writeFileSync(OUT_HTML, html);
const tot = cards.reduce((s, c) => s + c.value, 0);
console.log(`wrote ${OUT_HTML} @ ${W}x${H} (S=${S}) : ${cards.length} comp chips, cost ${fmt(COST)}, total ${fmt(tot)}, profit ${fmt(tot - COST)} (${((tot - COST) / COST * 100).toFixed(1)}% ROI), money=${cards.find(c => c.money)?.player}`);
console.log("chip times:", cards.map(c => `${c.name.split(' ')[0]} @${c.start}s/${c.dur}s`).join("  "));
