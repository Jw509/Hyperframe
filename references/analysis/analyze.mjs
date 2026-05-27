#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readCuts(file) {
  const raw = readFileSync(resolve(here, file));
  let text;
  if (raw[0] === 0xff && raw[1] === 0xfe) {
    text = raw.slice(2).toString("utf16le");
  } else if (raw[0] === 0xfe && raw[1] === 0xff) {
    text = raw.slice(2).toString("utf16le");
  } else {
    text = raw.toString("utf8");
  }
  return text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}

function stats(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return { count: sorted.length, mean, median, min: sorted[0], max: sorted[sorted.length - 1], p10, p90 };
}

function summarize(name, cuts, totalDur, fromTime = 0) {
  const filtered = cuts.filter((t) => t >= fromTime);
  const dwells = [];
  for (let i = 1; i < filtered.length; i++) dwells.push(filtered[i] - filtered[i - 1]);
  const dwellStats = stats(dwells);
  const cuts_per_min = filtered.length / ((totalDur - fromTime) / 60);
  return {
    name,
    window: `${fromTime.toFixed(1)}s – ${totalDur.toFixed(1)}s`,
    duration: (totalDur - fromTime).toFixed(1),
    cut_count: filtered.length,
    cuts_per_min: cuts_per_min.toFixed(1),
    dwell_seconds: dwellStats
      ? {
          mean: dwellStats.mean.toFixed(2),
          median: dwellStats.median.toFixed(2),
          p10: dwellStats.p10.toFixed(2),
          p90: dwellStats.p90.toFixed(2),
          min: dwellStats.min.toFixed(2),
          max: dwellStats.max.toFixed(2),
        }
      : null,
    cuts_sample: filtered.slice(0, 10).map((t) => t.toFixed(2)),
  };
}

const pokemon = readCuts("pokemon-ref-cuts.txt");
const user = readCuts("user-attempt-cuts.txt");

console.log(JSON.stringify({
  pokemon_full:    summarize("pokemon-ref (full)", pokemon, 117.17, 0),
  pokemon_mimic:   summarize("pokemon-ref (>=25s, the zone)", pokemon, 117.17, 25),
  user_full:       summarize("user-attempt (full)", user, 87.17, 0),
}, null, 2));
