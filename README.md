# Hinterdir – automatische Shorts-Pipeline

**3 Videos pro Tag, vollautomatisch produziert.**
Speechify spricht den Text, Three.js rendert die 3D-Animation und Buffer plant alles ein:

| Plattform | Wie veröffentlicht | Was du tun musst |
|---|---|---|
| **YouTube Shorts** | Buffer lädt **automatisch** hoch | nichts |
| **TikTok** | Buffer schickt dir eine **Push-Benachrichtigung** | Benachrichtigung antippen → in TikTok posten (optional Sound hinzufügen) |
| **Instagram Reels** | Buffer schickt dir eine **Push-Benachrichtigung** | Benachrichtigung antippen → in Instagram posten |

Kein Post und keine Benachrichtigung nach **23:00** (harte Grenze in `config/settings.yaml`).

```
content/queue/*.yaml  ──►  Speechify (Stimme + Wort-Timings)
                       ──►  Three.js in Headless-Chrome (1080×1920, 30 fps)
                       ──►  ffmpeg → MP4
                       ──►  GitHub Pages (öffentliche Video-URL)
                       ──►  Buffer API  →  YouTube (auto) · TikTok/Instagram (Push)
```
Läuft jeden Morgen um ca. 05:30/06:30 (Wien) als GitHub Action.

## Einrichtung – in dieser Reihenfolge

1. **GitHub-Repository anlegen** → [`docs/01_GITHUB_SETUP.md`](docs/01_GITHUB_SETUP.md)
2. **Buffer, Speechify & Social-Accounts verbinden** → [`docs/02_VERBINDUNGEN.md`](docs/02_VERBINDUNGEN.md)
3. **Posting-Zeiten prüfen** → [`docs/03_POSTING_ZEITEN.md`](docs/03_POSTING_ZEITEN.md)
4. **Test-Render starten** (Actions → „Werkzeuge“ → `test-render`)
5. **Videos schreiben** → [`docs/05_VIDEO_FORMAT.md`](docs/05_VIDEO_FORMAT.md)

Weitere Doku: [Architektur](docs/04_ARCHITEKTUR.md) · [Fehlerbehebung](docs/06_FEHLERBEHEBUNG.md) · [`CLAUDE.md`](CLAUDE.md) (Anleitung für Claude, um künftig Videos zu erstellen)

## Ordner

| Pfad | Inhalt |
|---|---|
| `config/settings.yaml` | **Alle Einstellungen** (Zeiten, Stimme, Farben, Plattformen) |
| `content/queue/` | Video-Skripte, die noch kommen (werden in Namensreihenfolge abgearbeitet) |
| `content/done/` | Bereits eingeplante Skripte (nach Datum) |
| `renderer/` | Three.js-Szenen (`renderer/scenes/*.js`) |
| `src/` | Pipeline-Code (Speechify, Render, Buffer) |
| `.github/workflows/` | Automatisierung (täglich + Werkzeuge) |
| `logs/` | Was wann in Buffer eingeplant wurde |

## Status

- [x] Infrastruktur, Verbindungen, Zeitplan
- [ ] **Video-Konzept** (Thema, Stil, Szenen) – kommt als Nächstes
- [ ] Erste 21 Skripte (= 1 Woche) in `content/queue/`
