"""Genera los spritesheets del lobo de las nieves en assets/ (wolf_idle 4, wolf_run 8, wolf_attack 4, wolf_hurt 1).
Frames de 32x32 mirando a la derecha. Uso: python3 tools/make_wolf_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

import make_sand_enemies as s

SIZE, GROUND = 32, 30
FUR = (122, 132, 150, 255)
FUR_L = (178, 188, 204, 255)
FUR_D = (78, 86, 104, 255)
BELLY = (214, 222, 234, 255)
EYE = (255, 226, 90, 255)
FANG = (250, 250, 250, 255)
NOSE = (24, 24, 32, 255)
SHADOW = (0, 0, 0, 70)


def wolf(legs_phase=0.0, stretch=0, crouch=0, jaw=0, tail_up=0, hurt=False, bob=0):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([4, GROUND - 1, 28, GROUND + 1], fill=SHADOW)
    by = GROUND - 11 + crouch + bob          # centro del cuerpo
    bx0, bx1 = 5 - stretch, 21 + stretch
    # patas: traseras y delanteras (las lejanas, mas oscuras)
    for i, (lx, col) in enumerate(((bx0 + 3, FUR_D), (bx0 + 6, FUR), (bx1 - 5, FUR_D), (bx1 - 2, FUR))):
        ph = math.sin(legs_phase + i * 1.6)
        top = by + 3
        foot = GROUND if stretch == 0 else GROUND - 1
        d.line([(lx, top), (lx + ph * 3, (top + foot) // 2), (lx + ph * 4 + 1, foot)], fill=col, width=2)
    # cola
    ty = by - 2 - tail_up * 4
    d.line([(bx0 + 1, by - 1), (bx0 - 3, ty), (bx0 - 5, ty + 3 - tail_up * 3)], fill=FUR, width=3)
    d.point((bx0 - 5, ty + 3 - tail_up * 3), fill=FUR_L)
    # cuerpo
    d.ellipse([bx0, by - 6, bx1, by + 6], fill=FUR)
    d.ellipse([bx0 + 2, by - 6, bx1 - 2, by - 1], fill=FUR_L)
    d.ellipse([bx0 + 4, by + 1, bx1 - 3, by + 6], fill=BELLY)
    # cabeza y hocico
    hx, hy = bx1 + 1, by - 5 + crouch // 2
    d.ellipse([hx - 4, hy - 4, hx + 4, hy + 4], fill=FUR)
    d.polygon([(hx - 3, hy - 4), (hx - 1, hy - 8), (hx + 1, hy - 4)], fill=FUR_D)       # oreja
    d.polygon([(hx + 1, hy - 4), (hx + 3, hy - 7), (hx + 4, hy - 3)], fill=FUR_D)
    d.polygon([(hx + 2, hy - 2), (hx + 9, hy + 1 - jaw // 2), (hx + 2, hy + 2)], fill=FUR_L)  # hocico
    if jaw:
        d.polygon([(hx + 2, hy + 2), (hx + 8, hy + 3 + jaw), (hx + 2, hy + 4)], fill=FUR_D)
        d.point((hx + 7, hy + 1), fill=FANG)
        d.point((hx + 5, hy + 2), fill=FANG)
    d.point((hx + 9, hy + 1 - jaw // 2), fill=NOSE)
    d.point((hx + 2, hy - 1), fill=NOSE if hurt else EYE)
    return s.outline(img)


def frames():
    idle = [wolf(legs_phase=0, bob=i % 2, tail_up=i % 2) for i in range(4)]
    run = [wolf(legs_phase=i * math.pi / 2, stretch=1 if i % 4 in (1, 2) else 0, bob=-1 if i % 4 in (1, 2) else 0, tail_up=1) for i in range(8)]
    attack = [wolf(crouch=3, jaw=0), wolf(stretch=3, jaw=3, bob=-2), wolf(stretch=3, jaw=3, bob=-1), wolf(crouch=1)]
    hurt = [wolf(crouch=2, hurt=True, tail_up=0)]
    return dict(idle=idle, run=run, attack=attack, hurt=hurt)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    for part, imgs in frames().items():
        s.save(f'wolf_{part}', imgs, out_dir)


if __name__ == '__main__':
    main()
