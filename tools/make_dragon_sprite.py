"""Genera el pixel art de Kryovar, el Dragon de Hielo, en assets/ (todo mirando a la izquierda; el juego lo escala x4):
  dragon_body    : cuerpo (2 frames de 64x48: de pie y con las patas recogidas en vuelo). Pies en la ultima fila.
  dragon_head    : cabeza (3 frames de 40x34: boca cerrada, entreabierta, abierta). Centro de la cabeza en (26, 12).
  dragon_wing    : ala (8 frames de 64x64, de arriba a abajo). Hombro en (10, 50).
  dragon_seg     : segmento redondo para cuello y cola (10x10)
  dragon_tip     : punta de la cola (10x10)
  dragon_plate   : placas de hielo del pecho (2 frames de 16x8: mitad superior e inferior)
  dragon_crystal : Corazon de Escarcha (2 frames de 8x12: azul y dorado)
  ice_wave       : cristales de hielo del aliento y las columnas (14x18)
  ice_spear      : lanza de hielo, punta hacia abajo (5x22)
Uso: python3 tools/make_dragon_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

import make_sand_enemies as s

OUT = (10, 22, 48, 255)
BODY = (90, 143, 196, 255)
BODY_L = (136, 188, 232, 255)
BODY_D = (53, 96, 143, 255)
BELLY = (191, 224, 245, 255)
WING = (127, 180, 230, 255)
WING_L = (170, 214, 250, 255)
WING_D = (63, 110, 164, 255)
BONE = (232, 244, 255, 255)
HORN = (217, 236, 255, 255)
PLATE = (155, 191, 224, 255)
PLATE_L = (230, 244, 255, 255)
CRYSTAL = (55, 184, 255, 255)
CRYSTAL_L = (200, 240, 255, 255)
CRYSTAL_D = (20, 110, 190, 255)
EYE = (255, 255, 255, 255)
MOUTH = (30, 12, 36, 255)


def new(w, h):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def outline(img):
    w, h = img.size
    out = img.copy()
    src, dst = img.load(), out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] and src[nx, ny] != OUT:
                    dst[x, y] = OUT
                    break
    return out


def sheet(frames):
    w, h = frames[0].size
    sh = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sh.paste(f, (i * w, 0))
    return sh


def body(flying):
    img, d = new(64, 48)
    # cola de la espalda: pinchos de hielo
    for i in range(6):
        x = 12 + i * 8
        d.polygon([(x, 8 + abs(i - 2)), (x + 4, 1 + abs(i - 2) * 2), (x + 8, 8 + abs(i - 2))], fill=HORN)
    # patas (detras y delante); en vuelo se recogen
    for lx in (14, 38):
        top = 28
        foot = 38 if flying else 47
        d.polygon([(lx, top), (lx + 8, top), (lx + 7, foot - 4), (lx + 2, foot - 4)], fill=BODY_D)
        d.polygon([(lx - 3, foot), (lx + 8, foot), (lx + 6, foot - 5), (lx, foot - 5)], fill=BODY_D)
        for k in range(3):
            d.polygon([(lx - 3 + k * 4, foot), (lx - 1 + k * 4, foot), (lx - 2 + k * 4, foot - 3)], fill=HORN)
    # cuerpo
    d.ellipse([6, 5, 58, 31], fill=BODY)
    d.ellipse([9, 6, 50, 17], fill=BODY_L)           # luz en el lomo
    d.ellipse([10, 20, 46, 32], fill=BELLY)          # vientre
    for x in range(14, 54, 5):                       # escamas
        d.point((x, 13), fill=BODY_D)
        d.point((x + 2, 16), fill=BODY_D)
    return outline(img)


def head(open_px):
    img, d = new(40, 34)
    c = (26, 12)
    P = lambda pts: [(c[0] + x, c[1] + y) for x, y in pts]
    # cuernos
    d.polygon(P([(5, -5), (14, -13), (9, -3)]), fill=HORN)
    d.polygon(P([(1, -5), (8, -15), (5, -5)]), fill=HORN)
    # craneo y hocico
    d.polygon(P([(7, -5), (-2, -5.5), (-15, -1.5), (-15, 1), (-2, 1.5), (7, 3.5)]), fill=BODY)
    d.polygon(P([(7, -5), (-2, -5.5), (-15, -1.5), (-9, -1), (0, -2), (7, -2)]), fill=BODY_L)
    # mandibula
    o = open_px
    d.polygon(P([(6, 1.5), (-13, 1.5 + o * 0.9), (-14, 3.5 + o), (-1, 5 + o * 0.5), (7, 5.5)]), fill=BODY_D)
    if o > 2:   # interior de la boca
        d.polygon(P([(4, 1.5), (-12, 1.8), (-12, 1.5 + o * 0.85), (-1, 3 + o * 0.45)]), fill=MOUTH)
    # colmillos
    for i in range(4):
        x = -13 + i * 3
        d.polygon(P([(x, 1.5), (x + 2, 1.5), (x + 1, 3.5)]), fill=(255, 255, 255, 255))
        if o > 2:
            d.polygon(P([(x + 1, 1.5 + o * 0.85 - i * 0.5), (x + 3, 1.5 + o * 0.85 - i * 0.5), (x + 2, -0.5 + o * 0.85 - i * 0.5)]), fill=(255, 255, 255, 255))
    d.point((c[0] - 2, c[1] - 2), fill=EYE)
    d.point((c[0] - 3, c[1] - 2), fill=EYE)
    return outline(img)


def wing(theta):
    img, d = new(64, 64)
    S = (10, 50)
    T = (S[0] + 44 * math.sin(theta), S[1] - 44 * math.cos(theta))
    B = (S[0] + 22, S[1] + 12)
    lerp = lambda a, b, t: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    pull = lambda p: (p[0] + (S[0] - p[0]) * 0.22, p[1] + (S[1] - p[1]) * 0.22)
    q1 = pull(lerp(T, B, 0.34))
    q2 = pull(lerp(T, B, 0.68))
    d.polygon([S, T, q1, q2, B], fill=WING)
    # luz cerca del brazo, sombra junto al borde de fuga
    d.polygon([S, T, lerp(T, q1, 0.5), lerp(S, q1, 0.55)], fill=WING_L)
    d.line([q1, lerp(S, q1, 0.6)], fill=WING_D)
    d.line([q2, lerp(S, q2, 0.6)], fill=WING_D)
    d.line([S, T], fill=BONE, width=2)
    d.line([T, q1], fill=BONE)
    d.line([T, q2], fill=BONE)
    return outline(img)


def seg():
    img, d = new(10, 10)
    d.ellipse([0, 0, 9, 9], fill=BODY)
    d.ellipse([1, 1, 6, 5], fill=BODY_L)
    d.arc([0, 0, 9, 9], 20, 160, fill=BODY_D)
    return outline(img.crop((0, 0, 10, 10)).resize((10, 10)))


def tip():
    img, d = new(10, 10)
    d.polygon([(0, 1), (9, 5), (0, 9)], fill=HORN)
    d.polygon([(0, 1), (9, 5), (0, 5)], fill=BONE)
    return outline(img)


def plate(upper):
    img, d = new(16, 8)
    pts = [(0, 7), (4, 0), (12, 0), (15, 7)] if upper else [(0, 0), (15, 0), (12, 7), (4, 7)]
    d.polygon(pts, fill=PLATE)
    if upper:
        d.line([(4, 1), (12, 1)], fill=PLATE_L)
        d.line([(2, 4), (6, 2)], fill=PLATE_L)
    else:
        d.line([(3, 6), (12, 6)], fill=(110, 150, 195, 255))
        d.line([(10, 2), (14, 1)], fill=PLATE_L)
    return outline(img)


def crystal(gold=False):
    base, dark, light = ((255, 214, 90, 255), (214, 140, 30, 255), (255, 250, 210, 255)) if gold else (CRYSTAL, CRYSTAL_D, CRYSTAL_L)
    img, d = new(8, 12)
    d.polygon([(3.5, 0), (7, 5.5), (3.5, 11), (0, 5.5)], fill=base)
    d.polygon([(3.5, 0), (7, 5.5), (3.5, 5.5)], fill=dark)
    d.polygon([(3.5, 0), (3.5, 5), (1, 5)], fill=light)
    return outline(img)


def ice_wave():
    img, d = new(14, 18)
    pts = [(0, 17), (1.5, 9), (3.5, 12.5), (5, 3), (7, 0), (9, 3.5), (10.5, 12), (12.5, 8.5), (13, 17)]
    d.polygon(pts, fill=(74, 127, 192, 255))
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    px = img.load()
    for y in range(18):
        for x in range(14):
            if mask.getpixel((x, y)):
                t = y / 17
                px[x, y] = (int(255 - 181 * t), int(255 - 128 * t), 255 if t < 0.5 else int(255 - 126 * (t - 0.5) * 2), 255) if t < 0.85 else (74, 127, 192, 255)
    return outline(img)


def ice_spear():
    img, d = new(5, 22)
    d.polygon([(0, 0), (4, 0), (2, 21)], fill=(106, 168, 232, 255))
    d.polygon([(1, 0), (3, 0), (2, 18)], fill=(255, 255, 255, 255))
    return outline(img)


def save(name, img):
    out = os.path.join(os.path.dirname(__file__), '..', 'assets')
    img.save(os.path.join(out, name + '.png'))
    prev = Image.new('RGBA', img.size, (28, 40, 78, 255))
    prev.alpha_composite(img)
    prev.resize((img.width * 4, img.height * 4), Image.NEAREST).save(os.path.join(out, name + '_preview.png'))
    print('ok:', name, img.size)


if __name__ == '__main__':
    save('dragon_body', sheet([body(False), body(True)]))
    save('dragon_head', sheet([head(0), head(4.5), head(9)]))
    save('dragon_wing', sheet([wing(0.2 + i * 1.5 / 7) for i in range(8)]))
    save('dragon_seg', seg())
    save('dragon_tip', tip())
    save('dragon_plate', sheet([plate(True), plate(False)]))
    save('dragon_crystal', sheet([crystal(), crystal(True)]))
    save('ice_wave', ice_wave())
    save('ice_spear', ice_spear())
