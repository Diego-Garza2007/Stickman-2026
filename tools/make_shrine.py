"""Genera el santuario de la espada (nivel 2): un trozo de fondo magico distinto al resto del mapa y su haz de luz.

  assets/bg/sword_shrine.png  parche de 560x452 (140x113 nativo x4): cielo violeta con estrellas, pilares con runas y altar.
                              Los bordes se funden con el fondo normal usando tramado (dither) para conservar el pixel art.
  assets/bg/sword_beam.png    haz de luz vertical (se dibuja con mezcla aditiva en el juego)

Uso: python3 tools/make_shrine.py
"""
import os
import random

from PIL import Image

from make_backgrounds import GROUND, SCALE, Canvas, blend, dither_pick, hexc

SW, SH = 140, 113          # tamano nativo del parche
FADE_SOFT = 3.0            # cuanto mas bajo, mas ancho es el degradado de los bordes

SKY = [hexc('#0f0a33'), hexc('#241766'), hexc('#43308f'), hexc('#2b5fa8'), hexc('#3ab0c4')]
STONE = hexc('#454b7a')
STONE_DARK = hexc('#2b2f55')
STONE_LIGHT = hexc('#6a73ae')
RUNE = hexc('#6ee7ff')
GLOW = hexc('#c8f7ff')


def vertical_gradient(cv):
    n = len(SKY) - 1
    for y in range(SH):
        t = min(y / GROUND, 1.0) * n
        i = min(int(t), n - 1)
        f = t - i
        for x in range(SW):
            cv.put(x, y, blend(SKY[i], SKY[i + 1], 0.0) if not dither_pick(x, y, f) else SKY[i + 1])


def stars(cv, rnd):
    for _ in range(46):
        x, y = rnd.randrange(SW), rnd.randrange(0, 62)
        cv.put(x, y, hexc('#ffffff') if rnd.random() < 0.4 else hexc('#a9c8ff'))
    for x, y in ((24, 14), (96, 9), (118, 33), (50, 26)):     # estrellas brillantes en cruz
        cv.put(x, y, hexc('#ffffff'))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.put(x + dx, y + dy, hexc('#bcd6ff'))


def halo(cv, cx, cy, rx, ry, color, strength):
    """Resplandor elíptico tramado: mas claro hacia el centro."""
    for y in range(SH):
        for x in range(SW):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d < 1:
                t = (1 - d) * strength
                if dither_pick(x, y, t):
                    cv.put(x, y, color)


def floating_rock(cv, cx, cy, w, rnd):
    for dy in range(5):
        half = max(1, w // 2 - dy * 2 + rnd.randint(0, 1))
        for x in range(cx - half, cx + half + 1):
            c = STONE_LIGHT if dy == 0 else STONE if dy < 3 else STONE_DARK
            cv.put(x, cy + dy, c)
    for x in range(cx - 1, cx + 2):                           # brillo magico bajo la roca
        cv.put(x, cy + 6, RUNE)


def pillar(cv, cx, height, rnd):
    top = GROUND - height
    for y in range(top, GROUND):
        broken = y < top + 3
        for x in range(cx - 4, cx + 5):
            if broken and rnd.random() < (top + 3 - y) * 0.3:
                continue
            c = STONE_LIGHT if x == cx - 4 else STONE_DARK if x >= cx + 3 else STONE
            cv.put(x, y, c)
    for y in range(top + 8, GROUND - 4, 9):                   # runas que brillan
        cv.put(cx - 1, y, RUNE); cv.put(cx, y, RUNE); cv.put(cx, y + 1, RUNE); cv.put(cx + 1, y + 2, RUNE)
    for x in range(cx - 5, cx + 6):                           # base ensanchada
        cv.put(x, GROUND - 1, STONE_DARK)
        cv.put(x, GROUND - 2, STONE)
    for y in range(top + 3, GROUND - 6, 2):                   # enredadera
        cv.put(cx - 4 + (y % 3), y, hexc('#3f8f5a'))


def altar(cv, cx):
    # base escalonada: 3 niveles, la losa superior sostiene la espada
    for y, half, c in ((92, 11, STONE_DARK), (93, 11, STONE_DARK), (94, 11, STONE_DARK),
                       (90, 8, STONE), (91, 8, STONE), (88, 6, STONE_LIGHT), (89, 6, STONE)):
        for x in range(cx - half, cx + half):
            cv.put(x, y, c)
    for x in range(cx - 6, cx + 6):
        cv.put(x, 88, GLOW)                                   # superficie iluminada
    for x in (cx - 3, cx - 2, cx + 1, cx + 2):                # runas del frente
        cv.put(x, 91, RUNE)
    cv.put(cx - 1, 93, RUNE); cv.put(cx, 93, RUNE)


def fade_edges(cv):
    """Mascara en forma de cupula: opaco en el centro y tramado hacia los bordes, para fundirse con el fondo normal."""
    px = cv.px
    for y in range(SH):
        for x in range(SW):
            d = ((x - SW / 2) / (SW / 2 - 2)) ** 2 + ((y - GROUND) / (GROUND + 6)) ** 2
            t = max(0.0, min(1.0, (1 - d) * FADE_SOFT))
            if not dither_pick(x, y, t):
                px[x, y] = (0, 0, 0, 0)


def shrine():
    rnd = random.Random(7)
    cv = Canvas(SW, SH)
    vertical_gradient(cv)
    stars(cv, rnd)
    halo(cv, 70, 78, 46, 40, hexc('#6fb6ff'), 0.55)
    halo(cv, 70, 82, 26, 26, hexc('#c8f7ff'), 0.7)
    floating_rock(cv, 46, 22, 9, rnd)
    floating_rock(cv, 98, 14, 11, rnd)
    floating_rock(cv, 84, 40, 6, rnd)
    pillar(cv, 32, 62, rnd)
    pillar(cv, 108, 46, rnd)
    halo(cv, 70, 93, 30, 4, RUNE, 0.5)                        # brillo de la runa en el suelo
    altar(cv, 70)
    fade_edges(cv)
    return cv


def beam():
    w, h = 22, GROUND
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            across = max(0.0, 1 - abs(x - (w - 1) / 2) / (w / 2)) ** 1.4
            along = 0.25 + 0.75 * (y / h)
            level = round(across * along * 6) / 6               # bandas de alfa, estilo pixel art
            if level > 0:
                px[x, y] = (225, 250, 255, int(level * 150))
    return img


def main():
    root = os.path.join(os.path.dirname(__file__), '..', 'assets', 'bg')
    os.makedirs(root, exist_ok=True)
    cv = shrine()
    cv.save(os.path.join(root, 'sword_shrine.png'))
    beam().resize((22 * SCALE, GROUND * SCALE), Image.NEAREST).save(os.path.join(root, 'sword_beam.png'))
    # vista previa sobre un fondo de pradera para ver como se funde
    base = Image.open(os.path.join(root, 'level1_preview.png')).convert('RGBA')
    patch = Image.open(os.path.join(root, 'sword_shrine.png'))
    base.alpha_composite(patch, (120, 0))
    base.alpha_composite(Image.open(os.path.join(root, 'sword_beam.png')), (120 + (SW * SCALE - 22 * SCALE) // 2, 0))
    base.save(os.path.join(root, 'sword_shrine_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
