#!/usr/bin/env bash
# Legt die neuen MP4s auf den Branch "media" (nur Speicher, wird immer neu
# geschrieben → Repo bleibt klein) und baut daraus den Ordner ./site,
# der anschließend per GitHub Pages veröffentlicht wird.
set -euo pipefail

KEEP_DAYS="${MEDIA_KEEP_DAYS:-7}"
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

rm -rf site
if git ls-remote --exit-code --heads "$REPO_URL" media >/dev/null 2>&1; then
  git clone --quiet --depth 1 --branch media "$REPO_URL" site
else
  mkdir site && git -C site init --quiet -b media && git -C site remote add origin "$REPO_URL"
fi

mkdir -p site/videos
if [ -d out/media/videos ]; then cp -r out/media/videos/. site/videos/; fi

# Alte Tage löschen
CUTOFF=$(date -u -d "-${KEEP_DAYS} days" +%Y-%m-%d)
for d in site/videos/*/; do
  [ -d "$d" ] || continue
  day=$(basename "$d")
  if [[ "$day" < "$CUTOFF" ]]; then echo "lösche $day"; rm -rf "$d"; fi
done

touch site/.nojekyll
echo "<!doctype html><title>hinterdir media</title><p>Nur Video-Speicher für Buffer.</p>" > site/index.html

cd site
git config user.name "hinterdir-bot"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout --quiet --orphan snapshot
git add -A
git commit --quiet -m "media $(date -u +%F)" || true
git push --quiet --force origin snapshot:media
rm -rf .git
echo "Media-Branch aktualisiert: $(find videos -name '*.mp4' | wc -l) Video(s) online."
