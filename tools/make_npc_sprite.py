"""Genera assets/npc_sage.png: un viejo sabio stickman (sombrero, barba y baculo), 4 frames de 32x32.

Mira a la derecha; en el juego se voltea. Uso: python3 tools/make_npc_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

from make_run_sprite import BODY, FAR, GROUND, SHADOW, SIZE, SKIN, line


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


FRAMES = 4
BREATH = [0, 0, 1, 1]
GLOW = [0, 1, 2, 1]          # 0 = orbe apagado ... 2 = brillo maximo
BEARD_SWAY = [0, 1, 0, -1]

HAT = hexc('#5b3fa0')
HAT_DARK = hexc('#3d2a75')
STAR = hexc('#ffd84a')
BEARD = hexc('#f2f2f8')
BEARD_SHADE = hexc('#b9bbd0')
STAFF = hexc('#8a5a33')
STAFF_DARK = hexc('#5e3d24')
ORB = hexc('#6ee7ff')
ORB_GLOW = (110, 231, 255, 90)


def frame(i):
    b = BREATH[i]
    hip = (14, 20)
    neck = (15, 13 + b)
    shoulder = (15, 14.5 + b)
    head = (16, 9 + b)

    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([7, GROUND, 22, GROUND + 1], fill=SHADOW)

    # baculo (detras del cuerpo) con orbe que brilla
    d.line([(22, 7), (22, GROUND)], fill=STAFF, width=2)
    d.line([(23, 9), (23, GROUND)], fill=STAFF_DARK, width=1)
    if GLOW[i]:
        r = 2 + GLOW[i] * 2
        d.ellipse([22 - r, 6 - r, 22 + r, 6 + r], fill=ORB_GLOW)
    d.ellipse([20, 4, 24, 8], fill=ORB, outline=hexc('#2aa7c9'))
    d.point((21, 5), fill=(255, 255, 255, 255))

    line(d, [shoulder, (13, 19), (12, 22)], FAR)            # brazo lejano
    line(d, [hip, (12, 30)], FAR)
    line(d, [hip, neck], BODY)
    line(d, [hip, (16, 30)], BODY)
    line(d, [shoulder, (19, 18 + b), (22, 17 + b)], BODY)   # brazo que sujeta el baculo

    # cabeza + sombrero + barba
    hx, hy = head
    d.ellipse([hx - 4, hy - 4, hx + 4, hy + 4], fill=SKIN, outline=BODY)
    d.point((hx + 2, hy - 1), fill=BODY)
    d.line([(hx - 2, hy - 3), (hx + 2, hy - 3)], fill=BEARD_SHADE)   # cejas canosas
    sway = BEARD_SWAY[i]
    for k, (y, x0, x1) in enumerate(((hy + 1, hx - 3, hx + 3), (hy + 2, hx - 3, hx + 3),
                                     (hy + 3, hx - 2, hx + 2), (hy + 4, hx - 2, hx + 2),
                                     (hy + 5, hx - 1, hx + 1), (hy + 6, hx, hx))):
        s = sway if k >= 3 else 0
        d.line([(x0 + s, y), (x1 + s, y)], fill=BEARD if k % 2 == 0 else BEARD_SHADE)
    # sombrero puntiagudo
    top = hy - 4
    d.polygon([(hx - 5, top), (hx + 5, top), (hx + 2, top - 6)], fill=HAT)
    d.polygon([(hx, top), (hx + 5, top), (hx + 2, top - 6)], fill=HAT_DARK)
    d.line([(hx - 6, top), (hx + 6, top)], fill=HAT_DARK, width=1)
    d.point((hx - 1, top - 2), fill=STAR)
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out_dir, exist_ok=True)
    sheet = Image.new('RGBA', (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i in range(FRAMES):
        sheet.paste(frame(i), (i * SIZE, 0))
    sheet.save(os.path.join(out_dir, 'npc_sage.png'))
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(
        os.path.join(out_dir, 'npc_sage_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
