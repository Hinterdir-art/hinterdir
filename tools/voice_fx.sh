#!/usr/bin/env bash
# Hinterdir – Horror-Stimmeffekt (vom Nutzer gewählt am 16.11.2026: „H2 Onyx Horror-Effekt“)
#   bash tools/voice_fx.sh <stimme_roh.wav> <stimme_fx.wav>
# ~2 Halbtöne tiefer (Tempo bleibt), mehr Bass, leichter Hall, Lautheit normalisiert.
set -euo pipefail
IN="$1"; OUT="$2"
SR=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$IN")
ffmpeg -y -loglevel error -i "$IN" -af "asetrate=${SR}*0.89,aresample=${SR},atempo=1.124,bass=g=4:f=110,aecho=0.8:0.6:55|110:0.22|0.12,loudnorm=I=-16:TP=-1.5" -ac 1 -ar 48000 "$OUT"
echo "$OUT"
