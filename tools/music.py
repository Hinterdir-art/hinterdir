#!/usr/bin/env python3
"""
Hinterdir – Horror-Soundtrack passend zu jeder Szene (alles selbst erzeugt, keine fremde Musik).

  python3 tools/music.py <shots.json> <dauer_sekunden> <ausgabe.wav> [seed]

shots.json: [{"start": 0.0, "end": 4.1, "mood": "wind"}, ...]
Aufeinanderfolgende Shots mit gleicher Stimmung laufen nahtlos weiter.

Stimmungen (mood):
  drone      tiefer, dunkler Klangteppich
  wind       kalter Wind + hoher, unheimlicher Ton (Schnee, Wald, draußen)
  herz       Herzschlag + Drone (Spannung, Gefahr, Tod)
  spieluhr   verstimmte Spieluhr-Melodie in Moll (Kindheit, Haus, Erinnerung)
  spannung   steigender Ton + schneller werdendes Pulsieren (Enthüllung, Code)
  meer       Brandung + tiefe Streicher-Drone (Strand, Insel, Leuchtturm)
  ticken     Uhrticken über Drone (Zeit, Warten) – hört am Ende auf
  stille     fast Stille, leises Rauschen + Tinnitus-Ton (Schock danach, Ende)
  schock     Einschlag (Boom) am Anfang, dann Drone
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000


def lp(x, f, o=4):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, a=0.4, r=0.6):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def drone(t, rng, base):
    x = np.zeros_like(t)
    for k, det in enumerate([0, 0.3, -0.4, 7.02]):        # Grundton, Schwebung, Quinte
        f = base * 2 ** (det / 12)
        ph = rng.uniform(0, 6.28)
        x += np.sign(np.sin(2 * np.pi * f * t + ph)) * (0.5 if k < 3 else 0.25)
    x = lp(x, 380)
    lfo = 0.65 + 0.35 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6))
    return x * lfo * 0.5


def noise(n, rng):
    return rng.standard_normal(n)


def mood_audio(mood, n, t0, rng, base):
    t = np.arange(n) / SR + t0
    tl = np.arange(n) / SR
    if mood == "wind":
        w = bp(noise(n, rng), 250, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t) ** 2)
        tone = np.sin(2 * np.pi * base * 8 * t) * 0.06 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t))
        return w * 0.35 + tone + drone(t, rng, base) * 0.4
    if mood == "herz":
        x = drone(t, rng, base) * 0.7
        beat = np.zeros(n); per = 60 / 68
        for s0 in np.arange(0, tl[-1] if n else 0, per):
            for off, amp in ((0, 1.0), (0.18, 0.7)):
                i0 = int((s0 + off) * SR); m = int(0.16 * SR)
                if i0 + m < n:
                    tt = np.arange(m) / SR
                    beat[i0:i0 + m] += amp * np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 28)
        return x + beat * 0.9
    if mood == "spieluhr":
        notes = [0, 3, 7, 12, 10, 7, 3, 2, 0, -2, 0, 3]       # Moll-Motiv
        x = drone(t, rng, base) * 0.35
        step = 0.42
        for j, s0 in enumerate(np.arange(0, tl[-1] if n else 0, step)):
            f = base * 8 * 2 ** ((notes[j % len(notes)] - 0.25 * rng.random()) / 12)  # leicht verstimmt
            i0 = int(s0 * SR); m = min(int(1.6 * SR), n - i0)
            if m <= 0: break
            tt = np.arange(m) / SR
            x[i0:i0 + m] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2.01 * f * tt)) * np.exp(-tt * 3.2) * 0.22
        return x
    if mood == "spannung":
        dur = max(tl[-1], 0.1) if n else 0.1
        f = base * 4 * (1 + 0.6 * (tl / dur))
        rise = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * (tl / dur)
        pulse = np.zeros(n); s0 = 0.0; gap = 0.5
        while s0 < dur:
            i0 = int(s0 * SR); m = min(int(0.05 * SR), n - i0)
            if m > 0: pulse[i0:i0 + m] += np.sin(2 * np.pi * 70 * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * 40)
            s0 += gap; gap = max(0.15, gap * 0.9)
        return drone(t, rng, base) * 0.8 + rise + pulse * 0.6
    if mood == "meer":
        surf = lp(noise(n, rng), 900) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.12 * t)) ** 2)
        strings = lp(sum(np.sin(2 * np.pi * base * 2 * r * t + rng.uniform(0, 6)) for r in (1, 1.2, 1.5)), 800)
        return surf * 0.5 + strings * 0.12 + drone(t, rng, base) * 0.3
    if mood == "ticken":
        x = drone(t, rng, base) * 0.6
        stop = tl[-1] * 0.8 if n else 0
        for s0 in np.arange(0, stop, 0.5):
            i0 = int(s0 * SR); m = min(int(0.02 * SR), n - i0)
            if m > 0: x[i0:i0 + m] += hp(noise(m, rng), 2000) * np.exp(-np.arange(m) / SR * 300) * 0.8
        return x
    if mood == "stille":
        return lp(noise(n, rng), 300) * 0.04 + np.sin(2 * np.pi * 6800 * t) * 0.008
    if mood == "schock":
        x = drone(t, rng, base * 0.75) * 0.8
        m = min(int(2.5 * SR), n)
        tt = np.arange(m) / SR
        boom = np.sin(2 * np.pi * (45 - 15 * tt) * tt) * np.exp(-tt * 2.2) + lp(noise(m, rng), 2500) * np.exp(-tt * 9) * 0.5
        x[:m] += boom * 1.2
        return x
    return drone(t, rng, base)


def reverb(x, rng, secs=2.2, wet=0.28):
    m = int(secs * SR)
    ir = rng.standard_normal(m) * np.exp(-np.arange(m) / SR * 3.0)
    ir = lp(ir, 5000)
    y = fftconvolve(x, ir)[: len(x)]
    y /= (np.max(np.abs(y)) + 1e-9)
    return x * (1 - wet) + y * wet * np.max(np.abs(x))


def main(shots_path, total, out, seed="0"):
    shots = json.load(open(shots_path))
    total = float(total)
    rng = np.random.default_rng(abs(hash(seed)) % (2**32))
    base = float(rng.choice([41.2, 43.65, 46.25, 49.0, 51.9]))   # tiefer Grundton je Video (E1…G#1)
    n_total = int(total * SR)
    mix = np.zeros(n_total)

    # gleiche Stimmungen hintereinander zusammenfassen
    segs = []
    for s in shots:
        a, b, m = float(s["start"]), float(s.get("end", total)), s.get("mood", "drone")
        if segs and segs[-1][2] == m:
            segs[-1][1] = b
        else:
            segs.append([a, b, m])
    segs[-1][1] = total
    xf = 0.35  # Überblendung
    for a, b, m in segs:
        i0 = max(0, int((a - xf / 2) * SR)); i1 = min(n_total, int((b + xf / 2) * SR))
        n = i1 - i0
        if n <= 0: continue
        seg = mood_audio(m, n, i0 / SR, rng, base)
        seg *= env(n, xf if i0 > 0 else 0.8, xf if i1 < n_total else 1.2)
        mix[i0:i1] += seg

    mix = reverb(mix, rng)
    mix = hp(mix, 30)
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix *= 10 ** (-24 / 20) / rms                  # ca. -24 dBFS RMS (unter der Stimme)
    mix = np.clip(mix, -0.95, 0.95)
    stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)  # leichte Breite
    wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
    print(out)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
