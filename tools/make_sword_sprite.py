"""Genera assets/sword.png: la espada legendaria del nivel 2, 7 frames de 32x32: 0-5 = hoja con aura que pulsa y un destello que la recorre; 6 = solo la espada (para llevarla en la mano).

Hoja hacia arriba; en el juego se dibuja flotando sobre el altar. Uso: python3 tools/make_sword_sprite.py
"""
import os

from PIL import Image, ImageDraw

SIZE = 32
FRAMES = 7
PULSE = [0, 1, 2, 3, 2, 1]               # intensidad del aura por frame
GLINT_Y = [None, 18, 13, 8, 4, None]     # fila del destello (None = sin destello)


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


OUTLINE = hexc('#14243d')
BLADE = [hexc('#f4fbff'), hexc('#bfe6ff'), hexc('#8cc8f2'), hexc('#5a9fd4')]   # de filo a lomo
RUNE = hexc('#6ee7ff')
GOLD = hexc('#ffd84a')
GOLD_DARK = hexc('#d9a017')
GRIP = hexc('#6b3f24')
GRIP_DARK = hexc('#4a2a18')


def sword_layer():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()

    def put(x, y, c):
        px[x, y] = c

    # hoja: punta de 2 px y cuerpo de 4 px con el filo claro a la izquierda
    for y in (1, 2):
        put(15, y, BLADE[0]); put(16, y, BLADE[2])
    for y in range(3, 22):
        for i, x in enumerate(range(14, 18)):
            put(x, y, BLADE[i])
    for y in (8, 11, 14, 17):                 # runas grabadas en el centro
        put(15, y, RUNE); put(16, y, RUNE)
    # guarda con las puntas curvadas hacia abajo
    for x in range(8, 24):
        put(x, 22, GOLD)
    for x in range(7, 25):
        put(x, 23, GOLD_DARK)
    for x in (7, 8, 23, 24):
        put(x, 24, GOLD_DARK)
    put(15, 22, RUNE); put(16, 22, RUNE); put(15, 23, hexc('#2aa7c9')); put(16, 23, hexc('#2aa7c9'))
    # empunadura y pomo
    for y in range(25, 29):
        c = GRIP if y % 2 else GRIP_DARK
        put(15, y, c); put(16, y, c)
    for y in (29, 30):
        for x in range(14, 18):
            put(x, y, GOLD if y == 29 else GOLD_DARK)
    put(15, 29, RUNE); put(16, 29, RUNE)

    # contorno oscuro alrededor de toda la silueta
    out = img.copy()
    opx = out.load()
    for y in range(SIZE):
        for x in range(SIZE):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and px[nx, ny][3]:
                    opx[x, y] = OUTLINE
                    break
    return out


def aura(level):
    """Resplandor cian en dos anillos de alfa; level 0..3."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([16 - 11, 14 - 15, 16 + 11, 14 + 15], fill=(110, 231, 255, 22 + level * 8))
    d.ellipse([16 - 7, 14 - 12, 16 + 7, 14 + 12], fill=(160, 240, 255, 35 + level * 12))
    return img


def frame(i, base):
    img = aura(PULSE[i])
    img.alpha_composite(base)
    gy = GLINT_Y[i]
    if gy is not None:
        d = ImageDraw.Draw(img)
        arm = 2 if gy == 4 else 1
        for k in range(1, arm + 1):
            c = (255, 255, 255, 255) if k == 1 else (200, 245, 255, 255)
            for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                d.point((15 + dx, gy + dy), fill=c)
        d.point((15, gy), fill=(255, 255, 255, 255))
    return img


STEEL_MAP = {                      # colores de la espada de hierro -> acero (hoja gris azulada, guarda plateada, runas blancas)
    BLADE[0]: hexc('#ffffff'), BLADE[1]: hexc('#dfe7f2'), BLADE[2]: hexc('#a4b2c6'), BLADE[3]: hexc('#6f7f98'),
    RUNE: hexc('#e8f4ff'), GOLD: hexc('#e2eaf6'), GOLD_DARK: hexc('#8a98b0'), hexc('#2aa7c9'): hexc('#7ab8e8'),
}


FIRE_MAP = {                       # espada de hierro -> espada encantada con fuego (hoja de brasa, guarda dorada, runas blancas)
    BLADE[0]: hexc('#fff7c8'), BLADE[1]: hexc('#ffd24a'), BLADE[2]: hexc('#ff8a1e'), BLADE[3]: hexc('#c8360e'),
    RUNE: hexc('#ffffff'), GOLD: hexc('#ffe27a'), GOLD_DARK: hexc('#d98a10'), hexc('#2aa7c9'): hexc('#ff4a1a'),
}


def fire_version(base):
    """assets/sword_fire.png: la espada encantada con fuego, con llamas sobre la hoja."""
    img = base.copy()
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            px[x, y] = FIRE_MAP.get(px[x, y], px[x, y])
    d = ImageDraw.Draw(img)
    for x, y, c in ((12, 4, '#ff8a1e'), (19, 7, '#ffd24a'), (12, 10, '#ffd24a'), (19, 13, '#ff8a1e'), (12, 16, '#ff4a1a'), (19, 19, '#ffd24a'),
                    (13, 1, '#ffd24a'), (18, 2, '#ff4a1a'), (11, 7, '#ff4a1a'), (20, 11, '#ff4a1a')):
        d.point((x, y), fill=hexc(c))
    return img


def steel_version(base):
    """assets/sword_steel.png: la misma espada recoloreada en acero (se usa en la animacion del amuleto)."""
    img = base.copy()
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            px[x, y] = STEEL_MAP.get(px[x, y], px[x, y])
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    os.makedirs(out_dir, exist_ok=True)
    base = sword_layer()
    sheet = Image.new('RGBA', (SIZE * FRAMES, SIZE), (0, 0, 0, 0))
    for i in range(FRAMES - 1):
        sheet.paste(frame(i, base), (i * SIZE, 0))
    sheet.paste(base, ((FRAMES - 1) * SIZE, 0))
    sheet.save(os.path.join(out_dir, 'sword.png'))
    steel = steel_version(base)
    steel.save(os.path.join(out_dir, 'sword_steel.png'))
    steel.resize((SIZE * 4, SIZE * 4), Image.NEAREST).save(os.path.join(out_dir, 'sword_steel_preview.png'))
    fire = fire_version(base)
    fire.save(os.path.join(out_dir, 'sword_fire.png'))
    fire.resize((SIZE * 4, SIZE * 4), Image.NEAREST).save(os.path.join(out_dir, 'sword_fire_preview.png'))
    prev = Image.new('RGBA', sheet.size, (40, 60, 90, 255))
    prev.alpha_composite(sheet)
    prev.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out_dir, 'sword_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
