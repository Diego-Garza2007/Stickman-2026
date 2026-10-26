"""Genera los efectos de sonido (WAV mono 22050 Hz, sintetizados) en assets/sfx/.

Sin dependencias: solo la libreria estandar. Uso: python3 tools/make_sounds.py
"""
import math
import os
import random
import struct
import wave

RATE = 22050
TAU = 2 * math.pi


def n_samples(sec):
    return int(sec * RATE)


def env(i, n, attack=0.005, release=0.6):
    """Envolvente: subida rapida y caida exponencial."""
    t = i / RATE
    a = min(1.0, t / attack) if attack > 0 else 1.0
    return a * math.exp(-(i / n) * release * 8)


def sweep(f0, f1, sec, shape=math.sin, release=0.6, attack=0.005, vib=0.0):
    """Tono cuya frecuencia va de f0 a f1; devuelve lista de muestras."""
    n = n_samples(sec)
    out, phase = [], 0.0
    for i in range(n):
        f = f0 + (f1 - f0) * (i / n)
        if vib:
            f *= 1 + vib * math.sin(TAU * 7 * i / RATE)
        phase += TAU * f / RATE
        out.append(shape(phase) * env(i, n, attack, release))
    return out


def square(p):
    return 1.0 if math.sin(p) >= 0 else -1.0


def noise(sec, lowpass=0.2, release=0.5, attack=0.003, seed=1, sweep_lp=None):
    """Ruido filtrado; sweep_lp = (inicio, fin) para barrer el filtro (silbido de aire)."""
    rnd = random.Random(seed)
    n = n_samples(sec)
    out, y = [], 0.0
    for i in range(n):
        lp = lowpass if sweep_lp is None else sweep_lp[0] + (sweep_lp[1] - sweep_lp[0]) * (i / n)
        y += lp * (rnd.uniform(-1, 1) - y)
        out.append(y * env(i, n, attack, release))
    return out


def mix(*tracks):
    n = max(len(t) for t in tracks)
    out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out


def scale(track, g):
    return [v * g for v in track]


def delay(track, sec):
    return [0.0] * n_samples(sec) + track


def save(name, track, peak=0.8):
    m = max(1e-9, max(abs(v) for v in track))
    data = b''.join(struct.pack('<h', int(max(-1, min(1, v / m * peak)) * 32767)) for v in track)
    path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx', name + '.wav')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data)
    print('ok:', name, f'{len(track) / RATE:.2f}s')


def bell(f, sec, release=0.45):
    """Campanilla: fundamental + parciales inarmonicos."""
    return mix(sweep(f, f, sec, release=release),
               scale(sweep(f * 2.01, f * 2.01, sec, release=release * 1.4), 0.4),
               scale(sweep(f * 3.02, f * 3.02, sec, release=release * 2), 0.18))


def main():
    save('jump', mix(sweep(300, 620, 0.16, release=0.5), scale(sweep(600, 1240, 0.16, release=0.8), 0.15)), 0.55)
    save('land', mix(sweep(120, 55, 0.12, release=0.6), scale(noise(0.08, 0.15, 0.7, seed=2), 0.5)), 0.6)
    save('step', noise(0.05, 0.12, 0.9, seed=3), 0.35)
    save('dash', noise(0.24, 0.5, 0.35, attack=0.02, seed=4, sweep_lp=(0.08, 0.7)), 0.6)
    save('attack', noise(0.16, 0.5, 0.55, attack=0.01, seed=5, sweep_lp=(0.7, 0.1)), 0.6)
    save('slash', mix(noise(0.22, 0.6, 0.5, attack=0.004, seed=6, sweep_lp=(0.9, 0.2)),
                      scale(sweep(1800, 900, 0.3, release=0.5), 0.25),
                      scale(sweep(2700, 1500, 0.3, release=0.7), 0.15)), 0.7)
    save('wave', mix(sweep(240, 900, 0.5, release=0.3, attack=0.05, vib=0.05),
                     scale(sweep(480, 1800, 0.5, release=0.4, attack=0.05), 0.4),
                     scale(noise(0.5, 0.3, 0.3, attack=0.08, seed=7, sweep_lp=(0.1, 0.6)), 0.4)), 0.65)
    save('hurt', mix(sweep(330, 110, 0.28, shape=square, release=0.5), scale(noise(0.2, 0.3, 0.7, seed=8), 0.5)), 0.6)
    save('fall', mix(sweep(700, 70, 0.7, release=0.35, vib=0.03), scale(sweep(1400, 140, 0.7, release=0.5), 0.12)), 0.55)
    save('death', mix(*[delay(scale(bell(f, 0.5, 0.5), 1.0), 0.18 * k) for k, f in enumerate((392, 330, 262, 196))],
                      delay(sweep(130, 45, 0.7, release=0.3), 0.55)), 0.7)
    save('ready', bell(1320, 0.18, 0.7), 0.35)
    save('hit', mix(sweep(220, 70, 0.14, release=0.5), scale(noise(0.1, 0.5, 0.7, seed=9), 0.6),
                    scale(sweep(1500, 700, 0.08, release=0.9), 0.2)), 0.75)
    save('enemy_die', mix(sweep(260, 60, 0.45, shape=square, release=0.35, vib=0.04),
                          scale(noise(0.4, 0.2, 0.4, seed=10, sweep_lp=(0.5, 0.05)), 0.5)), 0.65)
    save('alert', mix(sweep(520, 520, 0.07, shape=square, release=0.5),
                      delay(sweep(780, 780, 0.1, shape=square, release=0.6), 0.08)), 0.4)
    save('win', mix(*[delay(bell(f, 0.45, 0.5), 0.11 * k) for k, f in enumerate((523, 659, 784, 1047))]), 0.65)
    # pickup de la espada: acorde ascendente brillante con destello final
    notes = (523, 659, 784, 1047, 1319, 1568)
    chime = mix(*[delay(bell(f, 1.2, 0.35), 0.09 * k) for k, f in enumerate(notes)])
    glitter = mix(*[delay(scale(bell(2400 + 310 * k, 0.25, 0.8), 0.25), 0.5 + 0.07 * k) for k in range(6)])
    swell = scale(sweep(200, 800, 0.6, release=0.2, attack=0.25), 0.3)
    save('sword', mix(chime, glitter, swell), 0.8)
    # amuleto: aparicion (barrido grave que sube + destellos), impacto al equiparlo, golpes de yunque y coro final
    rise = mix(scale(sweep(80, 420, 1.6, release=0.15, attack=0.9), 0.55), scale(sweep(160, 840, 1.6, release=0.2, attack=1.0), 0.3),
               scale(noise(1.6, 0.2, 0.2, attack=0.9, seed=11, sweep_lp=(0.02, 0.5)), 0.25))
    sparkle = mix(*[delay(scale(bell(1800 + 260 * k, 0.4, 0.7), 0.22), 0.25 + 0.11 * k) for k in range(10)])
    save('amulet_appear', mix(rise, sparkle), 0.8)
    boom = mix(sweep(140, 38, 0.9, release=0.25), scale(noise(0.5, 0.25, 0.35, seed=12, sweep_lp=(0.7, 0.05)), 0.7),
               scale(sweep(70, 70, 0.9, release=0.25), 0.6))
    choir = mix(*[scale(sweep(f, f, 2.4, release=0.12, attack=0.35, vib=0.012), g)
                  for f, g in ((262, 0.5), (330, 0.4), (392, 0.4), (523, 0.35), (659, 0.25), (784, 0.2))])
    save('amulet_equip', mix(boom, delay(choir, 0.1), delay(bell(1568, 1.8, 0.3), 0.15)), 0.85)
    clang = mix(sweep(900, 880, 0.5, release=0.3, attack=0.001), scale(sweep(1450, 1430, 0.5, release=0.4, attack=0.001), 0.6),
                scale(sweep(2310, 2290, 0.5, release=0.5, attack=0.001), 0.4), scale(noise(0.06, 0.7, 0.9, attack=0.001, seed=13), 0.8))
    save('clang', clang, 0.8)
    save('armor', mix(scale(sweep(2100, 1700, 0.18, release=0.6, attack=0.001), 0.6),
                      scale(sweep(3200, 2600, 0.12, release=0.8, attack=0.001), 0.3), scale(noise(0.05, 0.8, 0.9, seed=14), 0.6)), 0.6)
    # fuego: rugido ascendente con crepitar (erupcion y dash de fuego)
    crackle = mix(*[delay(scale(noise(0.04, 0.8, 0.9, attack=0.001, seed=20 + k), 0.7), 0.05 * k + 0.02 * (k % 3)) for k in range(14)])
    save('flame', mix(scale(noise(0.7, 0.25, 0.25, attack=0.06, seed=19, sweep_lp=(0.05, 0.5)), 1.0),
                      scale(sweep(110, 260, 0.6, release=0.3, attack=0.08, vib=0.05), 0.45), crackle), 0.8)
    # zumbido del santuario: bucle perfecto de 4 s (frecuencias con ciclos enteros, LFO de 2 ciclos)
    n = n_samples(4)
    hum = []
    for i in range(n):
        t = i / RATE
        lfo = 0.65 + 0.35 * math.sin(TAU * 0.5 * t)
        v = (math.sin(TAU * 110 * t) * 0.5 + math.sin(TAU * 165 * t) * 0.3 * lfo
             + math.sin(TAU * 220 * t) * 0.25 * (1.3 - lfo) + math.sin(TAU * 440 * t) * 0.07 * lfo)
        hum.append(v)
    save('hum', hum, 0.5)


if __name__ == '__main__':
    main()
