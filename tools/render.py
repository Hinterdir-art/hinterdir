#!/usr/bin/env python3
"""
Hinterdir – Video rendern (läuft direkt in Claudes Umgebung, keine Installation nötig).

  python3 tools/render.py <skript.yaml> <stimme.wav> <ausgabe.mp4>

- Stimme kommt vorher aus dem Speko-Connector (audio_synthesize → WAV).
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


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main(item_path, wav, out_mp4):
    settings = yaml.safe_load((ROOT / "config/settings.yaml").read_text())
    item = yaml.safe_load(Path(item_path).read_text())
    r = settings["render"]
    voice_len = duration(wav)
    total = voice_len + float(r.get("tail_seconds", 0.8))
    fps, frames = int(r["fps"]), int(total * int(r["fps"])) + 1
    words = estimate_words(item.get("script", ""), voice_len) if item.get("captions", True) else []

    Path(out_mp4).parent.mkdir(parents=True, exist_ok=True)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "pipe:0",
        "-i", str(wav),
        "-filter_complex", f"[0:v]scale={r['width']}:{r['height']},setsar=1,format=yuv420p[v];[1:a]aresample=48000,apad[a]",
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
                "params": item.get("scene_params") or {}, "words": words,
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
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
