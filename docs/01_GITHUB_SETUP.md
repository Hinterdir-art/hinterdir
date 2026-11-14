# 1 · GitHub einrichten

GitHub ist bei Hinterdir **Ablage und Video-Hoster**. Claude erstellt die Videos selbst
und lädt sie hierher hoch; Buffer holt sie dann über GitHub Pages ab.
Repo: **github.com/Hinterdir-art/hinterdir** (Public).

## Status
| Schritt | Status |
|---|---|
| Konto `Hinterdir-art` + Repo `hinterdir` (Public) | ✅ |
| Dateien mit Ordnerstruktur hochgeladen | ✅ |
| GitHub mit Claude verknüpft (claude.ai/code → Connect GitHub) | ✅ |
| Claude-GitHub-App auf `hinterdir` installiert (Schreibzugriff) | ✅ |
| GitHub Pages aus Branch `media` | ⬜ siehe unten |

## GitHub Pages einschalten (einmalig)
1. github.com/Hinterdir-art/hinterdir → **Settings** → links **Pages**.
2. *Build and deployment → Source:* **Deploy from a branch**.
3. *Branch:* **media** und daneben **/(root)** → **Save**.
4. Nach 1–2 Minuten ist das Testvideo erreichbar unter
   `https://hinterdir-art.github.io/hinterdir/videos/test/beispiel-001.mp4`

## Keine Secrets nötig
Stimme (Speko) und Buffer laufen über Claudes Connectors, GitHub über die verknüpfte App.
Es müssen **keine** API-Schlüssel in GitHub eingetragen werden.

## Falls Claude wieder nicht schreiben darf
- claude.ai/code im Browser öffnen → GitHub neu verbinden.
- github.com/apps/claude/installations/select_target → `Hinterdir-art` → *Only select repositories* → `hinterdir` → Install/Save.
