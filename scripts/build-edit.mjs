#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const args = process.argv.slice(2);
const skipRender = args.includes("--no-render");
const positional = args.filter((a) => !a.startsWith("--"));
const briefPath = resolve(projectRoot, positional[0] ?? "briefs/selecthangerpack2024.json");
if (!existsSync(briefPath)) {
  console.error(`Brief not found: ${briefPath}`);
  process.exit(1);
}
const brief = JSON.parse(readFileSync(briefPath, "utf8"));

const sourceRel = brief.source;
const sourceAbs = resolve(projectRoot, sourceRel);
if (!existsSync(sourceAbs)) {
  console.error(`Source video not found: ${sourceAbs}`);
  process.exit(1);
}
const sourceSlug = basename(sourceRel, extname(sourceRel));

function parseTime(t) {
  if (typeof t === "number") return t;
  const s = String(t).trim();
  const parts = s.split(":").map(Number);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  throw new Error(`Cannot parse time: ${t}`);
}

const reveals = (brief.reveals ?? []).map((r, i) => ({
  ...r,
  index: i + 1,
  at_seconds: parseTime(r.at),
  hold: r.money_shot ? 4.0 : 1.8,
}));
reveals.sort((a, b) => a.at_seconds - b.at_seconds);

console.log(`\n=== Render ${reveals.length} title MOVs ===`);
const cardsJson = {
  video: sourceSlug,
  orientations: ["landscape"],
  cards: reveals.map((r) => ({
    value: r.value,
    label: r.label ?? "EST. VALUE",
    holdSeconds: r.hold,
    comp_image: r.comp_image,
  })),
};
const cardsJsonPath = resolve(projectRoot, "cards/cards.json");
writeFileSync(cardsJsonPath, JSON.stringify(cardsJson, null, 2));
console.log(`Wrote ${cardsJsonPath}`);

if (skipRender) {
  console.log("Skipping render (--no-render).");
  process.exit(0);
}

const renderRes = spawnSync("npm", ["run", "render:cards"], {
  cwd: resolve(projectRoot, "cards"),
  stdio: "inherit",
  shell: true,
});
if (renderRes.status !== 0) {
  console.error("Title render failed.");
  process.exit(1);
}

console.log(`\nDone. Title MOVs at cards/renders/${sourceSlug}/landscape/`);
console.log("Tell Claude what you want next (cuts, final video direction).");
