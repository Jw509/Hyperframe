import fs from "fs";
// Builds scratch/run-sdblf-composite.sh from scratch/sdblf-composite-manifest.json.
// ONE ffmpeg pass: 4K60 source + black recap tail + every element .mov overlaid at its
// timestamp/position (enable windows keep inactive overlays free) -> NVENC encode.
// Modes baked into the .sh: test (first 40s), review (1080p full length), final (4K).
const m = JSON.parse(fs.readFileSync("scratch/sdblf-composite-manifest.json", "utf8"));
const SRC = "cards/sources/SDBLF/SDBLF.mp4";
const FULL = +(m.videoDuration + m.recapDuration).toFixed(2);
const RECAP = m.recapDuration;

const inputs = [`-i "${SRC}"`];
const chains = [];
let prev = "base";
chains.push(`[0:v]tpad=stop_mode=add:stop_duration=${RECAP}[base]`);
m.elements.forEach((e, i) => {
  const idx = i + 1;
  inputs.push(`-itsoffset ${e.start} -i "cards/renders/${e.out}"`);
  const next = `v${idx}`;
  const end = +(e.start + e.duration + 0.05).toFixed(2);
  chains.push(`[${prev}][${idx}:v]overlay=x=${e.x}:y=${e.y}:eof_action=pass:enable='between(t,${e.start},${end})'[${next}]`);
  prev = next;
});
const graph4k = chains.join(";\n  ") + `;\n  [${prev}]format=yuv420p[vout];\n  [0:a]apad=pad_dur=${RECAP}[aout]`;
const graph1080 = chains.join(";\n  ") + `;\n  [${prev}]scale=1920:1080,format=yuv420p[vout];\n  [0:a]apad=pad_dur=${RECAP}[aout]`;

const common = (graph, t, vcodec, out) => `ffmpeg -y -hide_banner ${inputs.join(" \\\n  ")} \\
  -filter_complex "${graph}" \\
  -map "[vout]" -map "[aout]" ${t ? `-t ${t} ` : `-t ${FULL} `}-r 60 \\
  -c:v ${vcodec} -c:a aac -b:a 256k \\
  "${out}"`;

const sh = `#!/usr/bin/env bash
# Composite the SDBLF overlay elements onto the source. Usage: bash scratch/run-sdblf-composite.sh [test|review|final]
set -u
cd "$(dirname "$0")/.." || exit 1
MODE="\${1:-review}"
case "$MODE" in
  test)
${common(graph4k, 60, "hevc_nvenc -preset p5 -rc vbr -cq 19 -b:v 0", "cards/renders/SDBLF_test60.mp4").replace(/^/gm, "    ")}
    ;;
  review)
${common(graph1080, 0, "h264_nvenc -preset p5 -rc vbr -cq 23 -b:v 0", "cards/renders/SDBLF_review_1080.mp4").replace(/^/gm, "    ")}
    ;;
  final)
${common(graph4k, 0, "hevc_nvenc -preset p5 -rc vbr -cq 19 -b:v 0", "cards/renders/SDBLF_final_4k60.mp4").replace(/^/gm, "    ")}
    ;;
  *) echo "unknown mode $MODE"; exit 1;;
esac
`;
fs.writeFileSync("scratch/run-sdblf-composite.sh", sh);
console.log(`wrote scratch/run-sdblf-composite.sh : ${m.elements.length} overlays, full=${FULL}s`);
