"""Genera assets/stickman_sword_attack.png: el stickman golpeando con la espada (5 frames de 48x48).

La espada va dibujada en el sprite (no es una imagen superpuesta). El lienzo es mas grande que el
de los demas sprites para que quepa el arco del tajo; el cuerpo se desplaza (+8, +16) respecto al
lienzo de 32x32 y los pies quedan en la fila 46. Uso: python3 tools/make_sword_attack_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

from make_run_sprite import BODY, FAR, SHADOW, draw_head, line

W = H = 48
OX, OY = 8, 16
GROUND = 30

OUTLINE = (20, 36, 61, 255)
BLADE_EDGE = (244, 251, 255, 255)
BLADE = (160, 214, 247, 255)
GOLD = (255, 216, 74, 255)
GRIP = (107, 63, 36, 255)
ARC = (255, 255, 255, 255)
ARC_SOFT = (190, 232, 255, 255)

BLADE_LEN = 14

# Paleta de la espada de acero (amuleto del nivel 5): hoja mas ancha, gris azulada con filo muy brillante y guarda plateada
STEEL = dict(edge=(246, 250, 255, 255), blade=(138, 152, 172, 255), guard=(206, 216, 230, 255),
             grip=(60, 44, 52, 255), width=3, arc=(235, 244, 255, 255), arc_soft=(150, 170, 200, 255))
FIRE = dict(edge=(255, 247, 200, 255), blade=(255, 148, 38, 255), guard=(255, 206, 70, 255),
            grip=(70, 30, 24, 255), width=3, arc=(255, 232, 150, 255), arc_soft=(255, 120, 40, 255), flame=True)
IRON = dict(edge=BLADE_EDGE, blade=BLADE, guard=GOLD, grip=GRIP, width=2, arc=ARC, arc_soft=ARC_SOFT)

# Poses (cadera, cuello, cabeza, pierna lejana, pierna cercana, brazo lejano, brazo cercano) y angulo de la
# espada medido desde la vertical hacia arriba (+ = hacia delante). La mano es el ultimo punto del brazo cercano.
POSES = [
    # 0 preparacion: el cuerpo se echa atras y la espada queda alzada detras
    (((14, 18), (12, 9), (12, 4.5),
      [(14, 18), (10, 24), (7, 30)], [(14, 18), (18, 24), (19, 30)],
      [(12, 10.5), (16, 13), (18, 10)], [(12, 10.5), (9, 8), (8, 4)]), -35),
    # 1 elevacion: espada recta sobre la cabeza
    (((14, 18), (13, 9), (13, 4.5),
      [(14, 18), (10, 24), (7, 30)], [(14, 18), (18, 24), (19, 30)],
      [(13, 10.5), (17, 12), (19, 9)], [(13, 10.5), (15, 7), (16, 2)]), 8),
    # 2 tajo: el cuerpo se lanza y la hoja queda horizontal hacia delante
    (((14, 19), (19, 11), (21, 6.5),
      [(14, 19), (9, 25), (6, 30)], [(14, 19), (20, 25), (22, 30)],
      [(19, 12.5), (15, 15), (12, 13)], [(19, 12.5), (23, 11), (27, 11)]), 88),
    # 3 final del tajo: la hoja baja hacia delante
    (((14, 19), (19, 11), (21, 6.5),
      [(14, 19), (9, 25), (6, 30)], [(14, 19), (20, 25), (22, 30)],
      [(19, 12.5), (15, 15), (12, 13)], [(19, 12.5), (23, 14), (26, 17)]), 128),
    # 4 recuperacion
    (((14, 18), (16, 10), (17, 5.5),
      [(14, 18), (11, 24), (8, 30)], [(14, 18), (18, 24), (19, 30)],
      [(16, 11.5), (13, 14), (15, 11)], [(16, 11.5), (20, 14), (23, 16)]), 112),
]


def shift(pts):
    return [(x + OX, y + OY) for x, y in pts]


def dirvec(deg):
    a = math.radians(deg)
    return math.sin(a), -math.cos(a)


def draw_sword(d, hand, deg, pal):
    hx, hy = hand[0] + OX, hand[1] + OY
    ux, uy = dirvec(deg)
    px, py = -uy, ux                                         # perpendicular, para la guarda
    pt = lambda t: (round(hx + ux * t), round(hy + uy * t))
    d.line([pt(-3), pt(0)], fill=OUTLINE, width=3)
    d.line([pt(-3), pt(0)], fill=pal['grip'], width=1)
    gx, gy = hx + ux * 1, hy + uy * 1
    d.line([(round(gx - px * 3), round(gy - py * 3)), (round(gx + px * 3), round(gy + py * 3))], fill=OUTLINE, width=3)
    d.line([(round(gx - px * 2), round(gy - py * 2)), (round(gx + px * 2), round(gy + py * 2))], fill=pal['guard'], width=1)
    d.line([pt(2), pt(BLADE_LEN)], fill=OUTLINE, width=pal['width'] + 2)
    d.line([pt(2), pt(BLADE_LEN)], fill=pal['blade'], width=pal['width'])
    d.line([pt(2), pt(BLADE_LEN - 1)], fill=pal['edge'], width=1)
    if pal.get('flame'):
        # lenguas de fuego que lamen la hoja (cambian con el angulo para que parezcan moverse)
        for t, off in ((4, 2), (7, -2), (10, 2), (13, -2), (BLADE_LEN + 1, 0)):
            fx, fy = pt(t)
            fx, fy = round(fx + px * off * 1.2), round(fy + py * off * 1.2)
            d.point((fx, fy), fill=(255, 120, 30, 255))
            d.point((round(fx + ux), round(fy + uy)), fill=(255, 220, 90, 255))
            d.point((round(fx - uy * 0), round(fy - 1)), fill=(255, 90, 24, 255))


def draw_arc(d, i, pal):
    """Estela del tajo: un arco que sigue la punta de la espada."""
    if i not in (2, 3):
        return
    cx, cy = 16 + OX, 12 + OY
    r = BLADE_LEN + 4
    spans = {2: (-70, 20), 3: (-10, 62)}[i]
    for deg in range(spans[0], spans[1] + 1, 3):
        a = math.radians(deg)
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        d.point((round(x), round(y)), fill=pal['arc'])
        d.point((round(x - math.cos(a)), round(y - math.sin(a))), fill=pal['arc_soft'])


def frame(i, pal):
    (hip, neck, head, far_leg, near_leg, far_arm, near_arm), deg = POSES[i]
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6 + OX, GROUND + OY, 24 + OX, GROUND + 1 + OY], fill=SHADOW)
    line(d, shift(far_arm), FAR)
    line(d, shift(far_leg), FAR)
    line(d, shift([hip, neck]), BODY)
    line(d, shift(near_leg), BODY)
    line(d, shift(near_arm), BODY)
    draw_head(d, (head[0] + OX, head[1] + OY), i * 1.5, tail_amp=1.4)
    draw_arc(d, i, pal)
    draw_sword(d, near_arm[-1], deg, pal)
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    for name, pal in (('stickman_sword_attack', IRON), ('stickman_steel_attack', STEEL), ('stickman_fire_attack', FIRE)):
        sheet = Image.new('RGBA', (W * len(POSES), H), (0, 0, 0, 0))
        for i in range(len(POSES)):
            sheet.paste(frame(i, pal), (i * W, 0))
        sheet.save(os.path.join(out_dir, name + '.png'))
        bg = Image.new('RGBA', sheet.size, (120, 150, 190, 255))
        bg.alpha_composite(sheet)
        bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST).save(os.path.join(out_dir, name + '_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
