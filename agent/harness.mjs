#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  applyOperation,
  mapToSource,
  readJson,
  validateSegments,
  writeJson,
} from "./lib/cuts.mjs";
import {
  buildShortCutsFromCatalog,
  catalogFromConfirmedTable,
  catalogFromCuts,
  catalogFromPackSlots,
  catalogFromWindows,
  focusShortPacks,
  reconcileCatalog,
  selectCatalogCards,
  validateCatalog,
  validateConfirmedCatalog,
} from "./lib/catalog.mjs";
import { detectRevealStartsForCatalog } from "./lib/reveal-motion.mjs";
import { formatSeconds, parseTimestamp, roundTime } from "./lib/time.mjs";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const args = process.argv.slice(2);
const command = args.shift();

function usage() {
  console.log(`Usage:
  node agent/harness.mjs plan --cut <cuts.json> --instructions <instructions.json> [--out <plan.json>]
  node agent/harness.mjs apply --cut <cuts.json> --plan <plan.json> --out <cuts.out.json> --approved
  node agent/harness.mjs catalog:init --slug <slug> [--cut <cuts.json> | --windows <windows.json>] [--source <video.mp4>] [--out <catalog.json>]
  node agent/harness.mjs catalog:rewrite-slots --slug <slug> --cut <cuts.json> [--windows <windows.json>] [--source <video.mp4>] [--out <catalog.json>] [--brief <brief.json>] [--expected-packs <n> --cards-per-pack <n>]
  node agent/harness.mjs catalog:reconcile --catalog <catalog.json>
  node agent/harness.mjs catalog:focus --catalog <catalog.json>
  node agent/harness.mjs catalog:unassigned --catalog <catalog.json>
  node agent/harness.mjs catalog:evidence --catalog <catalog.json> --source <video.mp4> [--ids card-001,card-002] [--only-unknown] [--missing-evidence] [--limit 20]
  node agent/harness.mjs catalog:review --catalog <catalog.json> [--only-unknown] [--limit 20]
  node agent/harness.mjs catalog:todo --catalog <catalog.json> [--limit 20]
  node agent/harness.mjs catalog:upgrade --catalog <catalog.json>
  node agent/harness.mjs catalog:validate --catalog <catalog.json>
  node agent/harness.mjs catalog:from-table --slug <slug> --table <list.md> [--source <video.mp4>] [--out <catalog.json>] [--allow-draft]
  node agent/harness.mjs catalog:assert-confirmed --catalog <catalog.json>
  node agent/harness.mjs short:build --catalog <confirmed-catalog.json> --out <cuts.json> [--base-hold 0.85] [--insert-hold 0.85] [--hit-hold 1.25] [--slide-lead 0.22] [--transition-style card-start|hold-then-slide] [--slide-duration 0.55]
  node agent/harness.mjs short:detect-reveals --catalog <confirmed-catalog.json> --source <portrait-video.mp4> --out <catalog.detected.json> [--ids card-001,card-002] [--limit 20] [--min-confidence 0.7] [--allow-landscape-detection]
  node agent/harness.mjs short:review-detections --catalog <catalog.detected.json> --source <video.mp4> [--out-dir <dir>] [--mode all|accepted|needs-review|needs-earlier|needs-later|manual-pending|fallback|detected]
  node agent/harness.mjs short:apply-detection-review --catalog <catalog.detected.json> --review <review.json> --out <catalog.reviewed.json>
  node agent/harness.mjs short:gate --catalog <catalog.reviewed.json> --cut <cuts.json> [--out <gate.md>] [--strict] [--min-hold 1.2] [--min-slide 0.55]
  node agent/harness.mjs short:map-output --cut <cuts.json> --times <MM:SS,SS,...> [--out <map.md>] [--context 1]
  node agent/harness.mjs short:audit-reveals --cut <cuts.json> --source <video.mp4> [--out-dir <dir>] [--ids card-001,card-002] [--limit 20]
  node agent/harness.mjs render --slug <slug> --cut <cuts.json> [--input portrait] [--no-audio] [--out <output.mp4>] [--out-suffix <suffix>]

Instruction JSON:
  {
    "slug": "bowmanchrome2025",
    "defaultTimeline": "source",
    "instructions": [
      {
        "text": "3:34 insert missing card",
        "operation": "insert_segment",
        "timeline": "source",
        "start": "3:34",
        "end": "3:36",
        "note": "card: user specified",
        "locked": true
      }
    ]
  }`);
}

function opt(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function has(name) {
  return args.includes(name);
}

function probeVideoDimensions(sourcePath, ffprobe = "ffprobe") {
  const result = spawnSync(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    sourcePath,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`ffprobe failed while checking reveal source shape: ${stderr || `status=${result.status}`}`);
  }
  const [width, height] = result.stdout.trim().split("x").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Could not read reveal source dimensions from ffprobe output: ${result.stdout.trim()}`);
  }
  return { width, height };
}

function assertRevealDetectionSourceShape(sourcePath) {
  const { width, height } = probeVideoDimensions(sourcePath, opt("--ffprobe", "ffprobe"));
  if (width > height) {
    throw new Error(
      `Reveal detection requires the portrait/card-centered working source, but ${sourcePath} is ${width}x${height}. ` +
      `Create/use cards/sources/<slug>/<slug>-portrait.mp4 before running short:detect-reveals. ` +
      `Use --allow-landscape-detection only for detector debugging, not production cuts.`,
    );
  }
}

function requireOpt(name) {
  const value = opt(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function mdTable(rows) {
  const header = [
    "| # | User instruction | Operation | Timeline | Parsed input | Source time | Target segment | Status |",
    "|---:|---|---|---|---:|---:|---|---|",
  ];
  return [
    ...header,
    ...rows.map((row, i) => {
      const seg =
        row.segmentIndex === null || row.segmentIndex === undefined
          ? "new segment"
          : `#${row.segmentIndex + 1} ${formatSeconds(row.segment?.sourceStart)}-${formatSeconds(row.segment?.sourceEnd)}`;
      return `| ${i + 1} | ${escapeCell(row.sourceInstruction)} | \`${row.operation}\` | ${row.timeline} | ${formatSeconds(row.inputSeconds)} | ${formatSeconds(row.sourceSeconds)} | ${escapeCell(seg)} | ${escapeCell(row.status)} |`;
    }),
    "",
  ].join("\n");
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function normalizeInstruction(instruction, cut, defaults) {
  const timeline = instruction.timeline || defaults.defaultTimeline || "source";
  const operation = instruction.operation;
  const sourceInstruction = instruction.text || instruction.sourceInstruction || "";
  if (!operation) throw new Error(`Instruction missing operation: ${sourceInstruction}`);

  if (operation === "insert_segment") {
    const start = roundTime(mapToSource(cut.segments, timeline, instruction.start ?? instruction.at).sourceSeconds);
    const end = instruction.end
      ? roundTime(mapToSource(cut.segments, timeline, instruction.end).sourceSeconds)
      : roundTime(start + parseTimestamp(instruction.duration ?? 1.5));
    const overlaps = cut.segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => start < segment.end && end > segment.start);
    const overlapStatus = overlaps.length
      ? ` WARNING overlaps ${overlaps.map(({ index }) => `#${index + 1}`).join(", ")}; apply will fail until adjusted`
      : "";
    return {
      sourceInstruction,
      operation,
      timeline,
      inputSeconds: parseTimestamp(instruction.start ?? instruction.at),
      sourceSeconds: start,
      start,
      end,
      segmentIndex: null,
      segment: null,
      note: instruction.note || sourceInstruction,
      pack: instruction.pack,
      locked: true,
      status: `will insert locked segment ${formatSeconds(start)}-${formatSeconds(end)}${overlapStatus}`,
    };
  }

  const mapped = mapToSource(cut.segments, timeline, instruction.at ?? instruction.time);
  const segmentIndex =
    Number.isInteger(instruction.segmentIndex) ? instruction.segmentIndex : mapped.segmentIndex;
  if (operation !== "noop" && !Number.isInteger(segmentIndex)) {
    throw new Error(
      `Instruction "${sourceInstruction}" maps to ${formatSeconds(mapped.sourceSeconds)} source, but that time is not inside any current segment. Use insert_segment, or give an explicit segmentIndex if you really mean to edit a segment by number.`,
    );
  }
  const base = {
    sourceInstruction,
    operation,
    timeline,
    inputSeconds: mapped.inputSeconds,
    sourceSeconds: mapped.sourceSeconds,
    segmentIndex,
    segment: mapped.segment,
    note: instruction.note,
    locked: true,
  };

  if (operation === "remove_segment") {
    return { ...base, status: `will remove segment #${segmentIndex + 1}` };
  }
  if (operation === "replace_start") {
    return { ...base, status: `will set segment #${segmentIndex + 1} start to ${formatSeconds(mapped.sourceSeconds)}` };
  }
  if (operation === "replace_end") {
    return { ...base, status: `will set segment #${segmentIndex + 1} end to ${formatSeconds(mapped.sourceSeconds)}` };
  }
  if (operation === "lock_segment") {
    return { ...base, status: `will lock segment #${segmentIndex + 1}` };
  }
  if (operation === "set_note") {
    return { ...base, status: `will set note on segment #${segmentIndex + 1}` };
  }
  if (operation === "noop") {
    return { ...base, status: "no edit; recorded for audit trail" };
  }

  throw new Error(`Unsupported operation "${operation}"`);
}

function planCommand() {
  const cutPath = resolve(root, requireOpt("--cut"));
  const instructionsPath = resolve(root, requireOpt("--instructions"));
  if (!existsSync(cutPath)) throw new Error(`Cut file not found: ${cutPath}`);
  if (!existsSync(instructionsPath)) throw new Error(`Instructions file not found: ${instructionsPath}`);

  const cut = readJson(cutPath);
  const instructionsDoc = readJson(instructionsPath);
  const instructions = instructionsDoc.instructions || [];
  if (!Array.isArray(instructions) || instructions.length === 0) {
    throw new Error("Instruction file needs a non-empty instructions array");
  }

  const steps = instructions.map((instruction) =>
    normalizeInstruction(instruction, cut, instructionsDoc),
  );
  const plan = {
    createdAt: new Date().toISOString(),
    requiresConfirmation: true,
    approved: false,
    cutPath,
    instructionsPath,
    steps,
  };

  const outPath = resolve(
    root,
    opt("--out", `agent/state/plans/${instructionsDoc.slug || "edit"}-${Date.now()}.plan.json`),
  );
  writeJson(outPath, plan);

  const table = mdTable(steps);
  const mdPath = outPath.replace(/\.json$/i, ".md");
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, `# Edit Instruction Interpretation\n\n${table}`);

  console.log(table);
  console.log(`Plan written: ${outPath}`);
  console.log(`Review table: ${mdPath}`);
  console.log("No render should run until this plan is reviewed and applied with --approved.");
}

function applyCommand() {
  if (!has("--approved")) {
    throw new Error("Refusing to apply without --approved. Review the plan table first.");
  }

  const cutPath = resolve(root, requireOpt("--cut"));
  const planPath = resolve(root, requireOpt("--plan"));
  const outPath = resolve(root, requireOpt("--out"));
  const cut = readJson(cutPath);
  const plan = readJson(planPath);

  let segments = cut.segments;
  for (const step of plan.steps) {
    segments = applyOperation(segments, step);
  }

  const errors = validateSegments(segments);
  if (errors.length) {
    throw new Error(`Applied cut failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  writeJson(outPath, {
    ...cut,
    comment: `Applied approved agent plan ${planPath}`,
    segments,
  });
  console.log(`Applied ${plan.steps.length} approved instruction(s).`);
  console.log(`Wrote: ${outPath}`);
}

function catalogInitCommand() {
  const slug = requireOpt("--slug");
  const source = opt("--source", `${slug}.mp4`);
  const outPath = resolve(root, opt("--out", `briefs/catalogs/${slug}.json`));
  const cutPath = opt("--cut");
  const windowsPath = opt("--windows");

  if (!cutPath && !windowsPath) {
    throw new Error("catalog:init needs either --cut <cuts.json> or --windows <windows.json>");
  }
  if (cutPath && windowsPath) {
    throw new Error("catalog:init accepts one source at a time: use --cut or --windows, not both");
  }

  const catalog = cutPath
    ? catalogFromCuts({
        slug,
        source,
        cuts: readJson(resolve(root, cutPath)),
      })
    : catalogFromWindows({
        slug,
        source,
        windows: readJson(resolve(root, windowsPath)),
      });

  const errors = validateCatalog(catalog);
  if (errors.length) {
    throw new Error(`Catalog failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }
  writeJson(outPath, catalog);
  console.log(`Catalog initialized: ${outPath}`);
  console.log(`${catalog.cards.length} card entries, ${catalog.windows?.length || 0} pack windows`);
}

function readBriefForSlug(slug) {
  const briefPath = resolve(root, opt("--brief", `briefs/${slug}.json`));
  return existsSync(briefPath)
    ? { path: briefPath, data: readJson(briefPath) }
    : { path: briefPath, data: null };
}

function positiveInteger(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer, got "${value}"`);
  }
  return n;
}

function positiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} must be a positive number, got "${value}"`);
  }
  return n;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function resolvePackSlotSettings(slug) {
  const brief = readBriefForSlug(slug);
  const expectedPacksValue = firstDefined(
    opt("--expected-packs"),
    brief.data?.expected_packs,
    brief.data?.expectedPacks,
    brief.data?.pack_count,
    brief.data?.packCount,
  );
  const cardsPerPackValue = firstDefined(
    opt("--cards-per-pack"),
    brief.data?.cards_per_pack,
    brief.data?.cardsPerPack,
  );

  if (!expectedPacksValue || !cardsPerPackValue) {
    const missing = [
      !expectedPacksValue ? "expected_packs" : null,
      !cardsPerPackValue ? "cards_per_pack" : null,
    ].filter(Boolean).join(" and ");
    throw new Error(
      [
        `Pack-slot catalog needs ${missing} before editing "${slug}".`,
        `Question for user: How many packs/sections are in this video, and how many cards are in each pack/section?`,
        `Save the answer in ${brief.path} as:`,
        `{ "expected_packs": 20, "cards_per_pack": 4 }`,
        `or rerun with: --expected-packs <n> --cards-per-pack <n>`,
      ].join("\n"),
    );
  }

  return {
    expectedPacks: positiveInteger(expectedPacksValue, "expected_packs"),
    cardsPerPack: positiveInteger(cardsPerPackValue, "cards_per_pack"),
    source: brief.path,
  };
}

function catalogRewriteSlotsCommand() {
  const slug = requireOpt("--slug");
  const cutPath = resolve(root, requireOpt("--cut"));
  const windowsPath = opt("--windows");
  const source = opt("--source", `${slug}.mp4`);
  const { expectedPacks, cardsPerPack, source: settingsSource } = resolvePackSlotSettings(slug);
  const outPath = resolve(root, opt("--out", `briefs/catalogs/${slug}.pack-slots.json`));
  const catalog = catalogFromPackSlots({
    slug,
    source,
    cut: readJson(cutPath),
    windows: windowsPath ? readJson(resolve(root, windowsPath)) : null,
    expectedPacks,
    cardsPerPack,
  });
  const errors = validateCatalog(catalog);
  if (errors.length) {
    throw new Error(`Pack-slot catalog failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }
  writeJson(outPath, catalog);
  const summary = reconcileCatalog(catalog);
  console.log(`Pack-slot catalog written: ${outPath}`);
  console.log(`Pack-slot settings: ${expectedPacks} packs x ${cardsPerPack} cards from ${settingsSource}`);
  if (windowsPath) console.log(`Pack obligations from windows: ${resolve(root, windowsPath)}`);
  printReconcile(summary);
}

function printReconcile(summary) {
  console.log(
    `Expected ${summary.expectedPacks} packs x ${summary.cardsPerPack} cards = ${summary.expectedCards} cards`,
  );
  console.log(
    `Rows=${summary.rows} located=${summary.locatedCards} missing=${summary.missingCards} named=${summary.namedCards} locked=${summary.lockedCards} unassignedCandidates=${summary.unassignedCandidates}`,
  );
  console.log("| Pack | Status | Located | Missing | Overflow | Source window |");
  console.log("|---:|---|---:|---:|---:|---|");
  for (const pack of summary.packs) {
    const sourceWindow =
      Number.isFinite(pack.sourceStart) && Number.isFinite(pack.sourceEnd)
        ? `${formatSeconds(pack.sourceStart)}-${formatSeconds(pack.sourceEnd)}`
        : "";
    console.log(
      `| ${pack.pack} | ${pack.status} | ${pack.assignedCards} | ${pack.missingCards} | ${pack.overflowCards} | ${sourceWindow} |`,
    );
  }
  if (summary.missingIds.length) {
    console.log(`Missing card slots: ${summary.missingIds.join(", ")}`);
  }
}

function catalogReconcileCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  const errors = validateCatalog(catalog);
  if (errors.length) {
    throw new Error(`Catalog failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }
  printReconcile(reconcileCatalog(catalog));
}

function catalogFocusCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  const errors = validateCatalog(catalog);
  if (errors.length) {
    throw new Error(`Catalog failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }
  const shortPacks = focusShortPacks(catalog);
  if (!shortPacks.length) {
    console.log("All packs satisfy the configured card count.");
    return;
  }
  console.log("| Pack | Located | Missing | Source focus range | Missing slots |");
  console.log("|---:|---:|---:|---|---|");
  for (const pack of shortPacks) {
    const source =
      Number.isFinite(pack.sourceStart) && Number.isFinite(pack.sourceEnd)
        ? `${formatSeconds(pack.sourceStart)}-${formatSeconds(pack.sourceEnd)}`
        : "";
    console.log(
      `| ${pack.pack} | ${pack.located} | ${pack.missing} | ${source} | ${pack.missingIds.join(", ")} |`,
    );
  }
  console.log("Focus rule: inspect each range from pack open/window start until the next pack begins and locate the missing card reveals before asking the user for timestamps.");
}

function catalogUnassignedCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  const candidates = catalog.unassignedCandidates || [];
  if (!candidates.length) {
    console.log("No unassigned candidates.");
    return;
  }
  console.log("| # | Detected pack | Source | Type | Note | Reason |");
  console.log("|---:|---:|---:|---|---|---|");
  candidates.forEach((candidate, index) => {
    const source = `${formatSeconds(candidate.sourceStart)}-${formatSeconds(candidate.sourceEnd)}`;
    console.log(
      `| ${index + 1} | ${candidate.detectedPack ?? ""} | ${source} | ${candidate.beatType || ""} | ${escapeCell(candidate.note || "")} | ${escapeCell(candidate.reason || "")} |`,
    );
  });
}

function catalogValidateCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  const errors = validateCatalog(catalog);
  if (errors.length) {
    console.error(`Catalog invalid: ${catalogPath}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const named = catalog.cards.filter((card) => card.name && card.name !== "UNKNOWN").length;
  const locked = catalog.cards.filter((card) => card.locked).length;
  console.log(`Catalog valid: ${catalogPath}`);
  console.log(`${catalog.cards.length} cards, ${named} named, ${locked} locked`);
}

function catalogFromTableCommand() {
  const slug = requireOpt("--slug");
  const tablePath = resolve(root, requireOpt("--table"));
  if (!existsSync(tablePath)) throw new Error(`Confirmed card table not found: ${tablePath}`);

  const source = opt("--source", readBriefForSlug(slug).data?.source || `${slug}.mp4`);
  const { expectedPacks, cardsPerPack, source: settingsSource } = resolvePackSlotSettings(slug);
  const outPath = resolve(root, opt("--out", `briefs/catalogs/${slug}.confirmed.json`));
  const requireConfirmed = !has("--allow-draft");
  const catalog = catalogFromConfirmedTable({
    slug,
    source,
    markdown: readFileSync(tablePath, "utf8"),
    expectedPacks,
    cardsPerPack,
    requireConfirmed,
  });

  writeJson(outPath, catalog);
  console.log(`Confirmed catalog written: ${outPath}`);
  console.log(`Source table: ${tablePath}`);
  console.log(`Pack settings: ${expectedPacks} packs x ${cardsPerPack} cards from ${settingsSource}`);
  printReconcile(reconcileCatalog(catalog));
}

function catalogAssertConfirmedCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  const errors = validateConfirmedCatalog(catalog);
  if (errors.length) {
    console.error(`Confirmed catalog invalid: ${catalogPath}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Confirmed catalog valid: ${catalogPath}`);
  printReconcile(reconcileCatalog(catalog));
}

function shortBuildCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const outPath = resolve(root, requireOpt("--out"));
  const catalog = readJson(catalogPath);
  const cut = buildShortCutsFromCatalog({
    catalog,
    baseHold: opt("--base-hold") ? positiveNumber(opt("--base-hold"), "--base-hold") : undefined,
    insertHold: opt("--insert-hold") ? positiveNumber(opt("--insert-hold"), "--insert-hold") : undefined,
    hitHold: opt("--hit-hold") ? positiveNumber(opt("--hit-hold"), "--hit-hold") : undefined,
    gap: opt("--gap") ? positiveNumber(opt("--gap"), "--gap") : undefined,
    minHold: opt("--min-hold") ? positiveNumber(opt("--min-hold"), "--min-hold") : undefined,
    slideLead: opt("--slide-lead") ? positiveNumber(opt("--slide-lead"), "--slide-lead") : undefined,
    slideDuration: opt("--slide-duration") ? positiveNumber(opt("--slide-duration"), "--slide-duration") : undefined,
    transitionStyle: opt("--transition-style") || undefined,
  });
  writeJson(outPath, cut);
  const warnings = cut.segments.filter((segment) => segment.warning);
  console.log(`Catalog-driven short cut written: ${outPath}`);
  console.log(`${cut.segments.length} locked card segment(s).`);
  if (warnings.length) {
    console.log(`Warnings: ${warnings.length} short holds`);
    for (const segment of warnings) {
      console.log(`- ${segment.cardId} ${segment.cardName}: ${segment.warning}`);
    }
  }
}

function shortMapOutputCommand() {
  const cutPath = resolve(root, requireOpt("--cut"));
  const outPath = opt("--out") ? resolve(root, opt("--out")) : null;
  const times = parseTimestampList(requireOpt("--times"));
  const context = opt("--context") ? Math.max(0, Math.floor(Number(opt("--context")))) : 1;
  const cut = readJson(cutPath);
  const errors = validateSegments(cut.segments || []);
  if (errors.length) throw new Error(`Cut validation failed: ${errors.join("; ")}`);
  const mappedSegments = outputSegments(cut.segments || []);
  const rows = [];

  for (const time of times) {
    const currentIndex = outputSegmentIndexAt(mappedSegments, time);
    const fallbackIndex = currentIndex >= 0
      ? currentIndex
      : Math.max(0, Math.min(mappedSegments.length - 1, outputSegmentInsertionIndex(mappedSegments, time)));
    const startIndex = Math.max(0, fallbackIndex - context);
    const endIndex = Math.min(mappedSegments.length - 1, fallbackIndex + context);
    for (let index = startIndex; index <= endIndex; index++) {
      const segment = mappedSegments[index];
      rows.push({
        queryTime: time,
        relation: index === currentIndex ? "hit" : (index < fallbackIndex ? "prev" : "next"),
        segmentNumber: index + 1,
        segment,
      });
    }
  }

  const markdown = outputMapMarkdown({ cutPath, rows });
  if (outPath) {
    writeFileSync(outPath, markdown);
    console.log(`Output timestamp map written: ${outPath}`);
  } else {
    console.log(markdown);
  }
}

function parseTimestampList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => roundTime(parseTimestamp(item)));
}

function outputSegments(segments) {
  let outputStart = 0;
  return segments.map((segment) => {
    const duration = roundTime(Number(segment.end) - Number(segment.start));
    const mapped = {
      ...segment,
      outputStart: roundTime(outputStart),
      outputEnd: roundTime(outputStart + duration),
      outputDuration: duration,
    };
    outputStart = mapped.outputEnd;
    return mapped;
  });
}

function outputSegmentIndexAt(mappedSegments, time) {
  return mappedSegments.findIndex((segment, index) => {
    const isFinal = index === mappedSegments.length - 1;
    return time >= segment.outputStart && (time < segment.outputEnd || (isFinal && time === segment.outputEnd));
  });
}

function outputSegmentInsertionIndex(mappedSegments, time) {
  const nextIndex = mappedSegments.findIndex((segment) => time < segment.outputStart);
  if (nextIndex >= 0) return nextIndex;
  return mappedSegments.length - 1;
}

function outputMapMarkdown({ cutPath, rows }) {
  return [
    "# Output Timestamp Map",
    "",
    `Cut: ${relative(root, cutPath).replaceAll("\\", "/")}`,
    "",
    "| Query | Relation | Segment | Output window | Source window | Card | Role | Hold | Transition | Slide end | Reveals next |",
    "|---:|---|---:|---:|---:|---|---|---:|---:|---:|---|",
    ...rows.map(({ queryTime, relation, segmentNumber, segment }) => {
      const outputWindow = `${formatSeconds(segment.outputStart)}-${formatSeconds(segment.outputEnd)}`;
      const sourceWindow = `${formatSeconds(segment.start)}-${formatSeconds(segment.end)}`;
      const card = `${segment.cardId || ""} ${segment.cardName || segment.note || ""}`.trim();
      const revealsNext = `${segment.revealsNextCardId || ""} ${segment.revealsNextCardName || ""}`.trim();
      return `| ${formatSeconds(queryTime)} | ${relation} | ${segmentNumber} | ${outputWindow} | ${sourceWindow} | ${escapeCell(card)} | ${escapeCell(segment.clipRole || "")} | ${formatSeconds(segment.holdDuration)} | ${formatSeconds(segment.transitionStart)} | ${formatSeconds(segment.slideEnd)} | ${escapeCell(revealsNext)} |`;
    }),
    "",
  ].join("\n");
}

function shortGateCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const cutPath = resolve(root, requireOpt("--cut"));
  const outPath = opt("--out") ? resolve(root, opt("--out")) : cutPath.replace(/\.json$/i, ".gate.md");
  if (!existsSync(catalogPath)) throw new Error(`Catalog not found: ${catalogPath}`);
  if (!existsSync(cutPath)) throw new Error(`Cut not found: ${cutPath}`);

  const catalog = readJson(catalogPath);
  const cut = readJson(cutPath);
  const minHold = opt("--min-hold") ? positiveNumber(opt("--min-hold"), "--min-hold") : 1.2;
  const minSlide = opt("--min-slide") ? positiveNumber(opt("--min-slide"), "--min-slide") : 0.55;
  const maxDefaultSlide = opt("--max-default-slide") ? positiveNumber(opt("--max-default-slide"), "--max-default-slide") : 0.7;
  const findings = revealGateFindings({
    catalog,
    cut,
    minHold,
    minSlide,
    maxDefaultSlide,
    warnDefaultSlide: has("--warn-default-slide"),
    warnDetected: has("--warn-detected"),
  });
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  writeFileSync(outPath, revealGateMarkdown({
    catalogPath,
    cutPath,
    outPath,
    findings,
    minHold,
    minSlide,
    maxDefaultSlide,
  }));
  console.log(`Reveal gate report written: ${outPath}`);
  console.log(`Reveal gate: ${blockers.length ? "BLOCK" : "PASS"} (${blockers.length} blocker(s), ${warnings.length} warning(s))`);
  for (const finding of orderedFindings(findings).slice(0, 20)) {
    console.log(`- ${finding.severity.toUpperCase()} ${finding.transition}: ${finding.problem}`);
  }
  if (findings.length > 20) console.log(`... ${findings.length - 20} more finding(s) in report`);
  if (blockers.length && has("--strict")) process.exit(1);
}

function revealGateFindings({ catalog, cut, minHold, minSlide, maxDefaultSlide, warnDefaultSlide, warnDetected }) {
  const cardsById = new Map((catalog.cards || []).map((card) => [card.id, card]));
  const findings = [];
  for (const segment of cut.segments || []) {
    if (!segment.revealsNextCardId) continue;
    const next = cardsById.get(segment.revealsNextCardId);
    const current = cardsById.get(segment.cardId);
    const transition = next && current
      ? `P${current.pack}C${current.cardInPack}->P${next.pack}C${next.cardInPack}`
      : `${segment.cardId}->${segment.revealsNextCardId}`;
    const cardName = next?.name || segment.revealsNextCardName || "";
    const hold = Number(segment.holdDuration);
    const slide = Number(segment.slideDuration);
    const evidence = [
      Number.isFinite(segment.transitionStart) ? `transition=${formatSeconds(segment.transitionStart)}` : null,
      Number.isFinite(segment.slideEnd) ? `slideEnd=${formatSeconds(segment.slideEnd)}` : null,
      Number.isFinite(hold) ? `hold=${hold.toFixed(2)}s` : null,
      Number.isFinite(slide) ? `slide=${slide.toFixed(2)}s` : null,
    ].filter(Boolean).join(", ");

    if (!next) {
      findings.push(gateFinding("blocker", transition, segment.revealsNextCardId, cardName, "transition references a card missing from the catalog", evidence, "Fix the cut/card id mismatch before rendering."));
      continue;
    }

    if (isRevealManualException(next)) {
      continue;
    }

    const humanReviewed = hasHumanReviewedReveal(next);

    if (next.revealStartStatus === "fallback" && !humanReviewed) {
      findings.push(gateFinding("blocker", transition, next.id, cardName, "reveal start came from fallback timing and has not been visually reviewed", evidence, "Review this transition visually and store set_seconds if the fallback is wrong."));
    } else if (!hasReviewedOrDetectedReveal(next)) {
      findings.push(gateFinding("blocker", transition, next.id, cardName, "same-pack reveal start is not reviewed or detector-accepted", evidence, "Run reveal detection/review, or apply a set_seconds review for this card."));
    }
    if (Number.isFinite(hold) && hold < minHold) {
      const severity = humanReviewed ? "warning" : "blocker";
      const fix = humanReviewed
        ? "This is human-reviewed; recheck only if the render still feels rushed."
        : "Review the transition; use set_seconds, revealEndSeconds, or set_hold if this is intentional.";
      findings.push(gateFinding(severity, transition, next.id, cardName, `pre-slide hold is below ${minHold}s`, evidence, fix));
    }
    if (Number.isFinite(slide) && slide < minSlide) {
      findings.push(gateFinding("blocker", transition, next.id, cardName, `slide window is below ${minSlide}s`, evidence, "Extend the slide with revealEndSeconds or correct the reveal start."));
    }
    if (warnDefaultSlide && hasExplicitRevealStart(next) && !Number.isFinite(next.revealEndSeconds) && Number.isFinite(slide) && slide <= maxDefaultSlide) {
      findings.push(gateFinding("warning", transition, next.id, cardName, "uses default slide end instead of reviewed revealEndSeconds", evidence, "If this transition snaps, add revealEndSeconds for the next card."));
    }
    if (warnDetected && next.revealStartStatus === "detected" && !next.revealUserReviewed) {
      findings.push(gateFinding("warning", transition, next.id, cardName, "detector-accepted reveal has not been human-reviewed", evidence, "Leave it if it watches clean; otherwise add a review item."));
    }
  }
  return findings;
}

function hasReviewedOrDetectedReveal(card) {
  return hasHumanReviewedReveal(card) ||
    (card.revealStartAccepted && hasExplicitRevealStart(card));
}

function hasHumanReviewedReveal(card) {
  return Boolean(card.revealUserReviewed) ||
    ["accept", "accept_last_card", "set_seconds", "shifted", "set_hold"].includes(card.revealUserReviewStatus);
}

function isRevealManualException(card) {
  return ["manual_exception", "accept_last_card"].includes(card.revealUserReviewStatus);
}

function hasExplicitRevealStart(card) {
  return Number.isFinite(card.cutStartSeconds) || Number.isFinite(card.revealStartSeconds) || Number.isFinite(card.cutStart);
}

function gateFinding(severity, transition, cardId, cardName, problem, evidence, fix) {
  return { severity, transition, cardId, cardName, problem, evidence, fix };
}

function revealGateMarkdown({ catalogPath, cutPath, outPath, findings, minHold, minSlide, maxDefaultSlide }) {
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const rows = findings.length
    ? orderedFindings(findings).map((finding) => `| ${finding.severity} | ${escapeCell(finding.transition)} | ${escapeCell(finding.cardId)} | ${escapeCell(finding.cardName)} | ${escapeCell(finding.problem)} | ${escapeCell(finding.evidence)} | ${escapeCell(finding.fix)} |`)
    : ["| pass |  |  |  | No reveal gate findings. |  |  |"];
  return [
    "# Reveal Gate",
    "",
    `Catalog: ${relative(root, catalogPath).replaceAll("\\", "/")}`,
    `Cut: ${relative(root, cutPath).replaceAll("\\", "/")}`,
    `Report: ${relative(root, outPath).replaceAll("\\", "/")}`,
    "",
    `Status: ${blockers.length ? "BLOCK" : "PASS"}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    `Thresholds: minHold=${minHold}s, minSlide=${minSlide}s, maxDefaultSlide=${maxDefaultSlide}s`,
    "",
    "| Severity | Transition | Card ID | Card | Problem | Evidence | Fix |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function orderedFindings(findings) {
  return findings.slice().sort((a, b) => {
    const severity = severityRank(a.severity) - severityRank(b.severity);
    if (severity) return severity;
    return String(a.transition).localeCompare(String(b.transition), undefined, { numeric: true });
  });
}

function severityRank(severity) {
  if (severity === "blocker") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function shortDetectRevealsCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const sourcePath = resolve(root, requireOpt("--source"));
  const outPath = resolve(root, requireOpt("--out"));
  if (!existsSync(catalogPath)) throw new Error(`Catalog not found: ${catalogPath}`);
  if (!existsSync(sourcePath)) throw new Error(`Source video not found: ${sourcePath}`);
  if (!has("--allow-landscape-detection")) assertRevealDetectionSourceShape(sourcePath);

  const catalog = readJson(catalogPath);
  const errors = validateConfirmedCatalog(catalog);
  if (errors.length) {
    throw new Error(`Confirmed catalog failed validation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const ids = new Set(parseIds(opt("--ids")));
  const limit = opt("--limit") ? positiveInteger(opt("--limit"), "--limit") : null;
  const minConfidence = opt("--min-confidence") ? positiveNumber(opt("--min-confidence"), "--min-confidence") : 0.7;
  const applyFallback = has("--apply-fallback");
  const limitedIds = limit ? new Set((catalog.cards || []).slice(0, limit).map((card) => card.id)) : null;
  const wantedIds = new Set(ids.size ? ids : limitedIds || []);
  const results = detectRevealStartsForCatalog({
    catalog,
    sourcePath,
    ids: wantedIds,
    options: {
      fps: opt("--fps") ? positiveNumber(opt("--fps"), "--fps") : undefined,
      lookback: opt("--lookback") ? positiveNumber(opt("--lookback"), "--lookback") : undefined,
      lookahead: opt("--lookahead") ? positiveNumber(opt("--lookahead"), "--lookahead") : undefined,
      fallbackLead: opt("--fallback-lead") ? positiveNumber(opt("--fallback-lead"), "--fallback-lead") : undefined,
      preRoll: opt("--pre-roll") ? positiveNumber(opt("--pre-roll"), "--pre-roll") : undefined,
      ffmpeg: opt("--ffmpeg", "ffmpeg"),
    },
  });

  const resultById = new Map(results.map((result) => [result.cardId, result]));
  const updated = {
    ...catalog,
    source: relative(root, sourcePath).replaceAll("\\", "/"),
    revealDetection: {
      generatedAt: new Date().toISOString(),
      source: relative(root, sourcePath).replaceAll("\\", "/"),
      inputCatalog: relative(root, catalogPath).replaceAll("\\", "/"),
      detector: "right-thumb-plus-bottom-reveal-motion-v1",
      note: "Later cards use detected upward reveal motion; first cards in packs keep their held-in-hand catalog timestamp.",
    },
    cards: (catalog.cards || []).map((card) => {
      const result = resultById.get(card.id);
      if (!result || result.status === "skipped_unrequested") return card;
      if (card.cardInPack <= 1) return card;
      const accepted =
        result.status === "detected" && Number.isFinite(result.detectedStart) && result.confidence >= minConfidence;
      const fallbackAccepted =
        applyFallback && result.status === "fallback" && Number.isFinite(result.detectedStart);
      return {
        ...card,
        ...(accepted || fallbackAccepted ? {
          cutStartSeconds: result.detectedStart,
          revealStartSeconds: result.detectedStart,
        } : {}),
        revealStartCandidateSeconds: result.detectedStart,
        revealStartDetectedBy: "right-thumb-plus-bottom-reveal-motion-v1",
        revealStartConfidence: result.confidence,
        revealStartStatus: result.status,
        revealStartAccepted: accepted || fallbackAccepted,
        revealStartLead: result.lead,
        revealStartWindow: {
          start: result.windowStart,
          end: result.windowEnd,
        },
      };
    }),
  };

  writeJson(outPath, updated);
  const reviewPath = outPath.replace(/\.json$/i, ".reveal-detect.md");
  writeFileSync(reviewPath, revealDetectionMarkdown({
    sourcePath,
    catalogPath,
    outPath,
    catalog,
    results,
    minConfidence,
  }));

  const detected = results.filter((result) => result.status === "detected").length;
  const fallback = results.filter((result) => result.status === "fallback").length;
  const accepted = updated.cards.filter((card) => card.revealStartAccepted).length;
  console.log(`Reveal-detected catalog written: ${outPath}`);
  console.log(`Review table: ${reviewPath}`);
  console.log(`Detected=${detected} fallback=${fallback} accepted=${accepted} first-card/skipped=${results.length - detected - fallback}`);
}

function shortReviewDetectionsCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const sourcePath = resolve(root, requireOpt("--source"));
  if (!existsSync(catalogPath)) throw new Error(`Catalog not found: ${catalogPath}`);
  if (!existsSync(sourcePath)) throw new Error(`Source video not found: ${sourcePath}`);

  const catalog = readJson(catalogPath);
  const errors = validateConfirmedCatalog(catalog);
  if (errors.length) {
    throw new Error(`Confirmed catalog failed validation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const ids = new Set(parseIds(opt("--ids")));
  const mode = opt("--mode", "all");
  const validModes = new Set(["all", "accepted", "needs-review", "needs-earlier", "needs-later", "manual-pending", "fallback", "detected"]);
  if (!validModes.has(mode)) throw new Error(`--mode must be one of ${Array.from(validModes).join(", ")}`);
  const limit = opt("--limit") ? positiveInteger(opt("--limit"), "--limit") : null;
  const before = opt("--before") ? positiveNumber(opt("--before"), "--before") : 0.25;
  const after = opt("--after") ? positiveNumber(opt("--after"), "--after") : 0.95;
  const fps = opt("--fps") ? positiveNumber(opt("--fps"), "--fps") : 10;
  const scale = opt("--scale") ? positiveInteger(opt("--scale"), "--scale") : 240;
  const cols = opt("--cols") ? positiveInteger(opt("--cols"), "--cols") : 4;
  const rows = opt("--rows") ? positiveInteger(opt("--rows"), "--rows") : 3;
  const ffmpeg = opt("--ffmpeg", "ffmpeg");
  const slug = catalog.slug || basename(catalogPath).replace(/\.json$/i, "");
  const outDir = resolve(root, opt("--out-dir", `scratch/reveal-detection-review/${slug}`));

  let selected = (catalog.cards || [])
    .filter((card) => has("--include-first") || card.cardInPack > 1)
    .filter((card) => !ids.size || ids.has(card.id))
    .filter((card) => detectionModeMatches(card, mode));
  if (limit) selected = selected.slice(0, limit);
  if (!selected.length) throw new Error("No cards matched the detection review request.");

  mkdirSync(outDir, { recursive: true });
  const rowsOut = [];
  for (const card of selected) {
    const candidate = detectionCandidate(card);
    const start = Math.max(0, candidate.time - before);
    const duration = before + after;
    const file = `${String(card.sequence || rowsOut.length + 1).padStart(3, "0")}-${safeFilePart(card.id)}-${safeFilePart(card.name)}.jpg`;
    const gridPath = resolve(outDir, file);
    const vf = `fps=${fps},scale=${scale}:-1,tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`;
    const result = spawnSync(ffmpeg, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(roundTime(start)),
      "-t",
      String(roundTime(duration)),
      "-i",
      sourcePath,
      "-vf",
      vf,
      "-frames:v",
      "1",
      gridPath,
    ], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`ffmpeg detection review failed for ${card.id}`);

    rowsOut.push({
      card,
      candidate,
      start: roundTime(start),
      duration: roundTime(duration),
      image: relative(root, gridPath).replaceAll("\\", "/"),
    });
  }

  const mdPath = resolve(outDir, "review.md");
  const htmlPath = resolve(outDir, "review.html");
  writeFileSync(mdPath, detectionReviewMarkdown({
    catalogPath,
    sourcePath,
    rows: rowsOut,
    mode,
    before,
    after,
    fps,
  }));
  writeFileSync(htmlPath, detectionReviewHtml({
    catalogPath,
    sourcePath,
    rows: rowsOut,
    mode,
    before,
    after,
    fps,
    outDir,
  }));

  const accepted = rowsOut.filter(({ card }) => card.revealStartAccepted).length;
  const fallback = rowsOut.filter(({ card }) => card.revealStartStatus === "fallback").length;
  console.log(`Detection visual review written: ${mdPath}`);
  console.log(`HTML review: ${htmlPath}`);
  console.log(`Reviewed ${rowsOut.length} candidate(s): accepted=${accepted} fallback=${fallback} mode=${mode}`);
}

function shortApplyDetectionReviewCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const reviewPath = resolve(root, requireOpt("--review"));
  const outPath = resolve(root, requireOpt("--out"));
  if (!existsSync(catalogPath)) throw new Error(`Catalog not found: ${catalogPath}`);
  if (!existsSync(reviewPath)) throw new Error(`Review file not found: ${reviewPath}`);

  const catalog = readJson(catalogPath);
  const errors = validateConfirmedCatalog(catalog);
  if (errors.length) {
    throw new Error(`Confirmed catalog failed validation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  const review = readJson(reviewPath);
  if (!Array.isArray(review.reviews)) throw new Error("Review JSON needs a reviews array");
  const frameReference = {
    candidateFrame: Number(review.frameReference?.candidateFrame ?? 4),
    fps: Number(review.frameReference?.fps ?? 10),
  };
  if (!Number.isFinite(frameReference.candidateFrame) || !Number.isFinite(frameReference.fps) || frameReference.fps <= 0) {
    throw new Error("Review frameReference needs candidateFrame and positive fps");
  }

  const cardsById = new Map((catalog.cards || []).map((card) => [card.id, card]));
  const summary = [];
  for (const item of review.reviews) {
    const card = cardsById.get(item.cardId);
    if (!card) throw new Error(`Review references unknown card id: ${item.cardId}`);
    const action = item.action || "needs_manual";
    const candidate = detectionCandidate(card);
    const prior = card.cutStartSeconds ?? card.revealStartSeconds ?? null;
    const note = item.note || "";

    if (action === "accept" || action === "accept_last_card") {
      applyReviewedStart(card, candidate.time, item, {
        reviewStatus: action,
        note,
      });
      summary.push(reviewSummaryRow(card, prior, card.cutStartSeconds, action, note));
      continue;
    }

    if (action === "shift_to_frame") {
      if (!Number.isFinite(item.frame)) throw new Error(`${card.id} shift_to_frame needs frame`);
      const offset = (Number(item.frame) - frameReference.candidateFrame) / frameReference.fps;
      applyReviewedStart(card, roundTime(candidate.time + offset), item, {
        reviewStatus: "shifted",
        note: `${note} frame ${item.frame} relative to candidate frame ${frameReference.candidateFrame}`,
        offsetFrames: roundTime(Number(item.frame) - frameReference.candidateFrame),
        offsetSeconds: roundTime(offset),
      });
      summary.push(reviewSummaryRow(card, prior, card.cutStartSeconds, action, note));
      continue;
    }

    if (action === "offset_seconds") {
      if (!Number.isFinite(item.offsetSeconds)) throw new Error(`${card.id} offset_seconds needs offsetSeconds`);
      applyReviewedStart(card, roundTime(candidate.time + Number(item.offsetSeconds)), item, {
        reviewStatus: "shifted",
        note,
        offsetSeconds: roundTime(Number(item.offsetSeconds)),
      });
      summary.push(reviewSummaryRow(card, prior, card.cutStartSeconds, action, note));
      continue;
    }

    if (action === "set_seconds") {
      if (!Number.isFinite(item.seconds)) throw new Error(`${card.id} set_seconds needs seconds`);
      applyReviewedStart(card, Number(item.seconds), item, {
        reviewStatus: "set_seconds",
        note,
      });
      summary.push(reviewSummaryRow(card, prior, card.cutStartSeconds, action, note));
      continue;
    }

    if (action === "set_hold") {
      if (!Number.isFinite(item.holdSeconds)) throw new Error(`${card.id} set_hold needs holdSeconds`);
      card.holdSeconds = roundTime(Number(item.holdSeconds));
      card.revealUserReviewed = true;
      card.revealUserReviewStatus = "set_hold";
      card.revealUserReviewNote = note;
      card.revealUserReviewSource = "visual_detection_review";
      card.revealReviewedAt = new Date().toISOString();
      summary.push(reviewSummaryRow(card, prior, prior, action, note));
      continue;
    }

    if (["reject", "bad_detection", "manual_exception", "needs_earlier", "needs_later", "needs_manual"].includes(action)) {
      clearReviewedStart(card);
      card.revealStartAccepted = false;
      card.revealUserReviewStatus = action;
      card.revealUserReviewNote = note;
      card.revealReviewedAt = new Date().toISOString();
      summary.push(reviewSummaryRow(card, prior, null, action, note));
      continue;
    }

    throw new Error(`${card.id} has unsupported review action: ${action}`);
  }

  const reviewedSource = catalog.revealDetection?.source || catalog.source;
  const updated = {
    ...catalog,
    ...(reviewedSource ? { source: reviewedSource } : {}),
    revealReview: {
      schema: review.schema || "edithyper.reveal-review.v1",
      sourceReview: relative(root, reviewPath).replaceAll("\\", "/"),
      appliedAt: new Date().toISOString(),
      frameReference,
      reviewedCards: review.reviews.length,
    },
  };
  writeJson(outPath, updated);
  const mdPath = outPath.replace(/\.json$/i, ".review-summary.md");
  writeFileSync(mdPath, detectionReviewApplyMarkdown({
    catalogPath,
    reviewPath,
    outPath,
    summary,
  }));
  console.log(`Reviewed catalog written: ${outPath}`);
  console.log(`Review summary: ${mdPath}`);
  console.log(`Applied ${summary.length} review decision(s). Accepted/shifted=${summary.filter((row) => Number.isFinite(row.after)).length}`);
}

function applyReviewedStart(card, start, item, extra = {}) {
  card.cutStartSeconds = roundTime(start);
  card.revealStartSeconds = roundTime(start);
  card.revealStartAccepted = true;
  card.revealUserReviewed = true;
  card.revealUserReviewStatus = extra.reviewStatus || item.action || "accepted";
  card.revealUserReviewNote = extra.note || item.note || "";
  card.revealUserReviewSource = "visual_detection_review";
  card.revealReviewedAt = new Date().toISOString();
  if (Number.isFinite(extra.offsetFrames)) card.revealUserReviewOffsetFrames = extra.offsetFrames;
  if (Number.isFinite(extra.offsetSeconds)) card.revealUserReviewOffsetSeconds = extra.offsetSeconds;
  if (Number.isFinite(item.revealEndSeconds)) card.revealEndSeconds = roundTime(Number(item.revealEndSeconds));
  if (Number.isFinite(item.holdStartSeconds)) card.holdStartSeconds = roundTime(Number(item.holdStartSeconds));
  if (Number.isFinite(item.holdSeconds)) card.holdSeconds = roundTime(Number(item.holdSeconds));
}

function clearReviewedStart(card) {
  delete card.cutStartSeconds;
  delete card.revealStartSeconds;
  delete card.revealEndSeconds;
  delete card.holdStartSeconds;
  delete card.revealUserReviewOffsetFrames;
  delete card.revealUserReviewOffsetSeconds;
}

function reviewSummaryRow(card, before, after, action, note) {
  return {
    id: card.id,
    sequence: card.sequence,
    name: card.name,
    pack: card.pack,
    cardInPack: card.cardInPack,
    before,
    after,
    action,
    note,
  };
}

function detectionReviewApplyMarkdown({ catalogPath, reviewPath, outPath, summary }) {
  return [
    "# Reveal Review Apply Summary",
    "",
    `Catalog: ${relative(root, catalogPath).replaceAll("\\", "/")}`,
    `Review: ${relative(root, reviewPath).replaceAll("\\", "/")}`,
    `Output: ${relative(root, outPath).replaceAll("\\", "/")}`,
    "",
    "| # | Card id | Name | Pack | Action | Before | After | Note |",
    "|---:|---|---|---:|---|---:|---:|---|",
    ...summary.map((row) => {
      const pack = row.pack && row.cardInPack ? `P${row.pack}C${row.cardInPack}` : "";
      return `| ${row.sequence || ""} | ${escapeCell(row.id)} | ${escapeCell(row.name)} | ${pack} | ${escapeCell(row.action)} | ${formatSeconds(row.before)} | ${formatSeconds(row.after)} | ${escapeCell(row.note)} |`;
    }),
    "",
  ].join("\n");
}

function detectionModeMatches(card, mode) {
  if (mode === "all") return true;
  if (mode === "accepted") return Boolean(card.revealStartAccepted);
  if (mode === "needs-review") {
    const resolved = new Set(["bad_detection", "manual_exception", "accept_last_card"]);
    return !card.revealStartAccepted && !resolved.has(card.revealUserReviewStatus);
  }
  if (mode === "needs-earlier") return card.revealUserReviewStatus === "needs_earlier";
  if (mode === "needs-later") return card.revealUserReviewStatus === "needs_later";
  if (mode === "manual-pending") return ["bad_detection", "manual_exception", "needs_manual"].includes(card.revealUserReviewStatus);
  if (mode === "fallback") return card.revealStartStatus === "fallback";
  if (mode === "detected") return card.revealStartStatus === "detected";
  return false;
}

function detectionCandidate(card) {
  const time =
    finiteOrNull(card.revealStartSeconds) ??
    finiteOrNull(card.cutStartSeconds) ??
    finiteOrNull(card.revealStartCandidateSeconds) ??
    (Number.isFinite(card.sourceRepresentative) ? Math.max(0, card.sourceRepresentative - 0.45) : null);
  if (!Number.isFinite(time)) throw new Error(`${card.id} has no reveal candidate time`);
  return {
    time: roundTime(time),
    source:
      Number.isFinite(card.revealStartSeconds) ? "revealStartSeconds" :
      Number.isFinite(card.cutStartSeconds) ? "cutStartSeconds" :
      Number.isFinite(card.revealStartCandidateSeconds) ? "candidate" :
      "catalog-minus-0.45",
  };
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function shortAuditRevealsCommand() {
  const cutPath = resolve(root, requireOpt("--cut"));
  const sourcePath = resolve(root, requireOpt("--source"));
  if (!existsSync(cutPath)) throw new Error(`Cut file not found: ${cutPath}`);
  if (!existsSync(sourcePath)) throw new Error(`Source video not found: ${sourcePath}`);

  const cut = readJson(cutPath);
  const errors = validateSegments(cut.segments || []);
  if (errors.length) {
    throw new Error(`Cut failed validation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const ids = new Set(parseIds(opt("--ids")));
  const limit = opt("--limit") ? positiveInteger(opt("--limit"), "--limit") : null;
  const before = opt("--before") ? positiveNumber(opt("--before"), "--before") : 0.12;
  const after = opt("--after") ? positiveNumber(opt("--after"), "--after") : 0.72;
  const fps = opt("--fps") ? positiveNumber(opt("--fps"), "--fps") : 12;
  const scale = opt("--scale") ? positiveInteger(opt("--scale"), "--scale") : 240;
  const cols = opt("--cols") ? positiveInteger(opt("--cols"), "--cols") : 4;
  const rows = opt("--rows") ? positiveInteger(opt("--rows"), "--rows") : 3;
  const ffmpeg = opt("--ffmpeg", "ffmpeg");
  const slug = cut.sourceCatalog || basename(cutPath).replace(/\.json$/i, "");
  const outDir = resolve(root, opt("--out-dir", `scratch/reveal-audit/${slug}`));

  let selected = (cut.segments || []).map((segment, index) => ({ segment, index }));
  if (ids.size) {
    selected = selected.filter(({ segment }) => ids.has(segment.cardId));
  }
  if (limit) selected = selected.slice(0, limit);
  if (!selected.length) throw new Error("No segments matched the reveal audit request.");

  mkdirSync(outDir, { recursive: true });
  const rowsOut = [];
  for (const { segment, index } of selected) {
    const segmentStart = Number(segment.start);
    const auditStart = Math.max(0, segmentStart - before);
    const duration = before + after;
    const id = segment.cardId || `segment-${String(index + 1).padStart(3, "0")}`;
    const file = `${String(index + 1).padStart(3, "0")}-${safeFilePart(id)}-start-grid.jpg`;
    const gridPath = resolve(outDir, file);
    const vf = `fps=${fps},scale=${scale}:-1,tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`;

    const result = spawnSync(ffmpeg, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(roundTime(auditStart)),
      "-t",
      String(roundTime(duration)),
      "-i",
      sourcePath,
      "-vf",
      vf,
      "-frames:v",
      "1",
      gridPath,
    ], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`ffmpeg reveal audit failed for ${id}`);

    rowsOut.push({
      number: index + 1,
      id,
      name: segment.cardName || "",
      pack: segment.pack ?? "",
      cardInPack: segment.cardInPack ?? "",
      start: segmentStart,
      sourceRepresentative: segment.sourceRepresentative,
      revealTimestamp: segment.revealTimestamp || "",
      path: relative(root, gridPath).replaceAll("\\", "/"),
    });
  }

  const reviewPath = resolve(outDir, "review.md");
  writeFileSync(reviewPath, revealAuditMarkdown({
    cutPath,
    sourcePath,
    rows: rowsOut,
    before,
    after,
    fps,
  }));
  console.log(`Reveal audit written: ${reviewPath}`);
  console.log(`Grids: ${outDir}`);
  console.log(`Audited ${rowsOut.length} segment(s).`);
}

function detectionReviewMarkdown({ catalogPath, sourcePath, rows, mode, before, after, fps }) {
  return [
    "# Reveal Detection Visual Review",
    "",
    `Catalog: ${relative(root, catalogPath).replaceAll("\\", "/")}`,
    `Source: ${relative(root, sourcePath).replaceAll("\\", "/")}`,
    `Mode: ${mode}`,
    `Grid window: ${before}s before candidate through ${after}s after, sampled at ${fps} fps.`,
    "",
    "| # | Card id | Name | Pack | Catalog time | Candidate | Status | Confidence | Accepted | Image |",
    "|---:|---|---|---:|---:|---:|---|---:|---|---|",
    ...rows.map(({ card, candidate, image }) => {
      const pack = card.pack && card.cardInPack ? `P${card.pack}C${card.cardInPack}` : "";
      return `| ${card.sequence || ""} | ${escapeCell(card.id)} | ${escapeCell(card.name || "")} | ${pack} | ${formatSeconds(card.sourceRepresentative)} | ${formatSeconds(candidate.time)} | ${escapeCell(card.revealStartStatus || "")} | ${Number.isFinite(card.revealStartConfidence) ? card.revealStartConfidence.toFixed(3) : ""} | ${card.revealStartAccepted ? "yes" : ""} | ${escapeCell(image)} |`;
    }),
    "",
    ...rows.flatMap(({ card, candidate, image }) => [
      `## ${card.sequence || ""}. ${card.id} ${card.name || ""}`,
      "",
      `Pack/card: P${card.pack}C${card.cardInPack} | candidate: ${formatSeconds(candidate.time)} | status: ${card.revealStartStatus || ""} | confidence: ${Number.isFinite(card.revealStartConfidence) ? card.revealStartConfidence.toFixed(3) : ""} | accepted: ${card.revealStartAccepted ? "yes" : "no"}`,
      "",
      `![${card.id} ${escapeCell(card.name || "")}](${image})`,
      "",
    ]),
  ].join("\n");
}

function detectionReviewHtml({ catalogPath, sourcePath, rows, mode, before, after, fps, outDir }) {
  const cards = rows.map(({ card, candidate, image }) => {
    const imageSrc = relative(outDir, resolve(root, image)).replaceAll("\\", "/");
    const statusClass = card.revealStartAccepted ? "accepted" : "review";
    return [
      `<article class="card ${statusClass}">`,
      `<header><span>${escapeHtml(String(card.sequence || ""))}. ${escapeHtml(card.id)}</span><strong>${escapeHtml(card.name || "")}</strong></header>`,
      `<dl>`,
      `<div><dt>Pack</dt><dd>P${escapeHtml(String(card.pack))}C${escapeHtml(String(card.cardInPack))}</dd></div>`,
      `<div><dt>Catalog</dt><dd>${escapeHtml(formatSeconds(card.sourceRepresentative))}</dd></div>`,
      `<div><dt>Candidate</dt><dd>${escapeHtml(formatSeconds(candidate.time))}</dd></div>`,
      `<div><dt>Status</dt><dd>${escapeHtml(card.revealStartStatus || "")}</dd></div>`,
      `<div><dt>Conf.</dt><dd>${Number.isFinite(card.revealStartConfidence) ? escapeHtml(card.revealStartConfidence.toFixed(3)) : ""}</dd></div>`,
      `</dl>`,
      `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(`${card.id} ${card.name || ""}`)}">`,
      `</article>`,
    ].join("");
  }).join("\n");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<title>Reveal Detection Visual Review</title>",
    "<style>",
    "body{margin:0;background:#151515;color:#eee;font:14px/1.35 Arial,sans-serif}",
    "main{max-width:1500px;margin:0 auto;padding:20px}",
    "h1{font-size:24px;margin:0 0 8px}",
    ".meta{color:#aaa;margin:0 0 18px}",
    ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}",
    ".card{background:#202020;border:1px solid #3a3a3a;border-radius:6px;overflow:hidden}",
    ".card.accepted{border-color:#3b7d55}",
    ".card.review{border-color:#8a6d3b}",
    "header{display:flex;gap:8px;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #333}",
    "header span{color:#aaa;white-space:nowrap}",
    "header strong{font-size:14px;text-align:right}",
    "dl{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin:0;border-bottom:1px solid #333}",
    "dt{color:#888;font-size:11px;text-transform:uppercase}",
    "dd{margin:2px 0 0}",
    "dl div{padding:8px 10px;border-right:1px solid #333}",
    "img{display:block;width:100%;height:auto;background:#111}",
    "</style>",
    "</head>",
    "<body>",
    "<main>",
    "<h1>Reveal Detection Visual Review</h1>",
    `<p class="meta">Catalog: ${escapeHtml(relative(root, catalogPath).replaceAll("\\", "/"))} | Source: ${escapeHtml(relative(root, sourcePath).replaceAll("\\", "/"))} | Mode: ${escapeHtml(mode)} | Window: ${before}s before to ${after}s after at ${fps} fps</p>`,
    `<section class="grid">${cards}</section>`,
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function revealDetectionMarkdown({ sourcePath, catalogPath, outPath, catalog, results, minConfidence }) {
  const cardsById = new Map((catalog.cards || []).map((card) => [card.id, card]));
  return [
    "# Reveal Motion Detection",
    "",
    `Catalog: ${relative(root, catalogPath).replaceAll("\\", "/")}`,
    `Source: ${relative(root, sourcePath).replaceAll("\\", "/")}`,
    `Output: ${relative(root, outPath).replaceAll("\\", "/")}`,
    "",
    "| # | Card id | Name | Pack | Catalog time | Detected start | Lead | Status | Confidence | Accepted |",
    "|---:|---|---|---:|---:|---:|---:|---|---:|---|",
    ...results.map((result, index) => {
      const card = cardsById.get(result.cardId) || {};
      const pack = card.pack && card.cardInPack ? `P${card.pack}C${card.cardInPack}` : "";
      const lead = Number.isFinite(result.lead) ? `${result.lead.toFixed(3)}s` : "";
      const accepted = result.status === "detected" && Number.isFinite(result.confidence) && result.confidence >= minConfidence;
      return `| ${index + 1} | ${escapeCell(result.cardId)} | ${escapeCell(card.name || "")} | ${pack} | ${formatSeconds(card.sourceRepresentative)} | ${formatSeconds(result.detectedStart)} | ${lead} | ${escapeCell(result.status)} | ${Number.isFinite(result.confidence) ? result.confidence.toFixed(3) : ""} | ${accepted ? "yes" : ""} |`;
    }),
    "",
  ].join("\n");
}

function safeFilePart(value) {
  return String(value || "segment").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function revealAuditMarkdown({ cutPath, sourcePath, rows, before, after, fps }) {
  return [
    "# Reveal Start Audit",
    "",
    `Cut: ${relative(root, cutPath).replaceAll("\\", "/")}`,
    `Source: ${relative(root, sourcePath).replaceAll("\\", "/")}`,
    `Grid window: ${before}s before segment start through ${after}s after, sampled at ${fps} fps.`,
    "",
    "| # | Card id | Name | Pack | Cut start | Catalog time | Grid |",
    "|---:|---|---|---:|---:|---:|---|",
    ...rows.map((row) => {
      const pack = row.pack && row.cardInPack ? `P${row.pack}C${row.cardInPack}` : "";
      const catalogTime = Number.isFinite(row.sourceRepresentative)
        ? `${formatSeconds(row.sourceRepresentative)} ${row.revealTimestamp ? `(${row.revealTimestamp})` : ""}`.trim()
        : row.revealTimestamp;
      return `| ${row.number} | ${escapeCell(row.id)} | ${escapeCell(row.name)} | ${pack} | ${formatSeconds(row.start)} | ${escapeCell(catalogTime)} | ${escapeCell(row.path)} |`;
    }),
    "",
  ].join("\n");
}

function parseIds(value) {
  return value ? value.split(",").map((id) => id.trim()).filter(Boolean) : [];
}

function catalogTodoCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const limit = opt("--limit") ? Number(opt("--limit")) : 20;
  const catalog = readJson(catalogPath);
  const cards = selectCatalogCards(catalog, { onlyUnknown: true, limit });
  if (!cards.length) {
    console.log("No UNKNOWN cards remain in this catalog.");
    return;
  }
  console.log("| Card id | Source | Output | Evidence | Notes |");
  console.log("|---|---:|---:|---:|---|");
  for (const card of cards) {
    console.log(
      `| ${card.id} | ${formatSeconds(card.sourceRepresentative)} | ${formatSeconds(card.outputStart)} | ${card.evidence?.length || 0} | ${escapeCell(card.notes || "")} |`,
    );
  }
}

function catalogEvidenceCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const sourcePath = resolve(root, requireOpt("--source"));
  const catalog = readJson(catalogPath);
  const ids = parseIds(opt("--ids"));
  const limit = opt("--limit") ? Number(opt("--limit")) : null;
  const onlyUnknown = has("--only-unknown");
  const requestedCards = selectCatalogCards(catalog, { ids, onlyUnknown, limit }).filter((card) => {
    if (!has("--missing-evidence")) return true;
    return !(card.evidence || []).some((item) => item.generatedBy === "catalog:evidence");
  });
  const cards = requestedCards.filter((card) => Number.isFinite(card.sourceRepresentative));
  const skipped = requestedCards.filter((card) => !Number.isFinite(card.sourceRepresentative));
  if (!cards.length) {
    console.log("No catalog cards with located source times matched the evidence request.");
    if (skipped.length) console.log(`Skipped missing slots: ${skipped.map((card) => card.id).join(", ")}`);
    return;
  }

  const outDir = resolve(root, opt("--out-dir", `scratch/catalog-evidence/${catalog.slug}`));
  mkdirSync(outDir, { recursive: true });
  const ffmpeg = opt("--ffmpeg", "ffmpeg");

  for (const card of cards) {
    const start = Math.max(0, card.sourceRepresentative - 1.2);
    const duration = 2.4;
    const base = `${card.id}-${String(Math.round(card.sourceRepresentative * 1000)).padStart(8, "0")}`;
    const stillPath = resolve(outDir, `${base}-still.jpg`);
    const gridPath = resolve(outDir, `${base}-grid.jpg`);

    const still = spawnSync(ffmpeg, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(card.sourceRepresentative),
      "-i",
      sourcePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=900:-1",
      stillPath,
    ], { stdio: "inherit" });
    if (still.status !== 0) throw new Error(`ffmpeg still extraction failed for ${card.id}`);

    const grid = spawnSync(ffmpeg, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(start),
      "-t",
      String(duration),
      "-i",
      sourcePath,
      "-vf",
      "fps=3,scale=360:-1,tile=3x3:padding=6:margin=6:color=0x202020",
      "-frames:v",
      "1",
      gridPath,
    ], { stdio: "inherit" });
    if (grid.status !== 0) throw new Error(`ffmpeg grid extraction failed for ${card.id}`);

    const relStill = relative(root, stillPath).replaceAll("\\", "/");
    const relGrid = relative(root, gridPath).replaceAll("\\", "/");
    const evidence = card.evidence || [];
    card.evidence = [
      ...evidence.filter((item) => item.generatedBy !== "catalog:evidence"),
      {
        type: "still",
        path: relStill,
        time: roundTime(card.sourceRepresentative),
        generatedBy: "catalog:evidence",
      },
      {
        type: "grid",
        path: relGrid,
        start: roundTime(start),
        duration,
        fps: 3,
        layout: "3x3",
        cellTimeFormula: `${roundTime(start)} + cellIndex / 3`,
        generatedBy: "catalog:evidence",
      },
    ];
  }

  writeJson(catalogPath, catalog);
  console.log(`Generated evidence for ${cards.length} card(s).`);
  if (skipped.length) console.log(`Skipped missing slots: ${skipped.map((card) => card.id).join(", ")}`);
  console.log(`Updated catalog: ${catalogPath}`);
  console.log(`Evidence dir: ${outDir}`);
}

function catalogReviewCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const limit = opt("--limit") ? Number(opt("--limit")) : 20;
  const onlyUnknown = has("--only-unknown");
  const ids = parseIds(opt("--ids"));
  const catalog = readJson(catalogPath);
  const cards = selectCatalogCards(catalog, { ids, onlyUnknown, limit });
  if (!cards.length) {
    console.log("No catalog cards matched the review request.");
    return;
  }

  console.log("| Card id | Name | Source rep | Still | Grid |");
  console.log("|---|---|---:|---|---|");
  for (const card of cards) {
    const still = (card.evidence || []).find((item) => item.type === "still")?.path || "";
    const grid = (card.evidence || []).find((item) => item.type === "grid")?.path || "";
    console.log(
      `| ${card.id} | ${escapeCell(card.name || "UNKNOWN")} | ${formatSeconds(card.sourceRepresentative)} | ${escapeCell(still)} | ${escapeCell(grid)} |`,
    );
  }
}

function catalogUpgradeCommand() {
  const catalogPath = resolve(root, requireOpt("--catalog"));
  const catalog = readJson(catalogPath);
  let changed = 0;
  for (const card of catalog.cards || []) {
    if (!card.beatType) {
      card.beatType = "unknown";
      changed++;
    }
  }
  writeJson(catalogPath, catalog);
  console.log(`Catalog upgraded: ${catalogPath}`);
  console.log(`Rows changed: ${changed}`);
}

function renderCommand() {
  const slug = requireOpt("--slug");
  const cutPath = resolve(root, requireOpt("--cut"));
  if (!existsSync(cutPath)) throw new Error(`Cut file not found: ${cutPath}`);
  const renderArgs = ["scripts/cut-source.mjs", slug, "--cut", cutPath];
  const input = opt("--input");
  if (input) renderArgs.push("--input", input);
  const out = opt("--out");
  if (out) renderArgs.push("--out", resolve(root, out));
  const outSuffix = opt("--out-suffix");
  if (outSuffix) renderArgs.push("--out-suffix", outSuffix);
  if (has("--no-audio")) renderArgs.push("--no-audio");
  const result = spawnSync("node", renderArgs, { cwd: root, stdio: "inherit" });
  process.exit(result.status ?? 1);
}

try {
  if (command === "plan") planCommand();
  else if (command === "apply") applyCommand();
  else if (command === "catalog:init") catalogInitCommand();
  else if (command === "catalog:rewrite-slots") catalogRewriteSlotsCommand();
  else if (command === "catalog:reconcile") catalogReconcileCommand();
  else if (command === "catalog:focus") catalogFocusCommand();
  else if (command === "catalog:unassigned") catalogUnassignedCommand();
  else if (command === "catalog:evidence") catalogEvidenceCommand();
  else if (command === "catalog:review") catalogReviewCommand();
  else if (command === "catalog:todo") catalogTodoCommand();
  else if (command === "catalog:upgrade") catalogUpgradeCommand();
  else if (command === "catalog:validate") catalogValidateCommand();
  else if (command === "catalog:from-table") catalogFromTableCommand();
  else if (command === "catalog:assert-confirmed") catalogAssertConfirmedCommand();
  else if (command === "short:build") shortBuildCommand();
  else if (command === "short:detect-reveals") shortDetectRevealsCommand();
  else if (command === "short:review-detections") shortReviewDetectionsCommand();
  else if (command === "short:apply-detection-review") shortApplyDetectionReviewCommand();
  else if (command === "short:gate") shortGateCommand();
  else if (command === "short:map-output") shortMapOutputCommand();
  else if (command === "short:audit-reveals") shortAuditRevealsCommand();
  else if (command === "render") renderCommand();
  else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(`agent harness error: ${error.message}`);
  process.exit(1);
}
