# 6 · Fehlerbehebung

| Problem | Ursache / Lösung |
|---|---|
| Workflow startet nicht automatisch | Settings → Actions: Actions erlaubt? Repo 60 Tage inaktiv → einmal manuell starten. Cron kann bis zu ~1 h später starten (normal). |
| `Umgebungsvariable … fehlt` | Secret/Variable in GitHub falsch geschrieben (Groß-/Kleinschreibung!). |
| Speko `402 PROVIDER_REQUIRES_TOP_UP` | ElevenLabs-Stimmen gehen erst nach dem ersten Aufladen → Guthaben aufladen oder Inworld/Cartesia-Stimme nehmen. |
| Speko: Stimme nicht gefunden | `provider` und `voice` in `settings.yaml` exakt wie in der Tabelle in `02_VERBINDUNGEN.md` schreiben. |
| `Video nicht erreichbar` | Settings → Pages → Source muss **GitHub Actions** sein; Repo muss **Public** sein. |
| Push-Rechte / `deploy-pages` schlägt fehl | Settings → Actions → General → **Read and write permissions**; Environment `github-pages` darf vom `main`-Branch deployen (Settings → Environments). |
| Buffer: `Unauthorized` | Neuen API-Key unter publish.buffer.com/settings/api erzeugen, Secret ersetzen. |
| Buffer: Limit erreicht | Free-Plan: max. 10 geplante Posts pro Kanal. In Buffer alte/hängende Push-Posts erledigen oder löschen. |
| YouTube lehnt Video ab | Muss exakt 1080×1920 sein (nicht in `settings.yaml` ändern). Neue YouTube-Kanäle haben ein Tages-Upload-Limit. |
| Keine Push am Handy | Buffer-App → Account Settings → Push Notifications → Reset; Mitteilungen in iOS/Android erlauben; Test-Push von buffer.com senden. |
| Instagram landet als Push statt Reel-Vorschau | Seitenverhältnis außerhalb Instagram-Grenzen → bei 9:16 sollte das nicht passieren. |
| Queue leer | Pipeline postet nichts und beendet sich ohne Fehler. Neue Skripte in `content/queue/` legen. |
| Render hängt / Timeout | Video zu lang oder Szene zu schwer (Software-GL!). Weniger Polygone/Partikel, kürzerer Text. |

Logs: Actions → Lauf anklicken → Schritt aufklappen. Eingeplante Posts: `logs/DATUM.json`.
