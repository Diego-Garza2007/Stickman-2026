"""Sonidos del nivel 19 (preludio del jefe final) en assets/sfx/:
  roar     : rugido lejano y grave del Dragon de Hielo (~3.5 s) que se acerca y se apaga entre ecos
  blizzard : viento de ventisca (bucle de 4 s)
Uso: python3 tools/make_prelude_sounds.py
"""
import math
import random

import make_sounds as m


def roar():
    sec = 3.6
    n = m.n_samples(sec)
    rnd = random.Random(31)
    out, ph, ph2, y, y2 = [], 0.0, 0.0, 0.0, 0.0
    for i in range(n):
        t = i / m.RATE
        k = i / n
        # envolvente: crece despacio, mantiene y se apaga
        a = min(1.0, t / 0.9) ** 1.5 * math.exp(-max(0.0, t - 1.4) * 1.1)
        f = 62 - 18 * k + 5 * math.sin(m.TAU * 5 * t)                # grave con temblor
        ph += m.TAU * f / m.RATE
        ph2 += m.TAU * f * 1.51 / m.RATE
        saw = 2 * ((ph / m.TAU) % 1) - 1
        y += 0.05 * (rnd.uniform(-1, 1) - y)                         # rumor grave
        y2 += (0.1 + 0.25 * math.sin(math.pi * k)) * (rnd.uniform(-1, 1) - y2)  # rugido rasposo
        v = (saw * 0.55 + math.sin(ph2) * 0.25 + y * 3.0 + y2 * 0.9 * (0.5 + 0.5 * math.sin(m.TAU * 9 * t))) * a
        out.append(v)
    # ecos en la montana
    return m.mix(out, m.scale(m.delay(out, 0.55), 0.35), m.scale(m.delay(out, 1.1), 0.18))


def blizzard():
    sec = 4.0
    n = m.n_samples(sec)
    rnd = random.Random(32)
    raw, y, y2 = [], 0.0, 0.0
    for i in range(n):
        t = i / m.RATE
        gust = 0.6 + 0.4 * math.sin(m.TAU * 0.5 * t) * math.sin(m.TAU * 0.25 * t + 1)
        y += (0.04 + 0.08 * gust) * (rnd.uniform(-1, 1) - y)
        y2 += 0.3 * (rnd.uniform(-1, 1) - y2)
        raw.append((y * 2.2 + y2 * 0.12 * gust) * gust)
    # costura: el final se mezcla con el principio para que el bucle no se note
    fade = m.n_samples(0.5)
    out = raw[:n - fade]
    for j in range(fade):
        w = j / fade
        out[j] = out[j] * w + raw[n - fade + j] * (1 - w)
    return out


if __name__ == '__main__':
    m.save('roar', roar(), 0.9)
    m.save('blizzard', blizzard(), 0.6)
