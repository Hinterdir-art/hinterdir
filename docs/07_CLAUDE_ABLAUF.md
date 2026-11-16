# 7 · Täglicher Ablauf für Claude (Playbook)

Diese Datei ist die **verbindliche Arbeitsanleitung** für die geplanten Claude-Aufgaben.
Die Aufgaben selbst enthalten nur „lies docs/07_CLAUDE_ABLAUF.md und mach Video N“ –
Verbesserungen am Ablauf werden **hier** gemacht, nicht in den Aufgaben.

Alles läuft in Claudes eigener Umgebung. GitHub Actions werden **nicht** gebraucht.
GitHub = Ablage (Skripte, Code, Videos auf Branch `media`) + Hosting (GitHub Pages) für Buffer.

## Geplante Aufgaben (Europe/Vienna)
| Aufgabe | Zeit | Slot |
|---|---|---|
| Hinterdir – Video 1 Freigabe | 11:37 | 0 |
| Hinterdir – Video 2 Freigabe | 12:37 | 1 |
| Hinterdir – Video 3 Freigabe | 13:37 | 2 |
| Hinterdir – Tagesreport | 22:13 | – |

## A) Video N erstellen und zur Freigabe zeigen
1. **Repo holen:** `git clone --depth 1 https://github.com/Hinterdir-art/hinterdir /home/claude/hinterdir` (Schreibzugriff über die verknüpfte GitHub-App; ggf. vorher `add_repo` mit `access: push`). `CLAUDE.md` und `config/settings.yaml` lesen.
2. **Datum:** MORGEN in Europe/Vienna (`JJJJ-MM-TT`). Videos werden heute erstellt und morgen gepostet. Wochenende (Sa/So) → `slots.weekend`, sonst `slots.weekday`.
3. **Schon erledigt?** Existiert `content/freigabe/<MORGEN>/slot<N>.json` mit `"status": "eingeplant"` → nur kurz melden, Ende.
4. **Fall recherchieren und Skript schreiben** (Konzept siehe `CLAUDE.md`):
   - Liegt eine Datei in `content/queue/` (vom Nutzer), diese zuerst nehmen.
   - Sonst: `content/faelle.md` und alle `content/freigabe/*/` lesen → **einen neuen, noch nie verwendeten** echten, ungeklärten Fall per Websuche finden. Mindestens 2 seriöse Quellen lesen, Fakten (Datum, Ort, Namen, was passiert ist, was ungeklärt ist) gegenprüfen.
   - Abwechslung zu den letzten Tagen (anderes Land / Jahrzehnt / Art).
   - Skript als `content/freigabe/<MORGEN>/slot<N>_<id>.yaml` schreiben (Format `docs/05_VIDEO_FORMAT.md`, `scene: nebel`), inkl. `quellen:` (Liste von URLs). Sprechtext 60–110 Wörter, Hook im ersten Satz, Zahlen ausgeschrieben, Ende mit offener Frage oder unheimlicher Pointe.
   - Zeile in `content/faelle.md` ergänzen.
5. **Stimme:** Speko-Connector `audio_synthesize` mit `text` = `script`, `intent: {language: "de"}` und aus `settings.yaml → voice`: `voice`, `model`, `speed`, `instructions`, `constraints.allowedProviders.tts: [provider]`. Danach **immer** den Horror-Effekt: `bash tools/voice_fx.sh <roh.wav> /tmp/out/<id>_voice.wav` und diese Datei zum Rendern nehmen.
6. **Rendern:** `python3 tools/render.py <skript.yaml> <wav> /tmp/out/<id>.mp4` (ca. 1–3 Min.). Danach 2 Frames mit ffmpeg herausziehen und selbst ansehen (Text lesbar? nichts abgeschnitten?).
7. **Hochladen:** `bash tools/publish.sh /tmp/out/<id>.mp4 <MORGEN> <id>` → gibt die öffentliche URL aus.
8. **Ablegen:** (Queue-Datei ggf. nach `content/freigabe/<MORGEN>/` verschieben) und `content/freigabe/<MORGEN>/slot<N>.json` schreiben:
   `{"slot": N, "id": "...", "file": "...yaml", "url": "...mp4", "status": "wartet"}` → commit + push auf `main`.
9. **Zeigen:** Video mit `SendUserFile` (status proactive, display render). Darunter kurz: um welchen Fall es geht (1 Satz), Hook, Sprechtext, YouTube-Titel, Caption, Hashtags, Quellen, geplante Uhrzeiten morgen (YouTube / TikTok).
10. **Push:** `PushNotification`: „Hinterdir: Video N für morgen wartet auf deine Freigabe 🎬“
11. **Fragen:** „Passt? Antworte mit ‚passt‘ oder sag, was geändert werden soll.“ **Nichts einplanen ohne ausdrückliches OK.**

### A-Notfall: GitHub-Upload verweigert
Passiert, wenn die geplante Sitzung keinen Schreibzugriff bekommt (so am 15.11.2026).
- Trotzdem recherchieren, Skript schreiben, rendern und das Video per `SendUserFile` zeigen.
- Skript + `slot<N>.json` (mit `"hinweis": "nicht hochgeladen"`) als Projekt-Dokument `freigabe_<MORGEN>_slot<N>…` speichern.
- Dem Nutzer sagen: **„Upload ging nicht – schreib im Hinterdir-Hauptchat ‚hochladen‘, dann lade ich es hoch und plane es ein.“**
- Nicht in Buffer einplanen (ohne öffentliche URL geht es nicht).

## B) Bei „passt“
1. Buffer-Connector: `get_account` (Organisation „My organization“), `list_channels`. `list_posts` prüfen, dass das Video nicht schon eingeplant ist.
2. Pro Plattform `create_post`, `mode: customScheduled`, `dueAt` = Uhrzeit aus `settings.yaml` am Datum MORGEN mit korrektem Wiener UTC-Offset, `assets: [{video: {url}}]`, `text` = Caption + Hashtags (`item.hashtags` + `brand.default_hashtags`).
   - **YouTube:** `schedulingType: automatic`, `metadata.youtube {title ≤100, categoryId, madeForKids: false, privacy: public, isAiGenerated}`
   - **TikTok:** `schedulingType: notification`, `metadata.tiktok {isAiGenerated}`
   - **Instagram** (nur wenn `platforms.instagram.enabled: true` – aktuell AUS): `schedulingType: notification`, `metadata.instagram {type: reel, shouldShareToFeed: true, isAiGenerated}`
3. Nie vor 08:00 oder nach 23:00 Wiener Zeit.
4. `slot<N>.json` → `"status": "eingeplant"` + Buffer-Post-IDs, commit + push. Kurz bestätigen.

## C) Bei Änderungswunsch
Änderung besprechen → YAML im Ordner `content/freigabe/<MORGEN>/` anpassen → Schritte A5–A11 wiederholen (gleiche `id`, `publish.sh` überschreibt das Video).
Bei „ganz neu“: neues Skript schreiben und genauso verfahren.

## D) Tagesreport (22:13)
Buffer `list_posts` + `get_aggregated_post_metrics` (heute + 7 Tage). Inhalt: was heute online ging, bestes/schwächstes Video mit Vermutung warum, 7-Tage-Trend, 1–2 Verbesserungsvorschläge, Status morgen (sind alle 3 Slots `eingeplant`?). Push mit Highlight. Nichts ändern, nur berichten.
Bei TikTok/Instagram heißt „sent“ nur „Erinnerung verschickt“.

## Technik-Notizen
- Umgebung hat: Google Chrome, Python-Playwright, PyYAML, ffmpeg. Three.js liegt im Repo unter `vendor/three/` (keine Installation nötig).
- Video: 1080×1920, 30 fps, H.264 + AAC 48 kHz. Buffer lädt die URL erst beim Posten → `publish.sh` behält 10 Tage.
- GitHub Pages: Settings → Pages → *Deploy from a branch* → `media` / `(root)`. URL-Schema: `https://hinterdir-art.github.io/hinterdir/videos/<DATUM>/<id>.mp4`.
- Aus Claudes Umgebung ist `*.github.io` nicht erreichbar → URL nicht per curl prüfen; stattdessen `git ls-remote` / Datei im Branch prüfen.
