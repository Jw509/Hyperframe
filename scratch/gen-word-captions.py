"""Build a word-by-word Shorts caption .ass from whisper word timings.

Style matched to the Wayne Collection reference (2026-07-13 00-45-26.mp4):
heavy rounded font (Segoe UI Black), pure white, NO outline — soft dark
drop-shadow via a blurred black under-layer. All-caps, dead center,
words cut in with no pop animation, each holds until the next starts.
"""
import json
import sys

from PIL import ImageFont

words_path, out_path = sys.argv[1], sys.argv[2]
variant = sys.argv[3] if len(sys.argv) > 3 else "plain"  # plain | blue | black
words = json.load(open(words_path, encoding="utf-8"))

# outline per variant: light-blue #66BFFF border, thin black, or none (reference look)
OUTLINES = {
    "plain": (0, "&H00000000"),
    "blue": (5, "&H00FFBF66"),
    "black": (4, "&H00000000"),
}
OUT_W, OUT_COL = OUTLINES[variant]

BASE_FS = 150
MAX_W = 900  # keep words inside the 1080 PlayRes frame
_measure = ImageFont.truetype("C:/Windows/Fonts/seguibl.ttf", BASE_FS)


def fit_fs(text):
    w = _measure.getbbox(text)[2] - _measure.getbbox(text)[0]
    if w <= MAX_W:
        return BASE_FS
    return int(BASE_FS * MAX_W / w)


def ts(t):
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,Segoe UI Black,150,&H00FFFFFF,&H00FFFFFF,{OUT_COL},&H00000000,0,0,0,0,100,100,0,0,1,{OUT_W},0,5,60,60,60,1
Style: WordShadow,Segoe UI Black,150,&H50000000,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""".replace("{OUT_COL}", OUT_COL).replace("{OUT_W}", str(OUT_W))

lines = []
for i, w in enumerate(words):
    start = w["start"]
    # A word holds until the next one starts, EXCEPT:
    #  - it never outlives its own spoken end by more than GAP_HOLD. Without this, the last
    #    word before a pause hangs on screen for the whole silence (the last word of an intro
    #    sat there for 97s waiting for the outro).
    #  - it never extends INTO the next word. The old unconditional 0.10s minimum did, so
    #    anything spoken faster than that stacked glyphs ("THE"+"NEXT" -> "NTHEXT").
    GAP_HOLD = 0.25
    end = min(words[i + 1]["start"], w["end"] + GAP_HOLD) if i + 1 < len(words) else max(w["end"], start + 0.10)
    end = w.get("end_at", end)                     # explicit per-word override
    end = max(end, start + 0.08)                   # never a zero-length event
    text = w["text"].upper().replace("{", "").replace("}", "")
    fs = fit_fs(text)
    size = rf"\fs{fs}" if fs != BASE_FS else ""
    # soft drop-shadow: blurred 30%-alpha black copy nudged down, under the white word
    # slightly below center (y=1150/1920) so words clear the intro card + box logo.
    # A word may carry its own "y" to dodge a centred overlay (e.g. the profit/ROI recap).
    y = int(w.get("y", 1150))
    lines.append(
        f"Dialogue: 0,{ts(start)},{ts(end)},WordShadow,,0,0,0,,"
        rf"{{\an5{size}\blur14\pos(540,{y + 12})}}{text}"
    )
    lines.append(
        f"Dialogue: 1,{ts(start)},{ts(end)},Word,,0,0,0,,"
        rf"{{\an5{size}\pos(540,{y})}}{text}"
    )

with open(out_path, "w", encoding="utf-8") as f:
    f.write(header + "\n".join(lines) + "\n")
print(f"wrote {out_path} with {len(lines)//2} words, last ends {ts(words[-1]['end'])}")
