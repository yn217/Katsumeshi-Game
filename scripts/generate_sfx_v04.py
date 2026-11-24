"""Sound effects v04: layered procedural synthesis (no samples, no external recordings).

Each cue is built from physically-inspired voices (struck bars, bells, metal clinks, filtered noise),
then placed in a small synthetic room. Masters: 44.1 kHz stereo PCM16 WAV.
Run: python scripts/generate_sfx_v04.py
"""
from __future__ import annotations
import json
import wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
RNG = np.random.default_rng(20261124)


def midi_hz(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def buf(seconds: float) -> np.ndarray:
    return np.zeros((int(seconds * RATE), 2))


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=RATE, output="sos")
    return sosfilt(sos, x, axis=0)


def place(out, start, mono, pan=0.0, gain=1.0):
    a = int(start * RATE); z = min(len(out), a + len(mono))
    if z <= a: return
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    out[a:z, 0] += mono[:z - a] * l * gain; out[a:z, 1] += mono[:z - a] * r * gain


def partials(freq, dur, ratios, amps, decays, detune=0.0, attack=0.002):
    t = np.arange(int(dur * RATE)) / RATE
    sig = np.zeros_like(t)
    for ratio, amp, dec in zip(ratios, amps, decays):
        f = freq * ratio * (1 + detune * RNG.uniform(-1, 1))
        sig += amp * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6.28)) * np.exp(-t * dec)
    sig *= np.minimum(1, t / attack)
    return sig


def mallet_noise(dur=0.012, lo=1500, hi=9000, amp=0.25):
    n = int(dur * RATE); t = np.arange(n) / RATE
    x = RNG.normal(0, 1, n) * np.exp(-t * 400)
    return filt(x, "bandpass", [lo, hi]) * amp


def marimba(note, dur=0.9, vel=1.0):
    f = midi_hz(note)
    body = partials(f, dur, [1, 3.93, 9.2, 0.5], [1, .32, .08, .05], [7, 22, 45, 9], detune=.0015)
    hit = np.zeros_like(body); m = mallet_noise(amp=.18); hit[:len(m)] += m
    return (body + hit) * vel


def glock(note, dur=1.4, vel=1.0):
    f = midi_hz(note)
    return partials(f, dur, [1, 2.76, 5.40, 8.93], [1, .38, .16, .06], [3.2, 7, 14, 24], detune=.0008, attack=.0015) * vel


def bell(freq, dur=1.8, vel=1.0):
    # service-bell partials (hum, prime, tierce, quint, nominal...)
    return partials(freq, dur, [1, 2.0, 2.76, 3.42, 4.07, 5.40, 6.80], [1, .55, .42, .2, .28, .14, .06], [2.2, 2.8, 3.6, 4.5, 5.5, 8, 12], detune=.0006, attack=.001) * vel


def clink(freq=3200, dur=0.35, vel=1.0):
    # small metal / ceramic contact: dense inharmonic partials, fast decay
    ratios = [1, 1.47, 2.09, 2.56, 3.17, 3.91]
    return (partials(freq, dur, ratios, [1, .7, .5, .35, .25, .15], [18, 22, 28, 34, 40, 50], detune=.01, attack=.0005)
            + np.pad(mallet_noise(.006, 3000, 12000, .3), (0, int(dur * RATE) - int(.006 * RATE)))) * vel


def pad(notes, dur, vel=.12):
    t = np.arange(int(dur * RATE)) / RATE
    env = np.minimum(1, t / .25) * np.minimum(1, (dur - t) / .6)
    sig = sum(np.sin(2 * np.pi * midi_hz(n) * t) + .3 * np.sin(2 * np.pi * midi_hz(n) * 2.003 * t) for n in notes)
    return filt(sig * env * vel, "lowpass", 3000)


def sparkle(out, start, span, count, lo=88, hi=100, vel=.12):
    for _ in range(count):
        place(out, start + RNG.uniform(0, span), glock(RNG.integers(lo, hi), .5, vel * RNG.uniform(.5, 1)), RNG.uniform(-.8, .8))


def room(x, rt=0.9, wet=0.2, predelay=0.012, tone=6000):
    n = int(rt * RATE); t = np.arange(n) / RATE
    ir = np.stack([RNG.normal(0, 1, n), RNG.normal(0, 1, n)], 1) * np.exp(-t * 6.9 / rt)[:, None]
    ir = filt(ir, "lowpass", tone); ir[:int(predelay * RATE)] = 0
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    tail = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)
    dry = np.vstack([x, np.zeros((len(tail) - len(x), 2))])
    return dry * (1 - wet) + tail * wet


def finish(x, peak, rt=.9, wet=.2, hp=60, tail_trim=-60):
    y = room(filt(x, "highpass", hp), rt, wet)
    # trim inaudible tail
    env = np.abs(y).max(1); thr = env.max() * 10 ** (tail_trim / 20)
    last = np.nonzero(env > thr)[0][-1] + int(.02 * RATE)
    y = y[:last]; f = min(len(y), int(.03 * RATE)); y[-f:] *= np.linspace(1, 0, f)[:, None]
    return y * (peak / np.abs(y).max())


def arpeggio(notes, step, voice="glock", vel=1.0, spread=.5):
    out = buf(step * len(notes) + 2.0)
    for i, n in enumerate(notes):
        pan = spread * (i / max(1, len(notes) - 1) * 2 - 1)
        if voice in ("glock", "both"): place(out, i * step, glock(n, 1.4, vel), pan, .8)
        if voice in ("marimba", "both"): place(out, i * step, marimba(n - 12, .9, vel), -pan * .5, .9)
    return out


# ---------------- cues ----------------
def se_click():
    out = buf(.12)
    place(out, 0, partials(1250, .1, [1, 2.57, 4.1], [1, .35, .12], [55, 90, 140], attack=.0005) * .6)
    place(out, 0, mallet_noise(.008, 2500, 11000, .5))
    return finish(out, .30, rt=.25, wet=.08)


def se_purchase():
    out = buf(1.6)
    for i, (d, f) in enumerate([(0, 3400), (.05, 4100), (.11, 3700), (.16, 4600)]):  # coins dropping onto the counter
        place(out, d, clink(f, .4, .55 - i * .07), RNG.uniform(-.4, .4))
    place(out, .24, glock(84, 1.2, .9), -.15); place(out, .36, glock(88, 1.3, .8), .15)  # register ding
    sparkle(out, .3, .4, 4, 96, 104, .07)
    return finish(out, .62, rt=.8, wet=.18)


def se_serve():
    out = buf(2.2)
    place(out, 0, clink(2600, .3, .45), -.2)                 # plate set down
    place(out, .07, bell(1318.5, 1.9, 1.0), .1)              # counter service bell
    place(out, .07, bell(1318.5 * 1.004, 1.9, .35), -.25)
    return finish(out, .6, rt=1.0, wet=.2)


def se_rank(notes, step, chord, sparkles, peak, voice="both", vel=1.0, pad_vel=.1):
    out = arpeggio(notes, step, voice, vel)
    end = step * (len(notes) - 1)
    if chord: place(out, end, pad(chord, 1.5, pad_vel))
    if sparkles: sparkle(out, end, .9, sparkles)
    return finish(out, peak, rt=1.1, wet=.22)


def se_rank_low(notes, step, peak, lp=2200):
    out = buf(step * len(notes) + 1.2)
    for i, n in enumerate(notes):
        place(out, i * step, marimba(n, .9, 1.0), (-.2, .2)[i % 2])
        place(out, i * step, marimba(n - 12, .9, .5))
    out = filt(out, "lowpass", lp)
    return finish(out, peak, rt=.7, wet=.15)


def se_error():
    out = buf(.6)
    for i, n in enumerate([50, 46]):
        tone = partials(midi_hz(n), .25, [1, 2, 3], [1, .5, .25], [14, 20, 30], attack=.003)
        tone = filt(tone, "lowpass", 900)
        place(out, i * .13, tone, (-.15, .15)[i])
    return finish(out, .3, rt=.3, wet=.08)


def se_fry(seconds=4.0):
    n = int((seconds + .5) * RATE); t = np.arange(n) / RATE
    hiss = filt(RNG.normal(0, 1, n), "bandpass", [2500, 9000], 4)
    flutter = 1 + .35 * filt(RNG.normal(0, 1, n), "lowpass", 6)
    bed = hiss * flutter * .25
    crack = np.zeros(n)                                     # oil pops: short filtered impulses, Poisson-timed
    for at in np.cumsum(RNG.exponential(1 / 55, int(seconds * 90))):
        if at >= seconds + .4: break
        a = int(at * RATE); L = int(RNG.uniform(.002, .008) * RATE)
        crack[a:a + L] += RNG.normal(0, 1, L)[:max(0, min(L, n - a))] * np.exp(-np.arange(min(L, n - a)) / (L / 4)) * RNG.uniform(.3, 1.6)
    crack = filt(crack, "highpass", 1800) * .7
    bub = np.zeros(n)                                       # low bubbling under the cutlet
    for at in np.cumsum(RNG.exponential(1 / 9, int(seconds * 14))):
        if at >= seconds + .4: break
        a = int(at * RATE); L = int(.05 * RATE); tt = np.arange(min(L, n - a)) / RATE
        f0 = RNG.uniform(380, 700)
        bub[a:a + len(tt)] += np.sin(2 * np.pi * (f0 + 900 * tt) * tt) * np.exp(-tt * 70) * RNG.uniform(.1, .3)
    mono_l = bed + crack + bub
    mono_r = np.roll(bed, 37) + np.roll(crack, 211) * .9 + bub * .8
    x = np.stack([mono_l, mono_r], 1)
    # seamless loop: crossfade the extra half second back onto the start
    L, X = int(seconds * RATE), int(.5 * RATE)
    fade = np.linspace(0, 1, X)[:, None]
    loop = x[:L].copy(); loop[:X] = loop[:X] * fade + x[L:L + X] * (1 - fade)
    loop = filt(loop, "highpass", 120)
    loop *= .07 / np.sqrt((loop ** 2).mean())             # loudness by RMS; soft-limit the pops
    return np.tanh(loop * 1.6) / 1.6 * .9


def se_ready():
    out = buf(1.4)
    place(out, 0, bell(1760, 1.2, .6), .3)                  # small kitchen pass bell, lighter than the service bell
    return finish(out, .42, rt=.8, wet=.2)


def se_pickup():
    out = buf(.5)
    place(out, 0, clink(2900, .3, .5), -.1); place(out, .06, clink(3500, .25, .35), .15)  # two plates onto the tray
    return finish(out, .36, rt=.35, wet=.1)


CUES = {
    "click": (se_click, "Crisp wooden tap with a short airy transient."),
    "purchase": (se_purchase, "Coins clinking onto the counter, then a two-note register ding with sparkle."),
    "serve": (se_serve, "Plate set down, then a ringing counter service bell."),
    "rank_sss": (lambda: se_rank([72, 76, 79, 84, 88, 91], .085, [60, 64, 67, 72, 76], 14, .72, vel=1.0, pad_vel=.12), "Six-note glockenspiel and marimba run into a warm chord with a shower of sparkles."),
    "rank_s": (lambda: se_rank([72, 76, 79, 84, 88], .095, [60, 64, 67, 72], 8, .68), "Five-note bright run into a chord with sparkles."),
    "rank_a": (lambda: se_rank([72, 76, 79, 84], .11, [60, 64, 67], 3, .63), "Four-note cheerful run with a soft chord."),
    "rank_b": (lambda: se_rank([69, 72, 76], .13, None, 0, .56, voice="marimba"), "Three-note modest marimba figure."),
    "rank_c": (lambda: se_rank_low([69, 67, 64], .17, .5), "Soft descending marimba, slightly muted."),
    "rank_f": (lambda: se_rank_low([60, 55], .24, .44, lp=1400), "Low muted two-note marimba fall."),
    "error": (se_error, "Quiet muted two-note bonk."),
    "ready": (se_ready, "Small kitchen pass bell: a dish is ready."),
    "pickup": (se_pickup, "Two plates clinking onto the tray."),
    "fry": (se_fry, "4-second seamless loop: oil hiss, random crackling pops and low bubbling."),
}


def write(path: Path, x: np.ndarray):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(pcm.tobytes())


def main():
    src_dir, out_dir = ROOT / "assets/source/audio/v04/se", ROOT / "public/assets/game/audio/se"
    records = []
    for name, (fn, desc) in CUES.items():
        x = fn(); src = src_dir / f"se_{name}_v04.wav"; write(src, x)
        out = out_dir / f"se_{name}_v04.wav"; out.write_bytes(src.read_bytes())
        records.append({"id": f"se_{name}_v04", "path": out.relative_to(ROOT).as_posix(), "category": "se", "durationSeconds": round(len(x) / RATE, 3),
                        "sampleRate": RATE, "channels": 2, "format": "wav-pcm16", "loop": name == "fry", "status": "concept_review",
                        "source": src.relative_to(ROOT).as_posix(), "description": desc,
                        "generationMethod": "Original procedural synthesis from scripts/generate_sfx_v04.py (NumPy/SciPy); no samples or recordings.",
                        "sourceWorkflow": "scripts/generate_sfx_v04.py",
                        "licenseNote": "Original project synthesis; no external samples. Review listening quality before final release."})
    manifest_path = ROOT / "public/assets/game/audio/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"] = [f for f in manifest["files"] if not f["id"].endswith("_v04")] + records
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "assets/source/audio/v04/design.json").write_text(json.dumps({"schema": "katsumeshi-audio-source/v1", "version": "v04", "generatedAt": "2026-11-24", "generator": "scripts/generate_sfx_v04.py", "sfx": {k: v[1] for k, v in CUES.items()}, "assets": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("generated", len(records), "sfx")


if __name__ == "__main__":
    main()
