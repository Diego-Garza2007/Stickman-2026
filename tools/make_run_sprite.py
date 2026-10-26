"""Genera los spritesheets pixel art del stickman en assets/ (correr, idle, salto, golpe y dash).

Frames de 32x32 mirando a la derecha. Uso: python3 tools/make_run_sprite.py
"""
import math
import os
from PIL import Image, ImageDraw

FRAMES = 8
SIZE = 32
GROUND = 30
IDLE_FRAMES = 6
IDLE_BREATH = [0, 0, 1, 1, 1, 0]  # 1 = pecho abajo

# Poses de salto: (cadera, cuello, cabeza, [pierna lejana], [pierna cercana], [brazo lejano], [brazo cercano])
# 0 = subida, 1 = apice (encogido), 2 = caida, 3 = aterrizaje (agachado)
JUMP_POSES = [
    ((14, 18), (15, 9), (16, 4.5),
     [(14, 18), (12, 24), (9, 28)], [(14, 18), (16, 24), (13, 29)],
     [(15, 10.5), (11, 12), (8, 10)], [(15, 10.5), (19, 9), (23, 5)]),
    ((14, 18), (16, 10), (17, 5.5),
     [(14, 18), (18, 23), (12, 26)], [(14, 18), (20, 21), (16, 26)],
     [(16, 11.5), (12, 13), (8, 12)], [(16, 11.5), (19, 12), (23, 10)]),
    ((14, 18), (15, 9), (16, 4.5),
     [(14, 18), (11, 24), (8, 28)], [(14, 18), (17, 24), (18, 29)],
     [(15, 10.5), (11, 9), (7, 6)], [(15, 10.5), (20, 8), (24, 5)]),
    ((13, 22), (17, 15), (19, 10.5),
     [(13, 22), (15, 26), (10, 30)], [(13, 22), (19, 25), (16, 30)],
     [(17, 16.5), (13, 20), (10, 24)], [(17, 16.5), (18, 20), (22, 23)]),
]

# Golpe: 0 = preparacion, 1 = golpe, 2 = impacto (con arco), 3 = recuperacion
ATTACK_POSES = [
    ((14, 18), (13, 9), (13, 4.5),
     [(14, 18), (10, 24), (7, 30)], [(14, 18), (18, 24), (19, 30)],
     [(13, 10.5), (17, 14), (19, 10)], [(13, 10.5), (9, 13), (6, 11)]),
    ((14, 19), (19, 11), (21, 6.5),
     [(14, 19), (9, 25), (6, 30)], [(14, 19), (20, 25), (22, 30)],
     [(19, 12.5), (15, 15), (12, 13)], [(19, 12.5), (24, 12), (29, 11.5)]),
    ((14, 19), (19, 11), (21, 6.5),
     [(14, 19), (9, 25), (6, 30)], [(14, 19), (20, 25), (22, 30)],
     [(19, 12.5), (15, 15), (12, 13)], [(19, 12.5), (24, 12), (29, 11.5)]),
    ((14, 18), (16, 10), (17, 5.5),
     [(14, 18), (11, 24), (8, 30)], [(14, 18), (18, 24), (19, 30)],
     [(16, 11.5), (13, 14), (15, 11)], [(16, 11.5), (20, 13), (24, 12)]),
]

# Dash: cuerpo muy inclinado, brazos hacia atras (3 frames que alternan las piernas)
DASH_POSES = [
    ((11, 20), (20, 13), (24, 9.5),
     [(11, 20), (16, 25), (13, 30)], [(11, 20), (6, 24), (2, 29)],
     [(20, 14.5), (16, 17), (11, 17)], [(20, 14.5), (15, 14), (10, 14)]),
    ((11, 20), (20, 13), (24, 9.5),
     [(11, 20), (8, 25), (5, 30)], [(11, 20), (17, 24), (16, 30)],
     [(20, 14.5), (15, 15), (10, 16)], [(20, 14.5), (16, 17), (11, 18)]),
    ((11, 21), (20, 14), (24, 10.5),
     [(11, 21), (17, 25), (13, 30)], [(11, 21), (6, 25), (2, 29)],
     [(20, 15.5), (15, 18), (10, 18)], [(20, 15.5), (15, 15), (10, 14)]),
]

BODY = (26, 26, 46, 255)
FAR = (74, 74, 106, 255)      # extremidades del lado lejano (mas claras)
SKIN = (240, 240, 245, 255)   # relleno de la cabeza
BAND = (224, 52, 66, 255)     # cinta roja
BAND_DARK = (160, 30, 44, 255)
SHADOW = (0, 0, 0, 70)


def pt(origin, angle_deg, length):
    """Punto a `length` desde `origin`; angulo medido desde la vertical hacia abajo, + = adelante."""
    a = math.radians(angle_deg)
    return (origin[0] + math.sin(a) * length, origin[1] + math.cos(a) * length)


def leg(hip, p):
    thigh = 48 * math.sin(p)
    flex = 14 + 62 * max(0.0, math.cos(p))  # rodilla se dobla mientras la pierna vuelve adelante
    knee = pt(hip, thigh, 6)
    foot = pt(knee, thigh - flex, 7)
    return [hip, knee, foot]


def arm(shoulder, p):
    upper = -42 * math.sin(p)
    elbow = pt(shoulder, upper, 5)
    hand = pt(elbow, upper + 75 + 15 * math.sin(p), 5)
    return [shoulder, elbow, hand]


def line(d, pts, color):
    d.line([(round(x), round(y)) for x, y in pts], fill=color, width=2)


def draw_head(d, head, phase, tail_amp=1.2):
    """Cabeza con contorno, ojo, cinta roja y cola ondulante."""
    hx, hy = round(head[0]), round(head[1])
    d.ellipse([hx - 4, hy - 4, hx + 4, hy + 4], fill=SKIN, outline=BODY)
    d.point((hx + 2, hy - 1), fill=BODY)  # ojo
    d.line([(hx - 4, hy - 1), (hx + 3, hy - 2)], fill=BAND)
    d.line([(hx - 4, hy), (hx + 3, hy - 1)], fill=BAND)
    for k in range(1, 6):
        wave = round(math.sin(phase + k * 0.9) * tail_amp)
        d.point((hx - 4 - k, hy - 1 + wave), fill=BAND if k < 4 else BAND_DARK)
        d.point((hx - 4 - k, hy + wave), fill=BAND_DARK)


def idle_frame(i):
    p = 2 * math.pi * i / IDLE_FRAMES
    breath = 1 if IDLE_BREATH[i] else 0
    sway = math.sin(p)

    hip = (14.0, GROUND - 13.0)
    neck = (hip[0] + 1, hip[1] - 9 + breath)   # el pecho baja al respirar
    shoulder = (neck[0], neck[1] + 1.5)
    head = (neck[0] + 1, neck[1] - 4.5)

    far_leg = [hip, (hip[0] - 1, hip[1] + 6), (hip[0] - 3, GROUND)]
    near_leg = [hip, (hip[0] + 1.5, hip[1] + 6), (hip[0] + 3, GROUND)]
    far_arm = [shoulder, (shoulder[0] + 1.5, shoulder[1] + 4.5),
               (shoulder[0] + 2.5 + sway * 0.5, shoulder[1] + 9)]
    near_arm = [shoulder, (shoulder[0] - 1.5, shoulder[1] + 4.5),
                (shoulder[0] + 0.5 - sway * 0.5, shoulder[1] + 9 + breath * 0.5)]

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([8, GROUND, 21, GROUND + 1], fill=SHADOW)
    line(d, far_arm, FAR)
    line(d, far_leg, FAR)
    line(d, [hip, neck], BODY)
    line(d, near_leg, BODY)
    line(d, near_arm, BODY)
    draw_head(d, head, p, tail_amp=0.8)
    return img


def jump_frame(i):
    hip, neck, head, far_leg, near_leg, far_arm, near_arm = JUMP_POSES[i]
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if i == len(JUMP_POSES) - 1:
        d.ellipse([6, GROUND, 22, GROUND + 1], fill=SHADOW)  # solo al tocar suelo
    line(d, far_arm, FAR)
    line(d, far_leg, FAR)
    line(d, [hip, neck], BODY)
    line(d, near_leg, BODY)
    line(d, near_arm, BODY)
    draw_head(d, head, i * 1.5, tail_amp=1.4)
    return img


def pose_frame(poses, i, extra=None):
    hip, neck, head, far_leg, near_leg, far_arm, near_arm = poses[i]
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([6, GROUND, 24, GROUND + 1], fill=SHADOW)
    if extra:
        extra(d, i, 'back')
    line(d, far_arm, FAR)
    line(d, far_leg, FAR)
    line(d, [hip, neck], BODY)
    line(d, near_leg, BODY)
    line(d, near_arm, BODY)
    draw_head(d, head, i * 1.5, tail_amp=1.4)
    if extra:
        extra(d, i, 'front')
    return img


def attack_effects(d, i, layer):
    if layer != 'front':
        return
    if i in (1, 2):  # punio
        fx, fy = ATTACK_POSES[i][6][2]
        d.rectangle([round(fx) - 1, round(fy) - 1, round(fx) + 1, round(fy) + 1], fill=BODY)
    if i == 2:       # arco de impacto + chispas
        cx, cy = 21, 12
        for deg in range(-62, 63, 4):
            a = math.radians(deg)
            r = 9.5 + (1 if deg % 8 == 0 else 0)
            d.point((round(cx + math.cos(a) * r), round(cy + math.sin(a) * r)), fill=(255, 255, 255, 255))
        for deg in range(-50, 51, 4):
            a = math.radians(deg)
            d.point((round(cx + math.cos(a) * 7.5), round(cy + math.sin(a) * 7.5)), fill=(255, 226, 120, 255))
        for dx, dy in ((31, 6), (31, 17), (30, 3), (30, 20)):
            d.point((dx, dy), fill=(255, 226, 120, 255))


def dash_effects(d, i, layer):
    if layer != 'back':
        return
    # lineas de velocidad detras del personaje
    streaks = [((0, 9), 7), ((0, 14), 10), ((1, 19), 8), ((0, 24), 11), ((2, 28), 6)]
    for k, ((x, y), ln) in enumerate(streaks):
        x0 = x + ((i * 3 + k * 2) % 4)
        d.line([(x0, y), (x0 + ln - 4, y)], fill=(255, 255, 255, 170 if k % 2 else 110))


def attack_frame(i):
    return pose_frame(ATTACK_POSES, i, attack_effects)


def dash_frame(i):
    return pose_frame(DASH_POSES, i, dash_effects)


def frame(i):
    p = 2 * math.pi * i / FRAMES
    hip = (13.0, 17.0)
    neck = (hip[0] + 4, hip[1] - 8)       # torso inclinado hacia adelante
    shoulder = (neck[0] - 0.5, neck[1] + 1.5)
    head = (neck[0] + 2, neck[1] - 4.5)

    near_leg, far_leg = leg(hip, p), leg(hip, p + math.pi)
    near_arm, far_arm = arm(shoulder, p + math.pi), arm(shoulder, p)

    # apoya el pie mas bajo en el suelo
    drop = GROUND - max(near_leg[2][1], far_leg[2][1])
    shift = lambda pts: [(x, y + drop) for x, y in pts]
    near_leg, far_leg, near_arm, far_arm = map(shift, (near_leg, far_leg, near_arm, far_arm))
    hip_s, neck_s = (hip[0], hip[1] + drop), (neck[0], neck[1] + drop)
    head_s = (head[0], head[1] + drop)

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # sombra
    d.ellipse([7, GROUND, 22, GROUND + 1], fill=SHADOW)

    line(d, far_arm, FAR)
    line(d, far_leg, FAR)
    line(d, [hip_s, neck_s], BODY)          # torso
    line(d, near_leg, BODY)
    line(d, near_arm, BODY)

    draw_head(d, head_s, p)
    return img


def save_sheet(name, count, make_frame, out_dir):
    sheet = Image.new("RGBA", (SIZE * count, SIZE), (0, 0, 0, 0))
    for i in range(count):
        sheet.paste(make_frame(i), (i * SIZE, 0))
    out = os.path.join(out_dir, name + ".png")
    sheet.save(out)
    # version ampliada solo para previsualizar
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(
        os.path.join(out_dir, name + "_preview.png"))
    print("ok:", os.path.normpath(out))


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")
    os.makedirs(out_dir, exist_ok=True)
    save_sheet("stickman_run", FRAMES, frame, out_dir)
    save_sheet("stickman_idle", IDLE_FRAMES, idle_frame, out_dir)
    save_sheet("stickman_jump", len(JUMP_POSES), jump_frame, out_dir)
    save_sheet("stickman_attack", len(ATTACK_POSES), attack_frame, out_dir)
    save_sheet("stickman_dash", len(DASH_POSES), dash_frame, out_dir)


if __name__ == "__main__":
    main()
