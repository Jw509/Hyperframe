import fs from "node:fs";

const catalogPath =
  process.argv[2] ?? "scratch/chrome-short/catalogue_track.json";
const approvedPath =
  process.argv[3] ??
  "briefs/cuts/chrome-megabox-static-reframe-v1.approved.json";
const outputPath =
  process.argv[4] ??
  "briefs/cuts/chrome-megabox-master-reference-v2.json";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const approved = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
const wideLabels = new Set(["(sealed pack)", "(stack fan)"]);
const centerOverrides = new Map([
  [1, 1870],
  [23, 1680],
  [25, 1860],
  [34, 1960],
  [35, 1960],
  [36, 1820],
  [37, 1630]
]);
const preChangeLead = 0.12;

function approvedWideAt(time) {
  return approved.segments.find(
    (segment) =>
      segment.centerX !== approved.defaultCenterX &&
      time >= segment.start &&
      time < segment.end,
  );
}

const events = [
  {
    time: 0,
    centerX: approved.defaultCenterX,
    note: "locked default framing",
    priority: 0
  }
];

for (const segment of approved.segments) {
  if (segment.centerX === approved.defaultCenterX) continue;
  events.push({
    time: segment.start,
    centerX: segment.centerX,
    note: segment.note,
    priority: 3
  });
  events.push({
    time: segment.end,
    centerX: approved.defaultCenterX,
    note: "return to locked default framing",
    priority: 1
  });
}

for (const [index, shot] of catalog.shots.entries()) {
  let activation = Math.max(0, shot.start - preChangeLead);
  if (approvedWideAt(activation)) activation = shot.start;
  if (approvedWideAt(activation)) continue;

  const isWide = wideLabels.has(shot.label);
  events.push({
    time: activation,
    centerX: isWide
      ? approved.defaultCenterX
      : centerOverrides.get(index + 1) ?? shot.cx,
    note: isWide
      ? `wide fan/pack framing: ${shot.label}`
      : `master-reference card hold: ${shot.label}`,
    priority: 2
  });
}

events.sort((a, b) => a.time - b.time || a.priority - b.priority);
const resolvedEvents = [];
for (const event of events) {
  const previous = resolvedEvents.at(-1);
  if (previous && previous.time === event.time) {
    resolvedEvents[resolvedEvents.length - 1] = event;
  } else if (!previous || previous.centerX !== event.centerX) {
    resolvedEvents.push(event);
  }
}

const segments = resolvedEvents.map((event, index) => ({
  start: event.time,
  end: resolvedEvents[index + 1]?.time ?? 133.29,
  centerX: event.centerX,
  note: event.note
})).filter((segment) => segment.end > segment.start);

const output = {
  comment:
    "Master-reference framing: clean card holds snap horizontally to the reference card position; fan/pack exceptions remain wide; no panning.",
  source: approved.source,
  target: approved.target,
  referenceImage:
    "C:/Users/J/Pictures/Screenshots/Screenshot 2026-06-05 202819.png",
  referenceGuides: {
    left: 0.171,
    right: 0.821,
    top: 0.314,
    bottom: 0.813,
    cardCenterX: 0.496,
    cardCenterY: 0.564
  },
  cropWidth: approved.cropWidth,
  cropHeight: approved.cropHeight,
  defaultCenterX: approved.defaultCenterX,
  transitionStyle: "hard-cut",
  segments
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Master-reference cut -> ${outputPath}; ${segments.length} sections`);
