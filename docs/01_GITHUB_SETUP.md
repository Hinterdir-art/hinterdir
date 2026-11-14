# 1 · GitHub einrichten (Schritt für Schritt)

GitHub ist hier drei Dinge gleichzeitig: **Ablage** für Code und Video-Skripte, **Maschine**, die jeden Tag die Videos rendert (GitHub Actions), und **Video-Hoster**, von dem Buffer die MP4s abholt (GitHub Pages).

## A) Konto
1. Auf **github.com** → *Sign up* → Konto anlegen (falls noch keins).
2. Merke dir deinen Benutzernamen, z. B. `deinname`.

## B) Repository anlegen
1. Oben rechts **„+“ → „New repository“**.
2. Ausfüllen:
   - **Repository name:** `hinterdir`
   - **Description:** `Automatische Shorts-Pipeline`
   - **Public** auswählen ← wichtig (siehe Kasten unten)
   - *Add a README* **nicht** anhaken (ist schon in den Dateien)
3. **„Create repository“**.

> **Warum Public?** Buffer muss die Videos über eine öffentliche URL abholen. GitHub Pages ist bei Gratis-Konten nur für öffentliche Repos verfügbar, und Actions-Minuten sind bei öffentlichen Repos unbegrenzt. Deine API-Schlüssel bleiben trotzdem geheim (sie liegen in „Secrets“, nicht im Code). Die Videos sind ohnehin für die Öffentlichkeit gedacht.
> Wenn du die Skripte vorab geheim halten willst: GitHub Pro (privates Repo + Pages) oder Cloudflare R2 als Video-Speicher – sag Bescheid, dann baue ich das um.

## C) Dateien hochladen
**Variante 1 – im Browser (am einfachsten):**
1. ZIP `hinterdir.zip` entpacken.
2. Im neuen Repo auf **„uploading an existing file“** klicken.
3. **Den Inhalt** des Ordners `hinterdir` (nicht den Ordner selbst) ins Fenster ziehen – inkl. des Ordners **`.github`**.
   - Mac: versteckte Ordner im Finder mit **⌘ + ⇧ + .** einblenden.
   - Prüfe danach, dass im Repo `.github/workflows/daily.yml` existiert. Falls nicht: *Add file → Create new file*, als Namen `.github/workflows/daily.yml` eintippen und den Inhalt hineinkopieren (dasselbe für `tools.yml`).
4. Unten **„Commit changes“**.

**Variante 2 – GitHub Desktop:** Repo klonen, Dateien in den Ordner kopieren, *Commit* → *Push*.

## D) Rechte für die Automatik
1. **Settings → Actions → General**
   - *Actions permissions:* **Allow all actions**
   - ganz unten *Workflow permissions:* **Read and write permissions** → *Save*
2. **Settings → Pages**
   - *Build and deployment → Source:* **GitHub Actions**

## E) Geheimnisse & Variablen eintragen
**Settings → Secrets and variables → Actions**

Tab **Secrets** → *New repository secret*:

| Name | Wert | Woher |
|---|---|---|
| `SPEKO_API_KEY` | dein Speko-API-Key | siehe `02_VERBINDUNGEN.md` |
| `BUFFER_API_KEY` | dein Buffer-API-Key | publish.buffer.com/settings/api |

Tab **Variables** → *New repository variable* (Kanal-IDs bekommst du in Schritt F):

| Name | Wert |
|---|---|
| `BUFFER_CHANNEL_YOUTUBE` | ID des YouTube-Kanals in Buffer |
| `BUFFER_CHANNEL_TIKTOK` | ID des TikTok-Kanals in Buffer |
| `BUFFER_CHANNEL_INSTAGRAM` | ID des Instagram-Kanals in Buffer |

## F) Werkzeuge laufen lassen
Tab **Actions** → links **„Werkzeuge (Test-Render, Kanal-IDs, Stimmen, Plan)“** → **Run workflow** → Aufgabe wählen:

1. `channels` → im Log stehen deine Buffer-Kanäle mit IDs → als Variables eintragen (Schritt E).
2. `voice-test` → Hörprobe der eingestellten Stimme (Artifact herunterladen). Andere Stimme? In `config/settings.yaml` bei `voice` ändern (Datei im Browser öffnen → Stift-Symbol → ändern → *Commit*).
3. `test-render` → rendert das Beispielvideo ohne Stimme. Unten im Lauf unter **Artifacts** → `test-video` herunterladen und ansehen.
4. `plan` → zeigt die Posting-Zeiten der nächsten 7 Tage.

## G) Erster echter Lauf
**Actions → „Täglich – Videos für morgen …“ → Run workflow** → Start. Die Videos landen in `content/freigabe/<Datum>/` und werden dir von Claude zur Freigabe gezeigt.
Wenn alles grün ist: nochmal ohne Häkchen starten. Danach läuft es **jeden Tag von selbst**.

> GitHub pausiert geplante Abläufe nach 60 Tagen ohne Aktivität im Repo. Die Pipeline committet jeden Tag selbst (Queue → Done, Log), dadurch bleibt sie aktiv – solange Skripte in der Queue liegen.
