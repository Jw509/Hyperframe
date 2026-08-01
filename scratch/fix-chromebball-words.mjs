import fs from "fs";
// Clean up the whisper word list for chromebball captions.
//  - "Top's" -> "Topps" (whisper mis-spells the brand)
//  - merge "2024" + "-25" into one caption word so "-25" never flashes alone
//  - drop the outro words to y=1520: the recap card owns the centre of frame from 104.28,
//    and the default caption line (y=1150) sits right on top of its ROI line.
const words = JSON.parse(fs.readFileSync("scratch/chromebball-words.json", "utf8"));
const OUTRO_FROM = 101.0, LOW_Y = 1520;
const INTRO_LAST_OFF = 4.5;   // user: intro's final word clears at 4.5s

const out = [];
for (let i = 0; i < words.length; i++) {
  const w = { ...words[i] };
  if (w.text === "Top's") w.text = "Topps";
  if (w.text === "2024" && words[i + 1]?.text === "-25") {
    w.text = "2024-25";
    w.end = words[i + 1].end;
    i++;                                  // swallow the "-25" token
  }
  if (w.start >= OUTRO_FROM) w.y = LOW_Y;
  out.push(w);
}
// last word before the long silent stretch — hold it to exactly 4.5s, then clear
const introLast = out.filter(w => w.start < OUTRO_FROM).pop();
introLast.end_at = INTRO_LAST_OFF;

fs.writeFileSync("scratch/chromebball-words-fixed.json", JSON.stringify(out, null, 1));
console.log(`intro last word ${JSON.stringify(introLast.text)} clears at ${INTRO_LAST_OFF}s`);
const low = out.filter(w => w.y).length;
console.log(`${out.length} words (${words.length} in), ${low} dropped to y=${LOW_Y}`);
console.log("intro:", out.filter(w => w.start < 10).map(w => w.text).join(" "));
console.log("outro:", out.filter(w => w.start >= OUTRO_FROM).map(w => w.text).join(" "));
