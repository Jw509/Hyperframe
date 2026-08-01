import fs from "fs";
// SDBLF — 2025 Topps Signature Class, 2 MEGA boxes ($65.99 each) — LONGFORM 16:9 overlay generator.
// Based on scratch/gen-doubledouble-overlays.mjs (approved counter design) with ONE addition the user
// asked for on this build: once a box is finished, its FINAL win/loss stays pinned in the top-left
// counter as its own row ("BOX 1  ▼ -$12.34") while the next box runs live.
//
// Modes:
//   default        -> full-frame composition cards/compositions/final-sdblf.html (SCALE=2 for native 4K,
//                     PREVIEW=1 embeds the source video for Studio spot-checks).
//   ELEMENTS=1     -> decoupled render pipeline: emits SMALL-canvas element compositions
//                     (counter / one per comp chip / recap) + scratch/sdblf-composite-manifest.json
//                     with the composite position+time for each element. SCALE applies here too.
// args (no env vars — atomic argv style): node scratch/gen-sdblf-overlays.mjs [scale=2] [elements] [preview] [dur=N]
const argv = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.split("="); return [k.toLowerCase(), v ?? "1"]; }));
const S = +(argv.scale || 1);
const z = n => +(n * S).toFixed(2);
const PREVIEW = argv.preview === "1";
const ELEMENTS = argv.elements === "1";
const SRC = argv.src || "../sources/SDBLF/SDBLF.mp4";
const data = JSON.parse(fs.readFileSync("cards/comps/SDBLF/comps.json", "utf8"));
const VIDEO = data.videoDuration;
const RECAP = data.recap && data.recap.enabled ? (data.recap.durationSeconds || 7.5) : 0;
const FULL = VIDEO + RECAP;
const DURATION = argv.dur ? +argv.dur : FULL;
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
for (let i = 0; i < comps.length; i++) {
  const c = comps[i];
  c.start = +(+c.tStart).toFixed(2);
  if (i > 0 && c.start < comps[i - 1].start + MINGAP) c.start = +(comps[i - 1].start + MINGAP).toFixed(2);
}
for (let i = 0; i < comps.length; i++) {
  const c = comps[i], next = comps[i + 1];
  let span = Math.max((c.tEnd ?? c.tStart) - c.tStart, 0);
  let show = Math.min(Math.max(span, MINHOLD + IN + OUT), MAXSHOW);
  if (next) show = Math.min(show, (next.start - 0.2) - c.start);
  c.show = +Math.max(show, IN + OUT + 0.4).toFixed(2);
}
const CARDS_VALUE = +comps.reduce((s, c) => s + (+c.value || 0), 0).toFixed(2);
const NET = +(CARDS_VALUE - BOX_COST).toFixed(2);
const ROI = +(NET / BOX_COST * 100).toFixed(1);

// ---- box opens ----
const boxes = (data.boxOpens || []).slice().sort((a, b) => a.t - b.t);
let cum = 0;
boxes.forEach((b, i) => { cum += b.cost; b.cum = +cum.toFixed(2); b.idx = i + 1; });
const TRACK_START = boxes.length ? +(+boxes[0].t).toFixed(2) : 1.0;
const COST_TOTAL = +cum.toFixed(2);
const NBOX = boxes.length;

// ---- PER-BOX event timeline: each box resets Cards Pulled & P/L; pip green if that box profits ----
const _ce = comps.map(c => ({ t: c.start, kind: "comp", v: +c.value || 0 }));
const _be = boxes.map((b, i) => ({ t: b.t, kind: "box", bi: i, cost: b.cost, type: b.type }));
let _cb = 0, _bp = 0, _bc = 0;
const EVENTS = [..._be, ..._ce].sort((a, b) => a.t - b.t).map(e => {
  if (e.kind === "box") { _cb = e.bi; _bc = e.cost; _bp = 0; }
  else { _bp = +(_bp + e.v).toFixed(2); }
  return { t: +e.t.toFixed(2), kind: e.kind, idx: _cb + 1, type: boxes[_cb] ? boxes[_cb].type : "", cost: _bc, pulled: _bp, pl: +(_bp - _bc).toFixed(2) };
});
// final P/L per box (last event belonging to that box) — drives the pinned per-box result rows
const BOX_FINAL = boxes.map(b => {
  const evs = EVENTS.filter(e => e.idx === b.idx);
  return { idx: b.idx, type: b.type, pl: evs.length ? evs[evs.length - 1].pl : -b.cost };
});

const RECAP_HEAD = `${NBOX} Mega Box${NBOX !== 1 ? "es" : ""} &mdash; ${fmt(boxes[0].cost)} each`;

// ------------------------------------------------------------------ shared CSS fragments
// CHIP scales the whole comp chip block; 0.75 = 25% smaller (user 2026-07-11: chips were covering the cards)
const CHIP = 0.75;
const k = n => z(n * CHIP);
const compCss = (abs) => `
      .comp { position:absolute; left:50%; top:${z(18)}px; width:${k(196)}px; transform:translateX(-50%);
        display:flex; flex-direction:column; align-items:center; opacity:0; will-change:opacity,transform; }
      .comp__img { width:100%; border-radius:${k(11)}px; overflow:hidden; background:#fff;
        box-shadow:0 ${k(8)}px ${k(24)}px rgba(0,0,0,0.45), 0 ${k(2)}px ${k(6)}px rgba(0,0,0,0.35); }
      .comp__img img { width:100%; height:auto; display:block; }
      .comp__tag { margin-top:${k(8)}px; display:flex; align-items:center; gap:${k(9)}px;
        padding:${k(5)}px ${k(12)}px; border-radius:${z(999)}px; background:rgba(12,14,20,0.85);
        backdrop-filter:blur(${k(14)}px); -webkit-backdrop-filter:blur(${k(14)}px);
        border:${z(1)}px solid rgba(255,255,255,0.16); box-shadow:0 ${k(6)}px ${k(18)}px rgba(0,0,0,0.4); }
      .comp__name { font-size:${k(15)}px; font-weight:700; color:#fff; letter-spacing:${k(0.2)}px; white-space:nowrap; text-shadow:0 ${z(1)}px ${z(4)}px rgba(0,0,0,0.6); }
      .comp__val { font-size:${k(22)}px; font-weight:900; color:#4ade80; letter-spacing:${k(-0.5)}px; line-height:1; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(6)}px rgba(0,0,0,0.5); }
      .comp[data-money-shot="true"] .comp__val { color:#ffd24a; }
      .comp[data-money-shot="true"] .comp__img { box-shadow:0 ${z(12)}px ${z(40)}px rgba(255,210,74,0.45), 0 0 0 ${z(2)}px rgba(255,210,74,0.7); }`;

const costCss = (left, top) => `
      .cost { position:absolute; left:${z(left)}px; top:${z(top)}px; padding:${z(16)}px ${z(22)}px ${z(15)}px; border-radius:${z(22)}px;
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
      /* NEW: pinned per-box results — a finished box keeps its final W/L on screen */
      .cost__done { margin-top:${z(8)}px; display:flex; flex-direction:column; gap:${z(4)}px; }
      .cost__donerow { display:flex; align-items:baseline; gap:${z(10)}px; height:0; opacity:0; overflow:hidden; }
      .cost__donek { font-size:${z(11.5)}px; font-weight:700; letter-spacing:${z(1.5)}px; color:rgba(255,255,255,0.55); text-transform:uppercase; }
      .cost__donev { font-size:${z(19)}px; font-weight:900; letter-spacing:${z(-0.3)}px; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(6)}px rgba(0,0,0,0.5); }`;

const recapCss = (centered) => `
      .recap { position:absolute; ${centered ? `left:50%; top:50%;` : `left:${z(70)}px; top:${z(48)}px;`} width:${z(560)}px; padding:${z(38)}px ${z(44)}px ${z(42)}px; border-radius:${z(28)}px;
        background:rgba(18,20,28,0.92); backdrop-filter:blur(${z(28)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(28)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.16); box-shadow:0 ${z(18)}px ${z(48)}px rgba(0,0,0,0.6), inset 0 ${z(1)}px 0 rgba(255,255,255,0.16);
        display:flex; flex-direction:column; align-items:center; opacity:0; }
      .recap__head { font-size:${z(18)}px; font-weight:700; letter-spacing:${z(4)}px; color:rgba(255,255,255,0.6); text-transform:uppercase; margin-bottom:${z(22)}px; text-align:center; }
      .recap__row { width:100%; display:flex; align-items:baseline; justify-content:space-between; margin:${z(6)}px 0; }
      .recap__k { font-size:${z(22)}px; font-weight:600; letter-spacing:${z(2)}px; color:rgba(255,255,255,0.72); text-transform:uppercase; }
      .recap__v { font-size:${z(40)}px; font-weight:800; line-height:1; letter-spacing:${z(-1)}px; font-variant-numeric:tabular-nums; }
      .recap__v--cost { color:#fb6a5e; }
      .recap__v--pull { color:#9fb3c8; }
      .recap__krow { width:100%; display:flex; align-items:baseline; justify-content:space-between; margin:${z(3)}px 0; }
      .recap__bk { font-size:${z(16)}px; font-weight:600; letter-spacing:${z(2)}px; color:rgba(255,255,255,0.55); text-transform:uppercase; }
      .recap__bv { font-size:${z(26)}px; font-weight:800; line-height:1; letter-spacing:${z(-0.5)}px; font-variant-numeric:tabular-nums; }
      .recap__div { width:100%; height:${z(1)}px; background:rgba(255,255,255,0.16); margin:${z(20)}px 0 ${z(18)}px; }
      .recap__lossk { font-size:${z(20)}px; font-weight:800; letter-spacing:${z(8)}px; text-transform:uppercase; margin-bottom:${z(8)}px; }
      .recap__loss { font-size:${z(104)}px; font-weight:900; line-height:0.95; letter-spacing:${z(-4)}px; font-variant-numeric:tabular-nums; }
      .recap__roi { font-size:${z(34)}px; font-weight:700; letter-spacing:${z(1)}px; margin-top:${z(14)}px; font-variant-numeric:tabular-nums; }`;

// ------------------------------------------------------------------ shared markup
const costMarkup = `        <div class="cost__cols">
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
        <div class="cost__done">
${BOX_FINAL.map(b => `          <div class="cost__donerow" id="done-${b.idx}"><span class="cost__donek">Box ${b.idx}</span><span class="cost__donev" id="donev-${b.idx}"></span></div>`).join("\n")}
        </div>
        <div class="cost__foot" id="cost-foot">${NBOX} Mega Boxes</div>
        <div class="cost__pl" id="cost-pl"></div>`;

const recapMarkup = `        <div class="recap__head">${RECAP_HEAD}</div>
        <div class="recap__row"><span class="recap__k">Boxes Cost</span><span class="recap__v recap__v--cost">${fmt(BOX_COST)}</span></div>
        <div class="recap__row"><span class="recap__k">Cards pulled</span><span class="recap__v recap__v--pull" id="recap-pull">$0.00</span></div>
${BOX_FINAL.map(b => `        <div class="recap__krow"><span class="recap__bk">Box ${b.idx} &middot; ${b.type}</span><span class="recap__bv" id="recap-box-${b.idx}" style="color:${b.pl >= 0 ? "#4ade80" : "#fb6a5e"}">${(b.pl < 0 ? "▼ −$" : "▲ +$") + Math.abs(b.pl).toFixed(2)}</span></div>`).join("\n")}
        <div class="recap__div"></div>
        <div class="recap__lossk" id="recap-lossk">Loss</div>
        <div class="recap__loss" id="recap-loss">-$0.00</div>
        <div class="recap__roi" id="recap-roi"></div>`;

// counter timeline JS. off = seconds subtracted from absolute event times (0 in full-frame mode).
const counterJs = (off) => `
          const cost=document.querySelector(".cost");
          const cv=document.getElementById("cost-value");
          const pullEl=document.getElementById("pull-value");
          const plEl=document.getElementById("cost-pl");
          const foot=document.getElementById("cost-foot");
          const EVENTS=${JSON.stringify(EVENTS)};
          const BOX_FINAL=${JSON.stringify(BOX_FINAL)};
          const GREEN="#34d399", RED="#fb6a5e", BLUE="#5b9cff", NBOX=${NBOX}, OFF=${off};
          tl.fromTo(cost,{x:${z(-40)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${TRACK_START}-OFF);
          const cs={v:0}, ps={v:0}, ls={v:0};
          EVENTS.forEach((e)=>{
            const at=e.t-OFF;
            if(e.kind==="box"){
              tl.to(cs,{v:e.cost,duration:0.4,ease:"power1.out",onUpdate:()=>{cv.textContent="$"+cs.v.toFixed(2);}},at);
              tl.fromTo(cv,{scale:1.18},{scale:1,duration:0.5,ease:"back.out(2)",transformOrigin:"left center"},at);
              tl.to(ps,{v:0,duration:0.3,ease:"power1.in",onUpdate:()=>{pullEl.textContent="$"+ps.v.toFixed(2);}},at);
              tl.to("#pip-"+e.idx,{scaleX:1,duration:0.45,ease:"power2.out"},at);
              tl.call(()=>{ foot.textContent="Box "+e.idx+" / "+NBOX+"  \\u00b7  "+e.type.toUpperCase(); }, null, at);
              // NEW: the box that just FINISHED gets its result pinned as a row that stays on screen
              if(e.idx>1){
                const fin=BOX_FINAL[e.idx-2];
                const row=document.getElementById("done-"+fin.idx), val=document.getElementById("donev-"+fin.idx);
                tl.call(()=>{ val.style.color=fin.pl>=0?GREEN:RED; val.textContent=(fin.pl<0?"\\u25bc \\u2212$":"\\u25b2 +$")+Math.abs(fin.pl).toFixed(2); }, null, at);
                tl.to(row,{height:"auto",opacity:1,duration:0.45,ease:"power2.out"},at+0.15);
                tl.fromTo(val,{scale:1.25},{scale:1,duration:0.5,ease:"back.out(2)",transformOrigin:"left center"},at+0.3);
              }
            } else {
              tl.to(ps,{v:e.pulled,duration:0.5,ease:"power1.out",onUpdate:()=>{pullEl.textContent="$"+ps.v.toFixed(2);}},at);
              tl.fromTo(pullEl,{scale:1.14},{scale:1,duration:0.45,ease:"back.out(2)",transformOrigin:"left center"},at);
            }
            tl.to(ls,{v:e.pl,duration:0.45,ease:"power1.out",onUpdate:()=>{const v=ls.v;plEl.style.color=v<0?RED:BLUE;plEl.textContent=(v<0?"\\u25bc \\u2212$":"\\u25b2 +$")+Math.abs(v).toFixed(2);}},e.t-OFF);
            tl.call(()=>{ const pip=document.getElementById("pip-"+e.idx); if(pip) pip.style.background=e.pl>=0?GREEN:RED; }, null, e.t-OFF);
          });
          tl.to(cost,{opacity:0,duration:0.5,ease:"power2.in"},${(VIDEO - 0.5).toFixed(2)}-OFF);`;

// recap timeline JS. base = timeline-time the recap begins.
const recapJs = (base) => `
          const recap=document.querySelector(".recap");
          const rPull=document.getElementById("recap-pull");
          const rLoss=document.getElementById("recap-loss");
          const rLk=document.getElementById("recap-lossk");
          const rRoi=document.getElementById("recap-roi");
          const RS=${base};
          const CARDS=${CARDS_VALUE}, NET=${NET}, ROI=${ROI};
          const isLoss=NET<0; const col=isLoss?"#fb6a5e":"#4ade80";
          rLoss.style.color=col; rLk.style.color=col; rRoi.style.color=col; rLk.textContent=isLoss?"Loss":"Profit";
          ${"gsap.set(recap,{xPercent:-50,yPercent:-50,transformOrigin:\"center center\"});"}
          gsap.set([rLk,rLoss,rRoi],{opacity:0,y:${z(18)}});
          tl.fromTo(recap,{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.6,ease:"back.out(1.5)"},RS+0.15);
          const rcS={v:0};
          tl.to(rcS,{v:CARDS,duration:1.3,ease:"power2.out",onUpdate:()=>{rPull.textContent="$"+rcS.v.toFixed(2);}},RS+0.5);
          tl.to([rLk,rLoss,rRoi],{opacity:1,y:0,duration:0.5,ease:"power3.out",stagger:0.1},RS+2.1);
          const rlS={v:0};
          tl.to(rlS,{v:NET,duration:1.2,ease:"power2.out",onUpdate:()=>{const v=rlS.v;rLoss.textContent=(v<0?"-$":"+$")+Math.abs(v).toFixed(2);}},RS+2.3);
          rRoi.textContent=(ROI>=0?"+":"")+ROI.toFixed(1)+"% ROI";`;

// chip in/out animation JS for one element (relative timeline starting at 0)
const chipJs = (c) => {
  const inD = c.money ? POP_IN : IN;
  const hold = Math.max(0.2, c.show - inD - OUT);
  return c.money
    ? `tl.fromTo(el,{opacity:0,scale:0.8,y:${z(18)}},{opacity:1,scale:1,y:0,duration:${POP_IN},ease:"back.out(1.5)"},0);
          tl.to(el,{opacity:0,y:${z(-14)},duration:${OUT},ease:"power2.in"},${(inD + hold).toFixed(3)});`
    : `tl.fromTo(el,{opacity:0,y:${z(26)},scale:0.97},{opacity:1,y:0,scale:1,duration:${IN},ease:"power3.out"},0);
          tl.to(el,{opacity:0,y:${z(-14)},duration:${OUT},ease:"power2.in"},${(inD + hold).toFixed(3)});`;
};

const page = (id, w, h, dur, bodyInner, script, bg = "transparent") => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${id}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:${w}px; height:${h}px; background:${bg}; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:${w}px; height:${h}px; background:${bg}; }
      #source-video { position:absolute; inset:0; width:${w}px; height:${h}px; object-fit:cover; object-position:center center; }
${bodyInner.css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-width="${w}" data-height="${h}" data-start="0" data-duration="${dur}">
${bodyInner.html}
      <script>
        (function () {
          const tl = gsap.timeline({ paused:true });
${script}
          window.__timelines=window.__timelines||{};
          window.__timelines["${id}"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;

if (!ELEMENTS) {
  // ---------------- FULL-FRAME composition (preview / classic render path) ----------------
  const BG = PREVIEW ? "#000" : "transparent";
  const videoLayer = PREVIEW
    ? `      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" data-has-audio="true" playsinline src="${SRC}"></video>\n`
    : "";
  const compDivs = comps.map((c, i) => `      <div id="chip-${c.instId}" class="comp clip" data-start="${c.start}" data-duration="${c.show}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="comp__img"><img src="../comps/SDBLF/${c.file}" alt="${c.player} ${fmt(c.value)}" crossorigin="anonymous" /></div>
        <div class="comp__tag"><span class="comp__name">${c.player}</span><span class="comp__val">${fmt(c.value)}</span></div>
      </div>`).join("\n");

  const fullScript = `
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
${counterJs(0)}
${RECAP > 0 ? recapJs(VIDEO.toFixed(2)) : ""}`;

  const inner = {
    css: compCss() + costCss(46, 44) + (RECAP > 0 ? recapCss(true) : ""),
    html: `${videoLayer}${compDivs}

      <div id="cost" class="cost clip" data-start="${TRACK_START}" data-duration="${(Math.min(VIDEO, DURATION) - TRACK_START).toFixed(2)}" data-track-index="95">
${costMarkup}
      </div>
${RECAP > 0 ? `      <div id="recap" class="recap clip" data-start="${VIDEO.toFixed(2)}" data-duration="${(DURATION - VIDEO).toFixed(2)}" data-track-index="96">
${recapMarkup}
      </div>` : ""}`
  };

  const OUT_HTML = PREVIEW ? "cards/compositions/final-sdblf-preview.html"
    : (S > 1 ? "cards/compositions/final-sdblf-4k.html" : "cards/compositions/final-sdblf.html");
  fs.writeFileSync(OUT_HTML, page("final-sdblf", W, H, DURATION, inner, fullScript, BG));
  console.log(`wrote ${OUT_HTML} @ ${W}x${H} (S=${S}${PREVIEW ? ", PREVIEW" : ", ALPHA"}) : ${comps.length} comps, cost ${fmt(COST_TOTAL)}, pulled ${fmt(CARDS_VALUE)}, net ${fmt(NET)}`);
} else {
  // ---------------- DECOUPLED ELEMENT compositions + composite manifest ----------------
  const dir = "cards/compositions";
  const manifest = { scale: S, fps: 60, videoDuration: VIDEO, recapDuration: RECAP, fullDuration: FULL, elements: [] };

  // counter element: canvas covers the top-left corner region; .cost sits at its real (46,44) offset
  const CW = z(560), CH = z(560);
  const counterInner = { css: costCss(46, 44), html: `      <div id="cost" class="cost clip" data-start="${TRACK_START}" data-duration="${(VIDEO - TRACK_START).toFixed(2)}" data-track-index="1">\n${costMarkup}\n      </div>` };
  fs.writeFileSync(`${dir}/sdblf-el-counter.html`, page("sdblf-el-counter", CW, CH, VIDEO, counterInner, counterJs(0)));
  manifest.elements.push({ id: "counter", html: "compositions/sdblf-el-counter.html", out: "sdblf-el-counter.mov", x: 0, y: 0, start: 0, duration: VIDEO });

  // one element per chip instance: canvas 280 wide, chip centered; composite x centers it on the frame
  const XW = z(280), XH = z(640);
  for (const c of comps) {
    const inner = {
      css: compCss(),
      html: `      <div id="chip" class="comp clip" data-start="0" data-duration="${c.show}" data-track-index="1"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="comp__img"><img src="../comps/SDBLF/${c.file}" alt="${c.player} ${fmt(c.value)}" crossorigin="anonymous" /></div>
        <div class="comp__tag"><span class="comp__name">${c.player}</span><span class="comp__val">${fmt(c.value)}</span></div>
      </div>`
    };
    const script = `          const el=document.getElementById("chip");
          gsap.set(el,{transformOrigin:"50% 100%"});
          ${chipJs(c)}`;
    fs.writeFileSync(`${dir}/sdblf-el-chip-${c.instId}.html`, page(`sdblf-el-chip-${c.instId}`, XW, XH, c.show, inner, script));
    manifest.elements.push({ id: `chip-${c.instId}`, html: `compositions/sdblf-el-chip-${c.instId}.html`, out: `sdblf-el-chip-${c.instId}.mov`, x: z(1920 / 2 - 140), y: 0, start: c.start, duration: c.show, player: c.player, value: c.value });
  }

  // recap element: rendered on its own canvas, composited centered over the black tail
  if (RECAP > 0) {
    const RW = z(760), RH = z(900);
    const recapInner = { css: recapCss(true).replace("left:50%; top:50%;", "left:50%; top:50%;"), html: `      <div id="recap" class="recap clip" data-start="0" data-duration="${RECAP}" data-track-index="1">\n${recapMarkup}\n      </div>` };
    fs.writeFileSync(`${dir}/sdblf-el-recap.html`, page("sdblf-el-recap", RW, RH, RECAP, recapInner, recapJs(0)));
    manifest.elements.push({ id: "recap", html: "compositions/sdblf-el-recap.html", out: "sdblf-el-recap.mov", x: z((1920 - 760) / 2), y: z((1080 - 900) / 2), start: VIDEO, duration: RECAP });
  }

  fs.writeFileSync("scratch/sdblf-composite-manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`wrote ${manifest.elements.length} element compositions (S=${S}) + scratch/sdblf-composite-manifest.json`);
  console.log(`totals: cost ${fmt(COST_TOTAL)}, pulled ${fmt(CARDS_VALUE)}, net ${fmt(NET)}, per-box: ${BOX_FINAL.map(b => `B${b.idx} ${fmt(b.pl)}`).join("  ")}`);
}
