# 3 · Posting-Zeiten

Alle Zeiten **Wiener Zeit** (Sommer-/Winterzeit wird automatisch umgerechnet).
Harte Grenze: **nichts vor 08:00 und nichts nach 23:00** – so kommt nie eine Push-Benachrichtigung, wenn du schon schläfst.

## Werktags (Mo–Fr)

| Video | YouTube (automatisch) | TikTok (Push) | Instagram (Push) |
|---|---|---|---|
| 1 | 12:00 | 12:30 | 12:35 |
| 2 | 17:00 | 18:30 | 18:35 |
| 3 | 20:00 | 21:00 | 21:05 |

## Wochenende (Sa + So)

| Video | YouTube (automatisch) | TikTok (Push) | Instagram (Push) |
|---|---|---|---|
| 1 | 11:00 | 11:30 | 11:35 |
| 2 | 16:00 | 17:30 | 17:35 |
| 3 | 19:30 | 20:30 | 20:35 |

**Du bekommst also 3× am Tag je 2 Pushes im Abstand von 5 Minuten** – einmal Handy in die Hand, beide Apps erledigen, fertig. Letzte Push: spätestens 21:05.

## Warum diese Zeiten
- **TikTok:** Große Studien sehen den Abend vorn – Metricool (2 Mio. Posts) nennt 18–20 Uhr als beste Zeit. → 18:30 + 21:00 als Haupt-Slots.
- **Instagram Reels:** Mittag (Pause) und Abend 19–21 Uhr sind stark. → direkt nach TikTok, damit du beides in einem Rutsch machst.
- **YouTube Shorts:** Studien widersprechen sich (Vormittag vs. Abend). Shorts werden aber oft noch Tage später ausgespielt, Timing ist weniger kritisch. → jeweils etwas **vor** TikTok, damit die drei Plattformen sich nicht kannibalisieren.
- **Wochenende** eine halbe bis ganze Stunde früher, weil Leute früher scrollen und abends öfter unterwegs sind.

Das sind Startwerte. Nach 2–4 Wochen in den Statistiken (YouTube Studio, TikTok Analytics, Instagram Insights → „Wann deine Follower aktiv sind“) nachjustieren.

## Ändern
In `config/settings.yaml` unter `slots:`. Wird ein Zeitpunkt außerhalb von `posting_window` eingetragen, bricht die Pipeline mit einer Fehlermeldung ab – es kann also nicht versehentlich um 1 Uhr nachts gepostet werden.
Kontrolle: Actions → *Werkzeuge* → `plan`.

## Sonderfall: Lauf startet verspätet
Startet die Pipeline erst nachmittags (z. B. manuell), werden bereits vergangene Slots auf „jetzt + 15 Min.“ verschoben – aber **nur, wenn das noch vor 23:00 ist**. Sonst wird der Slot für diese Plattform übersprungen.
