"""Genera los spritesheets del enemigo basico (un goblin stickman con garrote) en assets/:
enemy_idle (4), enemy_run (8), enemy_attack (4: preparacion, golpe, impacto, recuperacion) y enemy_hurt (1).

Frames de 32x32 mirando a la derecha; reutiliza las poses del stickman. Uso: python3 tools/make_enemy_sprite.py
"""
import math
import os

from PIL import Image, ImageDraw

from make_run_sprite import ATTACK_POSES, FRAMES, GROUND, SHADOW, SIZE, arm, leg, line

BODY = (58, 22, 40, 255)
FAR = (118, 66, 92, 255)
HEAD = (146, 204, 120, 255)
EYE = (255, 48, 64, 255)
HORN = (232, 226, 200, 255)
CLUB = (122, 82, 48, 255)
CLUB_DARK = (84, 54, 30, 255)
SPIKE = (200, 200, 214, 255)

STEEL = (170, 184, 204, 255)
STEEL_LIGHT = (232, 240, 250, 255)
STEEL_DARK = (84, 96, 120, 255)
ARMORED = False       # main() lo activa para generar la variante con armadura (enemy_armor_*)

IDLE_FRAMES = 4
IDLE_BREATH = [0, 1, 1, 0]
HURT_POSE = ((15, 19), (11, 10), (10, 5.5),
             [(15, 19), (11, 25), (8, 30)], [(15, 19), (19, 25), (21, 30)],
             [(11, 11.5), (8, 8), (6, 5)], [(11, 11.5), (8, 13), (5, 12)])
# (mano, punta del garrote) por frame de ataque
ATTACK_CLUB = [((6, 11), (3, 2)), ((29, 11.5), (31, 20)), ((29, 11.5), (31, 20)), ((24, 12), (27, 19))]


def draw_head(d, head, angry=True):
    hx, hy = round(head[0]), round(head[1])
    for x, y in ((hx - 3, hy - 5), (hx - 3, hy - 6), (hx + 2, hy - 5), (hx + 2, hy - 6)):   # cuernos
        d.point((x, y), fill=HORN)
    d.ellipse([hx - 4, hy - 4, hx + 4, hy + 4], fill=HEAD, outline=BODY)
    d.point((hx + 2, hy - 1), fill=EYE)
    d.line([(hx, hy - 3 if angry else hy - 4), (hx + 3, hy - 2)], fill=BODY)                 # ceja furiosa
    d.point((hx + 2, hy + 2), fill=(255, 255, 255, 255))                                     # colmillo
    if ARMORED:
        # yelmo de acero: casquete sobre la frente con ranura para los ojos (los cuernos asoman por encima)
        d.pieslice([hx - 5, hy - 5, hx + 5, hy + 5], 180, 360, fill=STEEL, outline=STEEL_DARK)
        d.line([(hx - 4, hy - 1), (hx + 4, hy - 1)], fill=STEEL_DARK)
        d.point((hx - 2, hy - 4), fill=STEEL_LIGHT)
        d.point((hx - 1, hy - 4), fill=STEEL_LIGHT)
        d.point((hx + 2, hy - 1), fill=EYE)
        d.point((hx, hy - 6), fill=HORN)
        d.point((hx, hy - 7), fill=HORN)


def club(d, hand, tip):
    hx, hy = round(hand[0]), round(hand[1])
    tx, ty = round(tip[0]), round(tip[1])
    d.line([(hx, hy), (tx, ty)], fill=CLUB, width=2)
    d.line([(hx + 1, hy), (tx + 1, ty)], fill=CLUB_DARK, width=1)
    d.rectangle([tx - 1, ty - 1, tx + 1, ty + 1], fill=STEEL_DARK if ARMORED else CLUB_DARK)
    if ARMORED:     # maza con cabeza de acero
        d.rectangle([tx - 2, ty - 2, tx + 2, ty + 2], fill=STEEL, outline=STEEL_DARK)
        d.point((tx - 1, ty - 1), fill=STEEL_LIGHT)
    d.point((tx + 2, ty), fill=SPIKE)
    d.point((tx, ty + 2), fill=SPIKE)


def torso_armor(d, hip, neck):
    """Peto de acero sobre el tronco, hombrera y faldon."""
    nx, ny = round(neck[0]), round(neck[1])
    hx, hy = round(hip[0]), round(hip[1])
    mx, my = (nx + hx) // 2, (ny + hy) // 2
    d.polygon([(nx - 3, ny + 1), (nx + 3, ny + 1), (mx + 2, hy - 1), (mx - 2, hy - 1)], fill=STEEL, outline=STEEL_DARK)
    d.line([(nx - 1, ny + 2), (mx - 1, hy - 2)], fill=STEEL_LIGHT)
    d.line([(mx - 2, my + 1), (mx + 2, my + 1)], fill=STEEL_DARK)
    d.rectangle([nx - 4, ny, nx + 3, ny + 2], fill=STEEL, outline=STEEL_DARK)          # hombrera
    d.point((nx - 3, ny), fill=STEEL_LIGHT)


def render(hip, neck, head, far_leg, near_leg, far_arm, near_arm, club_pts=None, shadow=True, angry=True):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if shadow:
        d.ellipse([7, GROUND, 23, GROUND + 1], fill=SHADOW)
    line(d, far_arm, FAR)
    line(d, far_leg, FAR)
    line(d, [hip, neck], BODY)
    line(d, near_leg, BODY)
    if club_pts is None:
        club_pts = (near_arm[-1], (near_arm[-1][0] + 3, near_arm[-1][1] + 7))   # garrote colgando de la mano
    club(d, *club_pts)
    line(d, near_arm, BODY)
    if ARMORED:
        torso_armor(d, hip, neck)
    draw_head(d, head, angry)
    return img


def idle_frame(i):
    b = IDLE_BREATH[i]
    hip = (14.0, GROUND - 13.0)
    neck = (hip[0] + 2, hip[1] - 9 + b)
    shoulder = (neck[0], neck[1] + 1.5)
    head = (neck[0] + 2, neck[1] - 4.5)
    far_leg = [hip, (hip[0] - 2, hip[1] + 6), (hip[0] - 4, GROUND)]
    near_leg = [hip, (hip[0] + 2, hip[1] + 6), (hip[0] + 4, GROUND)]
    far_arm = [shoulder, (shoulder[0] - 1, shoulder[1] + 4.5), (shoulder[0], shoulder[1] + 9)]
    near_arm = [shoulder, (shoulder[0] + 2, shoulder[1] + 4), (shoulder[0] + 4, shoulder[1] + 8)]
    return render(hip, neck, head, far_leg, near_leg, far_arm, near_arm)


def run_frame(i):
    p = 2 * math.pi * i / FRAMES
    hip = (13.0, 17.0)
    neck = (hip[0] + 4, hip[1] - 8)
    shoulder = (neck[0] - 0.5, neck[1] + 1.5)
    head = (neck[0] + 2, neck[1] - 4.5)
    near_leg, far_leg = leg(hip, p), leg(hip, p + math.pi)
    near_arm, far_arm = arm(shoulder, p + math.pi), arm(shoulder, p)
    drop = GROUND - max(near_leg[2][1], far_leg[2][1])
    shift = lambda pts: [(x, y + drop) for x, y in pts]
    near_leg, far_leg, near_arm, far_arm = map(shift, (near_leg, far_leg, near_arm, far_arm))
    return render((hip[0], hip[1] + drop), (neck[0], neck[1] + drop), (head[0], head[1] + drop),
                  far_leg, near_leg, far_arm, near_arm)


def attack_frame(i):
    hip, neck, head, far_leg, near_leg, far_arm, near_arm = ATTACK_POSES[i]
    img = render(hip, neck, head, far_leg, near_leg, far_arm, near_arm, club_pts=ATTACK_CLUB[i])
    if i == 2:    # arco rojo del impacto
        d = ImageDraw.Draw(img)
        for deg in range(-58, 59, 4):
            a = math.radians(deg)
            d.point((round(22 + math.cos(a) * 9.5), round(14 + math.sin(a) * 9.5)), fill=(255, 120, 120, 255))
    return img


def hurt_frame(_):
    return render(*HURT_POSE, club_pts=((5, 12), (1, 18)), angry=False)


def save_sheet(name, count, make_frame, out_dir):
    sheet = Image.new('RGBA', (SIZE * count, SIZE), (0, 0, 0, 0))
    for i in range(count):
        sheet.paste(make_frame(i), (i * SIZE, 0))
    sheet.save(os.path.join(out_dir, name + '.png'))
    prev = Image.new('RGBA', sheet.size, (70, 110, 150, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, name + '_preview.png'))
    print('ok:', name)


def main():
    global ARMORED
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out_dir, exist_ok=True)
    for ARMORED, prefix in ((False, 'enemy'), (True, 'enemy_armor')):
        save_sheet(f'{prefix}_idle', IDLE_FRAMES, idle_frame, out_dir)
        save_sheet(f'{prefix}_run', FRAMES, run_frame, out_dir)
        save_sheet(f'{prefix}_attack', len(ATTACK_POSES), attack_frame, out_dir)
        save_sheet(f'{prefix}_hurt', 1, hurt_frame, out_dir)


if __name__ == '__main__':
    main()
