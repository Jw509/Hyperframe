import fs from "fs";
// 2024-25 Topps Chrome Basketball (chromebball) overlay generator.
// Sits on the host's pre-cut ChromeBBall2425.mp4 (native portrait 2160x3840 60fps, 104.28s,
// SILENT -91 dB). 17 comped cards of 32 catalogued (scratch/chromebball-card-positions.json).
//
// DECOUPLED PIPELINE (memory: feedback_decoupled_overlay_render, validated SDBLF 2026-07-11):
// each overlay ELEMENT renders on its own small alpha canvas; one ffmpeg NVENC pass composites
// them onto the source. The 1.9 GB HEVC source never enters headless Chrome.
//   node scratch/gen-chromebball-overlays.mjs        -> element htmls + composite manifest
//   node scratch/gen-chromebball-overlays.mjs full   -> single full-frame html (fallback / preview)
//
// LAYOUT v2 (user call 2026-07-24): v1 chips (top:350) and tracker (top:664) both hung into the
// TOP EDGE OF THE CARD. Raised both and shrank the chip 15% so they clear the card entirely:
// chip top 350->160, width 460->392; tracker top 664->380. Horizontal insets unchanged (chip
// right:240 still clears the right action rail). This trades away some of the ui_safezone top
// margin — the tracker no longer sits at ~17% down, and the chip is above the old Reels
// camera-icon line — because not covering the card won.
const MODE = process.argv[2] === "full" ? "full" : "elements";
const S = 2;                                // native 4K: every px value below is 1080-base * 2
const z = n => n * S;
const comps = JSON.parse(fs.readFileSync("cards/comps/chromebball/comps.json", "utf8"));
const pos = JSON.parse(fs.readFileSync("scratch/chromebball-card-positions.json", "utf8"));
const COST = comps.boxCost;                 // 29.99
const VIDEO = 104.28;                       // ChromeBBall2425.mp4 duration
const RECAP_START = VIDEO;                  // recap begins on black after the last card (Vince Carter)
const DURATION = VIDEO + 6.7;
const TRACK_START = 12.9;                   // tracker enters just before the first chip (13.07)
const TRACK_FADE = RECAP_START - 0.4;
const fmt = v => "$" + v.toFixed(2);
const W = z(1080), H = z(1920);

// ---- chip timing -----------------------------------------------------------
const cards = comps.comps.map(c => {
  const p = pos[c.cardId];
  if (!p) { console.warn("NO POSITION for", c.cardId, c.player); return null; }
  return { ...c, _s: p.s, _e: p.e };
}).filter(Boolean).sort((a, b) => a._s - b._s);

const chipStartOf = c => c._s + 0.12;
for (let i = 0; i < cards.length; i++) {
  const c = cards[i], next = cards[i + 1];
  c.start = +chipStartOf(c).toFixed(2);
  // MIN 1.5s: Naz Reid (0.80s hold) and Anton Watson (0.95s) are on screen too briefly to read a
  // chip, so the chip outlives the card slightly. Both have >2.5s of clear air before the next chip.
  let dur = Math.min(Math.max(c._e - c.start, 1.5), 3.0);
  if (next) dur = Math.min(dur, chipStartOf(next) - c.start - 0.04);
  c.dur = +Math.max(dur, 0.9).toFixed(2);
}
const TOTAL = cards.reduce((s, c) => s + c.value, 0);
const PROFIT = TOTAL - COST, ROI = PROFIT / COST * 100;

// ---- shared CSS ------------------------------------------------------------
const chipCss = `
      .sale-card { position:absolute; right:${z(120)}px; top:${z(80)}px; width:${z(196)}px; padding:${z(8)}px ${z(8)}px ${z(3)}px; border-radius:${z(17)}px;
        background:rgba(255,255,255,0.10); backdrop-filter:blur(${z(24)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(24)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.20); box-shadow:0 ${z(10)}px ${z(24)}px rgba(0,0,0,0.32),inset 0 ${z(1)}px 0 rgba(255,255,255,0.24);
        display:flex; flex-direction:column; align-items:stretch; opacity:0; }
      .sale-card__comp { width:100%; border-radius:${z(11)}px; overflow:hidden; background:#fff; box-shadow:0 ${z(4)}px ${z(13)}px rgba(0,0,0,0.22); display:block; }
      .sale-card__comp img { width:100%; height:auto; display:block; }
      .sale-card__label { font-size:${z(13)}px; font-weight:700; letter-spacing:${z(2.5)}px; color:#ffd24a; text-transform:uppercase; text-align:center; margin-top:${z(7)}px; text-shadow:0 ${z(1)}px ${z(7)}px rgba(0,0,0,0.6); }
      .sale-card__value { font-size:${z(43)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-1.7)}px; text-align:center; margin-top:${z(7)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.5); }
      .sale-card__label + .sale-card__value { margin-top:${z(2)}px; }
      .sale-card[data-money-shot="true"] .sale-card__value { color:#ffd24a; text-shadow:0 ${z(2)}px ${z(16)}px rgba(255,210,74,0.6); }`;

const trackerCss = `
      .box-tracker { position:absolute; left:${z(36)}px; top:${z(190)}px; width:${z(212)}px; padding:${z(14)}px ${z(16)}px; border-radius:${z(22)}px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(10)}px ${z(24)}px rgba(0,0,0,0.28),inset 0 ${z(1)}px 0 rgba(255,255,255,0.22); opacity:0; }
      .box-tracker__label { font-size:${z(12)}px; font-weight:600; letter-spacing:${z(4)}px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:${z(4)}px; line-height:1.25; }
      .box-tracker__value { font-size:${z(32)}px; font-weight:800; letter-spacing:${z(-1)}px; line-height:1; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); font-variant-numeric:tabular-nums; }
      .box-tracker__value--cost { color:#f87171; }
      .box-tracker__value--total { color:#4ade80; }
      .box-tracker__divider { height:${z(1)}px; background:rgba(255,255,255,0.15); margin:${z(10)}px 0; }`;

const recapCss = `
      .recap-card { position:absolute; left:50%; top:50%; width:${z(420)}px; padding:${z(30)}px ${z(34)}px ${z(34)}px; border-radius:${z(28)}px;
        background:rgba(255,255,255,0.08); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(14)}px ${z(36)}px rgba(0,0,0,0.35),inset 0 ${z(1)}px 0 rgba(255,255,255,0.22);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap-card__label { font-size:${z(17)}px; font-weight:600; letter-spacing:${z(6)}px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-bottom:${z(4)}px; }
      .recap-card__value { font-size:${z(58)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-2)}px; margin-bottom:${z(20)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.45); font-variant-numeric:tabular-nums; }
      .recap-card__divider { width:70%; height:${z(1)}px; background:rgba(255,255,255,0.18); margin:0 0 ${z(20)}px; }
      .recap-card__profit-label { font-size:${z(18)}px; font-weight:700; letter-spacing:${z(8)}px; color:#fff; text-transform:uppercase; margin-bottom:${z(6)}px; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); }
      .recap-card__profit { font-size:${z(96)}px; font-weight:900; line-height:1; letter-spacing:${z(-3)}px; font-variant-numeric:tabular-nums; }
      .recap-card__roi { font-size:${z(30)}px; font-weight:700; letter-spacing:${z(1)}px; margin-top:${z(14)}px; font-variant-numeric:tabular-nums; }`;

const chipMarkup = c => `<div id="chip" class="sale-card clip" data-start="0" data-duration="${c.dur}" data-track-index="1"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="sale-card__comp"><img src="../comps/chromebball/${c.file}" alt="${c.player} ${c.parallel} ${fmt(c.value)}" crossorigin="anonymous" /></div>
${c.label ? `        <div class="sale-card__label">${c.label}</div>\n` : ""}        <div class="sale-card__value">${fmt(c.value)}</div>
      </div>`;

const trackerMarkup = (start, dur) => `<div id="box-tracker" class="box-tracker clip" data-start="${start}" data-duration="${dur}" data-track-index="90">
        <div class="box-tracker__label">Box cost</div><div class="box-tracker__value box-tracker__value--cost">${fmt(COST)}</div>
        <div class="box-tracker__divider"></div>
        <div class="box-tracker__label">Cards pulled<br>total</div><div class="box-tracker__value box-tracker__value--total" id="box-tracker-total">$0.00</div>
      </div>`;

const recapMarkup = (start, dur) => `<div id="recap-card" class="recap-card clip" data-start="${start}" data-duration="${dur}" data-track-index="91">
        <div class="recap-card__label">Box cost</div>
        <div class="recap-card__value">${fmt(COST)}</div>
        <div class="recap-card__divider"></div>
        <div class="recap-card__label">Cards value</div>
        <div class="recap-card__value" id="recap-total">$0.00</div>
        <div class="recap-card__divider"></div>
        <div class="recap-card__profit-label" id="recap-profit-label">Profit</div>
        <div class="recap-card__profit" id="recap-profit">+$0.00</div>
        <div class="recap-card__roi" id="recap-roi"></div>
      </div>`;

// chip in/out animation, shared by element + full-frame builds
const chipJs = `
          const IN_DUR=0.3, OUT_DUR=0.4, POP_IN=0.7;
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
          });`;

const recapJs = (rs) => `
          const recap=document.getElementById("recap-card");
          const rTot=document.getElementById("recap-total");
          const rPro=document.getElementById("recap-profit");
          const rLab=document.getElementById("recap-profit-label");
          const rRoi=document.getElementById("recap-roi");
          const RS=${rs};
          const finalTotal=${TOTAL.toFixed(2)}; const profit=${PROFIT.toFixed(2)}; const isLoss=profit<0; const roi=${ROI.toFixed(4)};
          if(isLoss){ rPro.style.color="#f87171"; rPro.style.textShadow="0 ${z(4)}px ${z(24)}px rgba(248,113,113,0.45)"; rLab.style.color="#f87171"; rLab.textContent="Loss"; rRoi.style.color="#f87171"; }
          else { rPro.style.color="#4ade80"; rPro.style.textShadow="0 ${z(4)}px ${z(24)}px rgba(74,222,128,0.5)"; rRoi.style.color="#4ade80"; }
          gsap.set(recap,{xPercent:-50,yPercent:-50,transformOrigin:"center center"});
          gsap.set([rLab,rPro,rRoi],{opacity:0,y:${z(16)}});
          tl.fromTo(recap,{opacity:0,scale:0.88},{opacity:1,scale:1,duration:0.7,ease:"back.out(1.4)"},RS);
          const rts={value:0};
          tl.to(rts,{value:finalTotal,duration:1.4,ease:"power2.out",onUpdate:()=>{rTot.textContent="$"+rts.value.toFixed(2);}},RS+0.4);
          tl.to([rLab,rPro,rRoi],{opacity:1,y:0,duration:0.5,ease:"power3.out",stagger:0.08},RS+1.85);
          const rps={value:0};
          tl.to(rps,{value:profit,duration:1.2,ease:"power2.out",onUpdate:()=>{const v=rps.value;rPro.textContent=(v>=0?"+":"-")+"$"+Math.abs(v).toFixed(2);}},RS+2.1);
          rRoi.textContent=(roi>=0?"+":"")+roi.toFixed(1)+"% ROI";`;

const page = ({ id, cw, ch, dur, css, body, js }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${id}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:${cw}px; height:${ch}px; background:transparent; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:${cw}px; height:${ch}px; }
${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-width="${cw}" data-height="${ch}" data-start="0" data-duration="${dur}">
      ${body}
      <script>
        (function () {
          const tl = gsap.timeline({ paused:true });
${js}
          window.__timelines=window.__timelines||{};
          window.__timelines["${id}"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;

// ---- element canvases ------------------------------------------------------
// Each canvas is a window onto the 2160x3840 frame; `origin` is its top-left in frame coords,
// so element CSS below uses frame coordinates minus that origin.
const CHIP_CANVAS   = { w: 800,  h: 1320, x: W - 800, y: 0 };          // right edge == frame right edge
const TRACK_CANVAS  = { w: 640,  h: 1150, x: 0,       y: 0 };
const RECAP_CANVAS  = { w: 1200, h: 1400, x: (W - 1200) / 2, y: (H - 1400) / 2 };

if (MODE === "elements") {
  const manifest = { video: "cards/sources/chromebball/ChromeBBall2425.mp4", videoDur: VIDEO, duration: DURATION, elements: [] };

  cards.forEach((c, i) => {
    const n = String(i + 1).padStart(2, "0");
    const id = `cbb-el-chip-${n}`;
    // canvas right edge == frame right edge, so `right:240px` lands identically
    fs.writeFileSync(`cards/compositions/${id}.html`, page({
      id, cw: CHIP_CANVAS.w, ch: CHIP_CANVAS.h, dur: (c.dur + 0.1).toFixed(2),
      css: chipCss, body: chipMarkup(c), js: chipJs,
    }));
    manifest.elements.push({ id, file: `${id}.mov`, x: CHIP_CANVAS.x, y: CHIP_CANVAS.y,
      start: c.start, dur: +(c.dur + 0.1).toFixed(2), label: `${c.player} ${fmt(c.value)}` });
  });

  const trackDur = +(Math.min(TRACK_FADE, DURATION) - TRACK_START + 0.5).toFixed(2);
  const trackJs = `
          const tracker=document.getElementById("box-tracker");
          const totalEl=document.getElementById("box-tracker-total");
          tl.fromTo(tracker,{x:${z(-50)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},0);
          const revs=${JSON.stringify(cards.map(c => ({ t: +(c.start - TRACK_START).toFixed(2), v: c.value })))};
          const cs={value:0}; let run=0;
          revs.forEach(({t,v})=>{ const nt=run+v; tl.to(cs,{value:nt,duration:0.6,ease:"power1.out",onUpdate:()=>{totalEl.textContent="$"+cs.value.toFixed(2);}},t); run=nt; });
          tl.to(tracker,{opacity:0,duration:0.4,ease:"power2.in"},${(TRACK_FADE - TRACK_START).toFixed(2)});`;
  fs.writeFileSync("cards/compositions/cbb-el-counter.html", page({
    id: "cbb-el-counter", cw: TRACK_CANVAS.w, ch: TRACK_CANVAS.h, dur: trackDur,
    css: trackerCss, body: trackerMarkup(0, trackDur), js: trackJs,
  }));
  manifest.elements.push({ id: "cbb-el-counter", file: "cbb-el-counter.mov", x: TRACK_CANVAS.x, y: TRACK_CANVAS.y,
    start: TRACK_START, dur: trackDur, label: "box-cost tracker" });

  const recapDur = +(DURATION - RECAP_START).toFixed(2);
  fs.writeFileSync("cards/compositions/cbb-el-recap.html", page({
    id: "cbb-el-recap", cw: RECAP_CANVAS.w, ch: RECAP_CANVAS.h, dur: recapDur,
    css: recapCss, body: recapMarkup(0, recapDur), js: recapJs("0"),
  }));
  manifest.elements.push({ id: "cbb-el-recap", file: "cbb-el-recap.mov", x: RECAP_CANVAS.x, y: RECAP_CANVAS.y,
    start: RECAP_START, dur: recapDur, label: "profit/ROI recap" });

  fs.writeFileSync("scratch/chromebball-composite-manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`wrote ${manifest.elements.length} element htmls + scratch/chromebball-composite-manifest.json`);
} else {
  // full-frame fallback: one 2160x3840 composition over the source (needs HEVC decode in Chrome)
  const saleDivs = cards.map((c, i) => `      <div id="chip-${c.cardId}" class="sale-card clip" data-start="${c.start}" data-duration="${c.dur}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="sale-card__comp"><img src="../comps/chromebball/${c.file}" alt="${c.player} ${c.parallel} ${fmt(c.value)}" crossorigin="anonymous" /></div>
        <div class="sale-card__value">${fmt(c.value)}</div>
      </div>`).join("\n");
  const trackJs = `
          const tracker=document.getElementById("box-tracker");
          const totalEl=document.getElementById("box-tracker-total");
          tl.fromTo(tracker,{x:${z(-50)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${TRACK_START});
          const revs=${JSON.stringify(cards.map(c => ({ t: c.start, v: c.value })))};
          const cs={value:0}; let run=0;
          revs.forEach(({t,v})=>{ const nt=run+v; tl.to(cs,{value:nt,duration:0.6,ease:"power1.out",onUpdate:()=>{totalEl.textContent="$"+cs.value.toFixed(2);}},t); run=nt; });
          tl.to(tracker,{opacity:0,duration:0.4,ease:"power2.in"},${TRACK_FADE.toFixed(2)});
          tl.set(tracker,{opacity:0},${RECAP_START.toFixed(2)});`;
  const html = page({
    id: "final-chromebball-4k", cw: W, ch: H, dur: DURATION.toFixed(2),
    css: `      #source-video { position:absolute; inset:0; width:${W}px; height:${H}px; object-fit:cover; object-position:center center; }\n${chipCss}\n${trackerCss}\n${recapCss}`,
    body: `<video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" muted playsinline src="../sources/chromebball/ChromeBBall2425.mp4"></video>\n\n${saleDivs}\n\n      ${trackerMarkup(TRACK_START.toFixed(2), (Math.min(TRACK_FADE, DURATION) - TRACK_START).toFixed(2))}\n\n      ${recapMarkup(RECAP_START.toFixed(2), (DURATION - RECAP_START).toFixed(2))}`,
    js: chipJs + trackJs + recapJs(RECAP_START.toFixed(2)),
  }).replace('<html lang="en">', '<html lang="en" data-resolution="portrait">');
  fs.writeFileSync("cards/compositions/final-chromebball-4k.html", html);
  console.log("wrote cards/compositions/final-chromebball-4k.html @ " + W + "x" + H);
}

console.log(`${cards.length} chips | cost ${fmt(COST)} | total ${fmt(TOTAL)} | profit ${fmt(PROFIT)} (${ROI.toFixed(1)}% ROI) | money=${cards.find(c => c.money)?.player}`);
console.log("chip times:", cards.map(c => `${c.player.split(" ").pop()}@${c.start}/${c.dur}s`).join("  "));
