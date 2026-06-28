import fs from "fs";
// 2025 Topps Signature Class "Double Double" (2 mega + 2 blaster) — LONGFORM landscape overlay generator.
// Produces a TRANSPARENT 16:9 overlay (ProRes 4444 alpha, like the comet-border longform) that the user
// drops onto his already-cut 14-min 4K footage in DaVinci Resolve. Overlays are positioned in ABSOLUTE
// video time so dropping the overlay at t=0 lines it up with the source (overlay-only, no trim — user choice).
//
// Two things on screen:
//   1. Comp panel — the eBay sold screenshot for a card, FADES IN ABOVE the held card and FADES OUT, timed
//      to when that card is shown. Optional money-shot gets a bigger pop.
//   2. Cost counter — top-left, "BOX COST" running total that TICKS UP as each of the 4 boxes is opened
//      (+29.99 blaster, +65.99 mega, in the real open order) and lands on $191.96.
//
// SCALE (env, default 1): 1 -> author at 1920x1080. 2 -> author NATIVELY at 3840x2160 (true 4K, matches the
// source 1:1). Every px dimension AND every GSAP px offset is multiplied by S.
// PREVIEW=1 -> embed the source video behind + opaque bg, for alignment spot-checks (NOT the alpha deliverable).
const S = +(process.env.SCALE || 1);
const z = n => +(n * S).toFixed(2);
const PREVIEW = process.env.PREVIEW === "1";
const SRC = process.env.SRC || "../sources/DoubleDoubleSignature/SignatureDoubleDouble.mp4";
const data = JSON.parse(fs.readFileSync("cards/comps/25Signature2Mega2Blaster/comps.json", "utf8"));
const VIDEO = data.videoDuration || 839.47;
const RECAP = data.recap && data.recap.enabled ? (data.recap.durationSeconds || 7.5) : 0;  // end payoff card on black
const FULL = VIDEO + RECAP;
const INTRO = data.intro && data.intro.enabled ? data.intro : null;  // top-middle intro banner + emoji at the start
const DURATION = process.env.DUR ? +process.env.DUR : FULL;
const fmt = v => "$" + v.toFixed(2);
const W = z(1920), H = z(1080);
const BOX_COST = data.boxCostTotal;

// ---- comps: expand into on-screen INSTANCES (a card can appear more than once via extraShows) ----
const IN = 0.45, OUT = 0.5, MINHOLD = 1.6, MAXSHOW = 4.2, POP_IN = 0.7, MINGAP = 2.7;
const rawComps = data.comps.filter(c => c.placed !== false && c.tStart != null);
let comps = [];
for (const c of rawComps) {
  const times = [c.tStart, ...((c.extraShows) || [])];
  times.forEach((t, i) => {
    comps.push({ ...c, tStart: t, tEnd: (i === 0 && c.tEnd != null) ? c.tEnd : t + 2, instId: i === 0 ? c.compId : `${c.compId}x${i + 1}` });
  });
}
comps.sort((a, b) => a.tStart - b.tStart);
// Pass 1: start = on-screen time, but enforce a min gap so back-to-back cards SEQUENCE instead of flashing.
for (let i = 0; i < comps.length; i++) {
  const c = comps[i];
  c.start = +(+c.tStart).toFixed(2);
  if (i > 0 && c.start < comps[i - 1].start + MINGAP) c.start = +(comps[i - 1].start + MINGAP).toFixed(2);
}
// Pass 2: how long each stays up — clear before the next one comes in.
for (let i = 0; i < comps.length; i++) {
  const c = comps[i], next = comps[i + 1];
  let span = Math.max((c.tEnd ?? c.tStart) - c.tStart, 0);
  let show = Math.min(Math.max(span, MINHOLD + IN + OUT), MAXSHOW);   // total on-screen time
  if (next) show = Math.min(show, (next.start - 0.2) - c.start);      // clear before the next comp
  c.show = +Math.max(show, IN + OUT + 0.4).toFixed(2);
}
// counter / recap totals = value of every on-screen pull (duplicates count again)
const CARDS_VALUE = +comps.reduce((s, c) => s + (+c.value || 0), 0).toFixed(2);
const NET = +(CARDS_VALUE - BOX_COST).toFixed(2);
const ROI = +(NET / BOX_COST * 100).toFixed(1);

// ---- box opens: cumulative cost steps ----
const boxes = (data.boxOpens || []).slice().sort((a, b) => a.t - b.t);
let cum = 0;
boxes.forEach((b, i) => { cum += b.cost; b.cum = +cum.toFixed(2); b.idx = i + 1; });
const TRACK_START = boxes.length ? +(+boxes[0].t).toFixed(2) : 1.0;
const COST_TOTAL = +cum.toFixed(2);

// ---- PER-BOX event timeline: each box resets Cards Pulled & P/L (no carryover); pip = green if that box profits ----
const _ce = comps.map(c => ({ t: c.start, kind: "comp", v: +c.value || 0 }));
const _be = boxes.map((b, i) => ({ t: b.t, kind: "box", bi: i, cost: b.cost, type: b.type }));
let _cb = 0, _bp = 0, _bc = 0;
const EVENTS = [..._be, ..._ce].sort((a, b) => a.t - b.t).map(e => {
  if (e.kind === "box") { _cb = e.bi; _bc = e.cost; _bp = 0; }
  else { _bp = +(_bp + e.v).toFixed(2); }
  return { t: +e.t.toFixed(2), kind: e.kind, idx: _cb + 1, type: boxes[_cb] ? boxes[_cb].type : "", cost: _bc, pulled: _bp, pl: +(_bp - _bc).toFixed(2) };
});

// recap header lines built from the box config
const _bl = boxes.filter(b => b.type === "blaster"), _mg = boxes.filter(b => b.type === "mega");
const RECAP_HEAD = `${_bl.length} Blaster Box${_bl.length !== 1 ? "es" : ""} &mdash; ${fmt(_bl[0].cost)} each<br>${_mg.length} Mega Box${_mg.length !== 1 ? "es" : ""} &mdash; ${fmt(_mg[0].cost)} each`;

const compDivs = comps.map((c, i) => `      <div id="chip-${c.instId}" class="comp clip" data-start="${c.start}" data-duration="${c.show}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="comp__img"><img src="../comps/25Signature2Mega2Blaster/${c.file}" alt="${c.player} ${c.parallel || ""} ${fmt(c.value)}" crossorigin="anonymous" /></div>
        <div class="comp__tag"><span class="comp__name">${c.player}</span><span class="comp__val">${fmt(c.value)}</span></div>
      </div>`).join("\n");

const BG = PREVIEW ? "#000" : "transparent";
const videoLayer = PREVIEW
  ? `      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" data-has-audio="true" playsinline src="${SRC}"></video>\n`
  : "";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>DoubleDouble — 2025 Signature Class (2 Mega + 2 Blaster) overlay${S > 1 ? " 4K" : ""}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:${W}px; height:${H}px; background:${BG}; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:${W}px; height:${H}px; background:${BG}; }
      #source-video { position:absolute; inset:0; width:${W}px; height:${H}px; object-fit:cover; object-position:center center; }

      /* Comp panel: floats ABOVE the held card, horizontally centered, fades in/out.
         Kept SMALL and high so it never covers the card the host is holding. */
      .comp { position:absolute; left:50%; top:${z(18)}px; width:${z(196)}px; transform:translateX(-50%);
        display:flex; flex-direction:column; align-items:center; opacity:0; will-change:opacity,transform; }
      .comp__img { width:100%; border-radius:${z(11)}px; overflow:hidden; background:#fff;
        box-shadow:0 ${z(8)}px ${z(24)}px rgba(0,0,0,0.45), 0 ${z(2)}px ${z(6)}px rgba(0,0,0,0.35); }
      .comp__img img { width:100%; height:auto; display:block; }
      .comp__tag { margin-top:${z(8)}px; display:flex; align-items:center; gap:${z(9)}px;
        padding:${z(5)}px ${z(12)}px; border-radius:${z(999)}px; background:rgba(12,14,20,0.85);
        backdrop-filter:blur(${z(14)}px); -webkit-backdrop-filter:blur(${z(14)}px);
        border:${z(1)}px solid rgba(255,255,255,0.16); box-shadow:0 ${z(6)}px ${z(18)}px rgba(0,0,0,0.4); }
      .comp__name { font-size:${z(15)}px; font-weight:700; color:#fff; letter-spacing:${z(0.2)}px; white-space:nowrap; text-shadow:0 ${z(1)}px ${z(4)}px rgba(0,0,0,0.6); }
      .comp__val { font-size:${z(22)}px; font-weight:900; color:#4ade80; letter-spacing:${z(-0.5)}px; line-height:1; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(6)}px rgba(0,0,0,0.5); }
      .comp[data-money-shot="true"] .comp__val { color:#ffd24a; }
      .comp[data-money-shot="true"] .comp__img { box-shadow:0 ${z(12)}px ${z(40)}px rgba(255,210,74,0.45), 0 0 0 ${z(2)}px rgba(255,210,74,0.7); }

      /* Cost counter: top-left. Two columns (Boxes Cost | Cards Pulled) + per-box pips + live profit/loss. */
      .cost { position:absolute; left:${z(46)}px; top:${z(44)}px; padding:${z(16)}px ${z(22)}px ${z(15)}px; border-radius:${z(22)}px;
        background:rgba(12,14,20,0.74); backdrop-filter:blur(${z(26)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(26)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.16); box-shadow:0 ${z(12)}px ${z(30)}px rgba(0,0,0,0.4), inset 0 ${z(1)}px 0 rgba(255,255,255,0.18); opacity:0; }
      .cost__cols { display:flex; align-items:flex-start; gap:${z(18)}px; }
      .cost__col { display:flex; flex-direction:column; }
      .cost__sep { width:${z(1)}px; align-self:stretch; background:rgba(255,255,255,0.15); }
      .cost__label { font-size:${z(13)}px; font-weight:700; letter-spacing:${z(3)}px; color:rgba(255,255,255,0.72); text-transform:uppercase; margin-bottom:${z(5)}px; white-space:nowrap; }
      .cost__value { font-size:${z(38)}px; font-weight:900; line-height:1; letter-spacing:${z(-1.5)}px; font-variant-numeric:tabular-nums; text-shadow:0 ${z(2)}px ${z(10)}px rgba(0,0,0,0.5); }
      .cost__value--cost { color:#fb6a5e; }
      .cost__value--pull { color:#9fb3c8; }
      .cost__pips { display:flex; gap:${z(7)}px; margin-top:${z(13)}px; }
      .cost__pip { flex:1; height:${z(7)}px; border-radius:${z(999)}px; background:rgba(255,255,255,0.16); position:relative; overflow:hidden; }
      .cost__pip i { position:absolute; inset:0; transform:scaleX(0); transform-origin:left; border-radius:inherit; background:#9fb3c8; }
      .cost__foot { font-size:${z(11.5)}px; font-weight:600; letter-spacing:${z(1.5)}px; color:rgba(255,255,255,0.55); text-transform:uppercase; margin-top:${z(9)}px; }
      .cost__pl { font-size:${z(26)}px; font-weight:900; letter-spacing:${z(-0.5)}px; line-height:1; margin-top:${z(8)}px; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); }

      /* End payoff card — appears on black after the footage, reveals the loss. */
      .recap { position:absolute; left:50%; top:50%; width:${z(560)}px; padding:${z(38)}px ${z(44)}px ${z(42)}px; border-radius:${z(28)}px;
        background:rgba(18,20,28,0.92); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.16); box-shadow:0 ${z(18)}px ${z(48)}px rgba(0,0,0,0.6), inset 0 ${z(1)}px 0 rgba(255,255,255,0.16);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap__head { font-size:${z(18)}px; font-weight:700; letter-spacing:${z(4)}px; color:rgba(255,255,255,0.6); text-transform:uppercase; margin-bottom:${z(22)}px; text-align:center; }
      .recap__row { width:100%; display:flex; align-items:baseline; justify-content:space-between; margin:${z(6)}px 0; }
      .recap__k { font-size:${z(22)}px; font-weight:600; letter-spacing:${z(2)}px; color:rgba(255,255,255,0.72); text-transform:uppercase; }
      .recap__v { font-size:${z(40)}px; font-weight:800; line-height:1; letter-spacing:${z(-1)}px; font-variant-numeric:tabular-nums; }
      .recap__v--cost { color:#fb6a5e; }
      .recap__v--pull { color:#9fb3c8; }
      .recap__div { width:100%; height:${z(1)}px; background:rgba(255,255,255,0.16); margin:${z(20)}px 0 ${z(18)}px; }
      .recap__lossk { font-size:${z(20)}px; font-weight:800; letter-spacing:${z(8)}px; text-transform:uppercase; margin-bottom:${z(8)}px; }
      .recap__loss { font-size:${z(104)}px; font-weight:900; line-height:0.95; letter-spacing:${z(-4)}px; font-variant-numeric:tabular-nums; }
      .recap__roi { font-size:${z(34)}px; font-weight:700; letter-spacing:${z(1)}px; margin-top:${z(14)}px; font-variant-numeric:tabular-nums; }

      /* Intro banner: top-middle at the start — "totals shown at the end" + emoji to the right. */
      .intro { position:absolute; left:50%; top:${z(70)}px; display:flex; align-items:center; gap:${z(18)}px;
        padding:${z(15)}px ${z(24)}px; border-radius:${z(20)}px; background:rgba(12,14,20,0.82);
        backdrop-filter:blur(${z(20)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(20)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(12)}px ${z(30)}px rgba(0,0,0,0.45); opacity:0; }
      .intro__text { font-size:${z(25)}px; font-weight:800; color:#fff; letter-spacing:${z(0.2)}px; line-height:1.15; max-width:${z(560)}px; text-shadow:0 ${z(1)}px ${z(6)}px rgba(0,0,0,0.6); }
      .intro__img { height:${z(104)}px; width:auto; display:block; flex-shrink:0; filter:drop-shadow(0 ${z(4)}px ${z(10)}px rgba(0,0,0,0.5)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="final-DoubleDouble" data-width="${W}" data-height="${H}" data-start="0" data-duration="${DURATION}">
${videoLayer}
${compDivs}

      <div id="cost" class="cost clip" data-start="${TRACK_START}" data-duration="${(Math.min(VIDEO, DURATION) - TRACK_START).toFixed(2)}" data-track-index="95">
        <div class="cost__cols">
          <div class="cost__col">
            <div class="cost__label">Boxes Cost</div>
            <div class="cost__value cost__value--cost" id="cost-value">$0.00</div>
          </div>
          <div class="cost__sep"></div>
          <div class="cost__col">
            <div class="cost__label">Cards Pulled</div>
            <div class="cost__value cost__value--pull" id="pull-value">$0.00</div>
          </div>
        </div>
        <div class="cost__pips">
${boxes.map(b => `          <div class="cost__pip"><i id="pip-${b.idx}"></i></div>`).join("\n")}
        </div>
        <div class="cost__foot" id="cost-foot">2 Blaster &middot; 2 Mega</div>
        <div class="cost__pl" id="cost-pl"></div>
      </div>
${INTRO ? `
      <div id="intro" class="intro clip" data-start="${INTRO.start}" data-duration="${INTRO.duration}" data-track-index="97">
        <div class="intro__text">${INTRO.text}</div>
        <img class="intro__img" src="../comps/25Signature2Mega2Blaster/${INTRO.image}" alt="" crossorigin="anonymous" />
      </div>
` : ""}
${RECAP > 0 ? `
      <div id="recap" class="recap clip" data-start="${VIDEO.toFixed(2)}" data-duration="${(DURATION - VIDEO).toFixed(2)}" data-track-index="96">
        <div class="recap__head">${RECAP_HEAD}</div>
        <div class="recap__row"><span class="recap__k">Boxes Cost</span><span class="recap__v recap__v--cost">${fmt(BOX_COST)}</span></div>
        <div class="recap__row"><span class="recap__k">Cards pulled</span><span class="recap__v recap__v--pull" id="recap-pull">$0.00</span></div>
        <div class="recap__div"></div>
        <div class="recap__lossk" id="recap-lossk">Loss</div>
        <div class="recap__loss" id="recap-loss">-$0.00</div>
        <div class="recap__roi" id="recap-roi"></div>
      </div>
` : ""}

      <script>
        (function () {
          const tl = gsap.timeline({ paused:true });

          // ---- comp panels: fade in (rise) above the card, hold, fade out ----
          document.querySelectorAll(".comp.clip").forEach((el)=>{
            const start=Number(el.getAttribute("data-start"));
            const show=Number(el.getAttribute("data-duration"));
            const money=el.getAttribute("data-money-shot")==="true";
            const inD=money?${POP_IN}:${IN};
            const hold=Math.max(0.2, show-inD-${OUT});
            gsap.set(el,{transformOrigin:"50% 100%"});
            if(money){ tl.fromTo(el,{opacity:0,scale:0.8,y:${z(18)}},{opacity:1,scale:1,y:0,duration:${POP_IN},ease:"back.out(1.5)",overwrite:"auto"},start); }
            else { tl.fromTo(el,{opacity:0,y:${z(26)},scale:0.97},{opacity:1,y:0,scale:1,duration:${IN},ease:"power3.out",overwrite:"auto"},start); }
            tl.to(el,{opacity:0,y:${z(-14)},duration:${OUT},ease:"power2.in",overwrite:"auto"},start+inD+hold);
            tl.set(el,{opacity:0},start+inD+hold+${OUT});
          });

          // ---- PER-BOX counter: cost+pulled+P/L RESET each box; pip turns GREEN if that box profits, RED if not ----
          const cost=document.getElementById("cost");
          const cv=document.getElementById("cost-value");
          const pullEl=document.getElementById("pull-value");
          const plEl=document.getElementById("cost-pl");
          const foot=document.getElementById("cost-foot");
          const EVENTS=${JSON.stringify(EVENTS)};
          const GREEN="#34d399", RED="#fb6a5e", BLUE="#5b9cff", NBOX=${boxes.length};
          tl.fromTo(cost,{x:${z(-40)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${TRACK_START});
          const cs={v:0}, ps={v:0}, ls={v:0};
          EVENTS.forEach((e)=>{
            if(e.kind==="box"){
              tl.to(cs,{v:e.cost,duration:0.4,ease:"power1.out",onUpdate:()=>{cv.textContent="$"+cs.v.toFixed(2);}},e.t);
              tl.fromTo(cv,{scale:1.18},{scale:1,duration:0.5,ease:"back.out(2)",transformOrigin:"left center"},e.t);
              tl.to(ps,{v:0,duration:0.3,ease:"power1.in",onUpdate:()=>{pullEl.textContent="$"+ps.v.toFixed(2);}},e.t);   // reset pulled
              tl.to("#pip-"+e.idx,{scaleX:1,duration:0.45,ease:"power2.out"},e.t);
              tl.call(()=>{ foot.textContent="Box "+e.idx+" / "+NBOX+"  \\u00b7  "+e.type.toUpperCase(); }, null, e.t);
            } else {
              tl.to(ps,{v:e.pulled,duration:0.5,ease:"power1.out",onUpdate:()=>{pullEl.textContent="$"+ps.v.toFixed(2);}},e.t);
              tl.fromTo(pullEl,{scale:1.14},{scale:1,duration:0.45,ease:"back.out(2)",transformOrigin:"left center"},e.t);
            }
            // this box's P/L (blue up / red down) and pip outcome color (green once profitable / red while down)
            tl.to(ls,{v:e.pl,duration:0.45,ease:"power1.out",onUpdate:()=>{const v=ls.v;plEl.style.color=v<0?RED:BLUE;plEl.textContent=(v<0?"\\u25bc −$":"\\u25b2 +$")+Math.abs(v).toFixed(2);}},e.t);
            tl.call(()=>{ const pip=document.getElementById("pip-"+e.idx); if(pip) pip.style.background=e.pl>=0?GREEN:RED; }, null, e.t);
          });
          tl.to(cost,{opacity:0,duration:0.5,ease:"power2.in"},${(VIDEO - 0.5).toFixed(2)});
${INTRO ? `
          // ---- intro banner: pop in top-middle, hold, pop out ----
          const intro=document.getElementById("intro");
          gsap.set(intro,{xPercent:-50});
          tl.fromTo(intro,{opacity:0,yPercent:-14,scale:0.96},{opacity:1,yPercent:0,scale:1,duration:0.55,ease:"back.out(1.4)"},${INTRO.start});
          tl.to(intro,{opacity:0,yPercent:-10,duration:0.5,ease:"power2.in"},${(INTRO.start + INTRO.duration - 0.5).toFixed(2)});
` : ""}
${RECAP > 0 ? `
          // ---- end payoff card (loss-of-investment reveal) on black ----
          const recap=document.getElementById("recap");
          const rPull=document.getElementById("recap-pull");
          const rLoss=document.getElementById("recap-loss");
          const rLk=document.getElementById("recap-lossk");
          const rRoi=document.getElementById("recap-roi");
          const RS=${VIDEO.toFixed(2)};
          const CARDS=${CARDS_VALUE}, NET=${NET}, ROI=${ROI};
          const isLoss=NET<0; const col=isLoss?"#fb6a5e":"#4ade80";
          rLoss.style.color=col; rLk.style.color=col; rRoi.style.color=col; rLk.textContent=isLoss?"Loss":"Profit";
          gsap.set(recap,{xPercent:-50,yPercent:-50,transformOrigin:"center center"});
          gsap.set([rLk,rLoss,rRoi],{opacity:0,y:${z(18)}});
          tl.fromTo(recap,{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.6,ease:"back.out(1.5)"},RS+0.15);
          const rcS={v:0};
          tl.to(rcS,{v:CARDS,duration:1.3,ease:"power2.out",onUpdate:()=>{rPull.textContent="$"+rcS.v.toFixed(2);}},RS+0.5);
          tl.to([rLk,rLoss,rRoi],{opacity:1,y:0,duration:0.5,ease:"power3.out",stagger:0.1},RS+2.1);
          const rlS={v:0};
          tl.to(rlS,{v:NET,duration:1.2,ease:"power2.out",onUpdate:()=>{const v=rlS.v;rLoss.textContent=(v<0?"-$":"+$")+Math.abs(v).toFixed(2);}},RS+2.3);
          rRoi.textContent=(ROI>=0?"+":"")+ROI.toFixed(1)+"% ROI";
` : ""}
          window.__timelines=window.__timelines||{};
          window.__timelines["final-DoubleDouble"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;

const OUT_HTML = PREVIEW ? "cards/compositions/final-DoubleDouble-preview.html"
  : (S > 1 ? "cards/compositions/final-DoubleDouble-4k.html" : "cards/compositions/final-DoubleDouble.html");
fs.writeFileSync(OUT_HTML, html);
const tot = comps.reduce((s, c) => s + (+c.value || 0), 0);
console.log(`wrote ${OUT_HTML} @ ${W}x${H} (S=${S}${PREVIEW ? ", PREVIEW" : ", ALPHA"}) : ${comps.length} comps, box cost ${fmt(COST_TOTAL)}, cards value ${fmt(tot)}, net ${fmt(tot - COST_TOTAL)}`);
console.log("boxes:", boxes.map(b => `${b.type}@${b.t}s=>${fmt(b.cum)}`).join("  "));
console.log("comp times:", comps.map(c => `${c.player.split(" ")[0]}@${c.start}/${c.show}s`).join("  "));
