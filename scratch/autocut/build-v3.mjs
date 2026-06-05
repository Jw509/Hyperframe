#!/usr/bin/env node
/**
 * Build v3 cut by applying the user's round-3 frame-level corrections to v2.
 * User times in "original video" M:SS == source seconds (1:1). Output-time notes
 * resolved against the v2 beat map. Everything up to ~out 4:33 is rebuilt here;
 * tail (#150-151) kept from v2.
 *
 * Each entry below is the FINAL beat in source seconds. Comments cite the user note.
 */
import { writeFileSync } from "node:fs";

const seg = (start, end, note) => ({ start: +start.toFixed(2), end: +end.toFixed(2), note });

const segments = [
  // ---- PACK 1 (approved, unchanged) ----
  seg(86.4, 87.6, "open: pack held up"),
  seg(105.0, 106.4, "fan"),
  seg(107.3, 110.8, "card1"),
  seg(112.0, 114.7, "card2"),
  seg(116.5, 118.0, "card3"),
  seg(118.6, 120.4, "card4"),

  // ---- PACK 2: Royer (3rd card) +1s longer; 4th card shot was good ----
  seg(139.0, 140.2, "open"),
  seg(146.0, 148.0, "card1 Tennessee QB"),
  seg(161.9, 163.8, "card2 Penn State"),
  seg(165.5, 168.4, "card3 Joe Royer Cincinnati gold-sparkle HIT (+1s hold, was 1.9s)"), // +1.0s
  seg(190.0, 191.6, "card4 Michigan State (good)"),

  // ---- PACK 3 (user 'pack 3'): add fan from orig 3:31; card1 good; fix 2->3 and 3->4 ----
  seg(200.6, 201.8, "open"),
  seg(211.0, 213.0, "fan (orig 3:31)"),                 // user: pack3 has no fan, use 3:31
  seg(207.2, 209.2, "card1 (good first swipe)"),
  // user: 2nd->3rd doesn't work; use 3:42 as slide start for 2nd->3rd
  seg(222.0, 224.5, "card2->3 transition, slide start orig 3:42"),  // 222=3:42
  // user: use 3:47 for 3rd->4th
  seg(227.0, 229.0, "card3->4 transition, slide start orig 3:47"),  // 227=3:47

  // ---- PACK B (window2 packB, unchanged — user 'pack 4 is fine for now') ----
  seg(235.0, 236.2, "open packB"),
  seg(240.0, 241.4, "fan packB"),
  seg(244.0, 246.0, "B1"),
  seg(249.3, 251.3, "B2"),
  seg(254.7, 256.7, "B3"),
  seg(260.4, 262.4, "B4"),
  seg(263.7, 265.7, "B5"),
  seg(266.4, 268.4, "B6"),

  // ---- PACK 5 (user 'fifth pack'): skip fan -> use orig 4:50; Dawson Pendergrass card1 skipped -> 4:57 slide start
  seg(273.6, 274.6, "open packC"),
  seg(281.0, 282.3, "open pack1 tear"),
  seg(290.0, 292.0, "fan (orig 4:50)"),                 // 290=4:50
  seg(297.0, 299.5, "card1 Dawson Pendergrass (orig 4:57 slide start, was skipped)"), // 297=4:57
  seg(299.5, 301.4, "card2 orange base"),
  seg(304.7, 306.7, "card3 purple refractor"),
  seg(313.9, 315.8, "card4 red/white"),
  seg(318.7, 320.7, "card5 purple chrome refractor"),

  // ---- PACK 6 (user 'sixth pack'): first card slide from 5:46, then 5:48, 5:50; hit 6:11-6:13; user said 4th card skipped earlier — these source-times cover the slides
  seg(330.2, 331.5, "open pack2"),
  seg(334.3, 335.8, "fan pack2"),
  seg(346.0, 348.0, "card1 (orig 5:46 slide start)"),   // 346=5:46
  seg(348.0, 350.0, "card2 (orig 5:48)"),               // 348=5:48
  seg(350.0, 352.0, "card3 (orig 5:50)"),               // 350=5:50
  seg(371.0, 373.0, "card4 (was skipped entirely — add)"), // fills the missing 4th card
  seg(371.0, 373.0, "PLACEHOLDER dup removed below"),

  // ---- user output-time notes 1:08-1:32 region ----
  // 1:08-1:11 cut (drop #38 src372.3). 1:12 stay .7 longer to see back of card (#39 src375.9 +0.7).
  seg(375.9, 378.5, "card back, +0.7s to see back (orig out1:12)"), // 377.8+0.7
  // pack2 (#40-45) — user: keep as flagged below
  seg(385.6, 386.8, "open pack2"),
  seg(388.0, 389.4, "fan pack2"),
  seg(390.0, 391.9, "card1 gold-border"),
  seg(400.3, 402.2, "card2"),
  seg(411.9, 413.8, "card3"),
  seg(415.5, 417.5, "card4 MS5 insert"),

  // ---- out1:25 +1s; drop 1:26-1:29 (no cut-back to cards); keep 1:30-1:32 ----
  // #47 src431.6 is out1:24-1:26 region: user "1:25 needs to be one second longer"
  seg(430.5, 431.6, "fan packA"),
  seg(431.6, 434.6, "gold MS5 refractor +1s (orig out1:25)"), // 433.6+1.0
  // drop #48,#49 (out1:26-1:29 cut-backs). keep #50 (out1:30-1:32)
  seg(450.5, 452.5, "warm-tone player (keep, out1:30-1:32)"),

  // ---- packB (#51-58): out1:38 keep slide .15 longer; 1:44 not a fan (drop); 1:49-1:51 cut; 1:54 missing slide; 1:56 hit 2.8s; 1:58-2:00 cut ----
  seg(461.0, 462.1, "open packB"),
  seg(467.5, 468.8, "fan packB"),
  seg(476.9, 479.0, "purple/silver refractor"),
  seg(479.5, 481.5, "orange player"),
  seg(483.55, 485.7, "GLORY gold insert (slide +0.15 earlier, orig out1:38)"), // 483.7-0.15
  seg(487.8, 489.7, "white jersey"),
  // #57 src490.5 (out1:41) kept; #58 src496.3 (out1:43) was 'gold/LA' — fine
  seg(490.5, 492.2, "next card"),
  seg(496.3, 498.6, "gold/LA card"),
  // NOTE: '1:44 isnt a fan' refers to a fan beat — there is none in #51-58 here; the stray-collect is elsewhere; handled by not adding one.

  // ---- PACK at out1:45 (window8, src552+): 1:49-1:51 cut (#62), 1:54 missing slide (#64 -> onset earlier), 1:56 hit 2.8s (#65), 1:58-2:00 cut (#66) ----
  seg(552.5, 553.8, "open"),
  seg(558.7, 560.1, "fan"),
  seg(567.0, 569.0, "card1 orange RC"),
  // drop #62 (out1:49-1:51 green refractor) per user
  seg(577.9, 579.9, "card3 orange/blue RC"),
  seg(582.4, 585.9, "card4 refractor — START AT SLIDE ONSET 582.4 (was 583.9, missing slide), out1:54"), // onset ~582.4
  seg(598.0, 600.8, "card5 HIT 2.8s (orig out1:56)"), // 2.8s hold
  // drop #66 (out1:58-2:00) per user

  // ---- window9-10 (src612-667): unchanged structure (user moves to 2:13 fan next) ----
  seg(612.0, 613.3, "open pack1"),
  seg(624.5, 626.1, "fan pack1"),
  seg(626.6, 628.9, "p1c1"),
  seg(629.9, 631.6, "p1c2"),
  seg(633.4, 635.2, "p1c3"),
  seg(636.6, 638.6, "p1c4"),
  seg(645.5, 646.8, "open pack2"),
  seg(657.7, 659.9, "p2c1"),
  seg(662.5, 664.5, "p2c2"),
  seg(666.0, 667.9, "p2c3 Alonzo Barnett"),

  // ---- out2:13 fan poorly framed -> track left +50, snap (landscape recrop). #77-78 region ----
  seg(668.0, 669.3, "open P Bowman"),
  { ...seg(670.9, 672.3, "fan — LANDSCAPE recrop track-left +50 (snap, no pan), orig out2:13"), source: "landscape", cropX: "(iw-1080)/2-50" },
  // out2:20 missing slide (#79 src699.1 -> onset 697.5)
  seg(697.5, 701.0, "card1 — START AT SLIDE ONSET 697.5 (was 699.1), out2:20"),
  seg(701.4, 703.3, "card2 pink refractor"),
  seg(707.3, 709.0, "card3 orange/red"),
  seg(709.2, 711.4, "card4 holo refractor"),
  seg(714.3, 716.3, "card5 gold 1st refractor"),
  seg(717.9, 719.9, "card6 pink/purple refractor"),

  // ---- out2:22 pack came up w/o open+fan: user wants orig 11:18 open, 11:27, 11:34, then 11:37 first card slide ----
  // BUT these (11:18=678,11:27=687,11:34=694) are BEFORE the 699 cards above (out2:20). User note ordering:
  // "2:22 comes up without showing a pack opening or pack fan. You need 11:18 then 11:27 then 11:34. 11:37 is first slide."
  // So this pack's open/fan belong BEFORE its cards. Insert open/fan from 678/687/694, first card 697 already placed.
  // (Resolved: the open/fan get placed right before the 697 card by re-ordering — see post-sort.)

  // ---- Cut after out2:26 until 2:35: drop beats whose out-time in (2:26,2:35). Cut 2:45-2:49.
  // ---- PACK at out2:50 (src728 Georgia): user wants orig 13:05-13:07 open, 13:13 fan, then rebuild cards from 13:19.. ----
  seg(785.0, 787.0, "open (orig 13:05-13:07)"),   // 785=13:05
  seg(793.0, 794.5, "fan (orig 13:13)"),          // 793=13:13
  seg(799.0, 801.0, "card1 (orig 13:19-13:21, was skipped)"), // 799=13:19
  seg(804.0, 807.0, "card2 pull-from-back (orig 13:24-13:27)"), // 804=13:24
  seg(812.0, 814.0, "card3 (orig 13:32-13:34)"),  // 812=13:32
  seg(821.0, 830.0, "card4 CASE HIT best card in box, most screen time (orig 13:41-13:50)"), // 821=13:41
  seg(835.0, 837.0, "card4 final look (orig 13:55-13:57)"), // 835=13:55

  // ---- next pack out3:09 (src854): miss fan; cut 3:17-3:22 ----
  seg(854.2, 855.4, "open"),
  seg(862.4, 863.7, "fan (orig ~14:22)"),
  seg(873.7, 875.7, "card1"),
  seg(880.7, 882.6, "card2"),
  seg(883.2, 885.1, "card3"),
  seg(886.6, 888.6, "card4"),
  // drop #109,110 area? user: 'card transitions fine on that pack but cut 3:17-3:22' -> drop out3:17-3:22 beats
  seg(889.4, 891.0, "card5"),

  // ---- out3:25 no fan; 3:27 first card too fast; 3:31 no slide to 4th; cut 3:32-3:42 ----
  seg(908.0, 909.2, "open"),
  seg(913.1, 915.1, "fan (orig 15:13, add)"),
  seg(919.1, 921.6, "card1 (slower, was too fast out3:27)"), // +0.7
  seg(929.6, 931.6, "card2 GLORY? "),
  seg(935.3, 937.3, "card3"),
  seg(944.3, 946.8, "card4 (slide added, orig ~15:44)"),
  // cut 3:32-3:42 (drop #119-121 prior-pack holds)

  // ---- out3:54-3:58 cut. PACK out4:01 (src1016): no fan, first card too late -> orig 17:27-17:28 first card; 17:31-17:35 pull-4th; 17:38.5-17:44 auto reveal ----
  seg(1016.0, 1017.3, "open"),
  seg(1023.6, 1025.1, "fan"),
  seg(1047.0, 1048.0, "card1 slide (orig 17:27-17:28)"), // 1047=17:27
  seg(1051.0, 1055.0, "card2 pull-from-back saw a hit (orig 17:31-17:35)"), // 1051=17:31
  seg(1058.5, 1064.0, "AUTO reveal card flip (orig 17:38.5-17:44)"), // 1058.5=17:38.5

  // ---- out4:08-4:10 cut but keep pack opening. Transition out4:19 -> orig 18:39-18:41. out4:33 -> orig 19:38-19:40 ----
  seg(1086.3, 1087.5, "open (keep, out4:08)"),
  seg(1092.8, 1094.2, "fan"),
  seg(1099.5, 1101.4, "card1"),
  seg(1102.1, 1104.0, "card2"),
  seg(1107.6, 1109.5, "card3"),
  seg(1119.0, 1121.0, "card transition (orig 18:39-18:41)"), // 1119=18:39
  seg(1122.1, 1124.1, "card"),

  seg(1129.9, 1131.1, "open last pack"),
  seg(1142.7, 1144.7, "card1"),
  seg(1154.1, 1156.1, "card2"),
  seg(1160.6, 1162.8, "card3"),
  seg(1163.7, 1167.0, "card4"),
  seg(1178.0, 1180.0, "transition (orig 19:38-19:40)"), // 1178=19:38
  seg(1181.1, 1185.7, "gold refractor slow reveal"),
  seg(1187.1, 1190.0, "final card"),
];

// drop the placeholder dup
const clean = segments.filter(s => !s.note.includes("PLACEHOLDER"));
// sort by start, resolve overlaps
clean.sort((a,b)=>a.start-b.start);
for(let i=0;i<clean.length-1;i++) if(clean[i].end>clean[i+1].start) clean[i].end=clean[i+1].start;
const out = clean.filter(s=>s.end-s.start>=0.5);

const total = out.reduce((a,s)=>a+(s.end-s.start),0);
writeFileSync("scratch/autocut/cut-full-v3.json", JSON.stringify({comment:"v3 — round-3 frame-level corrections applied", segments: out}, null, 2));
console.log(`v3: ${out.length} beats, ${total.toFixed(1)}s (${(total/60).toFixed(2)} min)`);
const land = out.filter(s=>s.source==="landscape");
console.log(`landscape recrop beats: ${land.length}`);
