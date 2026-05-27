#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join, posix, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const inputPath = resolve(projectRoot, process.argv[2] ?? "cards.json");
if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf8"));
const videoId = input.video?.trim();
if (!videoId) {
  console.error("`video` field is required in cards.json");
  process.exit(1);
}
const cards = Array.isArray(input.cards) ? input.cards : [];
if (cards.length === 0) {
  console.error("`cards` array is empty");
  process.exit(1);
}
const orientations = input.orientations?.length ? input.orientations : ["landscape", "portrait"];

const compFor = {
  landscape: { file: "index.html", relRoot: "" },
  portrait: { file: "compositions/portrait.html", relRoot: "../" },
};

const IN_DUR = 0.45;
const OUT_DUR = 0.35;

function patchDuration(html, totalSec) {
  const dur = totalSec.toFixed(2);
  return html.replace(/data-duration="[\d.]+"/g, `data-duration="${dur}"`);
}

const compsDir = resolve(projectRoot, "comps", videoId);
const outRoot = resolve(projectRoot, "renders", videoId);
const tmpDir = resolve(projectRoot, "renders", ".tmp");
mkdirSync(outRoot, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\$/g, "usd")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function resolveCompImage(card, idx) {
  const padded = String(idx).padStart(2, "0");
  if (card.comp_image) {
    const explicit = resolve(compsDir, card.comp_image);
    return existsSync(explicit) ? card.comp_image : null;
  }
  for (const ext of IMG_EXTS) {
    const candidate = `${padded}${ext}`;
    if (existsSync(resolve(compsDir, candidate))) return candidate;
  }
  return null;
}

let total = 0;
let failed = 0;
let withComp = 0;
let withoutComp = 0;
const t0 = Date.now();

for (const orientation of orientations) {
  const cfg = compFor[orientation];
  if (!cfg) {
    console.error(`Unknown orientation: ${orientation}`);
    continue;
  }
  const orientDir = join(outRoot, orientation);
  mkdirSync(orientDir, { recursive: true });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card.value) {
      console.error(`Card #${i + 1} has no "value" — skipping`);
      continue;
    }
    const idx = i + 1;
    const padded = String(idx).padStart(2, "0");
    const slug = card.slug ? slugify(card.slug) : slugify(card.value);
    const outName = `${padded}-${slug}.mov`;
    const outPath = join(orientDir, outName);

    const compImageName = resolveCompImage(card, idx);
    const compImagePath = compImageName
      ? posix.join(cfg.relRoot + "comps", videoId, compImageName)
      : "";
    if (orientation === orientations[0]) {
      if (compImageName) withComp++;
      else withoutComp++;
    }

    const holdSeconds = Math.max(0.5, Number(card.holdSeconds) || 2.5);
    const totalSeconds = IN_DUR + holdSeconds + OUT_DUR;
    const vars = {
      value: card.value,
      label: card.label ?? "EST. VALUE",
      subtitle: card.subtitle ?? "",
      holdSeconds,
      compImage: compImagePath,
    };
    const varsPath = join(tmpDir, `${orientation}-${padded}.json`);
    writeFileSync(varsPath, JSON.stringify(vars, null, 2));

    const baseHtmlAbs = resolve(projectRoot, cfg.file);
    const baseHtmlDir = dirname(baseHtmlAbs);
    const tmpHtmlName = `__render-tmp-${orientation}-${padded}-${basename(cfg.file)}`;
    const tmpHtmlAbs = join(baseHtmlDir, tmpHtmlName);
    const tmpHtmlRelToProject = posix.normalize(
      (dirname(cfg.file) === "." ? "" : dirname(cfg.file) + "/") + tmpHtmlName,
    );
    const patched = patchDuration(readFileSync(baseHtmlAbs, "utf8"), totalSeconds);
    writeFileSync(tmpHtmlAbs, patched);

    total++;
    const compNote = compImageName ? ` (comp: ${compImageName})` : " (no comp image)";
    console.log(`\n[${total}] ${orientation} · ${outName}${compNote} · ${totalSeconds.toFixed(2)}s`);
    const r = spawnSync(
      "npx",
      [
        "--yes",
        "hyperframes@0.6.33",
        "render",
        "-c",
        tmpHtmlRelToProject,
        "--format",
        "mov",
        "--variables-file",
        varsPath,
        "-o",
        outPath,
        "--quiet",
      ],
      { cwd: projectRoot, stdio: "inherit", shell: true },
    );
    try { unlinkSync(tmpHtmlAbs); } catch {}
    if (r.status !== 0) {
      failed++;
      console.error(`  ✗ render failed (exit ${r.status})`);
    }
  }
}

rmSync(tmpDir, { recursive: true, force: true });

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(
  `\nDone. ${total - failed}/${total} renders succeeded in ${secs}s. ` +
    `${withComp}/${withComp + withoutComp} cards had comp screenshots. ` +
    `Output: renders/${videoId}/`,
);
if (withoutComp > 0) {
  console.log(
    `\nMissing comp screenshots? Drop PNGs into comps/${videoId}/ named 01.png, 02.png, ... ` +
      `(matching card order in cards.json).`,
  );
}
process.exit(failed > 0 ? 1 : 0);
