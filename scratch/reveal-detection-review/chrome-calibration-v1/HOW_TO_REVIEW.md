# Chrome Calibration V1 Review Format

Open `review.html`.

Each card grid is 6 columns x 4 rows, read left-to-right, top-to-bottom.

- Frame 1 is the top-left image.
- Frame 9 is the detector's current candidate start.
- Mark the first frame where the top card clearly begins moving upward to reveal the next card.
- Mark the first frame where the revealed card has settled/readable.

Reply in this format:

```text
card-002 start 10 settle 16
card-003 start 8 settle 14
card-004 bad/no slide
card-005 weird/manual
```

Short labels are fine:

- `start <frame>`: actual upward slide starts here.
- `settle <frame>`: card is fully revealed/readable here.
- `bad/no slide`: the grid does not show a real slide.
- `weird/manual`: flip, pause, nonstandard reveal, or anything the detector should not learn from.

