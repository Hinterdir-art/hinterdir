#!/usr/bin/env bash
# Hinterdir – fertiges Video auf den Branch "media" legen (→ GitHub Pages → Buffer).
#   bash tools/publish.sh <video.mp4> <DATUM JJJJ-MM-TT> <id>
# Ergebnis-URL: https://hinterdir-art.github.io/hinterdir/videos/<DATUM>/<id>.mp4
# Der Branch wird jedes Mal als einzelner Commit neu geschrieben (Repo bleibt klein);
# Videos älter als KEEP_DAYS werden entfernt.
set -euo pipefail
VIDEO="$1"; DATUM="$2"; ID="$3"; KEEP_DAYS="${KEEP_DAYS:-10}"
REPO="https://github.com/Hinterdir-art/hinterdir"
WORK="$(mktemp -d)"

if git ls-remote --exit-code --heads "$REPO" media >/dev/null 2>&1; then
  git clone -q --depth 1 --branch media "$REPO" "$WORK/site"
else
  mkdir -p "$WORK/site" && git -C "$WORK/site" init -q -b media && git -C "$WORK/site" remote add origin "$REPO"
fi
cd "$WORK/site"
mkdir -p "videos/$DATUM"
cp "$VIDEO" "videos/$DATUM/$ID.mp4"

CUTOFF=$(date -u -d "-${KEEP_DAYS} days" +%Y-%m-%d)
for d in videos/*/; do
  day=$(basename "$d")
  [[ "$day" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ "$day" < "$CUTOFF" ]] && rm -rf "$d"
done
touch .nojekyll
echo '<!doctype html><title>hinterdir media</title><p>Video-Speicher für Buffer.</p>' > index.html

git checkout -q --orphan snapshot
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "media: $DATUM/$ID"
git -c push.negotiate=true push -q --force origin snapshot:media
echo "https://hinterdir-art.github.io/hinterdir/videos/$DATUM/$ID.mp4"
rm -rf "$WORK"
