import fs from "fs";
// EXPERIMENTAL VARIANT (not part of the standard workflow) — "box health bar / boss fight" overlay.
// The box is the BOSS: a product-box image sits above a full-width HP bar (HP == boxCost). Each card's
// comp value is DAMAGE applied at that card's on-screen time. On every comp a drawn SWORD slashes the
// box (with the slash SFX from HPBAR), the box flinches (white-flash + shake), the bar drains, and an
// RPG damage number pops (the money shot crits). When cumulative comps >= cost the box is DEFEATED
// (bar -> 0, gold sweep, box knocked back, stamp) and the HP readout flips to PROFIT. "Honest" framing:
// a box that never recoups just survives with HP left; the end recap reports the loss in red.
//
// Assets: cards/sources/hpbar/box.png (transparent box), cards/sources/hpbar/swordslash.wav (one-shot,
// extracted from HPBAR/2026-06-20 22-41-36.mp4). Same source cut + chip choreography as the approved comp.
// SCALE (env, default 1): 1 -> 1080x1920, 2 -> native 2160x3840. PREVIEW=1 -> short clip. DUR=<sec> trims.
const S = +(process.env.SCALE || 1);
const z = n => Math.round(n * S);
const comps = JSON.parse(fs.readFileSync("cards/comps/Signature2025/comps.json", "utf8"));
const pos = JSON.parse(fs.readFileSync("scratch/signature2025-card-positions.json", "utf8"));
const COST = comps.boxCost;            // 29.99
const VIDEO = 54.03;
const PREVIEW = process.env.PREVIEW === "1";
const RECAP_START = VIDEO;
const DURATION = process.env.DUR ? +process.env.DUR : (PREVIEW ? 24.0 : 60.5);
const BAR_FADE = RECAP_START - 0.4;
const BAR_START = 5.0;
const fmt = v => "$" + v.toFixed(2);
const W = z(1080), H = z(1920);

// boss-box geometry (image is 737x1004 -> aspect 0.7341). Box is a top-LEFT "boss portrait" so it
// clears the held card in the center; sword + slash are scoped tightly onto it.
const boxW = z(196), boxH = Math.round(boxW * 1004 / 737);
const boxTop = z(90), boxLeft = z(48);
const boxCX = boxLeft + Math.round(boxW / 2), boxCY = boxTop + Math.round(boxH / 2);
const swordSize = z(300), swordLeft = boxCX + z(18) - Math.round(swordSize / 2), swordTop = boxCY - z(6) - Math.round(swordSize / 2);
const slashW = z(236), slashH = z(13), slashLeft = boxCX - Math.round(slashW / 2), slashTop = boxCY - Math.round(slashH / 2);
const BAR_TOP = z(372), CHIP_TOP = z(516), DMG_TOP = z(150), DMG_LEFT = boxCX + z(80);

const cards = comps.comps.map(c => {
  const p = pos[c.cardId];
  if (!p) { console.warn("NO POSITION for", c.cardId, c.player); return null; }
  return { ...c, _s: p.s, _e: p.e, name: c.player };
}).filter(Boolean).sort((a, b) => a._s - b._s);

const chipStartOf = c => (c.chipStartOutput != null ? c.chipStartOutput : c._s + 0.12);
for (let i = 0; i < cards.length; i++) {
  const c = cards[i]; const next = cards[i + 1];
  c.start = +chipStartOf(c).toFixed(2);
  let dur = c._e - c.start;
  dur = Math.min(Math.max(dur, 1.1), 3.0);
  if (next) dur = Math.min(dur, chipStartOf(next) - c.start - 0.04);
  c.dur = +Math.max(dur, 0.9).toFixed(2);
}

const saleDivs = cards.map((c, i) => `      <div id="chip-${c.cardId}" class="sale-card clip" data-start="${c.start}" data-duration="${c.dur}" data-track-index="${i + 1}" data-value="${c.value}"${c.money ? ' data-money-shot="true"' : ''}>
        <div class="sale-card__comp"><img src="../comps/Signature2025/${c.file}" alt="${c.player} ${c.parallel} ${fmt(c.value)}" crossorigin="anonymous" /></div>
${c.label ? `        <div class="sale-card__label">${c.label}</div>\n` : ''}        <div class="sale-card__value">${fmt(c.value)}</div>
      </div>`).join("\n");

const dmgDivs = cards.map(c => `      <div class="dmg-float${c.money ? ' dmg-float--crit' : ''}" id="dmg-${c.cardId}">
        <div class="dmg-float__big">-${fmt(c.value)}</div>${c.money ? `\n        <div class="dmg-float__tag">CRIT</div>` : ''}
      </div>`).join("\n");

// one slash SFX per comp, fired at the hit time
const sfxDivs = cards.map((c, i) => `      <audio id="sfx-${c.cardId}" class="clip" data-start="${Math.max(0, c.start - 0.02).toFixed(2)}" data-duration="0.55" data-track-index="${30 + i}" data-volume="0.72" src="../sources/hpbar/swordslash.wav"></audio>`).join("\n");

const revsLit = JSON.stringify(cards.map(c => ({ start: c.start, value: c.value, money: !!c.money, id: c.cardId })));

const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <title>Final Edit (Shorts) - 2025 Topps Signature Class — BOSS FIGHT${S > 1 ? " (4K)" : ""}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      html, body { margin:0; padding:0; width:${W}px; height:${H}px; background:#000; overflow:hidden; font-family:"Helvetica Neue","Helvetica",Arial,sans-serif; -webkit-font-smoothing:antialiased; }
      #root { position:relative; width:${W}px; height:${H}px; }
      #source-video { position:absolute; inset:0; width:${W}px; height:${H}px; object-fit:cover; object-position:center center; }

      .sale-card { position:absolute; right:${z(120)}px; top:${CHIP_TOP}px; width:${z(230)}px; padding:${z(9)}px ${z(9)}px ${z(4)}px; border-radius:${z(20)}px;
        background:rgba(255,255,255,0.10); backdrop-filter:blur(${z(24)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(24)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.20); box-shadow:0 ${z(12)}px ${z(28)}px rgba(0,0,0,0.32),inset 0 ${z(1)}px 0 rgba(255,255,255,0.24);
        display:flex; flex-direction:column; align-items:stretch; opacity:0; }
      .sale-card__comp { width:100%; border-radius:${z(13)}px; overflow:hidden; background:#fff; box-shadow:0 ${z(5)}px ${z(15)}px rgba(0,0,0,0.22); display:block; }
      .sale-card__comp img { width:100%; height:auto; display:block; }
      .sale-card__label { font-size:${z(15)}px; font-weight:700; letter-spacing:${z(3)}px; color:#ffd24a; text-transform:uppercase; text-align:center; margin-top:${z(8)}px; text-shadow:0 ${z(1)}px ${z(7)}px rgba(0,0,0,0.6); }
      .sale-card__value { font-size:${z(50)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-2)}px; text-align:center; margin-top:${z(8)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.5); }
      .sale-card__label + .sale-card__value { margin-top:${z(2)}px; }
      .sale-card[data-money-shot="true"] .sale-card__value { color:#ffd24a; text-shadow:0 ${z(2)}px ${z(16)}px rgba(255,210,74,0.6); }

      .boss-box { position:absolute; left:${boxLeft}px; top:${boxTop}px; width:${boxW}px; height:${boxH}px; opacity:0; }
      .boss-box__inner { position:relative; width:100%; height:100%; transform-origin:50% 100%; }
      .boss-box__img { width:100%; height:100%; object-fit:contain; display:block; filter:drop-shadow(0 ${z(10)}px ${z(18)}px rgba(0,0,0,0.5)); }
      .boss-box__hit { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; filter:brightness(0) invert(1); opacity:0; }
      .boss-sword { position:absolute; left:${swordLeft}px; top:${swordTop}px; width:${swordSize}px; height:${swordSize}px; opacity:0; pointer-events:none; }
      .boss-slash { position:absolute; left:${slashLeft}px; top:${slashTop}px; width:${slashW}px; height:${slashH}px; background:#fff; border-radius:${z(7)}px; opacity:0; pointer-events:none;
        box-shadow:0 0 ${z(16)}px ${z(4)}px rgba(255,255,255,0.75); }

      .boss-bar { position:absolute; left:${z(40)}px; right:${z(40)}px; top:${BAR_TOP}px; padding:${z(16)}px ${z(20)}px ${z(13)}px; border-radius:${z(22)}px;
        background:rgba(8,10,14,0.56); backdrop-filter:blur(${z(22)}px) saturate(140%); -webkit-backdrop-filter:blur(${z(22)}px) saturate(140%);
        border:${z(1)}px solid rgba(255,255,255,0.18); box-shadow:0 ${z(10)}px ${z(26)}px rgba(0,0,0,0.34),inset 0 ${z(1)}px 0 rgba(255,255,255,0.18); opacity:0; }
      .boss-bar__top { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:${z(10)}px; }
      .boss-bar__tag { font-size:${z(15)}px; font-weight:700; letter-spacing:${z(4)}px; color:#ff8a8a; text-transform:uppercase; }
      .boss-bar__prod { font-size:${z(19)}px; font-weight:600; color:#fff; margin-top:${z(3)}px; text-shadow:0 ${z(1)}px ${z(6)}px rgba(0,0,0,0.55); }
      .boss-bar__hpwrap { text-align:right; }
      .boss-bar__hplab { font-size:${z(12)}px; font-weight:600; letter-spacing:${z(3)}px; color:rgba(255,255,255,0.6); text-transform:uppercase; }
      .boss-bar__hp { font-size:${z(34)}px; font-weight:800; color:#ff5a5a; line-height:1; letter-spacing:${z(-1)}px; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.5); }
      .boss-bar__track { position:relative; height:${z(34)}px; border-radius:${z(10)}px; overflow:hidden; background:#3a1414; border:${z(1)}px solid rgba(255,255,255,0.22); box-shadow:inset 0 ${z(2)}px ${z(6)}px rgba(0,0,0,0.5); }
      .boss-bar__fill { position:absolute; inset:0; transform-origin:0% 50%; background:#e23b3b; box-shadow:inset 0 ${z(2)}px 0 rgba(255,255,255,0.22); }
      .boss-bar__gold { position:absolute; inset:0; transform-origin:0% 50%; background:#22c55e; opacity:0; box-shadow:inset 0 ${z(2)}px 0 rgba(255,255,255,0.3); }
      .boss-bar__flash { position:absolute; inset:0; background:rgba(255,255,255,0.92); opacity:0; }
      .boss-bar__pulled { font-size:${z(14)}px; font-weight:600; color:rgba(255,255,255,0.6); text-align:right; margin-top:${z(8)}px; font-variant-numeric:tabular-nums; text-shadow:0 ${z(1)}px ${z(5)}px rgba(0,0,0,0.5); }

      .dmg-float { position:absolute; left:${DMG_LEFT}px; top:${DMG_TOP}px; transform:translateX(-50%); text-align:center; opacity:0; pointer-events:none; }
      .dmg-float__big { font-size:${z(60)}px; font-weight:800; color:#fff; line-height:1; letter-spacing:${z(-2)}px; text-shadow:0 ${z(2)}px ${z(12)}px rgba(0,0,0,0.7),0 0 ${z(3)}px rgba(0,0,0,0.7); }
      .dmg-float--crit .dmg-float__big { font-size:${z(94)}px; color:#ffd24a; text-shadow:0 ${z(2)}px ${z(16)}px rgba(0,0,0,0.7),0 0 ${z(22)}px rgba(240,180,41,0.5); }
      .dmg-float__tag { font-size:${z(26)}px; font-weight:800; letter-spacing:${z(6)}px; color:#ffd24a; margin-top:${z(2)}px; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.6); }

      .defeat-stamp { position:absolute; left:50%; top:${z(1190)}px; transform:translate(-50%,-50%); width:${z(720)}px; text-align:center; opacity:0; }
      .defeat-stamp__txt { font-size:${z(104)}px; font-weight:900; letter-spacing:${z(5)}px; color:#ffd24a; line-height:0.92; text-transform:uppercase; text-shadow:0 ${z(3)}px ${z(16)}px rgba(0,0,0,0.6),0 0 ${z(24)}px rgba(240,180,41,0.4); }
      .defeat-stamp__sub { font-size:${z(30)}px; font-weight:700; letter-spacing:${z(7)}px; color:#fff; margin-top:${z(10)}px; text-transform:uppercase; text-shadow:0 ${z(1)}px ${z(8)}px rgba(0,0,0,0.55); }

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
    <div id="root" data-composition-id="final-Signature2025-healthbar" data-width="${W}" data-height="${H}" data-start="0" data-duration="${DURATION}">
      <video id="source-video" class="clip" data-start="0" data-duration="${VIDEO}" data-track-index="0" data-has-audio="true" playsinline src="../sources/shatteredJtaylor/ShatteredJTaylor.mp4"></video>

${saleDivs}

${sfxDivs}

      <div id="boss-box" class="boss-box">
        <div id="boss-box-inner" class="boss-box__inner">
          <img class="boss-box__img" src="../sources/hpbar/box.png" alt="2025 Topps Signature Class box" crossorigin="anonymous" />
          <img class="boss-box__hit" id="boss-box-hit" src="../sources/hpbar/box_flash.png" alt="" crossorigin="anonymous" />
        </div>
      </div>

      <div id="boss-slash" class="boss-slash"></div>
      <div id="boss-sword" class="boss-sword">
        <svg viewBox="0 0 300 300" width="100%" height="100%" aria-hidden="true">
          <line x1="196" y1="100" x2="264" y2="24" stroke="#23232a" stroke-width="24" stroke-linecap="round"/>
          <line x1="208" y1="80" x2="234" y2="52" stroke="#b98a2a" stroke-width="6" stroke-linecap="round"/>
          <circle cx="270" cy="18" r="12" fill="#e8b84b" stroke="#8a6418" stroke-width="2"/>
          <line x1="176" y1="82" x2="216" y2="118" stroke="#e8b84b" stroke-width="15" stroke-linecap="round"/>
          <polygon points="189,94 203,106 74,236" fill="#eef1f6" stroke="#565c69" stroke-width="3" stroke-linejoin="round"/>
          <line x1="196" y1="100" x2="74" y2="236" stroke="#aeb4c0" stroke-width="2" stroke-linecap="round"/>
          <line x1="191" y1="96" x2="80" y2="230" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        </svg>
      </div>

      <div id="boss-bar" class="boss-bar clip" data-start="${BAR_START.toFixed(2)}" data-duration="${(Math.min(BAR_FADE, DURATION) - BAR_START).toFixed(2)}" data-track-index="90">
        <div class="boss-bar__top">
          <div>
            <div class="boss-bar__tag">The box</div>
            <div class="boss-bar__prod">2025 Topps Signature Class</div>
          </div>
          <div class="boss-bar__hpwrap">
            <div class="boss-bar__hplab" id="boss-hplab">Box HP</div>
            <div class="boss-bar__hp" id="boss-hp">${fmt(COST)}</div>
          </div>
        </div>
        <div class="boss-bar__track">
          <div class="boss-bar__fill" id="bar-fill"></div>
          <div class="boss-bar__gold" id="bar-gold"></div>
          <div class="boss-bar__flash" id="bar-flash"></div>
        </div>
        <div class="boss-bar__pulled" id="boss-pulled">Pulled $0.00</div>
      </div>

      <div id="dmg-layer">
${dmgDivs}
      </div>

      <div id="defeat-stamp" class="defeat-stamp">
        <div class="defeat-stamp__txt">Box<br>defeated</div>
        <div class="defeat-stamp__sub">Box cost recouped</div>
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
          const COST=${COST};
          const IN_DUR=0.3, OUT_DUR=0.4, POP_IN=0.7;
          const tl = gsap.timeline({ paused:true });

          // ---- comp chips (unchanged choreography) ----
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

          // ---- boss frame: box image + sword + slash + HP bar ----
          const box=document.getElementById("boss-box");
          const boxInner=document.getElementById("boss-box-inner");
          const boxHit=document.getElementById("boss-box-hit");
          const sword=document.getElementById("boss-sword");
          const slash=document.getElementById("boss-slash");
          const bar=document.getElementById("boss-bar");
          const fill=document.getElementById("bar-fill");
          const gold=document.getElementById("bar-gold");
          const flash=document.getElementById("bar-flash");
          const hpEl=document.getElementById("boss-hp");
          const hpLab=document.getElementById("boss-hplab");
          const pulledEl=document.getElementById("boss-pulled");
          const stamp=document.getElementById("defeat-stamp");
          const revs=${revsLit};

          gsap.set(fill,{transformOrigin:"0% 50%",scaleX:1});
          gsap.set(gold,{transformOrigin:"0% 50%",scaleX:0,opacity:0});
          gsap.set(stamp,{xPercent:-50,yPercent:-50});
          gsap.set(sword,{transformOrigin:"50% 50%"});
          gsap.set(slash,{rotation:-48,transformOrigin:"50% 50%"});
          // boss frame enters
          tl.fromTo(box,{opacity:0,y:${z(-26)},scale:0.9},{opacity:1,y:0,scale:1,duration:0.6,ease:"back.out(1.4)"},${BAR_START.toFixed(2)});
          tl.fromTo(bar,{x:${z(-50)},opacity:0},{x:0,opacity:1,duration:0.6,ease:"power3.out"},${BAR_START.toFixed(2)}+0.1);

          let cum=0, run=0, defeated=false;
          revs.forEach((r)=>{
            const to=cum+r.value; cum=to; run=to;
            const remTo=Math.max(0,COST-to);
            const proxy={c:(to-r.value)};
            // bar drain + HP / pulled readouts
            tl.to(fill,{scaleX:remTo/COST,duration:0.55,ease:"power1.out"},r.start);
            tl.to(proxy,{c:to,duration:0.55,ease:"power1.out",onUpdate:()=>{
              const v=proxy.c; const rem=Math.max(0,COST-v);
              if(v>=COST){ hpLab.textContent="Profit"; hpEl.textContent="+$"+(v-COST).toFixed(2); hpEl.style.color="#4ade80"; }
              else { hpLab.textContent="Box HP"; hpEl.textContent="$"+rem.toFixed(2); hpEl.style.color="#ff5a5a"; }
              pulledEl.textContent="Pulled $"+v.toFixed(2);
            }},r.start);
            // SWORD strike (swing in fast, follow through out)
            tl.fromTo(sword,{opacity:0,x:${z(200)},y:${z(-200)},rotation:24},{opacity:1,x:0,y:0,rotation:0,duration:0.15,ease:"power3.in"},r.start-0.04);
            tl.to(sword,{opacity:0,x:${z(-120)},y:${z(120)},rotation:-18,duration:0.28,ease:"power2.out"},r.start+0.12);
            // SLASH streak across the box
            tl.fromTo(slash,{opacity:0,scaleX:0.2},{opacity:0.98,scaleX:1.15,duration:0.1,ease:"power2.out",immediateRender:false},r.start+0.1);
            tl.to(slash,{opacity:0,duration:0.24,ease:"power2.in"},r.start+0.18);
            // box flinch: white flash + shake
            tl.fromTo(boxHit,{opacity:0},{opacity:0.95,duration:0.05,immediateRender:false},r.start+0.12);
            tl.to(boxHit,{opacity:0,duration:0.26,ease:"power2.out"},r.start+0.18);
            tl.to(boxInner,{keyframes:{x:[0,${z(-18)},${z(14)},${z(-8)},0]},duration:0.3,ease:"none"},r.start+0.12);
            // white bar flash + damage number
            tl.set(flash,{opacity:0.9},r.start);
            tl.to(flash,{opacity:0,duration:0.32,ease:"power2.out"},r.start);
            const f=document.getElementById("dmg-"+r.id);
            tl.fromTo(f,{opacity:0,y:${z(34)},scale:0.6},{opacity:1,y:0,scale:1,duration:0.26,ease:"back.out(2)",immediateRender:false},r.start+0.06);
            tl.to(f,{y:${z(-78)},duration:1.0,ease:"power1.out"},r.start+0.16);
            tl.to(f,{opacity:0,duration:0.4,ease:"power2.in"},r.start+0.78);
            // DEFEAT
            if(!defeated && to>=COST){ defeated=true;
              tl.to(gold,{scaleX:1,opacity:1,duration:0.45,ease:"power2.out"},r.start+0.14);
              tl.to(boxInner,{rotation:9,y:${z(34)},scale:0.9,opacity:0.6,duration:0.55,ease:"power2.in"},r.start+0.3);
              tl.fromTo(stamp,{scale:2,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"back.out(1.6)",immediateRender:false},r.start+0.18);
              tl.to(stamp,{opacity:0,duration:0.45,ease:"power2.in"},r.start+2.0);
            }
          });
          tl.to([bar,box],{opacity:0,duration:0.4,ease:"power2.in"},${BAR_FADE.toFixed(2)});
          tl.set([bar,box],{opacity:0},${RECAP_START.toFixed(2)});

          // ---- end recap (unchanged; honest win/loss) ----
          const recap=document.getElementById("recap-card");
          const rTot=document.getElementById("recap-total");
          const rPro=document.getElementById("recap-profit");
          const rLab=document.getElementById("recap-profit-label");
          const rRoi=document.getElementById("recap-roi");
          const RS=${RECAP_START.toFixed(2)};
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
          window.__timelines["final-Signature2025-healthbar"]=tl;
        })();
      </script>
    </div>
  </body>
</html>
`;
const OUT_HTML = PREVIEW ? "cards/compositions/final-Signature2025-healthbar-preview.html"
  : (S > 1 ? "cards/compositions/final-Signature2025-healthbar-4k.html" : "cards/compositions/final-Signature2025-healthbar.html");
fs.writeFileSync(OUT_HTML, html);
const tot = cards.reduce((s, c) => s + c.value, 0);
let acc = 0, defAt = null;
for (const c of cards) { acc += c.value; if (defAt == null && acc >= COST) defAt = c; }
console.log(`wrote ${OUT_HTML} @ ${W}x${H} (S=${S}) : ${cards.length} cards, HP ${fmt(COST)}, total dmg ${fmt(tot)}, ${tot >= COST ? `DEFEATED on ${defAt.name} @${defAt.start}s` : `box SURVIVES with ${fmt(COST - tot)} HP`}, profit ${fmt(tot - COST)} (${((tot - COST) / COST * 100).toFixed(1)}% ROI)`);
console.log("slash SFX fired on each comp:", cards.map(c => `${c.name.split(' ')[0]}@${c.start}s`).join("  "));
