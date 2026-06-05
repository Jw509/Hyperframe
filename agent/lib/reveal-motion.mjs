import { spawnSync } from "node:child_process";
import { roundTime } from "./time.mjs";

const DEFAULTS = {
  fps: 30,
  width: 180,
  height: 320,
  lookback: 2,
  lookahead: 0.05,
  minAfterPrevious: 0.25,
  minAfterPreviousReveal: 0.75,
  fallbackLead: 0.45,
  preRoll: 0.03,
  ffmpeg: "ffmpeg",
};

export function detectRevealStart({
  sourcePath,
  card,
  previousCard = null,
  previousRevealStart = null,
  previousRevealEnd = null,
  options = {},
}) {
  const settings = { ...DEFAULTS, ...definedOptions(options) };
  if (!Number.isFinite(card.sourceRepresentative)) {
    throw new Error(`${card.id} needs sourceRepresentative for reveal detection`);
  }

  if (card.cardInPack <= 1) {
    return {
      cardId: card.id,
      status: "skipped_first_card",
      detectedStart: card.sourceRepresentative,
      confidence: 1,
      reason: "first card in pack uses held-in-hand catalog timestamp",
    };
  }

  const target = card.sourceRepresentative;
  const priorReveal =
    Number.isFinite(previousRevealEnd) ? previousRevealEnd :
    Number.isFinite(previousRevealStart) ? previousRevealStart :
    Number.isFinite(previousCard?.revealStartSeconds) ? previousCard.revealStartSeconds :
    Number.isFinite(previousCard?.cutStartSeconds) ? previousCard.cutStartSeconds :
    Number.isFinite(previousCard?.sourceRepresentative) ? previousCard.sourceRepresentative :
    null;
  const previousFloor =
    previousCard && previousCard.pack === card.pack && Number.isFinite(priorReveal)
      ? priorReveal + settings.minAfterPreviousReveal
      : target - settings.lookback;
  const windowStart = Math.max(0, previousFloor);
  const windowEnd = Math.max(windowStart + 0.2, target + settings.lookahead);
  const frames = extractGrayFrames({
    sourcePath,
    start: windowStart,
    duration: windowEnd - windowStart,
    fps: settings.fps,
    width: settings.width,
    height: settings.height,
    ffmpeg: settings.ffmpeg,
  });

  if (frames.length < 4) {
    return fallbackResult(card, settings, windowStart, windowEnd, "not enough frames");
  }

  const metrics = computeMotionMetrics(frames, {
    fps: settings.fps,
    start: windowStart,
    width: settings.width,
    height: settings.height,
  });
  const thresholds = motionThresholds(metrics);
  const clusters = motionClusters(metrics, thresholds, {
    target,
    frames,
    windowStart,
    fps: settings.fps,
    width: settings.width,
    height: settings.height,
  });
  const chosen = chooseCluster(clusters, target);

  if (!chosen) {
    return fallbackResult(card, settings, windowStart, windowEnd, "no sustained reveal-motion cluster", {
      thresholds,
      sampleCount: metrics.length,
    });
  }

  const firstMetric = metrics[chosen.startIndex];
  const detectedStart = roundTime(Math.max(windowStart, firstMetric.time - (1 / settings.fps) - settings.preRoll));
  const lead = roundTime(target - detectedStart);
  return {
    cardId: card.id,
    status: "detected",
    detectedStart,
    lead,
    detectedEnd: roundTime(metrics[chosen.endIndex].time),
    confidence: confidenceForCluster(chosen),
    target,
    windowStart: roundTime(windowStart),
    windowEnd: roundTime(windowEnd),
    thresholds,
    cluster: {
      start: roundTime(metrics[chosen.startIndex].time),
      end: roundTime(metrics[chosen.endIndex].time),
      frames: chosen.frames,
      maxScore: roundTime(chosen.maxScore),
      averageScore: roundTime(chosen.averageScore),
    },
  };
}

function definedOptions(options) {
  return Object.fromEntries(
    Object.entries(options || {}).filter(([, value]) => value !== undefined && value !== null),
  );
}

export function detectRevealStartsForCatalog({ catalog, sourcePath, options = {}, ids = new Set() }) {
  const cards = catalog.cards || [];
  let previousRevealStart = null;
  let previousRevealEnd = null;
  return cards.map((card, index) => {
    if (ids.size && !ids.has(card.id)) {
      return {
        cardId: card.id,
        status: "skipped_unrequested",
        detectedStart: card.cutStartSeconds ?? card.revealStartSeconds ?? null,
      };
    }
    const result = detectRevealStart({
      sourcePath,
      card,
      previousCard: cards[index - 1] || null,
      previousRevealStart,
      previousRevealEnd,
      options,
    });
    if (Number.isFinite(result.detectedStart)) previousRevealStart = result.detectedStart;
    if (Number.isFinite(result.detectedEnd)) previousRevealEnd = result.detectedEnd;
    else if (Number.isFinite(result.detectedStart)) previousRevealEnd = result.detectedStart;
    return result;
  });
}

function fallbackResult(card, settings, windowStart, windowEnd, reason, extra = {}) {
  const detectedStart = roundTime(Math.max(windowStart, card.sourceRepresentative - settings.fallbackLead));
  return {
    cardId: card.id,
    status: "fallback",
    detectedStart,
    lead: roundTime(card.sourceRepresentative - detectedStart),
    confidence: 0.25,
    target: card.sourceRepresentative,
    windowStart: roundTime(windowStart),
    windowEnd: roundTime(windowEnd),
    reason,
    ...extra,
  };
}

function extractGrayFrames({ sourcePath, start, duration, fps, width, height, ffmpeg }) {
  const frameBytes = width * height;
  const maxBuffer = Math.max(
    64 * 1024 * 1024,
    Math.ceil(frameBytes * Math.max(8, duration * fps + 6) * 2),
  );
  const result = spawnSync(ffmpeg, [
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
    `fps=${fps},scale=${width}:${height},format=gray`,
    "-f",
    "rawvideo",
    "pipe:1",
  ], {
    encoding: "buffer",
    maxBuffer,
  });

  if (result.status !== 0) {
    if (result.error) throw result.error;
    const stderr = result.stderr?.toString("utf8") || "";
    throw new Error(`ffmpeg frame extraction failed: ${stderr.trim() || `status=${result.status} signal=${result.signal || ""}`}`);
  }

  const frames = [];
  const usableLength = Math.floor(result.stdout.length / frameBytes) * frameBytes;
  for (let offset = 0; offset < usableLength; offset += frameBytes) {
    frames.push(result.stdout.subarray(offset, offset + frameBytes));
  }
  return frames;
}

function computeMotionMetrics(frames, { fps, start, width, height }) {
  const rois = {
    right: roi(width, height, 0.52, 0.95, 0.18, 0.82),
    bottom: roi(width, height, 0.18, 0.84, 0.50, 0.92),
    stack: roi(width, height, 0.16, 0.88, 0.18, 0.90),
  };

  const out = [];
  for (let i = 1; i < frames.length; i++) {
    const previous = frames[i - 1];
    const current = frames[i];
    const stackShift = verticalShift(previous, current, rois.stack, width, 6);
    const rightShift = verticalShift(previous, current, rois.right, width, 6);
    out.push({
      time: roundTime(start + i / fps),
      rightMotion: meanAbsDiff(previous, current, rois.right, width),
      bottomMotion: meanAbsDiff(previous, current, rois.bottom, width),
      stackMotion: meanAbsDiff(previous, current, rois.stack, width),
      upwardShift: Math.max(stackShift, rightShift),
      verticalMotion: Math.max(Math.abs(stackShift), Math.abs(rightShift)),
      stackShift,
      rightShift,
    });
  }
  return out.map((metric, index, all) => ({
    ...metric,
    smoothedBottom: smoothAt(all, index, "bottomMotion"),
    smoothedStack: smoothAt(all, index, "stackMotion"),
    smoothedRight: smoothAt(all, index, "rightMotion"),
    smoothedUpwardShift: smoothAt(all, index, "upwardShift"),
    smoothedVerticalMotion: smoothAt(all, index, "verticalMotion"),
  }));
}

function motionThresholds(metrics) {
  return {
    bottom: robustThreshold(metrics.map((m) => m.smoothedBottom), 1.25),
    stack: robustThreshold(metrics.map((m) => m.smoothedStack), 1.15),
    right: robustThreshold(metrics.map((m) => m.smoothedRight), 1.2),
    verticalMotion: 0.65,
  };
}

function motionClusters(metrics, thresholds, context) {
  const { target } = context;
  const scored = metrics.map((metric) => {
    const bottomScore = metric.smoothedBottom / thresholds.bottom;
    const stackScore = metric.smoothedStack / thresholds.stack;
    const rightScore = metric.smoothedRight / thresholds.right;
    const verticalScore = metric.smoothedVerticalMotion / thresholds.verticalMotion;
    const score = bottomScore + 0.8 * stackScore + 0.35 * rightScore + 0.75 * verticalScore;
    const isReveal =
      metric.time <= target + 0.1 &&
      metric.smoothedBottom >= thresholds.bottom &&
      metric.smoothedStack >= thresholds.stack * 0.85 &&
      (metric.smoothedVerticalMotion >= thresholds.verticalMotion || metric.smoothedBottom >= thresholds.bottom * 1.45);
    return { ...metric, score, isReveal };
  });

  const clusters = [];
  let current = null;
  let gap = 0;
  for (const [index, metric] of scored.entries()) {
    if (metric.isReveal) {
      if (!current) current = { startIndex: index, endIndex: index, startTime: metric.time, endTime: metric.time, scores: [] };
      current.endIndex = index;
      current.endTime = metric.time;
      current.scores.push(metric.score);
      gap = 0;
      continue;
    }
    if (current && gap === 0) {
      gap++;
      current.endIndex = index;
      current.endTime = metric.time;
      current.scores.push(metric.score * 0.4);
      continue;
    }
    if (current) {
      clusters.push(finalizeCluster(current));
      current = null;
      gap = 0;
    }
  }
  if (current) clusters.push(finalizeCluster(current));
  const transitionRoi = roi(context.width, context.height, 0.18, 0.84, 0.16, 0.88);
  return clusters
    .map((cluster) => addTransitionScore(cluster, context, transitionRoi))
    .filter((cluster) =>
      cluster.frames >= 2 &&
      cluster.maxScore >= 3.2 &&
      cluster.transitionGain >= 1.5 &&
      cluster.postTargetDiff <= cluster.preTargetDiff * 0.9,
    );
}

function chooseCluster(clusters, target) {
  const eligible = clusters.filter((cluster) => cluster.startTime <= target + 0.1);
  if (!eligible.length) return null;
  return eligible.at(-1);
}

function finalizeCluster(cluster) {
  const frames = cluster.endIndex - cluster.startIndex + 1;
  const maxScore = Math.max(...cluster.scores);
  const averageScore = cluster.scores.reduce((sum, score) => sum + score, 0) / cluster.scores.length;
  return {
    ...cluster,
    frames,
    maxScore,
    averageScore,
  };
}

function addTransitionScore(cluster, { frames, windowStart, fps, target, width }, area) {
  const targetIndex = clamp(Math.round((target - windowStart) * fps), 0, frames.length - 1);
  const beforeIndex = clamp(cluster.startIndex, 0, frames.length - 1);
  const afterIndex = clamp(cluster.endIndex + 1, 0, frames.length - 1);
  const targetFrame = frames[targetIndex];
  const preTargetDiff = meanAbsDiff(frames[beforeIndex], targetFrame, area, width);
  const postTargetDiff = meanAbsDiff(frames[afterIndex], targetFrame, area, width);
  return {
    ...cluster,
    preTargetDiff,
    postTargetDiff,
    transitionGain: preTargetDiff - postTargetDiff,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function confidenceForCluster(cluster) {
  const scorePart = Math.min(0.8, cluster.maxScore / 7);
  const durationPart = Math.min(0.2, cluster.frames / 20);
  return roundTime(Math.max(0.35, Math.min(0.98, scorePart + durationPart)));
}

function roi(width, height, x0, x1, y0, y1) {
  return {
    x0: Math.floor(width * x0),
    x1: Math.ceil(width * x1),
    y0: Math.floor(height * y0),
    y1: Math.ceil(height * y1),
  };
}

function meanAbsDiff(a, b, area, width) {
  let sum = 0;
  let count = 0;
  for (let y = area.y0; y < area.y1; y++) {
    const row = y * width;
    for (let x = area.x0; x < area.x1; x++) {
      sum += Math.abs(a[row + x] - b[row + x]);
      count++;
    }
  }
  return count ? sum / count : 0;
}

function verticalShift(previous, current, area, width, maxShift) {
  let bestShift = 0;
  let bestScore = Infinity;
  for (let dy = -maxShift; dy <= maxShift; dy++) {
    let sum = 0;
    let count = 0;
    const yStart = Math.max(area.y0, area.y0 - dy);
    const yEnd = Math.min(area.y1, area.y1 - dy);
    for (let y = yStart; y < yEnd; y++) {
      const currentRow = y * width;
      const previousRow = (y + dy) * width;
      for (let x = area.x0; x < area.x1; x++) {
        sum += Math.abs(current[currentRow + x] - previous[previousRow + x]);
        count++;
      }
    }
    const score = count ? sum / count : Infinity;
    if (score < bestScore) {
      bestScore = score;
      bestShift = dy;
    }
  }
  return bestShift;
}

function smoothAt(items, index, key) {
  const values = [];
  for (let i = Math.max(0, index - 1); i <= Math.min(items.length - 1, index + 1); i++) {
    values.push(items[i][key]);
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function robustThreshold(values, minimum) {
  if (!values.length) return minimum;
  const sorted = values.slice().sort((a, b) => a - b);
  const baseline = quantile(sorted, 0.35);
  const deviations = values.map((value) => Math.abs(value - baseline)).sort((a, b) => a - b);
  const mad = quantile(deviations, 0.5);
  return Math.max(minimum, baseline + 3.5 * Math.max(mad, 0.05));
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
