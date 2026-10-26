"""Genera los fondos pixel art con parallax en assets/bg/.

Cada escena produce capas PNG de 800x452 (arte nativo de 200x113 ampliado x4, igual que el
stickman). Las capas se repiten sin costuras en horizontal: las ondulaciones usan armonicos
enteros del ancho y los objetos se dibujan con "wrap" en los bordes.

Uso: python3 tools/make_backgrounds.py
"""
import math
import os
import random

from PIL import Image

W, H = 200, 113          # tamano nativo
SCALE = 4
GROUND = 95              # fila nativa donde empieza el suelo (380px / 4)
TILE_W, TILE_H = 64, 18  # suelo nativo (256x72 al ampliar)

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hexc(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


class Canvas:
    def __init__(self, w=W, h=H, fill=(0, 0, 0, 0)):
        self.w, self.h = w, h
        self.img = Image.new('RGBA', (w, h), fill)
        self.px = self.img.load()

    def put(self, x, y, c):
        x = int(x)
        y = int(y)
        if 0 <= y < self.h:
            self.px[x % self.w, y] = c

    def save(self, path, scale=SCALE):
        self.img.resize((self.w * scale, self.h * scale), Image.NEAREST).save(path)


def blend(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def dither_pick(x, y, t):
    """True si el pixel (x, y) toma el segundo color de una mezcla con proporcion t (0..1)."""
    return BAYER[y % 4][x % 4] < t * 16


# ---------------------------------------------------------------- cielo / nubes

def sky(colors, sun=None, stars=0, seed=1):
    rnd = random.Random(seed)
    cv = Canvas(fill=colors[0])
    n = len(colors) - 1
    for y in range(H):
        t = min(y / GROUND, 1.0) * n
        i = min(int(t), n - 1)
        frac = t - i
        for x in range(W):
            cv.put(x, y, colors[i + 1] if dither_pick(x, y, frac) else colors[i])
    for _ in range(stars):
        x, y = rnd.randrange(W), rnd.randrange(60)
        c = hexc('#ffffff') if rnd.random() < 0.4 else hexc('#aab4e8')
        cv.put(x, y, c)
        if rnd.random() < 0.18:  # estrella con brillo en cruz
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.put(x + dx, y + dy, hexc('#7d89c9'))
    if sun:
        cx, cy, r = sun['x'], sun['y'], sun['r']
        for y in range(cy - r * 3, cy + r * 3):
            for x in range(cx - r * 3, cx + r * 3):
                d = math.hypot(x - cx, y - cy)
                if d <= r:
                    c = sun['color']
                    if sun.get('craters') and ((x - cx + 3) ** 2 + (y - cy - 2) ** 2 < 4
                                               or (x - cx - 3) ** 2 + (y - cy + 3) ** 2 < 2):
                        c = sun['crater']
                    cv.put(x, y, c)
                elif d <= r * 1.6 and dither_pick(x, y, 0.55 * (1 - (d - r) / (r * 0.6))):
                    cv.put(x, y, sun['halo'])
                elif d <= r * 2.6 and dither_pick(x, y, 0.3 * (1 - (d - r * 1.6) / (r * 1.0))) \
                        and (x + y) % 2 == 0:
                    cv.put(x, y, sun['halo2'])
    return cv


def clouds(pal, specs):
    """specs: lista de (cx, cy, escala). Dibuja nubes con luz arriba y sombra abajo."""
    cv = Canvas()
    for cx, cy, s in specs:
        discs = [(0, 0, 7 * s), (-9 * s, 2 * s, 5 * s), (9 * s, 2 * s, 6 * s),
                 (-17 * s, 4 * s, 3.5 * s), (17 * s, 4 * s, 4 * s), (0, 4 * s, 6 * s)]
        cols = {}
        for dx, dy, r in discs:
            for y in range(int(cy + dy - r), int(cy + dy + r) + 1):
                for x in range(int(cx + dx - r), int(cx + dx + r) + 1):
                    if (x - cx - dx) ** 2 + (y - cy - dy) ** 2 <= r * r and y <= cy + 4.5 * s + 3:
                        cols.setdefault(x, []).append(y)
        for x, ys in cols.items():
            top, bot = min(ys), max(ys)
            for y in range(top, bot + 1):
                if y - top <= 1:
                    c = pal['light']
                elif bot - y <= 1:
                    c = pal['shadow']
                else:
                    c = pal['body']
                cv.put(x, y, c)
    return cv


# ---------------------------------------------------------------- relieve

def ridge_y(x, base, waves):
    y = base
    for k, amp, phase, *ridged in waves:
        s = math.sin(2 * math.pi * k * x / W + phase)
        y -= amp * ((1 - abs(s)) if ridged and ridged[0] else s)
    return y


def mountains(base, waves, pal, snow_line=None, snow=None, snow_shade=None,
              speckle=0.0, seed=2, strata=None, plateau=False):
    rnd = random.Random(seed)
    cv = Canvas()
    ys = []
    for x in range(W):
        y = ridge_y(x, base, waves)
        if plateau:  # mesetas: aplana las cimas
            y = base - 26 * max(0.0, min(1.0, (base - y) / 8.0 - 0.15)) * 1.0
        ys.append(int(round(y)))
    top_min = min(ys)
    for x in range(W):
        top = ys[x]
        slope = ys[(x + 1) % W] - ys[(x - 1) % W]
        for y in range(top, GROUND + 4):
            depth = y - top
            if strata:
                c = strata[((y // 3) + (x // 40)) % len(strata)]
                if abs(slope) > 4:
                    c = pal['dark']
                elif depth == 0:
                    c = pal['light']
                elif depth < 2 and slope < 0:
                    c = pal['light']
            else:
                if depth == 0:
                    c = pal['light']
                elif slope < -1 and depth < 9:
                    c = pal['light']
                elif slope > 1 and depth < 12:
                    c = pal['dark']
                else:
                    c = pal['body']
                if speckle and c == pal['body'] and rnd.random() < speckle:
                    c = pal['light'] if rnd.random() < 0.5 else pal['dark']
            # nieve en las cumbres
            if snow_line is not None and top < snow_line:
                snow_depth = (snow_line - top) * 0.9 + 1 + (1 if (x * 7) % 5 < 2 else 0)
                if depth < snow_depth:
                    c = snow_shade if slope > 1 else snow
            # bruma atmosferica hacia abajo
            t = (y - top_min) / max(1, GROUND - top_min)
            if dither_pick(x, y, max(0.0, t - 0.4) * 0.8):
                c = pal['haze']
            cv.put(x, y, c)
    return cv


# ---------------------------------------------------------------- objetos

def paint(cv, pix, outline):
    """pix: {(x, y): color}. Pinta y rodea con un contorno oscuro de 1px."""
    for (x, y), c in pix.items():
        cv.put(x, y, c)
    if outline is None:
        return
    for (x, y) in pix:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in pix:
                cv.put(x + dx, y + dy, outline)


def round_tree(cv, cx, base, r, pal, rnd):
    pix = {}
    cy = base - int(r * 1.9)
    # tronco
    for y in range(cy, base):
        w = 3 if y < base - 2 else 5
        for i in range(w):
            x = cx - w // 2 + i
            pix[(x, y)] = pal['trunk_l'] if i == 0 else (pal['trunk_d'] if i == w - 1 else pal['trunk'])
    discs = [(0, 0, r), (-r * 0.75, r * 0.35, r * 0.68), (r * 0.75, r * 0.4, r * 0.68),
             (0, -r * 0.55, r * 0.62)]
    for y in range(int(cy - r * 1.4), int(cy + r * 1.4)):
        for x in range(int(cx - r * 1.8), int(cx + r * 1.8)):
            best = None
            for dx, dy, rr in discs:
                d = math.hypot(x - cx - dx, y - cy - dy) / rr
                if d <= 1 and (best is None or d < best[0]):
                    best = (d, (x - cx - dx) / rr, (y - cy - dy) / rr)
            if best:
                _, nx, ny = best
                l = -0.7 * nx - 0.75 * ny + rnd.random() * 0.35 - 0.17
                if l > 0.62:
                    c = pal['hl']
                elif l > 0.22:
                    c = pal['light']
                elif l > -0.25:
                    c = pal['mid']
                else:
                    c = pal['dark']
                pix[(x, y)] = c
    paint(cv, pix, pal['outline'])


def pine(cv, cx, base, h, tiers, pal, rnd, snow=None, snow_shade=None):
    pix = {}
    w = h * 0.42
    step = (h - 3) / (tiers + 0.7)
    for y in range(base - 3, base):
        for x in (cx - 1, cx):
            pix[(x, y)] = pal['trunk']
    for i in range(tiers):
        ty = base - h + i * step + 2
        by = ty + step * 1.9
        wmax = w * (0.4 + 0.6 * (i + 1) / tiers)
        for y in range(int(ty), int(by) + 1):
            hw = wmax * (y - ty) / (by - ty) + (rnd.random() - 0.5) * 1.3
            for x in range(int(cx - hw), int(cx + hw) + 1):
                rel = (x - cx) / max(hw, 1)
                if y >= int(by) - 1:
                    c = pal['dark']
                elif rel < -0.25:
                    c = pal['light']
                elif rel > 0.3:
                    c = pal['dark']
                else:
                    c = pal['mid']
                if snow is not None:
                    edge = ty + abs(x - cx) * (by - ty) / wmax
                    if y - edge < 2.2:
                        c = snow_shade if rel > 0.3 else snow
                pix[(x, y)] = c
    paint(cv, pix, pal.get('outline'))


def saguaro(cv, cx, base, h, pal):
    pix = {}

    def rect(x0, y0, x1, y1):
        wd = x1 - x0 + 1
        for x in range(x0, x1 + 1):
            ci = x - x0
            c = pal['light'] if ci == 0 else (pal['dark'] if ci == wd - 1 else pal['mid'])
            if wd >= 5 and ci == 1:
                c = pal['hl']
            for y in range(y0, y1 + 1):
                if (y == y0 and ci in (0, wd - 1)):
                    continue  # esquinas redondeadas
                pix[(x, y)] = c

    rect(cx - 2, base - h, cx + 2, base - 1)
    ya, yb = base - int(h * 0.5), base - int(h * 0.62)
    rect(cx - 8, ya, cx - 3, ya + 2)               # brazo izquierdo
    rect(cx - 8, ya - 9, cx - 6, ya + 2)
    rect(cx + 3, yb, cx + 8, yb + 2)               # brazo derecho
    rect(cx + 6, yb - 11, cx + 8, yb + 2)
    paint(cv, pix, pal['outline'])


def rock(cv, cx, base, w, h, pal, rnd):
    pix = {}
    for y in range(base - h, base):
        for x in range(cx - w, cx + w + 1):
            nx, ny = (x - cx) / w, (y - base) / h
            if nx * nx + ny * ny <= 1:
                l = -0.6 * nx - 0.9 * (ny + 1) + 0.5 + rnd.random() * 0.2
                pix[(x, y)] = pal['light'] if l > 0.55 else (pal['mid'] if l > 0.1 else pal['dark'])
    paint(cv, pix, pal['outline'])


def dry_bush(cv, cx, base, pal, rnd):
    pix = {}
    for _ in range(26):
        x = cx + int(rnd.gauss(0, 3.2))
        y = base - 1 - int(abs(rnd.gauss(0, 3)))
        pix[(x, y)] = pal['mid'] if rnd.random() < 0.6 else pal['light']
    for x in range(cx - 4, cx + 5):
        pix.setdefault((x, base - 1), pal['dark'])
    paint(cv, pix, pal['outline'])


def place_wrapped(fn, cv, x, *args):
    """Dibuja un objeto en x y en x +/- W para que el borde del tile case."""
    for off in (-W, 0, W):
        fn(cv, x + off, *args)


# ---------------------------------------------------------------- suelo / primer plano

def ground_tile(pal, seed):
    rnd = random.Random(seed)
    cv = Canvas(TILE_W, TILE_H, pal['dirt'])
    for y in range(TILE_H):
        for x in range(TILE_W):
            if y < 2:
                c = pal['top_l']
            elif y < 5:
                c = pal['top']
            elif y < 6:
                c = pal['top_d']
            else:
                c = pal['dirt'] if dither_pick(x, y, (y - 6) / 14) is False else pal['dirt_d']
            cv.px[x, y] = c
    for _ in range(16):  # piedritas y manchas
        x, y = rnd.randrange(TILE_W - 3), 8 + rnd.randrange(TILE_H - 9)
        cv.px[x, y] = pal['dirt_l']
        cv.px[x + 1, y] = pal['dirt_l']
        cv.px[x + 1, y + 1] = pal['dirt_d']
    for _ in range(8):   # mechones que sobresalen
        x = rnd.randrange(TILE_W - 2)
        cv.px[x, 0] = pal['top_l']
        cv.px[(x + 1) % TILE_W, 1] = pal['top_l']
    return cv


def foreground(pal, seed, count=9):
    """Siluetas oscuras al borde inferior; se dibujan por encima del personaje con factor > 1."""
    rnd = random.Random(seed)
    cv = Canvas()
    for i in range(count):
        x = int((i + rnd.random() * 0.8) * W / count)
        hgt = 6 + rnd.randrange(7)
        for blade in range(-2, 3):
            bh = hgt - abs(blade) * 2 + rnd.randrange(2)
            for k in range(bh):
                cv.put(x + blade + (k // 4) * (1 if blade > 0 else -1 if blade < 0 else 0),
                       H - 1 - k, pal['fg'] if k < bh - 2 else pal['fg_l'])
    return cv


# ---------------------------------------------------------------- plataformas

def platform_sheet(pal, seed):
    """Hoja de 3 piezas de 8x8 (izquierda, medio, derecha) para armar plataformas de cualquier largo.
    La fila 0 es la superficie donde pisa el personaje."""
    rnd = random.Random(seed)
    speck = [[rnd.random() for _ in range(8)] for _ in range(8)]
    cv = Canvas(24, 8)
    for piece in range(3):          # 0 = izquierda, 1 = medio, 2 = derecha
        for y in range(8):
            for x in range(8):
                if y == 0:
                    c = pal['top_l']
                elif y == 1:
                    c = pal['top']
                elif y == 2:
                    c = pal['top_d']
                elif y == 7:
                    c = pal['outline'] if x in (1, 2, 4, 6) else None   # borde inferior irregular
                else:
                    c = pal['dirt']
                    if speck[y][x] < 0.18:
                        c = pal['dirt_d']
                    elif speck[y][x] > 0.9:
                        c = pal['dirt_l']
                gx = piece * 8 + x
                if piece == 0 and x == 0:   # borde izquierdo redondeado con contorno
                    c = None if y in (0, 7) else pal['outline']
                if piece == 2 and x == 7:
                    c = None if y in (0, 7) else pal['outline']
                if c is not None:
                    cv.px[gx, y] = c
    return cv


# ---------------------------------------------------------------- escenas

def scene_pradera():
    rnd = random.Random(11)
    out = {}
    out['sky'] = sky([hexc(c) for c in ('#3f8fe0', '#5aa6ee', '#7dbcf4', '#a4d2f7', '#c8e6fa', '#e4f3fb')],
                     sun=dict(x=150, y=24, r=7, color=hexc('#fff4b0'), halo=hexc('#fff3c0'), halo2=hexc('#ffffff')))
    out['clouds'] = clouds(dict(light=hexc('#ffffff'), body=hexc('#e6f0fa'), shadow=hexc('#bfd3ea')),
                           [(30, 22, 1), (100, 40, 1.4), (165, 14, 0.8)])
    out['far'] = mountains(58, [(1, 12, 0.4, 1), (3, 7, 1.7, 1), (5, 3, 0.9)],
                           dict(body=hexc('#7f9fcf'), light=hexc('#a8c2e6'), dark=hexc('#6a88bb'), haze=hexc('#cfe3f5')),
                           snow_line=40, snow=hexc('#f4f8ff'), snow_shade=hexc('#c3d3ee'), seed=3)
    out['mid'] = mountains(72, [(2, 7, 1.0), (3, 4, 2.2), (7, 1.5, 0.3)],
                           dict(body=hexc('#4f9a4a'), light=hexc('#76bd5e'), dark=hexc('#3d803f'), haze=hexc('#a6d68e')),
                           speckle=0.05, seed=4)
    near = Canvas()
    pal_back = dict(light=hexc('#2f7d45'), mid=hexc('#276a3a'), dark=hexc('#1c5230'), trunk=hexc('#3a2a1a'), outline=None)
    pal_front = dict(light=hexc('#3f9455'), mid=hexc('#2f7d45'), dark=hexc('#1f5a36'), trunk=hexc('#3a2a1a'), outline=None)
    for x in range(-4, W, 7):
        place_wrapped(pine, near, x + rnd.randrange(3), GROUND - 3, rnd.randrange(20, 28), 4, pal_back, rnd)
    for x in range(-2, W, 9):
        place_wrapped(pine, near, x + rnd.randrange(4), GROUND, rnd.randrange(14, 21), 3, pal_front, rnd)
    out['near'] = near
    trees = Canvas()
    tpal = dict(hl=hexc('#b6e684'), light=hexc('#78c95a'), mid=hexc('#46a04a'), dark=hexc('#2b6b3a'),
                outline=hexc('#173d28'), trunk=hexc('#8a5a33'), trunk_l=hexc('#a8713f'), trunk_d=hexc('#5e3d24'))
    for x, r in ((22, 11), (68, 9), (118, 12), (170, 10)):
        place_wrapped(round_tree, trees, x, GROUND + 1, r, tpal, rnd)
    out['trees'] = trees
    out['ground'] = ground_tile(dict(top_l=hexc('#8fe06a'), top=hexc('#5cb84c'), top_d=hexc('#3f8a3a'),
                                     dirt=hexc('#7a5232'), dirt_d=hexc('#5e3d24'), dirt_l=hexc('#9a6a42')), 5)
    out['fg'] = foreground(dict(fg=hexc('#1d5a36'), fg_l=hexc('#3f9455')), 6)
    out['platform'] = platform_sheet(dict(top_l=hexc('#8fe06a'), top=hexc('#5cb84c'), top_d=hexc('#3f8a3a'),
                                          dirt=hexc('#7a5232'), dirt_d=hexc('#5e3d24'), dirt_l=hexc('#9a6a42'),
                                          outline=hexc('#2e1d10')), 41)
    return out


def scene_desierto():
    rnd = random.Random(21)
    out = {}
    out['sky'] = sky([hexc(c) for c in ('#2b1b4f', '#6b2a6b', '#b8416a', '#ee7050', '#fba35a', '#fdd283')],
                     sun=dict(x=112, y=74, r=13, color=hexc('#fff1b0'), halo=hexc('#ffd78a'), halo2=hexc('#ffb86b')))
    out['clouds'] = clouds(dict(light=hexc('#ffb985'), body=hexc('#ea7e70'), shadow=hexc('#b04f6e')),
                           [(35, 24, 1.1), (120, 14, 0.9), (170, 36, 1.2)])
    out['far'] = mountains(62, [(1, 10, 1.1, 1), (2, 6, 0.2, 1), (4, 3, 2.4)],
                           dict(body=hexc('#7a3b6e'), light=hexc('#a0507e'), dark=hexc('#5e2d5c'), haze=hexc('#d9677c')),
                           seed=7)
    out['mid'] = mountains(80, [(2, 12, 0.9), (3, 7, 2.7), (5, 4, 0.5)],
                           dict(body=hexc('#b9503e'), light=hexc('#e07a52'), dark=hexc('#7e2f36'), haze=hexc('#e58a62')),
                           strata=[hexc('#b9503e'), hexc('#a8453a'), hexc('#c25f45'), hexc('#a8453a')],
                           plateau=True, seed=8)
    out['near'] = mountains(87, [(2, 4, 0.3), (3, 2.5, 1.9), (6, 1.2, 0.8)],
                            dict(body=hexc('#d68a4a'), light=hexc('#f4b068'), dark=hexc('#b8703c'), haze=hexc('#f2b777')),
                            speckle=0.03, seed=9)
    trees = Canvas()
    cpal = dict(hl=hexc('#8ccf6a'), light=hexc('#5aa04a'), mid=hexc('#3f7d3a'), dark=hexc('#2b5c2e'),
                outline=hexc('#1a3a20'))
    rpal = dict(light=hexc('#d08a60'), mid=hexc('#a8603f'), dark=hexc('#7a4030'), outline=hexc('#43241f'))
    bpal = dict(light=hexc('#9a8b4a'), mid=hexc('#7a6c3a'), dark=hexc('#5a4d2c'), outline=hexc('#3a321c'))
    for x, h in ((20, 34), (74, 26), (128, 38), (176, 28)):
        place_wrapped(saguaro, trees, x, GROUND + 1, h, cpal)
    for x, w, h in ((48, 6, 5), (100, 8, 6), (152, 5, 4)):
        place_wrapped(rock, trees, x, GROUND + 1, w, h, rpal, rnd)
    for x in (10, 90, 140):
        place_wrapped(dry_bush, trees, x, GROUND + 1, bpal, rnd)
    out['trees'] = trees
    out['ground'] = ground_tile(dict(top_l=hexc('#f6d08c'), top=hexc('#e8b66e'), top_d=hexc('#cc9650'),
                                     dirt=hexc('#c0803f'), dirt_d=hexc('#a0652f'), dirt_l=hexc('#d99a52')), 15)
    out['fg'] = foreground(dict(fg=hexc('#4d2b25'), fg_l=hexc('#7a4a36')), 16, 6)
    out['platform'] = platform_sheet(dict(top_l=hexc('#f6d08c'), top=hexc('#e8b66e'), top_d=hexc('#cc9650'),
                                          dirt=hexc('#b9503e'), dirt_d=hexc('#a8453a'), dirt_l=hexc('#c25f45'),
                                          outline=hexc('#43241f')), 42)
    return out


def scene_nieve():
    rnd = random.Random(31)
    out = {}
    out['sky'] = sky([hexc(c) for c in ('#050a22', '#0b1638', '#14224f', '#213066', '#32428a', '#4a5aa5')],
                     sun=dict(x=38, y=24, r=8, color=hexc('#f4f1d0'), halo=hexc('#9aa0d8'), halo2=hexc('#5c66b0'),
                              craters=True, crater=hexc('#d0cca0')), stars=70, seed=12)
    out['clouds'] = clouds(dict(light=hexc('#7480c4'), body=hexc('#505a9c'), shadow=hexc('#394380')),
                           [(70, 30, 1.2), (150, 18, 1.0), (180, 46, 0.8)])
    out['far'] = mountains(56, [(1, 13, 2.0, 1), (3, 8, 0.7, 1), (4, 3, 1.1)],
                           dict(body=hexc('#3a4a86'), light=hexc('#6074b4'), dark=hexc('#2a3668'), haze=hexc('#6877b8')),
                           snow_line=44, snow=hexc('#e8efff'), snow_shade=hexc('#9fb0e0'), seed=13)
    out['mid'] = mountains(74, [(2, 8, 0.3), (3, 5, 1.9), (6, 2, 0.9)],
                           dict(body=hexc('#222d5c'), light=hexc('#3a4a8a'), dark=hexc('#172046'), haze=hexc('#4a5a9a')),
                           snow_line=70, snow=hexc('#c9d6f5'), snow_shade=hexc('#7d90c8'), seed=14)
    near = Canvas()
    npal_b = dict(light=hexc('#1c4d42'), mid=hexc('#143d34'), dark=hexc('#0e2c26'), trunk=hexc('#1a1a2a'), outline=None)
    npal_f = dict(light=hexc('#276657'), mid=hexc('#1c4d42'), dark=hexc('#133a31'), trunk=hexc('#1a1a2a'), outline=None)
    for x in range(-4, W, 7):
        place_wrapped(pine, near, x + rnd.randrange(3), GROUND - 3, rnd.randrange(22, 30), 4, npal_b, rnd,
                      hexc('#a9b8e0'), hexc('#6c7db6'))
    for x in range(-2, W, 9):
        place_wrapped(pine, near, x + rnd.randrange(4), GROUND, rnd.randrange(15, 22), 3, npal_f, rnd,
                      hexc('#c4d0ee'), hexc('#8191c4'))
    out['near'] = near
    trees = Canvas()
    tpal = dict(light=hexc('#35927a'), mid=hexc('#25705c'), dark=hexc('#184a3d'), trunk=hexc('#4a3322'),
                outline=hexc('#0b1d1a'))
    for x, h, t in ((18, 52, 6), (62, 40, 5), (112, 56, 6), (160, 44, 5)):
        place_wrapped(pine, trees, x, GROUND + 1, h, t, tpal, rnd, hexc('#f2f6ff'), hexc('#aebfe6'))
    out['trees'] = trees
    out['ground'] = ground_tile(dict(top_l=hexc('#ffffff'), top=hexc('#e6eeff'), top_d=hexc('#a9bbe6'),
                                     dirt=hexc('#6f81b3'), dirt_d=hexc('#566897'), dirt_l=hexc('#8fa0cc')), 25)
    out['fg'] = foreground(dict(fg=hexc('#0e1d3a'), fg_l=hexc('#3a4a86')), 26, 7)
    out['platform'] = platform_sheet(dict(top_l=hexc('#ffffff'), top=hexc('#e6eeff'), top_d=hexc('#a9bbe6'),
                                          dirt=hexc('#6f81b3'), dirt_d=hexc('#566897'), dirt_l=hexc('#8fa0cc'),
                                          outline=hexc('#1a2146')), 43)
    return out


SCENES = {'level1': scene_pradera, 'level2': scene_desierto, 'level3': scene_nieve}
ORDER = ['sky', 'clouds', 'far', 'mid', 'near', 'trees']


def main():
    root = os.path.join(os.path.dirname(__file__), '..', 'assets', 'bg')
    os.makedirs(root, exist_ok=True)
    for name, build in SCENES.items():
        layers = build()
        for layer, cv in layers.items():
            cv.save(os.path.join(root, f'{name}_{layer}.png'))
        # previsualizacion: capas apiladas, desplazadas medio tile para revisar las costuras
        comp = Canvas(fill=(0, 0, 0, 255))
        for layer in ORDER:
            comp.img.alpha_composite(layers[layer].img)
        for gx in range(0, W, TILE_W):
            comp.img.alpha_composite(layers['ground'].img, (gx, GROUND))
        comp.img.alpha_composite(layers['fg'].img)
        shifted = Image.new('RGBA', comp.img.size)
        shifted.paste(comp.img.crop((W // 2, 0, W, H)), (0, 0))
        shifted.paste(comp.img.crop((0, 0, W // 2, H)), (W // 2, 0))
        shifted.resize((W * SCALE, H * SCALE), Image.NEAREST).save(os.path.join(root, f'{name}_preview.png'))
        print('ok:', name, ', '.join(layers))


if __name__ == '__main__':
    main()
