# Hinterdir – automatische Shorts-Pipeline

**3 Videos pro Tag, vollautomatisch produziert.**
Speko spricht den Text, Three.js rendert die 3D-Animation. **Jedes Video wird erst nach deiner Freigabe** („passt“) über Buffer eingeplant:

| Plattform | Wie veröffentlicht | Was du tun musst |
|---|---|---|
| **YouTube Shorts** | Buffer lädt **automatisch** hoch | nichts |
| **TikTok** | Buffer schickt dir eine **Push-Benachrichtigung** | Benachrichtigung antippen → in TikTok posten (optional Sound hinzufügen) |
| **Instagram Reels** | Buffer schickt dir eine **Push-Benachrichtigung** | Benachrichtigung antippen → in Instagram posten |

Kein Post und keine Benachrichtigung nach **23:00** (harte Grenze in `config/settings.yaml`).

```
content/queue/*.yaml ──► Claude: Speko-Connector (Stimme)
                     ──► Claude: Three.js in Chrome + ffmpeg (tools/render.py)
                     ──► GitHub Branch "media" (tools/publish.sh) → GitHub Pages
                     ──► deine Freigabe ──► Buffer: YouTube (auto) · TikTok/Instagram (Push)
```
### Tagesablauf (Europe/Vienna)
| Zeit | Was |
|---|---|
| 11:37 / 12:37 / 13:37 | Claude erstellt Video 1 / 2 / 3 für **morgen** (Speko + Three.js), lädt es nach GitHub und schickt es dir zur Freigabe → „passt“ = Einplanen in Buffer |
| 22:13 | Claude-Tagesreport (Performance, Tipps) |

## Einrichtung – in dieser Reihenfolge

1. **GitHub-Repository anlegen** → [`docs/01_GITHUB_SETUP.md`](docs/01_GITHUB_SETUP.md)
2. **Buffer, Speko, GitHub & Social-Accounts verbinden** → [`docs/02_VERBINDUNGEN.md`](docs/02_VERBINDUNGEN.md)
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
| `src/` | Pipeline-Code (Speko, Render, Buffer) |
| `tools/` | `render.py` (Video bauen), `publish.sh` (Video hochladen) |
| `vendor/three/` | Three.js-Bibliothek |
| `docs/07_CLAUDE_ABLAUF.md` | Täglicher Ablauf für Claude |
| `logs/` | Was wann in Buffer eingeplant wurde |

## Status

- [x] Infrastruktur, Verbindungen, Zeitplan
- [ ] **Video-Konzept** (Thema, Stil, Szenen) – kommt als Nächstes
- [ ] Erste 21 Skripte (= 1 Woche) in `content/queue/`
