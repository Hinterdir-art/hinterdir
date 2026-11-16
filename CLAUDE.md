# CLAUDE.md – Arbeitsanweisung für Claude im Projekt „Hinterdir“

Lies das zuerst, bevor du an diesem Repo arbeitest.

## Was das Projekt ist
Automatische Kurzvideo-Pipeline: **3 Shorts pro Tag**, komplett von **Claude** erstellt:
Speko-Connector (Stimme) → Three.js in Chrome (`tools/render.py`) → ffmpeg → Branch `media` (`tools/publish.sh`) → GitHub Pages (Video-URL) → Buffer-Connector.
**GitHub Actions werden nicht benutzt.** GitHub = Ablage + Hosting.
- YouTube Shorts: Buffer postet **automatisch** (`schedulingType: automatic`).
- TikTok + Instagram Reels: Buffer schickt eine **Push-Benachrichtigung**, der Nutzer postet selbst (`schedulingType: notification`).

## ⚠️ FREIGABE-PFLICHT (wichtigste Regel)
Kein Video wird ohne ausdrückliches **„passt“** des Nutzers in Buffer eingeplant.
Genauer Ablauf: **`docs/07_CLAUDE_ABLAUF.md`** (Playbook – Änderungen am Ablauf dort machen).
- Geplante Claude-Aufgaben: „Hinterdir – Video 1/2/3 Freigabe“ täglich 11:37 / 12:37 / 13:37 (erstellen je 1 Video für **morgen**, zeigen es, planen nach „passt“ ein) und „Hinterdir – Tagesreport“ 22:13.
Video-URLs: `https://hinterdir-art.github.io/hinterdir/videos/<DATUM>/<id>.mp4`. Repo: `Hinterdir-art/hinterdir` (öffentlich).
Buffer: Organisation „My organization“ `6af7b0ffb11418117920fc3f`; Kanäle TikTok `6af7b2f162b70b94b025112b`, YouTube `6af7b23262b70b94b0250204`. **Fokus: nur YouTube Shorts + TikTok.** Instagram ist AUS (`settings.yaml → platforms.instagram.enabled: false`), bis der Nutzer Bescheid gibt.
- Zeitzone **Europe/Vienna**. **Niemals** Posts/Pushes nach **23:00** oder vor 08:00 (`posting_window`). Der Nutzer schläft nach Mitternacht – diese Grenze nie aufweichen.

## Der Nutzer
- Schreibt Deutsch (Österreich), antworte auf Deutsch, Du-Form.
- Kein Entwickler-Profi: Anleitungen klickbar und Schritt für Schritt (GitHub-Weboberfläche, nicht Terminal).
- Kanalname auf allen Plattformen: **hinterdir.horror**.

## 🎬 KONZEPT (festgelegt am 14.11.2026)
**Wahre unheimliche Fälle – echte, ungeklärte Geschichten.** Leitmotiv „hinter dir“: das Unheimliche, das unbemerkt passiert.
- **Jedes Video = ein neuer Fall, jeden Tag frisch recherchiert.** Keine Wochen-Vorproduktion, keine Wiederholungen (Register: `content/faelle.md`).
- Nur **echte, gut dokumentierte** Fälle (mind. 2 seriöse Quellen: Nachrichten, Behörden, Fachliteratur, Wikipedia als Einstieg). Ungeklärt oder mit offenem Rätsel.
- Fakten exakt; was unbelegt ist, als Vermutung kennzeichnen („angeblich“, „bis heute ungeklärt“). Nichts erfinden.
- **Respekt vor Opfern und Angehörigen:** keine blutigen Details, keine Witze, keine Verdächtigungen gegen lebende Privatpersonen, keine Adressen von Privatleuten.
- Abwechslung: Länder, Jahrzehnte und Arten mischen (Verschwinden, rätselhafte Funde, unerklärliche Ereignisse, ungelöste Verbrechen, unheimliche Orte).
- Szenen: `story` mit Drehbuch – zeigt, was erzählt wird, schnelle Schnitte. Farben: Blutrot/Schwarz.

## 🎞️ PFLICHT-REGELN FÜR JEDES VIDEO (vom Nutzer am 16.11.2026 verlangt)
1. **Untertitel exakt synchron zum Ton.** Immer: Ton mit Speko `audio_transcribe` (`word_timestamps: true`, `keywords` = Namen) transkribieren und an `tools/render.py --words` geben. Nie schätzen. Untertitel-Text kommt aus dem Skript, Timing aus der Transkription (automatisch).
2. **Musik passend zu jeder Szene** – jeder Shot hat ein `mood` (wind, herz, spieluhr, spannung, meer, ticken, stille, schock, drone). Wechselt die Szene inhaltlich, wechselt die Musik; gleiche Stimmung = Musik läuft weiter. Keine fremde Musik – `tools/music.py` erzeugt sie.
3. **Man muss sehen, was erzählt wird.** `scene: story` + Drehbuch `shots:` – zu jedem Satz das passende Bild (Ort/Datum als Karte, Gegenstände, Orte, Handlungen). Kein beliebiges Stimmungsbild. Neue Fälle brauchen evtl. neue Shot-Typen in `renderer/scenes/story.js` → dann ergänzen.
4. Schnelle Schnitte: alle 2–4 Sekunden ein neuer Shot.
5. Vor dem Zeigen selbst prüfen: aus jedem Shot einen Frame ansehen (nichts abgeschnitten? erkennbar?).

## Wenn du neue Videos erstellen sollst
1. `docs/05_VIDEO_FORMAT.md` und `docs/07_CLAUDE_ABLAUF.md` lesen.
2. Fall recherchieren (siehe Konzept), Skript direkt in `content/freigabe/<DATUM>/` schreiben. Hat der Nutzer selbst etwas in `content/queue/` gelegt, hat das Vorrang.
3. Sprechtext 60–110 Wörter, Hook im ersten Satz, Zahlen ausgeschrieben, Quellen im YAML unter `quellen:`.
4. YouTube-Titel ≤ 100 Zeichen. Hashtags 3–5.
5. Keine urheberrechtlich geschützten Figuren, Logos, Musik oder Songtexte in Videos oder Texten.
6. Ein Video pro Aufgabe (3 Aufgaben pro Tag), jedes ein anderer Fall.

## Wenn du neue Szenen baust
- Datei `renderer/scenes/<name>.js`, Signatur siehe `default.js`. Testen mit `python3 tools/render.py`. Alles nur von `t` abhängig, Zufall nur mit Seed.
- Software-GL im Runner: sparsam mit Polygonen, Schatten und Post-Processing.
- Format bleibt **1080×1920, 30 fps** (Buffer/YouTube verlangen exakt 9:16).
- Safe Zones: unten 300 px, rechts 150 px frei halten.

## Technische Eckdaten (Stand Nov 2026 – bei Zweifel Doku prüfen)
- Buffer API: GraphQL `https://api.buffer.com`, Public Beta, Free-Plan 3 Kanäle / 10 geplante Posts pro Kanal / 3.000 Requests pro Monat. `createPost` mit `mode: customScheduled`, `dueAt` UTC-ISO. YouTube braucht `metadata.youtube.title` + `categoryId`; Instagram `metadata.instagram.type: reel` + `shouldShareToFeed`. Buffer lädt die Media-URL erst beim Veröffentlichen.
- Speko: Connector `audio_synthesize` → WAV (keine Wort-Timings → Untertitel werden in `tools/render.py` geschätzt). Stimme in `settings.yaml → voice` (Onyx, model gpt-4o-mini-tts, speed, instructions) + danach `tools/voice_fx.sh`. Nutzer will **menschliche, tiefe Horror-Stimme, etwas schneller**.
- Keine GitHub-Secrets nötig: Speko und Buffer laufen über Claudes Connectors, GitHub über die verknüpfte Claude-GitHub-App.

## Nicht tun
- Keine API-Keys in Dateien schreiben.
- `posting_window` nicht über 23:00 hinaus erweitern, auch nicht „nur einmal“.
- Nicht mehr als einen Tag im Voraus in Buffer einplanen (Free-Plan-Limit 10 Posts/Kanal).
- Nie ohne „passt“ einplanen.
- Videos nicht ins `main`-Branch committen (nur über `tools/publish.sh` auf Branch `media`).

## Offene Punkte
- [x] Video-Konzept: wahre unheimliche, ungeklärte Fälle (täglich recherchiert)
- [x] Markenfarben Blutrot/Schwarz, Szene `nebel`
- [x] Stimme: **Onyx (OpenAI über Speko) + Horror-Effekt** (`tools/voice_fx.sh`), Tempo 1.12 – vom Nutzer am 16.11.2026 gewählt (Annika abgelehnt: klang roboterhaft)
- [x] Video-Stil: `story` (Drehbuch-Shots, 3D) – montage3d/2d waren dem Nutzer zu wenig aussagekräftig
- [ ] Weitere Szenen für Abwechslung (z. B. Wald, verlassenes Haus, Straße bei Nacht)
- [ ] Instagram wieder aktivieren, sobald verbunden
