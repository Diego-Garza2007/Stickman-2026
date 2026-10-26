"""Genera assets/boss.png: el Guardian de la Cima (jefe del nivel 5), 14 frames de 64x64 mirando a la derecha.

Frames: 0-3 idle, 4-9 caminar, 10 preparacion (maza en alto), 11 golpe (maza al suelo), 12 embestida, 13 herido.
Los pies quedan en la fila 62. Uso: python3 tools/make_boss_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

S = 64            # lienzo con margen para la maza; el cuerpo se dibuja en una cuadricula de 48x48 desplazada (+8, +16)
OX, OY = 8, 16
OUT = (14, 16, 28, 255)
STEEL_D = (38, 42, 62, 255)
STEEL = (62, 68, 98, 255)
STEEL_L = (104, 114, 156, 255)
FAR = (46, 50, 74, 255)
GOLD = (232, 180, 62, 255)
GOLD_D = (168, 118, 34, 255)
EYE = (255, 70, 80, 255)
EYE_L = (255, 220, 200, 255)
GLOW = (255, 60, 70, 90)
WOOD = (110, 70, 40, 255)
WOOD_D = (72, 44, 24, 255)
STONE = (120, 122, 140, 255)
STONE_D = (78, 80, 100, 255)
DUST = (200, 190, 170, 255)

# nombre -> (lean, bob, pie lejano (dx, lift), pie cercano (dx, lift), mano, angulo de la maza, ojos brillantes)
def pose(lean=0, bob=0, far=(0, 0), near=(0, 0), hand=(36, 27), ang=150, eyes=1, crouch=0, dust=False, head_back=0):
    return dict(lean=lean, bob=bob, far=far, near=near, hand=hand, ang=ang, eyes=eyes, crouch=crouch, dust=dust, head_back=head_back)


POSES = (
    [pose(bob=b, hand=(35, 26 + b), ang=152, eyes=e) for b, e in ((0, 1), (1, 2), (1, 1), (0, 0))]
    + [pose(bob=b, far=f, near=n, hand=(34, 23 + b), ang=20) for b, f, n in (
        (0, (-4, 0), (4, 2)), (1, (-2, 0), (2, 0)), (0, (0, 0), (0, 0)),
        (0, (4, 2), (-4, 0)), (1, (2, 0), (-2, 0)), (0, (0, 0), (0, 0)))]
    + [
        pose(lean=-3, bob=0, hand=(31, 11), ang=-35, eyes=2, head_back=-1),        # preparacion
        pose(lean=4, bob=2, far=(-3, 0), near=(4, 0), hand=(37, 29), ang=160, eyes=2, dust=True),  # golpe
        pose(lean=7, bob=4, far=(-5, 0), near=(5, 0), hand=(29, 31), ang=-105, eyes=2, crouch=3),  # embestida
        pose(lean=-4, bob=1, hand=(34, 30), ang=130, eyes=0, head_back=-2),         # herido
    ]
)


class Shift:
    """Envoltorio de ImageDraw que desplaza todo lo que se dibuja (OX, OY)."""
    def __init__(self, d):
        self.d = d

    def _pts(self, pts):
        return [(x + OX, y + OY) for x, y in pts]

    def _box(self, b):
        return [b[0] + OX, b[1] + OY, b[2] + OX, b[3] + OY]

    def line(self, pts, **kw): self.d.line(self._pts(pts), **kw)
    def polygon(self, pts, **kw): self.d.polygon(self._pts(pts), **kw)
    def rectangle(self, b, **kw): self.d.rectangle(self._box(b), **kw)
    def ellipse(self, b, **kw): self.d.ellipse(self._box(b), **kw)
    def point(self, xy, **kw): self.d.point((xy[0] + OX, xy[1] + OY), **kw)


def dirvec(deg):
    a = math.radians(deg)
    return math.sin(a), -math.cos(a)


def poly(d, pts, fill, outline=OUT):
    d.polygon([(round(x), round(y)) for x, y in pts], fill=fill, outline=outline)


def draw_leg(d, hip, foot_dx, lift, color, light):
    hx, hy = hip
    fx = hx + foot_dx
    fy = 46 - lift
    poly(d, [(hx - 4, hy), (hx + 4, hy), (fx + 4, fy - 6), (fx - 4, fy - 6)], color)
    poly(d, [(fx - 5, fy - 6), (fx + 6, fy - 6), (fx + 7, fy), (fx - 5, fy)], light)
    d.line([(fx - 4, fy - 6), (fx + 5, fy - 6)], fill=GOLD_D)


def draw_maul(d, hand, ang):
    ux, uy = dirvec(ang)
    px, py = -uy, ux
    hx, hy = hand
    end = (hx + ux * 17, hy + uy * 17)
    d.line([(round(hx - ux * 4), round(hy - uy * 4)), (round(end[0]), round(end[1]))], fill=OUT, width=4)
    d.line([(round(hx - ux * 4), round(hy - uy * 4)), (round(end[0]), round(end[1]))], fill=WOOD, width=2)
    cx, cy = hx + ux * 19, hy + uy * 19
    w, l = 7, 6   # cabeza de la maza: bloque de piedra con puas
    pts = [(cx - ux * l - px * w, cy - uy * l - py * w), (cx + ux * l - px * w, cy + uy * l - py * w),
           (cx + ux * l + px * w, cy + uy * l + py * w), (cx - ux * l + px * w, cy - uy * l + py * w)]
    poly(d, pts, STONE)
    d.line([(round(cx - ux * l - px * w), round(cy - uy * l - py * w)), (round(cx - ux * l + px * w), round(cy - uy * l + py * w))], fill=STONE_D, width=2)
    for k in (-1, 1):   # puas
        sx, sy = cx + px * w * k, cy + py * w * k
        d.line([(round(sx), round(sy)), (round(sx + px * 3 * k), round(sy + py * 3 * k))], fill=GOLD, width=2)


def draw_arm(d, shoulder, hand, color, light):
    sx, sy = shoulder
    hx, hy = hand
    ex, ey = (sx + hx) / 2, (sy + hy) / 2 + 3   # codo ligeramente hacia abajo
    for p, q in (((sx, sy), (ex, ey)), ((ex, ey), (hx, hy))):
        d.line([(round(p[0]), round(p[1])), (round(q[0]), round(q[1]))], fill=OUT, width=5)
        d.line([(round(p[0]), round(p[1])), (round(q[0]), round(q[1]))], fill=color, width=3)
    d.rectangle([round(hx) - 2, round(hy) - 2, round(hx) + 2, round(hy) + 2], fill=light, outline=OUT)


def frame(i):
    p = POSES[i]
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = Shift(ImageDraw.Draw(img))
    lean, bob, crouch = p['lean'], p['bob'], p['crouch']
    d.ellipse([8, 45, 40, 47], fill=(0, 0, 0, 80))
    hip_y = 31 + crouch
    draw_leg(d, (21 + lean // 2, hip_y), p['far'][0], p['far'][1], FAR, STEEL_D)
    # brazo lejano (detras del torso) sujetando la maza
    sh_y = 16 + bob + crouch
    draw_arm(d, (16 + lean, sh_y + 1), (p['hand'][0] - 3, p['hand'][1] + 2), FAR, STEEL_D)
    # torso
    poly(d, [(14 + lean, sh_y - 1), (34 + lean, sh_y - 1), (31 + lean // 2, hip_y + 1), (17 + lean // 2, hip_y + 1)], STEEL)
    d.line([(24 + lean, sh_y + 2), (24 + lean // 2 + 1, hip_y)], fill=STEEL_D, width=2)
    d.rectangle([17 + lean // 2, hip_y - 4, 31 + lean // 2, hip_y], fill=STEEL_D, outline=OUT)          # cinturon
    d.rectangle([22 + lean // 2, hip_y - 4, 26 + lean // 2, hip_y], fill=GOLD, outline=GOLD_D)
    for x in range(17 + lean, 32 + lean, 4):                                                              # remaches del pecho
        d.point((x, sh_y + 4), fill=STEEL_L)
    draw_leg(d, (27 + lean // 2, hip_y), p['near'][0], p['near'][1], STEEL, STEEL_L)
    # cabeza con cuernos
    hx = 24 + lean + 2 + p['head_back']
    hy = sh_y - 7
    for k, sgn in ((0, -1), (1, 1)):
        bx = hx + sgn * 5
        d.line([(bx, hy), (bx + sgn * 3, hy - 4), (bx + sgn * 3 + (1 if sgn > 0 else 0), hy - 8)], fill=OUT, width=4)
        d.line([(bx, hy), (bx + sgn * 3, hy - 4), (bx + sgn * 3 + (1 if sgn > 0 else 0), hy - 8)], fill=(232, 226, 200, 255), width=2)
    poly(d, [(hx - 6, hy - 5), (hx + 6, hy - 5), (hx + 7, hy + 5), (hx + 3, hy + 8), (hx - 3, hy + 8), (hx - 7, hy + 5)], STEEL)
    d.line([(hx - 6, hy - 4), (hx + 6, hy - 4)], fill=STEEL_L)
    d.rectangle([hx - 5, hy, hx + 6, hy + 2], fill=(10, 10, 20, 255))                                     # visor
    if p['eyes']:
        e = EYE_L if p['eyes'] == 2 else EYE
        d.rectangle([hx + 1, hy, hx + 5, hy + 1], fill=e)
        d.rectangle([hx - 4, hy, hx - 2, hy + 1], fill=EYE)
        d.point((hx + 6, hy), fill=GLOW)
    # hombreras con puas
    for sx, col in ((14 + lean, STEEL_D), (34 + lean, STEEL)):
        poly(d, [(sx - 5, sh_y - 3), (sx + 5, sh_y - 3), (sx + 6, sh_y + 4), (sx - 6, sh_y + 4)], col)
        d.line([(sx - 5, sh_y - 3), (sx + 5, sh_y - 3)], fill=STEEL_L)
        d.polygon([(sx - 2, sh_y - 3), (sx + 2, sh_y - 3), (sx, sh_y - 8)], fill=GOLD, outline=GOLD_D)
    # brazo cercano y maza delante
    draw_arm(d, (33 + lean, sh_y + 2), p['hand'], STEEL, STEEL_L)
    draw_maul(d, p['hand'], p['ang'])
    d.rectangle([round(p['hand'][0]) - 2, round(p['hand'][1]) - 2, round(p['hand'][0]) + 2, round(p['hand'][1]) + 2], fill=STEEL_L, outline=OUT)
    if p['dust']:
        for x, y in ((44, 44), (46, 41), (41, 45), (45, 46), (38, 46), (47, 44)):
            d.point((x, y), fill=DUST)
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    sheet = Image.new('RGBA', (S * len(POSES), S), (0, 0, 0, 0))
    for i in range(len(POSES)):
        sheet.paste(frame(i), (i * S, 0))
    sheet.save(os.path.join(out_dir, 'boss.png'))
    bg = Image.new('RGBA', sheet.size, (120, 150, 190, 255))
    bg.alpha_composite(sheet)
    rows = [bg.crop((k * S * 7, 0, (k + 1) * S * 7, S)) for k in range(2)]
    prev = Image.new('RGBA', (S * 7, S * 2))
    for k, r in enumerate(rows):
        prev.paste(r, (0, k * S))
    prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(out_dir, 'boss_preview.png'))
    print('ok', len(POSES))


if __name__ == '__main__':
    main()
