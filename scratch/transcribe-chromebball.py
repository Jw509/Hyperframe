"""Word-level transcript of the chromebball voiceover (faster-whisper).

The cut is mostly silent card footage with VO only at the head and tail, so VAD is on
to skip the dead air. Writes scratch/chromebball-words.json ([{text,start,end}]) plus a
readable segment dump so the wording can be checked against what the host actually said.
"""
import json

from faster_whisper import WhisperModel

model = WhisperModel("medium.en", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    "scratch/chromebball-vo.wav",
    word_timestamps=True,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 700},
)

words, segs = [], []
for seg in segments:
    segs.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()})
    print(f"[{seg.start:7.2f} -> {seg.end:7.2f}] {seg.text.strip()}")
    for w in seg.words or []:
        t = w.word.strip()
        if t:
            words.append({"text": t, "start": round(w.start, 2), "end": round(w.end, 2)})

json.dump(words, open("scratch/chromebball-words.json", "w", encoding="utf-8"), indent=1)
json.dump(segs, open("scratch/chromebball-segments.json", "w", encoding="utf-8"), indent=1)
print(f"\n{len(words)} words, {len(segs)} segments -> scratch/chromebball-words.json")
