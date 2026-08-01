#!/usr/bin/env bash
# Composite the SDBLF overlay elements onto the source. Usage: bash scratch/run-sdblf-composite.sh [test|review|final]
set -u
cd "$(dirname "$0")/.." || exit 1
MODE="${1:-review}"
case "$MODE" in
  test)
    ffmpeg -y -hide_banner -i "cards/sources/SDBLF/SDBLF.mp4" \
      -itsoffset 0 -i "cards/renders/sdblf-el-counter.mov" \
      -itsoffset 42 -i "cards/renders/sdblf-el-chip-01.mov" \
      -itsoffset 46 -i "cards/renders/sdblf-el-chip-02.mov" \
      -itsoffset 50 -i "cards/renders/sdblf-el-chip-03.mov" \
      -itsoffset 102 -i "cards/renders/sdblf-el-chip-06.mov" \
      -itsoffset 110 -i "cards/renders/sdblf-el-chip-07.mov" \
      -itsoffset 135 -i "cards/renders/sdblf-el-chip-08.mov" \
      -itsoffset 162 -i "cards/renders/sdblf-el-chip-10.mov" \
      -itsoffset 178 -i "cards/renders/sdblf-el-chip-11.mov" \
      -itsoffset 195 -i "cards/renders/sdblf-el-chip-12.mov" \
      -itsoffset 198 -i "cards/renders/sdblf-el-chip-13.mov" \
      -itsoffset 200.7 -i "cards/renders/sdblf-el-chip-14.mov" \
      -itsoffset 218 -i "cards/renders/sdblf-el-chip-15.mov" \
      -itsoffset 220.7 -i "cards/renders/sdblf-el-chip-16.mov" \
      -itsoffset 238 -i "cards/renders/sdblf-el-chip-17.mov" \
      -itsoffset 243 -i "cards/renders/sdblf-el-chip-30.mov" \
      -itsoffset 271 -i "cards/renders/sdblf-el-chip-19.mov" \
      -itsoffset 273.7 -i "cards/renders/sdblf-el-chip-18.mov" \
      -itsoffset 295.5 -i "cards/renders/sdblf-el-chip-20.mov" \
      -itsoffset 309.5 -i "cards/renders/sdblf-el-chip-21.mov" \
      -itsoffset 314 -i "cards/renders/sdblf-el-chip-22.mov" \
      -itsoffset 316.7 -i "cards/renders/sdblf-el-chip-23.mov" \
      -itsoffset 360 -i "cards/renders/sdblf-el-chip-24.mov" \
      -itsoffset 369 -i "cards/renders/sdblf-el-chip-05.mov" \
      -itsoffset 392 -i "cards/renders/sdblf-el-chip-25.mov" \
      -itsoffset 417 -i "cards/renders/sdblf-el-chip-04.mov" \
      -itsoffset 420 -i "cards/renders/sdblf-el-chip-26.mov" \
      -itsoffset 438 -i "cards/renders/sdblf-el-chip-28.mov" \
      -itsoffset 442 -i "cards/renders/sdblf-el-chip-27.mov" \
      -itsoffset 460 -i "cards/renders/sdblf-el-chip-29.mov" \
      -itsoffset 463 -i "cards/renders/sdblf-el-chip-09.mov" \
      -itsoffset 486 -i "cards/renders/sdblf-el-chip-31.mov" \
      -itsoffset 490 -i "cards/renders/sdblf-el-chip-32.mov" \
      -itsoffset 528 -i "cards/renders/sdblf-el-chip-34.mov" \
      -itsoffset 536 -i "cards/renders/sdblf-el-chip-35.mov" \
      -itsoffset 538.7 -i "cards/renders/sdblf-el-chip-36.mov" \
      -itsoffset 568.98 -i "cards/renders/sdblf-el-recap.mov" \
      -filter_complex "[0:v]tpad=stop_mode=add:stop_duration=7.5[base];
      [base][1:v]overlay=x=0:y=0:eof_action=pass:enable='between(t,0,569.03)'[v1];
      [v1][2:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,42,44.6)'[v2];
      [v2][3:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,46,48.6)'[v3];
      [v3][4:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,50,52.6)'[v4];
      [v4][5:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,102,106.25)'[v5];
      [v5][6:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,110,112.6)'[v6];
      [v6][7:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,135,137.6)'[v7];
      [v7][8:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,162,164.6)'[v8];
      [v8][9:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,178,180.6)'[v9];
      [v9][10:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,195,197.6)'[v10];
      [v10][11:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,198,200.55)'[v11];
      [v11][12:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,200.7,203.3)'[v12];
      [v12][13:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,218,220.55)'[v13];
      [v13][14:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,220.7,223.3)'[v14];
      [v14][15:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,238,242.25)'[v15];
      [v15][16:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,243,245.6)'[v16];
      [v16][17:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,271,273.55)'[v17];
      [v17][18:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,273.7,276.3)'[v18];
      [v18][19:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,295.5,298.1)'[v19];
      [v19][20:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,309.5,312.1)'[v20];
      [v20][21:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,314,316.55)'[v21];
      [v21][22:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,316.7,319.3)'[v22];
      [v22][23:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,360,364.25)'[v23];
      [v23][24:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,369,371.6)'[v24];
      [v24][25:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,392,394.6)'[v25];
      [v25][26:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,417,419.6)'[v26];
      [v26][27:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,420,422.6)'[v27];
      [v27][28:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,438,440.6)'[v28];
      [v28][29:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,442,444.6)'[v29];
      [v29][30:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,460,462.6)'[v30];
      [v30][31:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,463,465.6)'[v31];
      [v31][32:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,486,488.6)'[v32];
      [v32][33:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,490,492.6)'[v33];
      [v33][34:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,528,532.25)'[v34];
      [v34][35:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,536,538.55)'[v35];
      [v35][36:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,538.7,541.3)'[v36];
      [v36][37:v]overlay=x=1160:y=180:eof_action=pass:enable='between(t,568.98,576.53)'[v37];
      [v37]format=yuv420p[vout];
      [0:a]apad=pad_dur=7.5[aout]" \
      -map "[vout]" -map "[aout]" -t 60 -r 60 \
      -c:v hevc_nvenc -preset p5 -rc vbr -cq 19 -b:v 0 -c:a aac -b:a 256k \
      "cards/renders/SDBLF_test60.mp4"
    ;;
  review)
    ffmpeg -y -hide_banner -i "cards/sources/SDBLF/SDBLF.mp4" \
      -itsoffset 0 -i "cards/renders/sdblf-el-counter.mov" \
      -itsoffset 42 -i "cards/renders/sdblf-el-chip-01.mov" \
      -itsoffset 46 -i "cards/renders/sdblf-el-chip-02.mov" \
      -itsoffset 50 -i "cards/renders/sdblf-el-chip-03.mov" \
      -itsoffset 102 -i "cards/renders/sdblf-el-chip-06.mov" \
      -itsoffset 110 -i "cards/renders/sdblf-el-chip-07.mov" \
      -itsoffset 135 -i "cards/renders/sdblf-el-chip-08.mov" \
      -itsoffset 162 -i "cards/renders/sdblf-el-chip-10.mov" \
      -itsoffset 178 -i "cards/renders/sdblf-el-chip-11.mov" \
      -itsoffset 195 -i "cards/renders/sdblf-el-chip-12.mov" \
      -itsoffset 198 -i "cards/renders/sdblf-el-chip-13.mov" \
      -itsoffset 200.7 -i "cards/renders/sdblf-el-chip-14.mov" \
      -itsoffset 218 -i "cards/renders/sdblf-el-chip-15.mov" \
      -itsoffset 220.7 -i "cards/renders/sdblf-el-chip-16.mov" \
      -itsoffset 238 -i "cards/renders/sdblf-el-chip-17.mov" \
      -itsoffset 243 -i "cards/renders/sdblf-el-chip-30.mov" \
      -itsoffset 271 -i "cards/renders/sdblf-el-chip-19.mov" \
      -itsoffset 273.7 -i "cards/renders/sdblf-el-chip-18.mov" \
      -itsoffset 295.5 -i "cards/renders/sdblf-el-chip-20.mov" \
      -itsoffset 309.5 -i "cards/renders/sdblf-el-chip-21.mov" \
      -itsoffset 314 -i "cards/renders/sdblf-el-chip-22.mov" \
      -itsoffset 316.7 -i "cards/renders/sdblf-el-chip-23.mov" \
      -itsoffset 360 -i "cards/renders/sdblf-el-chip-24.mov" \
      -itsoffset 369 -i "cards/renders/sdblf-el-chip-05.mov" \
      -itsoffset 392 -i "cards/renders/sdblf-el-chip-25.mov" \
      -itsoffset 417 -i "cards/renders/sdblf-el-chip-04.mov" \
      -itsoffset 420 -i "cards/renders/sdblf-el-chip-26.mov" \
      -itsoffset 438 -i "cards/renders/sdblf-el-chip-28.mov" \
      -itsoffset 442 -i "cards/renders/sdblf-el-chip-27.mov" \
      -itsoffset 460 -i "cards/renders/sdblf-el-chip-29.mov" \
      -itsoffset 463 -i "cards/renders/sdblf-el-chip-09.mov" \
      -itsoffset 486 -i "cards/renders/sdblf-el-chip-31.mov" \
      -itsoffset 490 -i "cards/renders/sdblf-el-chip-32.mov" \
      -itsoffset 528 -i "cards/renders/sdblf-el-chip-34.mov" \
      -itsoffset 536 -i "cards/renders/sdblf-el-chip-35.mov" \
      -itsoffset 538.7 -i "cards/renders/sdblf-el-chip-36.mov" \
      -itsoffset 568.98 -i "cards/renders/sdblf-el-recap.mov" \
      -filter_complex "[0:v]tpad=stop_mode=add:stop_duration=7.5[base];
      [base][1:v]overlay=x=0:y=0:eof_action=pass:enable='between(t,0,569.03)'[v1];
      [v1][2:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,42,44.6)'[v2];
      [v2][3:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,46,48.6)'[v3];
      [v3][4:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,50,52.6)'[v4];
      [v4][5:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,102,106.25)'[v5];
      [v5][6:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,110,112.6)'[v6];
      [v6][7:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,135,137.6)'[v7];
      [v7][8:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,162,164.6)'[v8];
      [v8][9:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,178,180.6)'[v9];
      [v9][10:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,195,197.6)'[v10];
      [v10][11:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,198,200.55)'[v11];
      [v11][12:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,200.7,203.3)'[v12];
      [v12][13:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,218,220.55)'[v13];
      [v13][14:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,220.7,223.3)'[v14];
      [v14][15:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,238,242.25)'[v15];
      [v15][16:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,243,245.6)'[v16];
      [v16][17:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,271,273.55)'[v17];
      [v17][18:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,273.7,276.3)'[v18];
      [v18][19:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,295.5,298.1)'[v19];
      [v19][20:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,309.5,312.1)'[v20];
      [v20][21:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,314,316.55)'[v21];
      [v21][22:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,316.7,319.3)'[v22];
      [v22][23:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,360,364.25)'[v23];
      [v23][24:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,369,371.6)'[v24];
      [v24][25:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,392,394.6)'[v25];
      [v25][26:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,417,419.6)'[v26];
      [v26][27:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,420,422.6)'[v27];
      [v27][28:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,438,440.6)'[v28];
      [v28][29:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,442,444.6)'[v29];
      [v29][30:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,460,462.6)'[v30];
      [v30][31:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,463,465.6)'[v31];
      [v31][32:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,486,488.6)'[v32];
      [v32][33:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,490,492.6)'[v33];
      [v33][34:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,528,532.25)'[v34];
      [v34][35:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,536,538.55)'[v35];
      [v35][36:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,538.7,541.3)'[v36];
      [v36][37:v]overlay=x=1160:y=180:eof_action=pass:enable='between(t,568.98,576.53)'[v37];
      [v37]scale=1920:1080,format=yuv420p[vout];
      [0:a]apad=pad_dur=7.5[aout]" \
      -map "[vout]" -map "[aout]" -t 576.48 -r 60 \
      -c:v h264_nvenc -preset p5 -rc vbr -cq 23 -b:v 0 -c:a aac -b:a 256k \
      "cards/renders/SDBLF_review_1080.mp4"
    ;;
  final)
    ffmpeg -y -hide_banner -i "cards/sources/SDBLF/SDBLF.mp4" \
      -itsoffset 0 -i "cards/renders/sdblf-el-counter.mov" \
      -itsoffset 42 -i "cards/renders/sdblf-el-chip-01.mov" \
      -itsoffset 46 -i "cards/renders/sdblf-el-chip-02.mov" \
      -itsoffset 50 -i "cards/renders/sdblf-el-chip-03.mov" \
      -itsoffset 102 -i "cards/renders/sdblf-el-chip-06.mov" \
      -itsoffset 110 -i "cards/renders/sdblf-el-chip-07.mov" \
      -itsoffset 135 -i "cards/renders/sdblf-el-chip-08.mov" \
      -itsoffset 162 -i "cards/renders/sdblf-el-chip-10.mov" \
      -itsoffset 178 -i "cards/renders/sdblf-el-chip-11.mov" \
      -itsoffset 195 -i "cards/renders/sdblf-el-chip-12.mov" \
      -itsoffset 198 -i "cards/renders/sdblf-el-chip-13.mov" \
      -itsoffset 200.7 -i "cards/renders/sdblf-el-chip-14.mov" \
      -itsoffset 218 -i "cards/renders/sdblf-el-chip-15.mov" \
      -itsoffset 220.7 -i "cards/renders/sdblf-el-chip-16.mov" \
      -itsoffset 238 -i "cards/renders/sdblf-el-chip-17.mov" \
      -itsoffset 243 -i "cards/renders/sdblf-el-chip-30.mov" \
      -itsoffset 271 -i "cards/renders/sdblf-el-chip-19.mov" \
      -itsoffset 273.7 -i "cards/renders/sdblf-el-chip-18.mov" \
      -itsoffset 295.5 -i "cards/renders/sdblf-el-chip-20.mov" \
      -itsoffset 309.5 -i "cards/renders/sdblf-el-chip-21.mov" \
      -itsoffset 314 -i "cards/renders/sdblf-el-chip-22.mov" \
      -itsoffset 316.7 -i "cards/renders/sdblf-el-chip-23.mov" \
      -itsoffset 360 -i "cards/renders/sdblf-el-chip-24.mov" \
      -itsoffset 369 -i "cards/renders/sdblf-el-chip-05.mov" \
      -itsoffset 392 -i "cards/renders/sdblf-el-chip-25.mov" \
      -itsoffset 417 -i "cards/renders/sdblf-el-chip-04.mov" \
      -itsoffset 420 -i "cards/renders/sdblf-el-chip-26.mov" \
      -itsoffset 438 -i "cards/renders/sdblf-el-chip-28.mov" \
      -itsoffset 442 -i "cards/renders/sdblf-el-chip-27.mov" \
      -itsoffset 460 -i "cards/renders/sdblf-el-chip-29.mov" \
      -itsoffset 463 -i "cards/renders/sdblf-el-chip-09.mov" \
      -itsoffset 486 -i "cards/renders/sdblf-el-chip-31.mov" \
      -itsoffset 490 -i "cards/renders/sdblf-el-chip-32.mov" \
      -itsoffset 528 -i "cards/renders/sdblf-el-chip-34.mov" \
      -itsoffset 536 -i "cards/renders/sdblf-el-chip-35.mov" \
      -itsoffset 538.7 -i "cards/renders/sdblf-el-chip-36.mov" \
      -itsoffset 568.98 -i "cards/renders/sdblf-el-recap.mov" \
      -filter_complex "[0:v]tpad=stop_mode=add:stop_duration=7.5[base];
      [base][1:v]overlay=x=0:y=0:eof_action=pass:enable='between(t,0,569.03)'[v1];
      [v1][2:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,42,44.6)'[v2];
      [v2][3:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,46,48.6)'[v3];
      [v3][4:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,50,52.6)'[v4];
      [v4][5:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,102,106.25)'[v5];
      [v5][6:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,110,112.6)'[v6];
      [v6][7:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,135,137.6)'[v7];
      [v7][8:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,162,164.6)'[v8];
      [v8][9:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,178,180.6)'[v9];
      [v9][10:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,195,197.6)'[v10];
      [v10][11:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,198,200.55)'[v11];
      [v11][12:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,200.7,203.3)'[v12];
      [v12][13:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,218,220.55)'[v13];
      [v13][14:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,220.7,223.3)'[v14];
      [v14][15:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,238,242.25)'[v15];
      [v15][16:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,243,245.6)'[v16];
      [v16][17:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,271,273.55)'[v17];
      [v17][18:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,273.7,276.3)'[v18];
      [v18][19:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,295.5,298.1)'[v19];
      [v19][20:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,309.5,312.1)'[v20];
      [v20][21:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,314,316.55)'[v21];
      [v21][22:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,316.7,319.3)'[v22];
      [v22][23:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,360,364.25)'[v23];
      [v23][24:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,369,371.6)'[v24];
      [v24][25:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,392,394.6)'[v25];
      [v25][26:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,417,419.6)'[v26];
      [v26][27:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,420,422.6)'[v27];
      [v27][28:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,438,440.6)'[v28];
      [v28][29:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,442,444.6)'[v29];
      [v29][30:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,460,462.6)'[v30];
      [v30][31:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,463,465.6)'[v31];
      [v31][32:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,486,488.6)'[v32];
      [v32][33:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,490,492.6)'[v33];
      [v33][34:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,528,532.25)'[v34];
      [v34][35:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,536,538.55)'[v35];
      [v35][36:v]overlay=x=1640:y=0:eof_action=pass:enable='between(t,538.7,541.3)'[v36];
      [v36][37:v]overlay=x=1160:y=180:eof_action=pass:enable='between(t,568.98,576.53)'[v37];
      [v37]format=yuv420p[vout];
      [0:a]apad=pad_dur=7.5[aout]" \
      -map "[vout]" -map "[aout]" -t 576.48 -r 60 \
      -c:v hevc_nvenc -preset p5 -rc vbr -cq 19 -b:v 0 -c:a aac -b:a 256k \
      "cards/renders/SDBLF_final_4k60.mp4"
    ;;
  *) echo "unknown mode $MODE"; exit 1;;
esac
