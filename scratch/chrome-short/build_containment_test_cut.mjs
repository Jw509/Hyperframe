import fs from "node:fs";

const catalogPath =
  process.argv[2] ?? "scratch/chrome-short/catalogue_track.json";
const masterPath =
  process.argv[3] ?? "briefs/cuts/chrome-megabox-master-reference-v2.json";
const outputPath =
  process.argv[4] ?? "briefs/cuts/chrome-megabox-containment-test-v1.json";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));
const wideLabels = new Set(["(sealed pack)", "(stack fan)"]);
const centerXOverrides = new Map([
  [1, 1870],
  [23, 1680],
  [25, 1860],
  [34, 1960],
  [35, 1960],
  [36, 1820],
  [37, 1630],
]);
const centerYOverrides = new Map([
  // This is the user's redlined Cam Ward master-reference moment.
  [40, Math.round(master.referenceGuides.cardCenterY * master.cropHeight)],
]);
const targetCenterY = Math.round(
  master.referenceGuides.cardCenterY * master.cropHeight,
);
const preChangeLead = 0.12;

const events = [
  {
    time: 0,
    centerX: master.defaultCenterX,
    centerY: targetCenterY,
    note: "locked default framing",
    priority: 0,
  },
  {
    time: 39.43,
    centerX: 1672,
    centerY: targetCenterY,
    note: "approved 0:40 fan and 0:41 pack framing",
    priority: 4,
  },
  {
    time: 89.3,
    centerX: 1750,
    centerY: targetCenterY,
    note: "approved 1:30 and 1:35 pack framing",
    priority: 4,
  },
  {
    time: 107.75,
    centerX: 1800,
    centerY: targetCenterY,
    note: "approved 1:48 fan and 1:50 pack framing",
    priority: 4,
  },
  {
    time: 118,
    centerX: master.defaultCenterX,
    centerY: targetCenterY,
    note: "approved return to correct framing at 1:58",
    priority: 5,
  },
];

for (const [zeroIndex, shot] of catalog.shots.entries()) {
  const shotNumber = zeroIndex + 1;
  const isWide = wideLabels.has(shot.label);
  events.push({
    time: Math.max(0, shot.start - preChangeLead),
    centerX: isWide
      ? master.defaultCenterX
      : centerXOverrides.get(shotNumber) ?? shot.cx,
    centerY: isWide
      ? targetCenterY
      : centerYOverrides.get(shotNumber) ?? shot.cyTrack ?? shot.cy,
    note: isWide
      ? `wide fan/pack framing: ${shot.label}`
      : `85%-containment card framing: ${shot.label}`,
    priority: isWide ? 3 : 2,
  });
}

events.sort((a, b) => a.time - b.time || a.priority - b.priority);
const resolvedEvents = [];
for (const event of events) {
  const previous = resolvedEvents.at(-1);
  if (previous && previous.time === event.time) {
    resolvedEvents[resolvedEvents.length - 1] = event;
  } else if (
    !previous ||
    previous.centerX !== event.centerX ||
    previous.centerY !== event.centerY
  ) {
    resolvedEvents.push(event);
  }
}

const segments = resolvedEvents
  .map((event, index) => ({
    start: event.time,
    end: resolvedEvents[index + 1]?.time ?? 133.29,
    centerX: event.centerX,
    centerY: event.centerY,
    note: event.note,
  }))
  .filter((segment) => segment.end > segment.start);

const output = {
  comment:
    "First 85%-containment test: every clean card hold gets one locked horizontal/vertical reframe; no panning.",
  source: master.source,
  target: master.target,
  referenceImage: master.referenceImage,
  referenceGuides: master.referenceGuides,
  minimumCardContainment: 0.85,
  cropWidth: master.cropWidth,
  cropHeight: master.cropHeight,
  verticalPad: 700,
  verticalFillMode: "mirror",
  defaultCenterX: master.defaultCenterX,
  defaultCenterY: targetCenterY,
  transitionStyle: "hard-cut",
  segments,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Containment test cut -> ${outputPath}; ${segments.length} sections`);
