"""Genera los spritesheets del murcielago en assets/: bat_fly (4 frames de aleteo), bat_dive (1: en picado, alas atras) y bat_hurt (1).
Frames de 32x32, simetricos (en el juego se voltea segun hacia donde vuele). Uso: python3 tools/make_bat_sprite.py
"""
import os

from PIL import Image, ImageDraw

SIZE = 32
OUTLINE = (18, 10, 28, 255)
WING = (92, 58, 128, 255)
WING_L = (132, 92, 170, 255)
WING_D = (58, 34, 84, 255)
BODY = (70, 42, 98, 255)
BODY_L = (108, 72, 142, 255)
EYE = (255, 72, 84, 255)
FANG = (255, 255, 255, 255)
EAR = (210, 140, 170, 255)


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


def wing(d, tip, sweep=0):
    """Ala derecha (la izquierda es el espejo): del hombro (18,15) a la punta, con borde inferior festoneado."""
    tx, ty = tip
    pts = [(18, 14), (tx, ty), (tx - 3 - sweep, ty + 5), (tx - 6 - sweep, ty + 3), (tx - 9, ty + 7), (20, 20)]
    d.polygon(pts, fill=WING)
    d.line([(18, 14), (tx, ty)], fill=WING_L)
    d.line([(19, 16), (tx - 5, ty + 4)], fill=WING_D)


def bat(tip, sweep=0, dive=False, hurt=False):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # alas: se dibujan a la derecha y se reflejan a la izquierda
    wings = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    wing(ImageDraw.Draw(wings), tip, sweep)
    img.alpha_composite(wings)
    img.alpha_composite(wings.transpose(Image.FLIP_LEFT_RIGHT))
    # cuerpo, orejas, cara
    d.ellipse([12, 13, 20, 24], fill=BODY)
    d.line([(14, 15), (14, 22)], fill=BODY_L)
    d.ellipse([12, 8, 20, 16], fill=BODY)
    d.polygon([(12, 10), (11, 4), (15, 8)], fill=BODY)
    d.polygon([(20, 10), (21, 4), (17, 8)], fill=BODY)
    d.point((12, 6), fill=EAR); d.point((20, 6), fill=EAR)
    if hurt:
        for ex in (14, 18):
            d.point((ex - 1, 11), fill=EYE); d.point((ex + 1, 13), fill=EYE)
            d.point((ex + 1, 11), fill=EYE); d.point((ex - 1, 13), fill=EYE)
    else:
        d.point((14, 12), fill=EYE); d.point((18, 12), fill=EYE)
        d.point((14, 13), fill=EYE); d.point((18, 13), fill=EYE)
        d.point((14, 15), fill=FANG); d.point((18, 15), fill=FANG)
    return outline(img)


def save(name, imgs, out_dir):
    sheet = Image.new('RGBA', (SIZE * len(imgs), SIZE), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        sheet.paste(im, (i * SIZE, 0))
    sheet.save(os.path.join(out_dir, name + '.png'))
    prev = Image.new('RGBA', sheet.size, (226, 140, 90, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, name + '_preview.png'))
    print('ok:', name)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    up, mid, down = (29, 4), (30, 13), (28, 24)
    save('bat_fly', [bat(up), bat(mid), bat(down), bat(mid)], out_dir)
    save('bat_dive', [bat((27, 25), sweep=3, dive=True)], out_dir)
    save('bat_hurt', [bat((27, 8), hurt=True)], out_dir)


if __name__ == '__main__':
    main()
