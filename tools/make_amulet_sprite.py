"""Genera assets/amulet.png: el Amuleto de Acero que suelta el Guardian de la Cima, 7 frames de 32x32:
0-5 = medallon con aura que pulsa y un destello que lo recorre; 6 = solo el amuleto (para el HUD).

Uso: python3 tools/make_amulet_sprite.py
"""
import os

from PIL import Image, ImageDraw

SIZE = 32
FRAMES = 7
PULSE = [0, 1, 2, 3, 2, 1]               # intensidad del aura por frame
GLINT = [None, (10, 13), (16, 16), (16, 23), (22, 15), None]   # posicion del destello por frame
CX, CY = 16, 19                          # centro del escudo


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


OUTLINE = hexc('#12192b')
RIM = [hexc('#f2f7ff'), hexc('#c4d0e2'), hexc('#8d9db6')]      # de luz a sombra
PLATE = hexc('#3a4863')
PLATE_DARK = hexc('#27324a')
CHAIN = hexc('#aab6c9')
CHAIN_DARK = hexc('#6c7a92')
BLADE = hexc('#e8f4ff')
GEM = hexc('#6ee7ff')
GEM_DARK = hexc('#2aa7c9')
RIVET = hexc('#dfe8f5')


SHIELD = [(7, 10), (25, 10), (25, 20), (16, 30), (7, 20)]       # contorno del escudo (punta hacia abajo)


def inset(poly, n):
    """Encoge el poligono n px hacia su centro (aproximado, suficiente para formas convexas pequenas)."""
    cx = sum(x for x, _ in poly) / len(poly)
    cy = sum(y for _, y in poly) / len(poly)
    out = []
    for x, y in poly:
        dx, dy = cx - x, cy - y
        dist = (dx * dx + dy * dy) ** 0.5
        out.append((x + dx / dist * n, y + dy / dist * n))
    return out


def amulet_layer():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px = img.load()

    # cadena: dos ramas en V que se unen en una anilla sobre el escudo
    for i in range(6):
        c = CHAIN if i % 2 else CHAIN_DARK
        px[7 + i, 1 + i] = c
        px[SIZE - 8 - i, 1 + i] = c
    d.ellipse([13, 5, 18, 10], outline=CHAIN, fill=None)
    px[15, 5] = RIM[0]

    # escudo: borde oscuro, bisel de acero, placa interior y brillo en el canto superior izquierdo
    d.polygon(SHIELD, fill=OUTLINE)
    d.polygon(inset(SHIELD, 1), fill=RIM[2])
    d.polygon(inset(SHIELD, 1.8), fill=RIM[1])
    d.line([(8, 11), (24, 11)], fill=RIM[0])
    d.line([(8, 11), (8, 19)], fill=RIM[0])
    d.polygon(inset(SHIELD, 3.6), fill=OUTLINE)
    d.polygon(inset(SHIELD, 4.4), fill=PLATE)

    # remaches en las esquinas superiores
    for x, y in ((10, 13), (22, 13)):
        px[x, y] = RIVET

    # emblema: espada vertical bajo una gema azul en forma de rombo
    for y in range(18, 25):
        px[16, y] = BLADE
    px[15, 19] = hexc('#9fb4cc')
    for x in range(13, 20):
        px[x, 23] = RIM[1]
    px[13, 23] = RIM[2]; px[19, 23] = RIM[2]
    d.polygon([(16, 12), (19, 16), (16, 20), (13, 16)], fill=GEM_DARK, outline=OUTLINE)
    d.polygon([(16, 13), (18, 16), (16, 19), (14, 16)], fill=GEM)
    px[15, 15] = (255, 255, 255, 255); px[15, 14] = (255, 255, 255, 255)
    return img


def aura(level):
    """Resplandor azul acero en dos anillos de alfa; level 0..3."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([CX - 15, CY - 16, CX + 15, CY + 14], fill=(150, 200, 255, 20 + level * 8))
    d.ellipse([CX - 11, CY - 12, CX + 11, CY + 11], fill=(190, 225, 255, 32 + level * 11))
    return img


def frame(i, base):
    img = aura(PULSE[i])
    img.alpha_composite(base)
    g = GLINT[i]
    if g is not None:
        d = ImageDraw.Draw(img)
        gx, gy = g
        for k, c in ((1, (255, 255, 255, 255)), (2, (210, 235, 255, 255))):
            for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                d.point((gx + dx, gy + dy), fill=c)
        d.point((gx, gy), fill=(255, 255, 255, 255))
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out_dir, exist_ok=True)
    base = amulet_layer()
    sheet = Image.new('RGBA', (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i in range(FRAMES - 1):
        sheet.paste(frame(i, base), (i * SIZE, 0))
    sheet.paste(base, ((FRAMES - 1) * SIZE, 0))
    sheet.save(os.path.join(out_dir, 'amulet.png'))
    prev = Image.new('RGBA', sheet.size, (40, 60, 90, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, 'amulet_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
