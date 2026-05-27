#!/usr/bin/env node
/**
 * Build the FULL-video cut from the live-cut backbone, applying the user's rule:
 *   - shift each card's cut-in +0.3s (I cut ~0.3s too early on reveals)
 *   - EXCEPT the first card of each pack (anchored to the pack-rip) — leave as-is
 * Pack boundaries are inferred from the large gap that precedes a new pack.
 * Window flow is preserved (segment ends unchanged), which keeps the natural
 * slides and the baked Coleman auto-pan (source 412-418) intact.
 *
 * Usage: node make-full-cut.mjs <backbone.json> <out.json> [gapThreshold=6]
 */
import { readFileSync, writeFileSync } from "node:fs";

const [inPath, outPath, gapArg] = process.argv.slice(2);
const SHIFT = 0.3;
const GAP = gapArg ? parseFloat(gapArg) : 6.0;

const { segments } = JSON.parse(readFileSync(inPath, "utf8"));
const out = [];
let prevEnd = -Infinity;
let firstOfPackCount = 0;
const packStarts = [];
let total = 0;

for (let i = 0; i < segments.length; i++) {
  const s = segments[i];
  const gapBefore = i === 0 ? Infinity : s.start - prevEnd;
  const firstOfPack = gapBefore > GAP; // new pack / section
  const start = firstOfPack ? s.start : s.start + SHIFT;
  const end = s.end;
  if (firstOfPack) { firstOfPackCount++; packStarts.push(+start.toFixed(2)); }
  total += end - start;
  out.push({ start: +start.toFixed(3), end: +end.toFixed(3), note: s.note || "", firstOfPack });
  prevEnd = s.end;
}

writeFileSync(outPath, JSON.stringify({
  comment: `FULL video. +${SHIFT}s cut-in shift on all cards except first-of-pack (gap>${GAP}s). Backbone flow preserved.`,
  segments: out,
}, null, 2));

console.log(`segments: ${out.length}`);
console.log(`packs detected (first-of-pack): ${firstOfPackCount}`);
console.log(`expected output duration: ${total.toFixed(1)}s (${(total/60).toFixed(2)} min)`);
console.log(`pack start times (s): ${packStarts.join(", ")}`);
