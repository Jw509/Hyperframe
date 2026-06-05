# Chrome Calibration V3 Transition Fixes

Open `review.html`.

Each grid is 5 columns x 8 rows, read left-to-right, top-to-bottom.

- Frame 1 is the top-left image.
- Frame 11 is the current calibrated start.
- This sheet shows 1 second before the current start and 3 seconds after it.

Please review these three transitions:

- `card-005` = Davante Adams into Jakobi Meyers
- `card-006` = Jakobi Meyers into Dalton Schultz
- `card-012` = Deone Walker into Sam LaPorta

Reply like:

```text
card-005 start 8 settle 20
card-006 start ok settle 24
card-012 start 13 settle 19
```

Use:

- `start <frame>` if the slide should begin at a different frame.
- `start ok` if frame 11 is already the right slide start.
- `settle <frame>` for the first frame where the revealed card is fully readable/settled.
- `manual` if the grid does not show the needed motion cleanly.

