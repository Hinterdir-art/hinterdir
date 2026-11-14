# CLAUDE.md – Arbeitsanweisung für Claude im Projekt „Hinterdir“

Lies das zuerst, bevor du an diesem Repo arbeitest.

## Was das Projekt ist
Automatische Kurzvideo-Pipeline: **3 Shorts pro Tag**. Speko (Stimme) → Three.js (3D, Headless-Chrome) → ffmpeg → GitHub Pages (Video-URL) → Buffer.
- YouTube Shorts: Buffer postet **automatisch** (`schedulingType: automatic`).
- TikTok + Instagram Reels: Buffer schickt eine **Push-Benachrichtigung**, der Nutzer postet selbst (`schedulingType: notification`).

## ⚠️ FREIGABE-PFLICHT (wichtigste Regel)
Kein Video wird ohne ausdrückliches **„passt“** des Nutzers in Buffer eingeplant.
1. GitHub Action `daily.yml` (ca. 08:23/09:23 Wien) produziert die 3 Videos für **morgen**, stellt sie auf GitHub Pages und legt Skripte + `manifest.json` in `content/freigabe/<DATUM>/`.
2. Claude-Scheduled-Tasks „Hinterdir – Video 1/2/3 Freigabe“ (täglich 11:37 / 12:37 / 13:37 Wien) zeigen je ein Video (Slot 0/1/2) mit Push und fragen nach Freigabe.
3. „passt“ → Claude plant dieses Video per **Buffer-Connector** (`create_post`, `mode: customScheduled`) für **morgen** ein: YouTube `automatic`, TikTok + Instagram `notification`. Zeiten aus `config/settings.yaml → slots`.
4. „ändern“ / „passt nicht“ → besprechen, Skript anpassen, neu rendern (Actions → daily.yml → Run workflow mit Datum), erneut zur Freigabe.
5. „Hinterdir – Tagesreport“ (täglich 22:13 Wien) berichtet Performance über Buffer-Metriken, ändert nichts.
Video-URLs: `https://hinterdir-art.github.io/hinterdir/<mediaPath aus manifest>`. Repo: `Hinterdir-art/hinterdir` (öffentlich).
Buffer: Organisation „My organization“ `6af7b0ffb11418117920fc3f`; Kanäle TikTok `6af7b2f162b70b94b025112b`, YouTube `6af7b23262b70b94b0250204`, Instagram: noch nicht verbunden.
- Zeitzone **Europe/Vienna**. **Niemals** Posts/Pushes nach **23:00** oder vor 08:00 (`posting_window`). Der Nutzer schläft nach Mitternacht – diese Grenze nie aufweichen.

## Der Nutzer
- Schreibt Deutsch (Österreich), antworte auf Deutsch, Du-Form.
- Kein Entwickler-Profi: Anleitungen klickbar und Schritt für Schritt (GitHub-Weboberfläche, nicht Terminal).
- Kanalname auf allen Plattformen: **hinterdir.horror** → Nische Horror (Details zum Konzept noch offen).
- Arbeitet noch am **Video-Konzept** → bei neuen Inhalten zuerst nach Thema/Stil fragen, falls nicht festgelegt.

## Wenn du neue Videos erstellen sollst
1. `docs/05_VIDEO_FORMAT.md` lesen.
2. Pro Video eine Datei `content/queue/NNNN_kurzname.yaml` (fortlaufende Nummer nach der höchsten vorhandenen in `queue/` **und** `done/`).
3. Sprechtext 60–110 Wörter, Hook im ersten Satz, Zahlen ausgeschrieben, Fakten geprüft (Websuche bei Fakten-Videos).
4. YouTube-Titel ≤ 100 Zeichen. Hashtags 3–5.
5. Keine urheberrechtlich geschützten Figuren, Logos, Musik oder Songtexte in Videos oder Texten.
6. Immer in Paketen von 3 (= 1 Tag) bzw. 21 (= 1 Woche).

## Wenn du neue Szenen baust
- Datei `renderer/scenes/<name>.js`, Signatur siehe `default.js`. Alles nur von `t` abhängig, Zufall nur mit Seed.
- Software-GL im Runner: sparsam mit Polygonen, Schatten und Post-Processing.
- Format bleibt **1080×1920, 30 fps** (Buffer/YouTube verlangen exakt 9:16).
- Safe Zones: unten 300 px, rechts 150 px frei halten.

## Technische Eckdaten (Stand Nov 2026 – bei Zweifel Doku prüfen)
- Buffer API: GraphQL `https://api.buffer.com`, Public Beta, Free-Plan 3 Kanäle / 10 geplante Posts pro Kanal / 3.000 Requests pro Monat. `createPost` mit `mode: customScheduled`, `dueAt` UTC-ISO. YouTube braucht `metadata.youtube.title` + `categoryId`; Instagram `metadata.instagram.type: reel` + `shouldShareToFeed`. Buffer lädt die Media-URL erst beim Veröffentlichen.
- Speko: Voice-AI-Gateway, SDK `@spekoai/sdk` → `speko.synthesize(text, { language: "de", voice, constraints: { allowedProviders: { tts: [provider] } } })`, liefert WAV. Keine Wort-Timings → Untertitel-Timing wird geschätzt (`src/lib/speko.mjs`). Stimme in `settings.yaml → voice` (Standard: inworld/Annika). Im Chat ist Speko als Connector verbunden (voices_search, audio_synthesize) – zum Testen von Stimmen nutzen.
- Secrets: `SPEKO_API_KEY`, `BUFFER_API_KEY`. Variables: `BUFFER_CHANNEL_YOUTUBE|TIKTOK|INSTAGRAM`.

## Nicht tun
- Keine API-Keys in Dateien schreiben.
- `posting_window` nicht über 23:00 hinaus erweitern, auch nicht „nur einmal“.
- Nicht mehr als einen Tag im Voraus in Buffer einplanen (Free-Plan-Limit 10 Posts/Kanal).
- Nie ohne „passt“ einplanen.
- Videos nicht ins `main`-Branch committen (nur Branch `media`, wird überschrieben).

## Offene Punkte
- [ ] Video-Konzept festlegen (Nische, Ton, Serien, wiederkehrende Elemente)
- [ ] Markenfarben/Schrift in `config/settings.yaml → brand`
- [ ] Stimme endgültig auswählen (`voice` in settings.yaml, Standard Annika)
- [ ] Szenen passend zum Konzept bauen
- [ ] Erste 21 Skripte schreiben
