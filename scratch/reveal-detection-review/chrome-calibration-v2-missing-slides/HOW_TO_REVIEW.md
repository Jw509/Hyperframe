# Chrome Calibration V2 Missing Slides

Open `review.html`.

Each grid is 8 columns x 5 rows, read left-to-right, top-to-bottom.

- Frame 1 is the top-left image.
- Frame 33 is the detector/candidate time.
- This sheet shows 4 seconds before the candidate and 1 second after it.

For each card, reply with:

```text
card-003 start 18 settle 28
card-006 bad/no slide
card-024 start before frame 1 settle 20
```

Use:

- `start <frame>` for first upward slide motion.
- `settle <frame>` for fully readable/settled card.
- `start before frame 1` if even this wider sheet starts too late.
- `bad/no slide` if this is not a real reveal.
- `weird/manual` for nonstandard motion.

