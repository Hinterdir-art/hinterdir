#!/usr/bin/env python3
"""
Hinterdir – Video rendern (läuft direkt in Claudes Umgebung, keine Installation nötig).

  python3 tools/render.py <skript.yaml> <stimme.wav> <ausgabe.mp4> [--words woerter.json]

- Stimme kommt vorher aus dem Speko-Connector (audio_synthesize → WAV) + tools/voice_fx.sh.
- --words: ECHTE Wort-Zeitstempel aus Speko audio_transcribe (word_timestamps=true),
  Liste [{text, start_ms, end_ms}]. PFLICHT für synchrone Untertitel. Ohne → nur Schätzung (nicht verwenden!).
- shots: im YAML (scene: story) – jeder Shot startet bei einem Stichwort (cue) im Ton.
  Haben Shots ein „mood“, wird passende Musik erzeugt (tools/music.py) und unter die Stimme gemischt.
- Three.js-Szene aus renderer/scenes/<scene>.js wird in Headless-Chrome Frame für Frame
  gerendert (deterministisch) und mit ffmpeg zu 1080×1920 H.264 + AAC kodiert.
"""
import functools, http.server, json, re, socketserver, subprocess, sys, threading
from pathlib import Path

import yaml
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CHROME = "/usr/bin/google-chrome"


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(path)])
    return float(out)


def estimate_words(text, total):
    """Speko liefert keine Wort-Zeitstempel → nach Wortlänge + Satzzeichen-Pausen takten."""
    words = [w for w in re.sub(r"\s+", " ", text).strip().split(" ") if w]
    def weight(w):
        return len(w) + 2 + (6 if re.search(r"[.!?…]$", w) else 3 if re.search(r"[,;:—–-]$", w) else 0)
    s = sum(weight(w) for w in words) or 1
    speech, t, out = total * 0.97, 0.05, []
    for w in words:
        d = weight(w) / s * speech
        out.append({"text": re.sub(r"[„“\"]", "", w), "start": t, "end": t + d * 0.85})
        t += d
    return out


def norm(w):
    return re.sub(r"[^0-9a-zäöüß]", "", w.lower())


def load_words(path):
    data = json.loads(Path(path).read_text())
    data = data.get("words", data) if isinstance(data, dict) else data
    return [{"text": w["text"], "start": w["start_ms"] / 1000, "end": w["end_ms"] / 1000} for w in data]


def align_to_script(script, words):
    """Untertitel-Text aus dem Skript, Zeiten aus der Transkription.
    Verhörte Wörter (z. B. Namen) werden durch den Skript-Text ersetzt; Zahlen bleiben als Ziffern."""
    import difflib
    toks = [t for t in re.sub(r"\s+", " ", script or "").strip().split(" ") if t]
    if not toks or not words:
        return words
    a, b = [norm(t) for t in toks], [norm(w["text"]) for w in words]
    out = []
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                w = words[j1 + k]; out.append({"text": toks[i1 + k], "start": w["start"], "end": w["end"]})
        elif tag == "delete":                       # nur im Skript (nicht erkannt) → Lücke füllen
            t0 = out[-1]["end"] if out else 0.0
            t1 = words[j1]["start"] if j1 < len(words) else t0 + 0.4 * (i2 - i1)
            span = max(t1 - t0, 0.25 * (i2 - i1)); step = span / (i2 - i1)
            for k in range(i2 - i1):
                out.append({"text": toks[i1 + k], "start": t0 + k * step, "end": t0 + (k + 0.9) * step})
        elif tag == "insert":                       # nur im Ton → ignorieren (Text kommt aus dem Skript)
            continue
        else:                                        # replace
            ws = words[j1:j2]
            if any(re.search(r"\d", w["text"]) for w in ws):
                out.extend(ws)                         # Zahlen als Ziffern anzeigen
            else:
                t0, t1 = ws[0]["start"], ws[-1]["end"]; n = i2 - i1
                lens = [len(x) + 1 for x in toks[i1:i2]]; tot = sum(lens); t = t0
                for k in range(n):
                    d = (t1 - t0) * lens[k] / tot; out.append({"text": toks[i1 + k], "start": t, "end": t + d * 0.92}); t += d
    return out


def resolve_shots(shots, words, total):
    """Shot-Startzeiten aus Stichwörtern (cue) oder Sekunden (at) bestimmen."""
    out, ptr = [], 0
    for i, s in enumerate(shots):
        s = dict(s)
        if i == 0:
            start = 0.0
        elif "at" in s:
            start = float(s["at"])
        else:
            cue = norm(str(s.get("cue", "")))
            start = None
            for j in range(ptr, len(words)):
                if cue and norm(words[j]["text"]).startswith(cue):
                    start, ptr = words[j]["start"], j + 1
                    break
            if start is None:
                print(f"  ⚠ Stichwort nicht gefunden: {s.get('cue')} – Shot wird gleichmäßig verteilt", file=sys.stderr)
                start = out[-1]["start"] + 2.5 if out else 0.0
        s["start"] = round(start, 3)
        out.append(s)
    for i, s in enumerate(out):
        s["end"] = out[i + 1]["start"] if i + 1 < len(out) else total
    return out


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main(item_path, wav, out_mp4, words_path=None):
    settings = yaml.safe_load((ROOT / "config/settings.yaml").read_text())
    item = yaml.safe_load(Path(item_path).read_text())
    r = settings["render"]
    voice_len = duration(wav)
    total = voice_len + float(r.get("tail_seconds", 0.8))
    fps, frames = int(r["fps"]), int(total * int(r["fps"])) + 1
    if words_path:
        all_words = load_words(words_path)
        cue_words = all_words                         # Stichwörter auch im Original-Ton suchen
        all_words = align_to_script(item.get("script", ""), all_words)
    else:
        print("  ⚠ Keine echten Wort-Zeitstempel (--words) – Untertitel nur geschätzt!", file=sys.stderr)
        all_words = estimate_words(item.get("script", ""), voice_len)
        cue_words = all_words
    words = all_words if item.get("captions", True) else []

    scene_params = dict(item.get("scene_params") or {})
    shots = resolve_shots(item["shots"], all_words, total) if item.get("shots") else []
    if shots:
        scene_params["shots"] = shots
        for sh in shots:
            print(f"  Shot {sh['start']:6.2f}s  {sh['type']:<12} {sh.get('mood', '')}")
    music = None
    if shots and any("mood" in sh for sh in shots):
        music = str(Path(out_mp4).with_suffix(".music.wav"))
        Path(music + ".json").write_text(json.dumps(shots))
        subprocess.run([sys.executable, str(ROOT / "tools/music.py"), music + ".json", f"{total:.3f}", music, str(item.get("id", "x"))], check=True)

    Path(out_mp4).parent.mkdir(parents=True, exist_ok=True)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "pipe:0",
        "-i", str(wav),
        *(["-i", music] if music else []),
        "-filter_complex", f"[0:v]scale={r['width']}:{r['height']},setsar=1,format=yuv420p[v];" + (
            "[1:a]aresample=48000,aformat=channel_layouts=stereo,apad[va];[2:a]aformat=channel_layouts=stereo,volume=" + str(r.get("music_volume", 1.0)) + "[ma];[va][ma]amix=inputs=2:normalize=0:duration=longest[a]"
            if music else "[1:a]aresample=48000,apad[a]"),
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", r.get("preset", "veryfast"), "-crf", str(r.get("crf", 20)), "-r", str(fps),
        "-c:a", "aac", "-b:a", r.get("audio_bitrate", "160k"), "-ac", "2",
        "-t", f"{total:.3f}", "-movflags", "+faststart", str(out_mp4),
    ], stdin=subprocess.PIPE)

    httpd = serve()
    port = httpd.server_address[1]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME, headless=True, args=[
                "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                "--ignore-gpu-blocklist", "--hide-scrollbars"])
            page = browser.new_page(viewport={"width": r["width"], "height": r["height"]}, device_scale_factor=1)
            page.on("pageerror", lambda e: print("[renderer]", e, file=sys.stderr))
            page.goto(f"http://127.0.0.1:{port}/renderer/index.html", wait_until="networkidle")
            page.wait_for_function("typeof window.__setup === 'function'")
            page.evaluate("d => window.__setup(d)", {
                "width": r["width"], "height": r["height"], "brand": settings["brand"],
                "scene": item.get("scene") or r.get("default_scene", "default"),
                "params": scene_params, "words": words,
                "hook": item.get("hook", ""), "captions": item.get("captions", True), "duration": total,
            })
            for i in range(frames):
                page.evaluate("t => window.__frame(t)", i / fps)
                ff.stdin.write(page.screenshot(type="jpeg", quality=92))
                if i % (fps * 5) == 0:
                    print(f"  Frame {i}/{frames}", flush=True)
            browser.close()
    finally:
        ff.stdin.close()
        ff.wait()
        httpd.shutdown()
    if ff.returncode != 0:
        sys.exit(f"ffmpeg Fehler {ff.returncode}")
    print(json.dumps({"video": str(out_mp4), "seconds": round(total, 2), "frames": frames}))


if __name__ == "__main__":
    a = sys.argv[1:]
    wp = None
    if "--words" in a:
        k = a.index("--words"); wp = a[k + 1]; a = a[:k] + a[k + 2:]
    if len(a) != 3:
        sys.exit(__doc__)
    main(*a, words_path=wp)
