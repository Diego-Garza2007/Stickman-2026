"""Genera los spritesheets de los enemigos del desierto en assets/:
  scorpion_* : escorpion de arena (idle 4, run 8, attack 4: aviso con la cola en alto, picotazo, impacto, recuperacion; hurt 1)
  mummy_*    : momia (el goblin de make_enemy_sprite con vendas oscuras, cara palida y ojos amarillos)
Frames de 32x32 mirando a la derecha. Uso: python3 tools/make_sand_enemies.py
"""
import math
import os

from PIL import Image, ImageDraw

import make_enemy_sprite as m

SIZE = 32
GROUND = 30
OUTLINE = (24, 10, 8, 255)
SHELL = (150, 58, 36, 255)
SHELL_L = (206, 104, 62, 255)
SHELL_D = (96, 34, 24, 255)
LEG = (112, 44, 30, 255)
STING = (255, 214, 64, 255)
EYE = (255, 240, 120, 255)
SHADOW = (0, 0, 0, 70)

# cola: puntos desde la base hasta el aguijon, por pose
TAILS = {
    'idle': [(10, 22), (6, 19), (5, 13), (8, 8), (13, 8)],
    'idle2': [(10, 22), (6, 19), (5, 14), (8, 9), (13, 10)],
    'wind': [(10, 22), (5, 18), (3, 11), (5, 4), (10, 2)],
    'strike': [(10, 22), (7, 15), (11, 8), (20, 8), (28, 15)],
    'hit': [(10, 22), (8, 17), (14, 12), (23, 13), (29, 20)],
    'recover': [(10, 22), (6, 17), (6, 10), (11, 7), (16, 9)],
    'hurt': [(10, 22), (6, 21), (3, 17), (4, 11), (8, 9)],
}


def outline(img):
    out = img.copy()
    src, dst = img.load(), out.load()
    for y in range(SIZE):
        for x in range(SIZE):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and src[nx, ny][3]:
                    dst[x, y] = OUTLINE
                    break
    return out


def scorpion(tail, legs_phase=0.0, claw=0, crouch=0, hurt=False):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6, GROUND - 1, 26, GROUND + 1], fill=SHADOW)
    base = GROUND - 8 + crouch
    # patas: cuatro por el lado visible
    for i, lx in enumerate((11, 14, 17, 20)):
        ph = math.sin(legs_phase + i * 1.4)
        d.line([(lx, base + 3), (lx + ph * 2 - 1, base + 5), (lx + ph * 3, GROUND)], fill=LEG, width=1)
    # cola (segmentos redondeados) y aguijon
    d.line(tail, fill=SHELL_D, width=4, joint='curve')
    d.line(tail, fill=SHELL, width=2, joint='curve')
    for (x, y) in tail[:-1]:
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=SHELL)
        d.point((x - 1, y - 1), fill=SHELL_L)
    tx, ty = tail[-1]
    d.polygon([(tx - 2, ty - 2), (tx + 2, ty), (tx - 2, ty + 2)], fill=STING)
    # cuerpo y cabeza
    d.ellipse([6, base - 4, 22, base + 4], fill=SHELL)
    d.ellipse([7, base - 4, 17, base], fill=SHELL_L)
    d.line([(10, base - 3), (10, base + 3)], fill=SHELL_D)
    d.line([(14, base - 3), (14, base + 3)], fill=SHELL_D)
    d.ellipse([19, base - 3, 26, base + 3], fill=SHELL)
    d.point((24, base - 1), fill=EYE)
    d.point((22, base - 2), fill=EYE)
    # pinzas
    for sign in (-1, 1):
        cy = base + sign * 3
        d.line([(24, base + sign), (28, cy)], fill=SHELL, width=2)
        d.polygon([(28, cy - 2 + claw * sign), (31, cy), (28, cy + 2 - claw * sign)], fill=SHELL_L)
    if hurt:
        d.point((24, base - 1), fill=OUTLINE)
    return outline(img)


def scorpion_frames():
    idle = [scorpion(TAILS['idle' if i % 2 == 0 else 'idle2'], legs_phase=i * 0.4, claw=i % 2) for i in range(4)]
    run = [scorpion(TAILS['idle' if i % 2 == 0 else 'idle2'], legs_phase=i * math.pi / 2, crouch=i % 2) for i in range(8)]
    attack = [scorpion(TAILS['wind'], crouch=1), scorpion(TAILS['strike'], claw=1), scorpion(TAILS['hit'], claw=1), scorpion(TAILS['recover'])]
    hurt = [scorpion(TAILS['hurt'], crouch=1, hurt=True)]
    return dict(idle=idle, run=run, attack=attack, hurt=hurt)


def mummy_frames():
    m.BODY, m.FAR, m.HEAD, m.EYE = (84, 62, 44, 255), (132, 106, 78, 255), (222, 214, 196, 255), (255, 224, 40, 255)
    m.HORN = (0, 0, 0, 0)
    m.CLUB, m.CLUB_DARK, m.SPIKE = (150, 118, 66, 255), (100, 74, 40, 255), (255, 214, 64, 255)
    frames = dict(
        idle=[m.idle_frame(i) for i in range(m.IDLE_FRAMES)],
        run=[m.run_frame(i) for i in range(m.FRAMES)],
        attack=[m.attack_frame(i) for i in range(len(m.ATTACK_POSES))],
        hurt=[m.hurt_frame(0)],
    )
    # vendas: rayas claras cruzando el tronco y la cabeza
    for imgs in frames.values():
        for img in imgs:
            px = img.load()
            for y in range(SIZE):
                for x in range(SIZE):
                    if px[x, y] == m.BODY and (x + y) % 4 == 0:
                        px[x, y] = (196, 176, 138, 255)
                    elif px[x, y] == m.HEAD and y % 3 == 0:
                        px[x, y] = (186, 172, 142, 255)
    return frames


def save(name, imgs, out_dir):
    sheet = Image.new('RGBA', (SIZE * len(imgs), SIZE), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        sheet.paste(im, (i * SIZE, 0))
    sheet.save(os.path.join(out_dir, name + '.png'))
    prev = Image.new('RGBA', sheet.size, (226, 178, 104, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, name + '_preview.png'))
    print('ok:', name)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    for prefix, frames in (('scorpion', scorpion_frames()), ('mummy', mummy_frames())):
        for part, imgs in frames.items():
            save(f'{prefix}_{part}', imgs, out_dir)


if __name__ == '__main__':
    main()
