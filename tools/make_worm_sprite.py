"""Genera los sprites del Gusano de Brasas (jefe del nivel 14) en assets/:
  worm_seg.png  : anillo del cuerpo, 2 frames de 32x16 (0 normal, 1 con las junturas al rojo vivo). Se apilan en vertical en el juego.
  worm_head.png : cabeza mirando a la derecha, 4 frames de 48x48 (0 cerrada, 1 entreabierta, 2 abierta de par en par, 3 herida).
Uso: python3 tools/make_worm_sprite.py
"""
import os

from PIL import Image, ImageDraw

OUT = (28, 10, 8, 255)
HIDE = (170, 96, 52, 255)
HIDE_L = (226, 148, 82, 255)
HIDE_D = (110, 52, 32, 255)
PLATE = (88, 40, 28, 255)
SEAM = (255, 150, 40, 255)
SEAM_HOT = (255, 226, 110, 255)
MAW = (255, 120, 30, 255)
MAW_HOT = (255, 226, 120, 255)
TOOTH = (250, 240, 214, 255)
TOOTH_D = (190, 170, 140, 255)
EYE = (255, 236, 90, 255)


def outline(img):
    w, h = img.size
    out = img.copy()
    src, dst = img.load(), out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    dst[x, y] = OUT
                    break
    return out


def segment(hot):
    img = Image.new('RGBA', (32, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([1, 1, 30, 14], radius=5, fill=HIDE)
    d.rounded_rectangle([1, 1, 30, 7], radius=5, fill=HIDE_L)
    d.rectangle([2, 7, 29, 9], fill=HIDE)
    d.rounded_rectangle([1, 9, 30, 14], radius=4, fill=HIDE_D)
    for x in (6, 12, 19, 25):                                   # placas
        d.point((x, 4), fill=PLATE); d.point((x + 1, 5), fill=PLATE)
    seam = SEAM_HOT if hot else SEAM
    d.line([(3, 13), (28, 13)], fill=seam)
    if hot:
        d.line([(3, 12), (28, 12)], fill=SEAM)
    for x in (9, 16, 23):
        d.point((x, 12), fill=seam)
    return outline(img)


def head(frame):
    s = 48
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # cuello (sale por abajo) y craneo
    d.rounded_rectangle([8, 30, 36, 47], radius=5, fill=HIDE)
    d.rounded_rectangle([8, 40, 36, 47], radius=4, fill=HIDE_D)
    d.ellipse([4, 4, 34, 38], fill=HIDE)
    d.ellipse([6, 5, 26, 20], fill=HIDE_L)
    for x, y in ((10, 12), (16, 9), (22, 11), (12, 20), (19, 18)):
        d.point((x, y), fill=PLATE)
    # mandibulas: dos bandas articuladas en la bisagra (31, 21) que se abren hacia delante (derecha)
    open_ = (0, 3, 6, 1)[frame]
    hx, hy = 31, 21
    uy = 21 - 3 - open_ * 2          # y de la punta de la mandibula superior (la inferior es simetrica)
    ly = 21 + 3 + open_ * 2
    if open_:
        d.polygon([(hx, hy), (46, uy + 4), (46, ly - 4)], fill=MAW_HOT if frame == 2 else MAW)
    upper = (240, 200, 170, 255) if frame == 3 else HIDE_L
    d.polygon([(hx - 2, 14), (46, uy), (46, uy + 4), (hx, hy)], fill=upper)
    d.polygon([(hx - 2, 28), (46, ly), (46, ly - 4), (hx, hy)], fill=HIDE)
    d.line([(hx - 2, 14), (46, uy)], fill=OUT)
    d.line([(hx - 2, 28), (46, ly)], fill=OUT)
    for t in (0.45, 0.7, 0.95):      # colmillos sobre el borde interior de cada mandibula
        ix = round(hx + (46 - hx) * t)
        iy_u = round(hy + (uy + 4 - hy) * t)
        iy_l = round(hy + (ly - 4 - hy) * t)
        d.polygon([(ix - 1, iy_u), (ix + 1, iy_u), (ix, iy_u + 4)], fill=TOOTH)
        d.polygon([(ix - 1, iy_l), (ix + 1, iy_l), (ix, iy_l - 4)], fill=TOOTH_D)
    # ojos (rendijas incandescentes)
    if frame == 3:
        for ex in (22, 28):
            d.line([(ex - 1, 12), (ex + 1, 14)], fill=OUT); d.line([(ex - 1, 14), (ex + 1, 12)], fill=OUT)
    else:
        d.rectangle([23, 12, 26, 13], fill=EYE)
        d.point((27, 12), fill=SEAM)
    # junturas al rojo del cuello
    d.line([(10, 38), (34, 38)], fill=SEAM)
    d.line([(10, 44), (34, 44)], fill=SEAM)
    return outline(img)


def save(name, imgs, out_dir, bg=(226, 150, 90, 255)):
    w, h = imgs[0].size
    sheet = Image.new('RGBA', (w * len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        sheet.paste(im, (i * w, 0))
    sheet.save(os.path.join(out_dir, name + '.png'))
    prev = Image.new('RGBA', sheet.size, bg)
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(os.path.join(out_dir, name + '_preview.png'))
    print('ok:', name)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    save('worm_seg', [segment(False), segment(True)], out_dir)
    save('worm_head', [head(i) for i in range(4)], out_dir)


if __name__ == '__main__':
    main()
