"""Genera assets/ember.png: el Nucleo de Fuego que suelta el Coloso de Brasas, 7 frames de 32x32:
0-5 = nucleo con aura que pulsa y una chispa que lo recorre; 6 = solo el nucleo (para el HUD).

Una gema en forma de llama dentro de un aro de hierro ennegrecido, colgada de una cadena. Uso: python3 tools/make_ember_sprite.py
"""
import os

from PIL import Image, ImageDraw

SIZE = 32
FRAMES = 7
PULSE = [0, 1, 2, 3, 2, 1]
SPARK = [None, (11, 22), (14, 15), (20, 12), (22, 22), None]
CX, CY, R = 16, 19, 10


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


OUTLINE = hexc('#1a0806')
RING = [hexc('#f2b46a'), hexc('#b8703a'), hexc('#6a3a22')]
PLATE = hexc('#2c1410')
CHAIN = hexc('#c88a4a')
CHAIN_DARK = hexc('#7a4a2a')
FLAME = [hexc('#fff3b0'), hexc('#ffc23a'), hexc('#ff7a1a'), hexc('#d6280e')]    # del centro al borde


def ember_layer():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px = img.load()
    for i in range(6):
        c = CHAIN if i % 2 else CHAIN_DARK
        px[7 + i, 1 + i] = c
        px[SIZE - 8 - i, 1 + i] = c
    d.ellipse([13, 5, 18, 10], outline=CHAIN)
    px[15, 5] = RING[0]
    # aro de hierro con bisel y placa oscura
    d.ellipse([CX - R, CY - R + 1, CX + R, CY + R + 1], fill=OUTLINE)
    d.ellipse([CX - R + 1, CY - R + 2, CX + R - 1, CY + R], fill=RING[2])
    d.ellipse([CX - R + 1, CY - R + 2, CX + R - 2, CY + R - 1], fill=RING[1])
    d.arc([CX - R + 1, CY - R + 2, CX + R - 1, CY + R], 195, 285, fill=RING[0])
    d.ellipse([CX - R + 3, CY - R + 4, CX + R - 3, CY + R - 2], fill=OUTLINE)
    d.ellipse([CX - R + 4, CY - R + 5, CX + R - 4, CY + R - 3], fill=PLATE)
    # llama: tres capas de gota, de fuera hacia dentro
    for k, (col, w, top, bot) in enumerate(((FLAME[3], 5, 8, 27), (FLAME[2], 4, 11, 26), (FLAME[1], 3, 14, 25), (FLAME[0], 1, 18, 24))):
        mid = (top + bot) // 2
        d.polygon([(16, top), (16 + w, mid + 2), (16 + w - 1, bot - 1), (16, bot), (16 - w + 1, bot - 1), (16 - w, mid + 2)], fill=col)
    d.polygon([(16, 8), (18, 13), (16, 12), (14, 14)], fill=FLAME[3])        # punta con dos lenguas
    for x, y in ((CX, CY - R + 3), (CX - R + 3, CY + 1), (CX + R - 3, CY + 1)):
        px[x, y] = RING[0]
    return img


def aura(level):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([CX - 15, CY - 16, CX + 15, CY + 14], fill=(255, 130, 30, 22 + level * 9))
    d.ellipse([CX - 11, CY - 12, CX + 11, CY + 11], fill=(255, 190, 70, 34 + level * 12))
    return img


def frame(i, base):
    img = aura(PULSE[i])
    img.alpha_composite(base)
    g = SPARK[i]
    if g is not None:
        d = ImageDraw.Draw(img)
        gx, gy = g
        for k, c in ((1, (255, 255, 230, 255)), (2, (255, 214, 120, 255))):
            for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                d.point((gx + dx, gy + dy), fill=c)
        d.point((gx, gy), fill=(255, 255, 255, 255))
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    base = ember_layer()
    sheet = Image.new('RGBA', (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i in range(FRAMES - 1):
        sheet.paste(frame(i, base), (i * SIZE, 0))
    sheet.paste(base, ((FRAMES - 1) * SIZE, 0))
    sheet.save(os.path.join(out_dir, 'ember.png'))
    prev = Image.new('RGBA', sheet.size, (40, 40, 70, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, 'ember_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
