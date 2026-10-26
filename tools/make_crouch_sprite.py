"""Genera assets/stickman_crouch.png: frame 0 = agachado quieto, frames 1-4 = caminar agachado.
Frames de 32x32 mirando a la derecha. Uso: python3 tools/make_crouch_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

import make_run_sprite as r


def frame(i):
    walking = i > 0
    p = 2 * math.pi * (i - 1) / 4 if walking else 0.0
    sway = math.sin(p) if walking else 0.0
    hip = (12.0, 23.0)
    neck = (hip[0] + 5, hip[1] - 7)
    shoulder = (neck[0] - 0.5, neck[1] + 1.5)
    head = (neck[0] + 2.5, neck[1] - 4.5)
    # piernas flexionadas: la rodilla sale adelante y el pie se adelanta o se atrasa al caminar
    far_leg = [hip, (hip[0] + 5 - sway * 3, hip[1] + 2), (hip[0] + 1 - sway * 4, r.GROUND)]
    near_leg = [hip, (hip[0] + 5 + sway * 3, hip[1] + 2), (hip[0] + 1 + sway * 4, r.GROUND)]
    far_arm = [shoulder, (shoulder[0] + 3, shoulder[1] + 3), (shoulder[0] + 6 + sway, shoulder[1] + 5)]
    near_arm = [shoulder, (shoulder[0] + 1, shoulder[1] + 4), (shoulder[0] + 4 - sway, shoulder[1] + 7)]
    img = Image.new('RGBA', (r.SIZE, r.SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6, r.GROUND, 22, r.GROUND + 1], fill=r.SHADOW)
    r.line(d, far_arm, r.FAR)
    r.line(d, far_leg, r.FAR)
    r.line(d, [hip, neck], r.BODY)
    r.line(d, near_leg, r.BODY)
    r.line(d, near_arm, r.BODY)
    r.draw_head(d, head, i * 1.2, tail_amp=1.0)
    return img


if __name__ == '__main__':
    r.save_sheet('stickman_crouch', 5, frame, os.path.join(os.path.dirname(__file__), '..', 'assets'))
