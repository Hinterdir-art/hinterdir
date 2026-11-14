# 2 · Verbindungen (Buffer, Speko, GitHub, Social Media)

## Übersicht

```
                ┌── Speko-Connector ──► Stimme (WAV)
Claude ─────────┼── Three.js + ffmpeg ─► Video (tools/render.py)
(geplante       ├── GitHub-App ────────► Branch media → GitHub Pages (Video-URL)
 Aufgaben)      └── Buffer-Connector ──► YouTube Shorts (automatisch)
                                        TikTok / Instagram (Push → du postest)
```
Alles läuft über Claudes Connectors – **keine API-Schlüssel in GitHub nötig.**

## A) Buffer
1. Konto auf **buffer.com** anlegen. Der **Free-Plan** reicht zum Start: genau 3 Kanäle, max. 10 geplante Posts pro Kanal gleichzeitig, 1 API-Key mit 3.000 Anfragen/Monat. Die Pipeline plant immer nur den aktuellen Tag ein (max. 3 Posts je Kanal) und braucht ca. 300–500 Anfragen im Monat.
   ⚠️ Free-Plan: insgesamt nur **8 verschiedene Kanal-Verbindungen auf Lebenszeit** – also nicht unnötig trennen/neu verbinden.
2. **Kanäle verbinden** (*Channels → Connect*):
   - **YouTube** – den Kanal, auf dem die Shorts landen sollen.
   - **TikTok** – Hinweis: TikTok gibt es bei Buffer nur auf den neuen Plänen (nicht „Legacy“).
   - **Instagram** – am besten als **Creator- oder Business-Konto** (in Instagram: Einstellungen → Kontotyp). Für Push-Posting gehen auch private Konten.
3. Buffer ist in Claude als Connector verbunden ✅ (kein API-Key nötig).

### Push-Benachrichtigungen am Handy (für TikTok + Instagram)
1. **Buffer-App** installieren (iOS/Android), mit demselben Konto einloggen.
2. Mitteilungen für Buffer **erlauben** (iPhone: Einstellungen → Mitteilungen → Buffer → *Mitteilungen erlauben*).
3. In der Buffer-App: TikTok-Kanal → ⚙ → **„Default to Notification Publishing“ AN**. Dasselbe für Instagram.
4. Test: auf buffer.com am Computer TikTok-Kanal → Einstellungen → **Test-Benachrichtigung senden**.
5. Kommt nichts an: Buffer-App → Account Settings → Push Notifications → **Reset Push Notifications**.

**Wenn die Push kommt:** antippen → Buffer zeigt Video + Text → *Open TikTok/Instagram* → Video ist schon in der Galerie, Text in der Zwischenablage → einfügen → posten. Bonus: In der App kannst du **Trend-Sounds/Musik** hinzufügen – das geht bei automatischem Posten nicht.

Verpasst du eine Push, bleibt der Post in Buffer liegen und wird nicht automatisch veröffentlicht – du kannst ihn später erledigen.

> Hinweis: Bei Push-Posts heißt „Sent/Published“ in Buffer nur, dass die Benachrichtigung verschickt wurde – nicht, dass das Video online ist.

## B) Speko (Stimme)
Speko ist ein Voice-Gateway: eine Schnittstelle, dahinter viele Stimmen-Anbieter (Inworld, Cartesia, ElevenLabs …).
1. Konto auf **speko.ai** (hast du schon).
2. Speko ist in Claude als Connector verbunden ✅ (kein API-Key nötig).
3. Stimme steht in `config/settings.yaml → voice`. Standard: **Annika** (Inworld, weiblich, klar, günstig – bereits getestet).
   Weitere getestete deutsche Stimmen:

   | Stimme | provider | voice | Charakter |
   |---|---|---|---|
   | Annika (w) | `inworld` | `Annika` | klar, flott |
   | Reinhard (m) | `inworld` | `Reinhard` | ruhig |
   | Sebastian (m) | `cartesia` | `b7187e84-fe22-4344-ba4a-bc013fcb533e` | „Orator“, schnell, gleichbleibend |
   | Alina (w) | `cartesia` | `38aabb6a-f52b-4fb0-a3d1-988518f4dc06` | engagiert |
   | Roman (m) | `elevenlabs` | `1YST1S3BrkT7E0wcLKQD` | freundlich, sehr natürlich (teurer, erst nach Aufladen) |
   | Rhea (w) | `elevenlabs` | `le3O97c6UClnRdpxkDTb` | klar, natürlich (teurer, erst nach Aufladen) |

4. Hörprobe: im Claude-Chat „spiel mir Stimme X vor“.
5. Kosten grob: 3 Shorts/Tag ≈ 45.000 Zeichen/Monat → bei Inworld (~25 $/1 Mio. Zeichen) ca. 1–2 $ im Monat.
6. Speko liefert keine Wort-Zeitstempel → die Untertitel werden anhand der Wortlängen getaktet. Passt meist gut; bei Bedarf bauen wir später echtes Timing per Transkription ein.

## B2) Connectors in Claude
- **Speko:** ✅ verbunden
- **Buffer:** ✅ verbunden (TikTok + YouTube; Instagram fehlt noch)
- **GitHub:** ✅ verknüpft, Claude-App auf `hinterdir` installiert

## C) Three.js
Liegt im Repo unter `vendor/three/` – nichts zu installieren. Gerendert wird in Claudes Umgebung mit Chrome.

## E) Technische Fakten (für spätere Änderungen)
- Buffer-API: GraphQL, `POST https://api.buffer.com`, Header `Authorization: Bearer <key>`. Aktuell **Public Beta**.
- Post anlegen: `createPost` mit `mode: customScheduled`, `dueAt` (ISO, UTC), `schedulingType: automatic | notification`, `assets: [{ video: { url } }]`.
- Pflichtfelder: YouTube `metadata.youtube.title` + `categoryId`; Instagram `metadata.instagram.type: reel` + `shouldShareToFeed`.
- Buffer holt das Video erst **zum Veröffentlichungszeitpunkt** von der URL → Videos bleiben 7 Tage auf GitHub Pages (`media_keep_days`).
- Video-URL muss öffentlich, direkt (ohne Redirect), HTTPS und stabil sein → GitHub Pages erfüllt das.
- YouTube via Buffer: nur Shorts, bis 3 Min., **exakt 9:16 (1080×1920)**, Audio AAC 128–192 kbps. Eigene Thumbnails gehen über die API nicht.
