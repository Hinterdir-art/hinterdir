# 4 · Architektur

## Täglicher Ablauf (`.github/workflows/daily.yml`, 07:23 UTC → Videos für morgen)

```mermaid
flowchart TD
  Q[content/queue/*.yaml<br/>nächste 3 Skripte] --> P[src/produce.mjs]
  P --> S[Speko → Inworld „Annika“<br/>WAV → MP3, Wort-Timing geschätzt]
  S --> R[Three.js-Szene in Headless-Chrome<br/>Frame für Frame, 30 fps]
  R --> F[ffmpeg → MP4 1080×1920<br/>H.264 + AAC]
  F --> M[scripts/publish-media.sh<br/>Branch 'media', letzte 7 Tage]
  M --> G[GitHub Pages<br/>https://USER.github.io/hinterdir/videos/DATUM/ID.mp4]
  G --> FG[content/freigabe/DATUM/manifest.json]
  FG --> C[Claude-Task 11:37/12:37/13:37<br/>Push + Video zur Freigabe]
  C -->|„passt“| B[Buffer-Connector create_post<br/>für morgen]
  B --> YT[YouTube Shorts<br/>automatic]
  B --> TT[TikTok<br/>notification → Push]
  B --> IG[Instagram Reel<br/>notification → Push]
```

## Dateien

| Datei | Aufgabe |
|---|---|
| `src/lib/config.mjs` | Settings laden, Zeitzonen-Umrechnung, Posting-Fenster-Prüfung |
| `src/lib/speko.mjs` | Text → MP3 via Speko + geschätzte Wort-Timings (für Untertitel) |
| `src/lib/render.mjs` | lokaler Mini-Webserver + Puppeteer + ffmpeg |
| `renderer/runtime.js` | im Browser: Three.js-Setup, Untertitel, Hook-Text, `__frame(t)` |
| `renderer/scenes/*.js` | eine Datei pro Szenen-Typ |
| `src/lib/buffer.mjs` | Buffer GraphQL (`createPost`, Kanäle) |
| `src/produce.mjs` | Schritt 1: Videos bauen → `out/manifest.json` |
| `src/schedule.mjs` | Alternative ohne Freigabe (direkt per API einplanen) – aktuell **nicht** in Benutzung |
| `src/tools.mjs` | `channels`, `voice-test`, `plan` |

## Designentscheidungen
- **Deterministisches Rendern:** kein `requestAnimationFrame`; Node ruft `__frame(t)` pro Frame auf und macht einen Screenshot. Ergebnis ist unabhängig von der Rechenleistung des Runners (der rendert per Software-GL/SwiftShader – langsam, aber zuverlässig; ca. 2–5 Min. pro 30-s-Video).
- **Untertitel als HTML-Overlay** über dem WebGL-Canvas (darum Screenshot statt `canvas.toDataURL`).
- **Media-Branch wird jedes Mal neu geschrieben** (orphan + force-push) → das Repo wächst nicht mit jedem Video.
- **Nur der aktuelle Tag wird eingeplant** → passt ins Buffer-Free-Limit (10 Posts/Kanal) und Buffer findet die Videos sicher noch online.
- **Buffer holt Videos erst beim Posten** → `media_keep_days: 7` als Puffer.

## Erweiterungsideen (später)
- Hintergrundmusik (lizenzfrei) per ffmpeg-Mix
- Eigene 3D-Modelle (`.glb`) in `renderer/assets/`
- Skripte automatisch per KI aus einer Themenliste erzeugen
- Fallback, wenn Queue leer ist (Benachrichtigung per GitHub-Issue)
