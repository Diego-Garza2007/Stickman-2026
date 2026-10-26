"""Musica de la pelea final (assets/sfx/boss_theme.wav): bucle de 8 compases a 150 BPM en re menor, sintetizado sin dependencias.
Capas: timbales y caja (marcha de guerra), bajo grave, cuerdas sostenidas, metales con el tema y un coro de fondo.
Uso: python3 tools/make_boss_music.py
"""
import math
import os
import random
import struct
import wave

RATE = 22050
TAU = 2 * math.pi
BPM = 150
BEAT = 60 / BPM
BARS = 8
TOTAL = int(BARS * 4 * BEAT * RATE)

# progresion: Dm | Dm | Bb | Bb | C | C | Am | A (dominante, para volver a empezar con tension)
CHORDS = [(38, (50, 57, 62)), (38, (50, 57, 62)), (34, (46, 53, 58)), (34, (46, 53, 58)),
          (36, (48, 55, 60)), (36, (48, 55, 60)), (33, (45, 52, 57)), (33, (45, 52, 56))]
# tema de metales: (compas, tiempo, nota midi, duracion en tiempos)
THEME = [
    (0, 0, 74, 1.5), (0, 1.5, 77, 0.5), (0, 2, 81, 1), (0, 3, 79, 1),
    (1, 0, 77, 1.5), (1, 1.5, 76, 0.5), (1, 2, 74, 2),
    (2, 0, 74, 1.5), (2, 1.5, 77, 0.5), (2, 2, 82, 1), (2, 3, 81, 1),
    (3, 0, 79, 1.5), (3, 1.5, 77, 0.5), (3, 2, 77, 2),
    (4, 0, 76, 1), (4, 1, 79, 1), (4, 2, 84, 1.5), (4, 3.5, 83, 0.5),
    (5, 0, 81, 1.5), (5, 1.5, 79, 0.5), (5, 2, 76, 2),
    (6, 0, 77, 1), (6, 1, 81, 1), (6, 2, 84, 1), (6, 3, 81, 1),
    (7, 0, 80, 1), (7, 1, 81, 1), (7, 2, 83, 1), (7, 3, 85, 1),
]

buf = [0.0] * TOTAL
rnd = random.Random(7)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(start_beat, samples, gain=1.0):
    i0 = int(start_beat * BEAT * RATE)
    for k, v in enumerate(samples):
        buf[(i0 + k) % TOTAL] += v * gain     # el final se enrosca con el principio: bucle sin cortes


def adsr(i, n, a, r):
    t = i / RATE
    rel = n / RATE - t
    return min(1.0, t / a) * min(1.0, max(0.0, rel / r))


def tone(freq, beats, a=0.02, r=0.1, harmonics=((1, 1.0),), vib=0.0, detune=0.0):
    n = int(beats * BEAT * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        f = freq * (1 + vib * math.sin(TAU * 5.5 * t))
        v = 0.0
        for h, amp in harmonics:
            v += amp * math.sin(TAU * f * h * t)
            if detune:
                v += amp * 0.6 * math.sin(TAU * f * h * (1 + detune) * t)
        out.append(v * adsr(i, n, a, r))
    return out


def kick():
    n = int(0.28 * RATE)
    out, ph = [], 0.0
    for i in range(n):
        f = 45 + 110 * math.exp(-i / RATE * 28)
        ph += TAU * f / RATE
        out.append(math.sin(ph) * math.exp(-i / RATE * 9))
    return out


def timpani():
    n = int(0.5 * RATE)
    out, ph = [], 0.0
    for i in range(n):
        t = i / RATE
        ph += TAU * (70 + 40 * math.exp(-t * 18)) / RATE
        out.append((math.sin(ph) + 0.4 * math.sin(2.02 * ph)) * math.exp(-t * 6))
    return out


def snare():
    n = int(0.2 * RATE)
    out, y = [], 0.0
    for i in range(n):
        y += 0.55 * (rnd.uniform(-1, 1) - y)
        out.append((y * 0.8 + 0.3 * math.sin(TAU * 190 * i / RATE)) * math.exp(-i / RATE * 20))
    return out


def hat():
    n = int(0.05 * RATE)
    out, y = [], 0.0
    for i in range(n):
        raw = rnd.uniform(-1, 1)
        out.append((raw - y) * math.exp(-i / RATE * 70))
        y = raw * 0.3 + y * 0.7
    return out


def build():
    for bar in range(BARS):
        b0 = bar * 4
        root, chord = CHORDS[bar]
        # percusion: timbal en el 1, bombo en corcheas graves, caja en 2 y 4, platillo en cada corchea
        add(b0, timpani(), 0.9)
        for beat in (0, 1.5, 2, 3):
            add(b0 + beat, kick(), 0.8)
        for beat in (1, 3):
            add(b0 + beat, snare(), 0.6)
        for e in range(8):
            add(b0 + e * 0.5, hat(), 0.18 if e % 2 else 0.3)
        if bar == 7:      # redoble final antes de volver al inicio
            for k in range(8):
                add(b0 + 2 + k * 0.25, snare(), 0.3 + 0.07 * k)
        # bajo: corcheas con la fundamental
        for e in range(8):
            f = hz(root + (12 if e % 4 == 3 else 0))
            add(b0 + e * 0.5, tone(f, 0.45, a=0.005, r=0.05, harmonics=((1, 1.0), (2, 0.5), (3, 0.3))), 0.42)
        # cuerdas: acorde sostenido de todo el compas
        for m in chord:
            add(b0, tone(hz(m), 4, a=0.35, r=0.4, harmonics=((1, 1.0), (2, 0.35), (3, 0.2), (4, 0.1)), vib=0.004, detune=0.004), 0.1)
        # coro grave: quinta y octava
        add(b0, tone(hz(root + 24), 4, a=0.6, r=0.5, harmonics=((1, 1.0), (2, 0.2)), vib=0.006), 0.07)
    # metales con el tema
    for bar, beat, m, dur in THEME:
        add(bar * 4 + beat, tone(hz(m), dur * 0.95, a=0.04, r=0.08, harmonics=((1, 1.0), (2, 0.6), (3, 0.45), (4, 0.3), (5, 0.15)), vib=0.006), 0.2)
        add(bar * 4 + beat, tone(hz(m - 12), dur * 0.95, a=0.05, r=0.08, harmonics=((1, 1.0), (2, 0.5), (3, 0.3)), vib=0.005), 0.12)


def save():
    peak = max(abs(v) for v in buf)
    data = b''.join(struct.pack('<h', int(max(-1, min(1, v / peak * 0.85)) * 32767)) for v in buf)
    path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx', 'boss_theme.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data)
    print('ok: boss_theme', f'{TOTAL / RATE:.1f}s')


if __name__ == '__main__':
    build()
    save()
