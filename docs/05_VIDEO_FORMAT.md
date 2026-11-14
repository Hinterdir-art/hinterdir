# 5 · Videos schreiben

> **Konzept:** wahre unheimliche, ungeklärte Fälle – jeden Tag neu recherchiert (Details in `CLAUDE.md`). Diese Datei beschreibt das Format eines Skripts.

## Ein Video = eine YAML-Datei in `content/queue/`
Dateiname bestimmt die Reihenfolge: `0001_…`, `0002_…`. Pro Tag nimmt die Pipeline die nächsten **3**. Für eine Woche brauchst du also **21 Dateien**.
Dateien, die mit `_` beginnen, werden ignoriert (gut für Vorlagen/Entwürfe).

```yaml
id: kurzer-name-ohne-leerzeichen
scene: nebel                   # renderer/scenes/nebel.js (düsterer Gang)
script: |                      # Sprechtext – 60–110 Wörter ≈ 25–45 s
  Erster Satz ist der Hook. Muss in 2 Sekunden fesseln.
  …
hook: "Max. 5 Wörter"          # großer Text oben, verschwindet nach ~2,5 s
captions: true                 # Wort-für-Wort-Untertitel
scene_params: { shape: torusKnot, speed: 1.0 }
youtube:   { title: "Titel bis 100 Zeichen #shorts" }
tiktok:    { caption: "Text für TikTok" }
instagram: { caption: "Text für Instagram" }
hashtags: ["#tag1", "#tag2"]
quellen:                       # Pflicht bei wahren Fällen, mind. 2
  - https://...
  - https://...
# voice: { provider: cartesia, voice: b7187e84-… }   # optional andere Stimme nur für dieses Video
```

## Regeln für gute Shorts
- **Länge:** 20–45 s (YouTube via Buffer max. 3 Min., TikTok min. 3 s).
- **Hook in den ersten 1–2 Sekunden.** Kein „Hallo, heute …“.
- **Sicherer Bereich:** unten ~300 px und rechts ~150 px verdecken die App-Buttons → Untertitel sitzen bewusst bei ~520 px vom unteren Rand.
- **Keine fremde Musik/Marken/Figuren** in den Videos. Musik lieber bei TikTok/Instagram in der App beim Posten hinzufügen (geht dank Push-Posting).
- **Zahlen ausschreiben**, wenn die Stimme sie komisch liest („fünfhundert“ statt „500“).
- **Fakten prüfen** – falsche Fakten kosten Vertrauen und Reichweite.

## Neue Szene anlegen
`renderer/scenes/meine-szene.js`:
```js
export default function createScene({ THREE, scene, camera, params, brand, duration }) {
  // Objekte, Licht … einmalig aufbauen
  return (t) => { /* pro Frame: alles nur von t abhängig machen */ };
}
```
Dann im Skript `scene: meine-szene`. Zufall nur mit festem Seed (siehe `default.js`), sonst sieht jeder Render anders aus.

## Test
Actions → *Werkzeuge* → `test-render` rendert das erste Skript der Queue ohne Stimme → Artifact herunterladen.
