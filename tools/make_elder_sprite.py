"""Genera assets/npc_elder.png: Thorvald, el anciano de la cabana nevada (capucha con piel, capa azul, barba larga y bastón), 4 frames de 32x32.

Mira a la derecha; en el juego se voltea. Uso: python3 tools/make_elder_sprite.py
"""
import os

from PIL import Image, ImageDraw

from make_run_sprite import BODY, FAR, GROUND, SHADOW, SIZE, SKIN, line


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


FRAMES = 4
BREATH = [0, 0, 1, 1]
BEARD_SWAY = [0, 1, 0, -1]
CLOAK_SWAY = [0, 0, 1, 0]

HOOD = hexc('#4d6fa3')
HOOD_DARK = hexc('#34507f')
CLOAK = hexc('#3f5f94')
CLOAK_DARK = hexc('#2b4470')
FUR = hexc('#f4f6fb')
FUR_SHADE = hexc('#bcc4d8')
BEARD = hexc('#eef0f6')
BEARD_SHADE = hexc('#b3b8cc')
CANE = hexc('#7a4e2c')
CANE_DARK = hexc('#503219')


def frame(i):
    b = BREATH[i]
    hip = (14, 20)
    neck = (15, 13 + b)
    shoulder = (15, 14.5 + b)
    head = (16, 9 + b)

    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([7, GROUND, 22, GROUND + 1], fill=SHADOW)

    # baston con empunadura curva
    d.line([(22, 11), (22, GROUND)], fill=CANE, width=2)
    d.line([(23, 12), (23, GROUND)], fill=CANE_DARK, width=1)
    d.arc([19, 8, 25, 14], 180, 360, fill=CANE)

    line(d, [hip, (12, 30)], FAR)
    line(d, [hip, (16, 30)], BODY)
    # capa: cae por la espalda desde los hombros hasta las rodillas
    sway = CLOAK_SWAY[i]
    d.polygon([(shoulder[0] - 1, shoulder[1]), (shoulder[0] + 3, shoulder[1]), (10 - sway, 27), (17 - sway, 27)], fill=CLOAK)
    d.line([(shoulder[0], shoulder[1] + 2), (12 - sway, 26)], fill=CLOAK_DARK)
    d.line([(10 - sway, 27), (17 - sway, 27)], fill=FUR_SHADE)
    line(d, [shoulder, (13, 19), (12, 22)], FAR)
    line(d, [shoulder, (19, 18 + b), (22, 17 + b)], BODY)   # brazo que sujeta el baston

    # cabeza: capucha con ribete de piel, cara y barba larga
    hx, hy = head
    d.ellipse([hx - 5, hy - 5, hx + 5, hy + 4], fill=HOOD, outline=HOOD_DARK)
    d.ellipse([hx - 3, hy - 3, hx + 4, hy + 4], fill=SKIN)
    d.point((hx + 2, hy - 1), fill=BODY)
    d.line([(hx - 1, hy - 3), (hx + 3, hy - 3)], fill=BEARD_SHADE)            # cejas canosas
    d.arc([hx - 5, hy - 5, hx + 5, hy + 4], 100, 260, fill=FUR)               # piel del borde
    d.line([(hx - 3, hy - 4), (hx + 3, hy - 4)], fill=FUR)
    s = BEARD_SWAY[i]
    for k, (y, x0, x1) in enumerate(((hy + 1, hx - 3, hx + 3), (hy + 2, hx - 3, hx + 3), (hy + 3, hx - 2, hx + 3),
                                     (hy + 4, hx - 2, hx + 2), (hy + 5, hx - 2, hx + 1), (hy + 6, hx - 1, hx + 1), (hy + 7, hx, hx))):
        sw = s if k >= 3 else 0
        d.line([(x0 + sw, y), (x1 + sw, y)], fill=BEARD if k % 2 == 0 else BEARD_SHADE)
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    sheet = Image.new('RGBA', (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i in range(FRAMES):
        sheet.paste(frame(i), (i * SIZE, 0))
    sheet.save(os.path.join(out_dir, 'npc_elder.png'))
    prev = Image.new('RGBA', sheet.size, (150, 170, 200, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, 'npc_elder_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
