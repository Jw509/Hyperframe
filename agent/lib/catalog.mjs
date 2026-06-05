import { outputMap, validateSegments } from "./cuts.mjs";
import { parseTimestamp, roundTime } from "./time.mjs";

export function catalogFromCuts({ slug, source, cuts, mode = "card-candidates" }) {
  const errors = validateSegments(cuts.segments);
  if (errors.length) {
    throw new Error(`Cannot build catalog from invalid cuts:\n${errors.join("\n")}`);
  }

  return {
    slug,
    source,
    schema: "edithyper.card-catalog.v1",
    status: "draft",
    createdAt: new Date().toISOString(),
    mode,
    notes: [
      "Card names start as unknown. Claude/Codex should fill names by inspecting source grids or stills, then keep this file as the shared reference.",
    ],
    cards: outputMap(cuts.segments).map((row, index) => ({
      id: `card-${String(index + 1).padStart(3, "0")}`,
      beatType: "unknown",
      pack: null,
      cardInPack: null,
      name: "UNKNOWN",
      team: null,
      product: null,
      variant: null,
      isHit: false,
      sourceStart: roundTime(row.sourceStart),
      sourceEnd: roundTime(row.sourceEnd),
      sourceRepresentative: roundTime(row.sourceStart + row.duration / 2),
      outputStart: roundTime(row.outputStart),
      outputEnd: roundTime(row.outputEnd),
      cutSegmentIndex: row.index,
      confidence: 0,
      evidence: [],
      notes: row.note || "",
      locked: false,
    })),
  };
}

export function catalogFromWindows({ slug, source, windows }) {
  return {
    slug,
    source,
    schema: "edithyper.card-catalog.v1",
    status: "draft",
    createdAt: new Date().toISOString(),
    mode: "pack-windows",
    notes: [
      "Each pack window should be inspected before cutting. Add one card entry per distinct card reveal.",
    ],
    windows: windows.map((window) => ({
      id: window.id,
      sourceStart: roundTime(window.start),
      sourceEnd: roundTime(window.end),
      duration: roundTime(window.end - window.start),
      status: "needs_catalog",
      evidence: [],
    })),
    cards: [],
  };
}

function classifyCutNote(note = "") {
  const n = note.toLowerCase();
  if (/\bopen\b/.test(n)) return "open";
  if (/\bfan\b/.test(n)) return "fan";
  if (/transition|track-in|pan continues/.test(n)) return "other";
  if (/\bcard|\bc\d+\b|p\d+c\d+|hit|auto|refractor|glory|bowman|stockton|singleton|norton/.test(n)) {
    return /hit|auto|stockton|singleton|norton/.test(n) ? "hit" : "card";
  }
  return "other";
}

export function catalogFromPackSlots({
  slug,
  source,
  cut,
  windows = null,
  expectedPacks = 20,
  cardsPerPack = 4,
}) {
  const events = [];
  for (const [index, segment] of (cut.segments || []).entries()) {
    const beatType = classifyCutNote(segment.note || "");
    const event = {
      segmentIndex: index,
      beatType,
      sourceStart: roundTime(segment.start),
      sourceEnd: roundTime(segment.end),
      sourceRepresentative: roundTime(segment.start + (segment.end - segment.start) / 2),
      note: segment.note || "",
    };
    events.push(event);
  }

  const groups = windows
    ? groupsFromWindows(events, windows, expectedPacks)
    : groupsFromOpenEvents(events);

  const cards = [];
  const overflowCandidates = [];
  const packs = [];

  for (let pack = 1; pack <= expectedPacks; pack++) {
    const group = groups[pack - 1] || null;
    const assignedCandidates = group ? group.cards.slice(0, cardsPerPack) : [];
    const overflow = group ? group.cards.slice(cardsPerPack) : [];
    overflowCandidates.push(
      ...overflow.map((candidate, overflowIndex) => ({
        ...candidate,
        detectedPack: group.detectedPack,
        overflowIndex: overflowIndex + 1,
        reason: `detected pack has more than ${cardsPerPack} card-like beats`,
      })),
    );

    packs.push({
      pack,
      expectedCards: cardsPerPack,
      detectedPack: group?.detectedPack ?? null,
      sourceStart: group?.sourceStart ?? group?.open?.sourceStart ?? assignedCandidates[0]?.sourceStart ?? null,
      sourceEnd: group?.sourceEnd ?? group?.events.at(-1)?.sourceEnd ?? assignedCandidates.at(-1)?.sourceEnd ?? null,
      openCandidate: group?.open ?? null,
      fanCandidate: group?.fan ?? null,
      assignedCards: assignedCandidates.length,
      missingCards: Math.max(0, cardsPerPack - assignedCandidates.length),
      overflowCards: overflow.length,
      status:
        !group ? "missing_group" :
        assignedCandidates.length === cardsPerPack && overflow.length === 0 ? "complete" :
        "needs_review",
    });

    for (let cardInPack = 1; cardInPack <= cardsPerPack; cardInPack++) {
      const candidate = assignedCandidates[cardInPack - 1] || null;
      cards.push({
        id: `p${String(pack).padStart(2, "0")}-c${String(cardInPack).padStart(2, "0")}`,
        beatType: candidate?.beatType === "hit" ? "hit" : "card",
        pack,
        cardInPack,
        name: "UNKNOWN",
        team: null,
        product: null,
        variant: null,
        isHit: candidate?.beatType === "hit" || false,
        sourceStart: candidate?.sourceStart ?? null,
        sourceEnd: candidate?.sourceEnd ?? null,
        sourceRepresentative: candidate?.sourceRepresentative ?? null,
        outputStart: null,
        outputEnd: null,
        cutSegmentIndex: candidate?.segmentIndex ?? null,
        confidence: 0,
        evidence: [],
        notes: candidate?.note || "",
        locatorStatus: candidate ? "candidate_attached" : "missing_candidate",
        locked: false,
      });
    }
  }

  for (const group of groups.slice(expectedPacks)) {
    overflowCandidates.push(
      ...group.cards.map((candidate) => ({
        ...candidate,
        detectedPack: group.detectedPack,
        reason: "detected pack group is beyond expected pack count",
      })),
    );
  }

  return {
    slug,
    source,
    schema: "edithyper.card-catalog.v1",
    status: "draft",
    createdAt: new Date().toISOString(),
    mode: "pack-slots",
    expectedPacks,
    cardsPerPack,
    notes: [
      windows
        ? "Pack-slot rewrite: exactly one row per expected card. Pack windows are obligations; every window must account for the configured cards before the next pack window."
        : "Pack-slot rewrite: exactly one row per expected card. Candidate times come from detected cut notes; missing rows must be located from source evidence.",
    ],
    packs,
    cards,
    unassignedCandidates: overflowCandidates,
  };
}

function groupsFromOpenEvents(events) {
  const groups = [];
  let current = null;
  for (const event of events) {
    if (event.beatType === "open") {
      current = {
        detectedPack: groups.length + 1,
        sourceStart: event.sourceStart,
        sourceEnd: null,
        open: event,
        fan: null,
        cards: [],
        events: [event],
      };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = {
        detectedPack: 0,
        sourceStart: null,
        sourceEnd: null,
        open: null,
        fan: null,
        cards: [],
        events: [],
      };
      groups.push(current);
    }
    addEventToGroup(current, event);
  }
  for (const group of groups) {
    group.sourceEnd = group.events.at(-1)?.sourceEnd ?? group.sourceEnd;
  }
  return groups;
}

function groupsFromWindows(events, windows, expectedPacks) {
  const normalized = windows.slice(0, expectedPacks).map((window, index) => ({
    detectedPack: window.id ?? index + 1,
    sourceStart: roundTime(window.start),
    sourceEnd: roundTime(window.end),
    open: null,
    fan: null,
    cards: [],
    events: [],
  }));

  const overflow = {
    detectedPack: expectedPacks + 1,
    sourceStart: null,
    sourceEnd: null,
    open: null,
    fan: null,
    cards: [],
    events: [],
  };

  for (const event of events) {
    const group = normalized.find(
      (window) =>
        event.sourceRepresentative >= window.sourceStart &&
        event.sourceRepresentative < window.sourceEnd,
    );
    addEventToGroup(group || overflow, event);
  }

  return overflow.events.length ? [...normalized, overflow] : normalized;
}

function addEventToGroup(group, event) {
  group.events.push(event);
  if (event.beatType === "open" && !group.open) group.open = event;
  if (event.beatType === "fan" && !group.fan) group.fan = event;
  if (event.beatType === "card" || event.beatType === "hit") group.cards.push(event);
}

export function reconcileCatalog(catalog) {
  const expectedPacks = catalog.expectedPacks || 20;
  const cardsPerPack = catalog.cardsPerPack || 4;
  const expectedCards = expectedPacks * cardsPerPack;
  const cards = catalog.cards || [];
  const located = cards.filter((card) => Number.isFinite(card.sourceRepresentative));
  const missing = cards.filter((card) => !Number.isFinite(card.sourceRepresentative));
  const named = cards.filter((card) => card.name && card.name !== "UNKNOWN");
  const locked = cards.filter((card) => card.locked);
  const packs = catalog.packs || [];

  return {
    expectedPacks,
    cardsPerPack,
    expectedCards,
    rows: cards.length,
    locatedCards: located.length,
    missingCards: missing.length,
    namedCards: named.length,
    lockedCards: locked.length,
    unassignedCandidates: catalog.unassignedCandidates?.length || 0,
    packs: packs.map((pack) => ({
      pack: pack.pack,
      status: pack.status,
      assignedCards: pack.assignedCards || 0,
      missingCards: pack.missingCards || 0,
      overflowCards: pack.overflowCards || 0,
      sourceStart: pack.sourceStart,
      sourceEnd: pack.sourceEnd,
    })),
    missingIds: missing.map((card) => card.id),
  };
}

export function focusShortPacks(catalog) {
  const cardsPerPack = catalog.cardsPerPack || 4;
  const cards = catalog.cards || [];
  return (catalog.packs || [])
    .filter((pack) => (pack.assignedCards || 0) < cardsPerPack)
    .map((pack) => ({
      pack: pack.pack,
      located: pack.assignedCards || 0,
      missing: cardsPerPack - (pack.assignedCards || 0),
      sourceStart: pack.sourceStart,
      sourceEnd: pack.sourceEnd,
      missingIds: cards
        .filter((card) => card.pack === pack.pack && !Number.isFinite(card.sourceRepresentative))
        .map((card) => card.id),
      status: pack.status,
    }));
}

export function validateCatalog(catalog) {
  const errors = [];
  if (catalog.schema !== "edithyper.card-catalog.v1") {
    errors.push("schema must be edithyper.card-catalog.v1");
  }
  if (!catalog.slug) errors.push("slug is required");
  if (!Array.isArray(catalog.cards)) errors.push("cards must be an array");

  const ids = new Set();
  for (const [index, card] of (catalog.cards || []).entries()) {
    if (!card.id) errors.push(`cards[${index}] missing id`);
    if (ids.has(card.id)) errors.push(`duplicate card id: ${card.id}`);
    ids.add(card.id);
    const hasTime = Number.isFinite(card.sourceRepresentative);
    if (!hasTime && card.locatorStatus !== "missing_candidate") {
      errors.push(`${card.id || `cards[${index}]`} missing sourceRepresentative`);
    }
    if (Number.isFinite(card.sourceStart) && Number.isFinite(card.sourceEnd) && card.sourceEnd <= card.sourceStart) {
      errors.push(`${card.id || `cards[${index}]`} has invalid sourceStart/sourceEnd`);
    }
    if (card.beatType && !["unknown", "box", "open", "fan", "card", "hit", "recap", "dead"].includes(card.beatType)) {
      errors.push(`${card.id || `cards[${index}]`} has invalid beatType "${card.beatType}"`);
    }
  }
  return errors;
}

export function selectCatalogCards(catalog, { ids = [], onlyUnknown = false, limit = null } = {}) {
  const wanted = new Set(ids);
  const out = [];
  for (const card of catalog.cards || []) {
    if (wanted.size && !wanted.has(card.id)) continue;
    if (onlyUnknown && card.name && card.name !== "UNKNOWN") continue;
    out.push(card);
    if (Number.isInteger(limit) && out.length >= limit) break;
  }
  return out;
}

export function catalogFromConfirmedTable({
  slug,
  source,
  markdown,
  expectedPacks,
  cardsPerPack,
  requireConfirmed = true,
}) {
  const rows = parseMarkdownCardRows(markdown);
  const numberedRows = rows.filter((row) => Number.isInteger(row.sequence));
  const cards = numberedRows.map((row, index) => {
    const sequence = index + 1;
    const seconds = roundTime(parseTimestamp(row.time));
    const pack = Math.floor(index / cardsPerPack) + 1;
    const cardInPack = (index % cardsPerPack) + 1;
    const technical = extractTechnicalTimestamp(row.notes);
    const variant = inferVariant(row.card, row.notes);
    const isHit = inferHit(row.card, row.notes);

    return {
      id: `card-${String(sequence).padStart(3, "0")}`,
      sequence,
      pack,
      cardInPack,
      name: row.card,
      team: null,
      product: null,
      variant,
      isHit,
      beatType: isHit ? "hit" : "card",
      status: row.status,
      sourceStart: null,
      sourceEnd: null,
      sourceRepresentative: seconds,
      revealTimestamp: row.time,
      technicalCardTimestamp: technical?.timestamp ?? null,
      technicalCardSeconds: technical?.seconds ?? null,
      outputStart: null,
      outputEnd: null,
      cutSegmentIndex: null,
      confidence: row.status === "confirmed" ? 1 : 0.75,
      evidence: [],
      notes: row.notes,
      locked: row.status === "confirmed",
      timingRule: "pack_first_held_then_slide_begin_reveals",
    };
  });

  const catalog = {
    slug,
    source,
    schema: "edithyper.card-catalog.v1",
    status: requireConfirmed ? "confirmed" : "draft",
    createdAt: new Date().toISOString(),
    mode: "confirmed-cards",
    expectedPacks,
    cardsPerPack,
    timingRule: "pack_first_held_then_slide_begin_reveals",
    notes: [
      "Canonical sports-card edit catalog. One row per distinct physical card.",
      "For the first card in each pack, use the held-in-hand shot after the fan.",
      "For later cards, the preferred cut point is when the current top card begins sliding up to reveal the next card.",
      "If only a fully visible card timestamp is known, short:build can use slideLead as a fallback; exact reveal starts should be saved as cutStartSeconds or revealStartSeconds.",
      "technicalCardTimestamp is optional and only records a later fully visible card time when it differs from edit timing.",
    ],
    packs: packSummaries(cards, expectedPacks, cardsPerPack),
    cards,
  };

  const errors = requireConfirmed ? validateConfirmedCatalog(catalog) : validateCatalog(catalog);
  if (errors.length) {
    throw new Error(`Confirmed catalog failed validation:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return catalog;
}

function parseMarkdownCardRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*:?-{2,}/.test(trimmed)) continue;
    const cells = splitMarkdownRow(trimmed);
    if (cells.length < 5 || cells[0] === "#" || cells[0].startsWith("---")) continue;
    const sequence = /^\d+$/.test(cells[0]) ? Number(cells[0]) : null;
    rows.push({
      sequence,
      time: cells[1],
      card: stripInlineCode(cells[2]),
      status: stripInlineCode(cells[3]).toLowerCase(),
      notes: stripInlineCode(cells[4]),
    });
  }
  return rows;
}

function splitMarkdownRow(line) {
  const body = line.replace(/^\|/, "").replace(/\|$/, "");
  return body.split("|").map((cell) => cell.replaceAll("\\|", "|").trim());
}

function stripInlineCode(value) {
  return String(value ?? "").replace(/^`|`$/g, "").trim();
}

function extractTechnicalTimestamp(notes) {
  const match = String(notes || "").match(/technical card time is\s+(\d+(?::\d+){1,2}(?:\.\d+)?)/i);
  if (!match) return null;
  return {
    timestamp: match[1],
    seconds: roundTime(parseTimestamp(match[1])),
  };
}

function inferVariant(card, notes) {
  const text = `${card} ${notes}`.toLowerCase();
  if (/autograph|\bauto\b/.test(text)) return "autograph";
  if (/x-fractor|xfractor|checker/.test(text)) return "X-fractor/checker";
  if (/refractor|numbered|\/\d+|pink|gold|green|orange/.test(text)) return "parallel/refractor";
  if (/path to glory/.test(text)) return "Path to Glory insert";
  if (/college rule playbook/.test(text)) return "College Rule Playbook insert";
  if (/lettered up/.test(text)) return "Lettered Up insert";
  if (/dean'?s list/.test(text)) return "Dean's List insert";
  if (/acropolis/.test(text)) return "Acropolis insert";
  if (/\binsert\b/.test(text)) return "insert";
  return null;
}

function inferHit(card, notes) {
  const text = `${card} ${notes}`.toLowerCase();
  return /autograph|\bauto\b|numbered|\/\d+|pink|gold|case hit/.test(text);
}

function packSummaries(cards, expectedPacks, cardsPerPack) {
  const packs = [];
  for (let pack = 1; pack <= expectedPacks; pack++) {
    const packCards = cards.filter((card) => card.pack === pack);
    packs.push({
      pack,
      expectedCards: cardsPerPack,
      assignedCards: packCards.length,
      missingCards: Math.max(0, cardsPerPack - packCards.length),
      overflowCards: Math.max(0, packCards.length - cardsPerPack),
      status: packCards.length === cardsPerPack ? "confirmed" : "needs_review",
      sourceStart: packCards[0]?.sourceRepresentative ?? null,
      sourceEnd: packCards.at(-1)?.sourceRepresentative ?? null,
    });
  }
  return packs;
}

export function validateConfirmedCatalog(catalog) {
  const errors = validateCatalog(catalog);
  if (catalog.mode !== "confirmed-cards") errors.push("mode must be confirmed-cards");
  if (catalog.status !== "confirmed") errors.push("status must be confirmed");
  const expectedPacks = catalog.expectedPacks;
  const cardsPerPack = catalog.cardsPerPack;
  if (!Number.isInteger(expectedPacks) || expectedPacks <= 0) errors.push("expectedPacks must be a positive integer");
  if (!Number.isInteger(cardsPerPack) || cardsPerPack <= 0) errors.push("cardsPerPack must be a positive integer");

  const expectedCards = expectedPacks * cardsPerPack;
  const cards = catalog.cards || [];
  if (cards.length !== expectedCards) {
    errors.push(`expected ${expectedCards} cards from ${expectedPacks} packs x ${cardsPerPack}, got ${cards.length}`);
  }

  let previousTime = -Infinity;
  for (const [index, card] of cards.entries()) {
    const id = `card-${String(index + 1).padStart(3, "0")}`;
    const pack = Math.floor(index / cardsPerPack) + 1;
    const cardInPack = (index % cardsPerPack) + 1;
    if (card.id !== id) errors.push(`cards[${index}] id must be ${id}`);
    if (card.sequence !== index + 1) errors.push(`${card.id} sequence must be ${index + 1}`);
    if (card.pack !== pack) errors.push(`${card.id} pack must be ${pack}`);
    if (card.cardInPack !== cardInPack) errors.push(`${card.id} cardInPack must be ${cardInPack}`);
    if (!card.name || card.name === "UNKNOWN") errors.push(`${card.id} needs a confirmed card name`);
    if (card.status !== "confirmed") errors.push(`${card.id} status must be confirmed`);
    if (!card.locked) errors.push(`${card.id} must be locked`);
    if (!Number.isFinite(card.sourceRepresentative)) errors.push(`${card.id} needs sourceRepresentative`);
    if (Number.isFinite(card.sourceRepresentative) && card.sourceRepresentative <= previousTime) {
      errors.push(`${card.id} sourceRepresentative must be after the previous card`);
    }
    previousTime = card.sourceRepresentative;
  }

  for (let pack = 1; pack <= expectedPacks; pack++) {
    const count = cards.filter((card) => card.pack === pack).length;
    if (count !== cardsPerPack) {
      errors.push(`pack ${pack} expected ${cardsPerPack} cards, got ${count}`);
    }
  }

  return errors;
}

export function buildShortCutsFromCatalog({
  catalog,
  baseHold = 0.85,
  insertHold = 0.85,
  hitHold = 1.25,
  gap = 0.04,
  minHold = 0.2,
  slideLead = 0.22,
  slideDuration = 0.55,
  transitionStyle = "card-start",
}) {
  const errors = validateConfirmedCatalog(catalog);
  if (errors.length) {
    throw new Error(`Cannot build short cuts from invalid confirmed catalog:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const options = { baseHold, insertHold, hitHold, gap, minHold, slideLead, slideDuration };
  const segments = buildSegmentsForTransitionStyle(catalog.cards, transitionStyle, options).map((segment) => {
    if (!segment.warning) delete segment.warning;
    return segment;
  });

  const segmentErrors = validateSegments(segments);
  if (segmentErrors.length) {
    throw new Error(`Generated short cut failed validation:\n${segmentErrors.map((error) => `- ${error}`).join("\n")}`);
  }

  return {
    comment: `Catalog-driven YouTube Short cut generated from ${catalog.slug}`,
    sourceCatalog: catalog.slug,
    generatedAt: new Date().toISOString(),
    target: "youtube-short",
    timingRule: catalog.timingRule,
    holdPolicy: { baseHold, insertHold, hitHold, gap, minHold, slideLead, slideDuration, transitionStyle },
    segments,
  };
}

function buildSegmentsForTransitionStyle(cards, transitionStyle, options) {
  if (transitionStyle === "card-start") return buildCardStartSegments(cards, options);
  if (transitionStyle === "hold-then-slide") return buildHoldThenSlideSegments(cards, options);
  throw new Error(`Unsupported transitionStyle: ${transitionStyle}. Use card-start or hold-then-slide.`);
}

function buildCardStartSegments(cards, { baseHold, insertHold, hitHold, gap, minHold, slideLead }) {
  return cards.map((card, index) => {
    const next = cards[index + 1] || null;
    const start = roundTime(cutStartForCard(card, { slideLead }));
    const desiredEnd = start + holdForCard(card, { baseHold, insertHold, hitHold });
    const nextLimit = next ? cutStartForCard(next, { slideLead }) - gap : Infinity;
    const end = roundTime(Math.min(desiredEnd, nextLimit));
    if (end <= start) {
      throw new Error(`${card.id} has no room before ${next?.id || "end of video"}; start=${start}, end=${end}`);
    }
    const duration = roundTime(end - start);
    return segmentFromCard(card, {
      start,
      end,
      transitionStyle: "card-start",
      warning: duration < minHold ? `short hold ${duration}s` : undefined,
    });
  });
}

function buildHoldThenSlideSegments(cards, { baseHold, insertHold, hitHold, gap, minHold, slideLead, slideDuration }) {
  const segments = [];
  let lastSourceEnd = 0;
  const splitGapTolerance = 0.35;

  for (const [index, card] of cards.entries()) {
    const next = cards[index + 1] || null;
    const samePackNext = next && next.pack === card.pack;
    const hold = holdForCard(card, { baseHold, insertHold, hitHold });

    if (samePackNext) {
      const previous = cards[index - 1] || null;
      const revealedByPreviousSegment = previous && previous.pack === card.pack && card.cardInPack > 1;
      const earliestHeldStart = roundTime(revealedByPreviousSegment ? lastSourceEnd : heldCardStart(card, { slideLead }));
      const rawTransitionStart = roundTime(cutStartForCard(next, { slideLead }));
      let transitionStart = rawTransitionStart;
      let earlyRevealWarning;
      if (!next.revealUserReviewed && transitionStart < earliestHeldStart) {
        const fallbackStart = roundTime(fallbackCutStartForCard(next, { slideLead }));
        const guardedStart = roundTime(Math.max(fallbackStart, earliestHeldStart));
        if (guardedStart > transitionStart) {
          transitionStart = guardedStart;
          earlyRevealWarning = `ignored early auto reveal at ${rawTransitionStart}s before held start ${earliestHeldStart}s`;
        }
      }
      let slideEnd = roundTime(slideEndForTransition(next, { slideLead, slideDuration }, {
        start: transitionStart,
        useExplicitStart: !earlyRevealWarning && hasExplicitCutStart(next),
      }));
      const earliestHoldStart = roundTime(Math.max(earliestHeldStart, lastSourceEnd));
      const shouldSplitLongGap = roundTime(transitionStart - (earliestHoldStart + hold)) > splitGapTolerance;
      const preferredHoldStart = roundTime(transitionStart - hold);
      const rawHoldStart = shouldSplitLongGap
        ? earliestHoldStart
        : roundTime(Math.max(earliestHeldStart, preferredHoldStart));
      const holdStart = roundTime(Math.max(rawHoldStart, lastSourceEnd));
      const adjustedHoldStart = holdStart > rawHoldStart;
      const startWarning = adjustedHoldStart ? `held start moved ${roundTime(holdStart - rawHoldStart)}s to avoid source rewind` : undefined;
      let slideWarning;
      if (slideEnd <= transitionStart) {
        throw new Error(`${card.id} cannot include slide into ${next.id}; transition=${transitionStart}, end=${slideEnd}`);
      }
      if (slideEnd <= holdStart) {
        const fallbackEnd = Number.isFinite(next.sourceRepresentative) ? roundTime(next.sourceRepresentative) : null;
        if (Number.isFinite(fallbackEnd) && fallbackEnd > holdStart) {
          slideEnd = fallbackEnd;
          slideWarning = "slide end extended to next card timestamp after overlap";
        } else {
          throw new Error(`${card.id} has no source room after previous segment; holdStart=${holdStart}, slideEnd=${slideEnd}`);
        }
      }

      const holdEnd = roundTime(Math.min(holdStart + hold, transitionStart));
      const sourceGapBeforeSlide = roundTime(transitionStart - holdEnd);
      if (holdEnd > holdStart && sourceGapBeforeSlide > splitGapTolerance) {
        const holdSegment = segmentFromCard(card, {
          start: holdStart,
          end: holdEnd,
          transitionStyle: "hold-then-slide",
          clipRole: "hold",
          holdDuration: roundTime(holdEnd - holdStart),
          warning: warningText(
            startWarning,
            holdEnd - holdStart < minHold ? `short hold ${roundTime(holdEnd - holdStart)}s` : undefined,
          ),
        });
        segments.push(holdSegment);

        const slideSegment = segmentFromCard(card, {
          start: transitionStart,
          end: slideEnd,
          transitionStyle: "hold-then-slide",
          clipRole: "slide",
          holdDuration: roundTime(holdEnd - holdStart),
          transitionStart,
          slideEnd,
          slideDuration: roundTime(slideEnd - transitionStart),
          revealsNextCardId: next.id,
          revealsNextCardName: next.name,
          warning: warningText(
            earlyRevealWarning,
            slideWarning,
            `split ${sourceGapBeforeSlide}s source gap between hold and slide`,
          ),
        });
        segments.push(slideSegment);
        lastSourceEnd = slideSegment.end;
        continue;
      }

      const segment = segmentFromCard(card, {
        start: holdStart,
        end: slideEnd,
        transitionStyle: "hold-then-slide",
        clipRole: "hold-through-slide",
        holdDuration: roundTime(Math.max(0, transitionStart - holdStart)),
        transitionStart,
        slideEnd,
        slideDuration: roundTime(slideEnd - transitionStart),
        revealsNextCardId: next.id,
        revealsNextCardName: next.name,
        warning: warningText(
          earlyRevealWarning,
          startWarning,
          slideWarning,
          transitionStart < holdStart ? "slide starts before held-card timestamp" : undefined,
          transitionStart - holdStart < minHold ? `short pre-slide hold ${roundTime(Math.max(0, transitionStart - holdStart))}s` : undefined,
        ),
      });
      segments.push(segment);
      lastSourceEnd = segment.end;
    } else {
      const rawHoldStart = roundTime(heldCardStart(card, { slideLead }));
      const holdStart = roundTime(Math.max(rawHoldStart, lastSourceEnd));
      const holdEnd = roundTime(holdStart + hold);
      const adjustedHoldStart = holdStart > rawHoldStart;
      const startWarning = adjustedHoldStart ? `held start moved ${roundTime(holdStart - rawHoldStart)}s to avoid source rewind` : undefined;
      const segment = segmentFromCard(card, {
        start: holdStart,
        end: holdEnd,
        transitionStyle: "hold-only",
        clipRole: "hold",
        holdDuration: roundTime(holdEnd - holdStart),
        warning: warningText(startWarning, hold < minHold ? `short hold ${hold}s` : undefined),
      });
      segments.push(segment);
      lastSourceEnd = segment.end;
    }
  }

  return segments;
}

function warningText(...items) {
  return items.filter(Boolean).join("; ");
}

function segmentFromCard(card, extra) {
  return {
    start: extra.start,
    end: extra.end,
    note: `${card.id} P${card.pack}C${card.cardInPack}: ${card.name}`,
    pack: card.pack,
    cardId: card.id,
    cardName: card.name,
    cardInPack: card.cardInPack,
    revealTimestamp: card.revealTimestamp,
    sourceRepresentative: card.sourceRepresentative,
    locked: true,
    catalogDriven: true,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined && value !== "")),
  };
}

function cutStartForCard(card, { slideLead }) {
  if (Number.isFinite(card.cutStartSeconds)) return card.cutStartSeconds;
  if (Number.isFinite(card.revealStartSeconds)) return card.revealStartSeconds;
  if (Number.isFinite(card.cutStart)) return card.cutStart;
  return fallbackCutStartForCard(card, { slideLead });
}

function fallbackCutStartForCard(card, { slideLead }) {
  if (Number.isFinite(card.sourceRepresentative)) {
    if (card.cardInPack > 1) return Math.max(0, card.sourceRepresentative - slideLead);
    return card.sourceRepresentative;
  }
  throw new Error(`${card.id} needs sourceRepresentative or cutStartSeconds`);
}

function heldCardStart(card, { slideLead }) {
  if (Number.isFinite(card.holdStartSeconds)) return card.holdStartSeconds;
  if (Number.isFinite(card.sourceRepresentative)) return card.sourceRepresentative;
  return cutStartForCard(card, { slideLead });
}

function slideEndForTransition(nextCard, { slideLead, slideDuration }, override = {}) {
  const start = Number.isFinite(override.start) ? override.start : cutStartForCard(nextCard, { slideLead });
  if (Number.isFinite(nextCard.revealEndSeconds)) {
    return Math.max(start, nextCard.revealEndSeconds);
  }
  if (override.useExplicitStart ?? hasExplicitCutStart(nextCard)) {
    return start + slideDuration;
  }
  if (Number.isFinite(nextCard.sourceRepresentative)) {
    return Math.max(nextCard.sourceRepresentative, start + slideDuration);
  }
  return start + slideDuration;
}

function hasExplicitCutStart(card) {
  return Number.isFinite(card.cutStartSeconds) || Number.isFinite(card.revealStartSeconds) || Number.isFinite(card.cutStart);
}

function holdForCard(card, { baseHold, insertHold, hitHold }) {
  if (Number.isFinite(card.holdSeconds)) return card.holdSeconds;
  const text = `${card.name} ${card.variant || ""} ${card.notes || ""}`.toLowerCase();
  if (card.isHit || /autograph|\bauto\b|numbered|\/\d+|pink|gold|case hit/.test(text)) {
    return hitHold;
  }
  if (/insert|refractor|x-fractor|checker|parallel|path to glory|playbook|lettered|dean'?s list|acropolis|green|orange/.test(text)) {
    return insertHold;
  }
  return baseHold;
}
