import fs from "node:fs";
import { execSync } from "node:child_process";

const catalogPath =
  process.argv[2] ?? "scratch/chrome-short/catalogue.json";
const video =
  process.argv[3] ??
  "cards/sources/chrome/CutdownChromeMegaBox-portrait-static-reframed.mp4";
const output =
  process.argv[4] ?? "scratch/chrome-short/master-position-check.png";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const dir = "scratch/chrome-short/master-position-frames";
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

for (const [index, shot] of catalog.shots.entries()) {
  const time = ((shot.start + shot.end) / 2).toFixed(3);
  const file = `${dir}/f_${String(index + 1).padStart(2, "0")}.png`;
  const filter = [
    "scale=240:-1",
    "drawbox=x=40:y=0:w=2:h=ih:color=red:t=fill",
    "drawbox=x=196:y=0:w=2:h=ih:color=red:t=fill",
    "drawbox=x=0:y=134:w=iw:h=2:color=red:t=fill",
    "drawbox=x=0:y=348:w=iw:h=2:color=red:t=fill",
  ].join(",");
  execSync(
    `ffmpeg -hide_banner -loglevel error -y -ss ${time} -i "${video}" -frames:v 1 -vf "${filter}" "${file}"`,
  );
}

const rows = Math.ceil(catalog.shots.length / 6);
execSync(
  `ffmpeg -hide_banner -loglevel error -y -i "${dir}/f_%02d.png" -vf "tile=6x${rows}:margin=4:padding=6:color=white" -frames:v 1 "${output}"`,
  { stdio: "inherit" },
);
console.log(`Master-position audit -> ${output}`);
