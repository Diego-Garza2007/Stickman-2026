// Trampas del nivel 16 (parkour): pinchos de hielo en el suelo y pisos falsos.
//  LEVELS[i].spikes = [{ x0, x1, y? }]            -> pinchos (y = superficie donde estan; por defecto el suelo). Quitan media vida; el dash los esquiva.
//  LEVELS[i].fakes  = [{ x, y, w, kind }]         -> plataformas trampa, con el mismo aspecto que las normales (w en piezas de 32px):
//     'ghost'   -> no es solida: el personaje la atraviesa y cae.
//     'crumble' -> es solida, pero con grietas: se desmorona poco despues de pisarla y reaparece al rato.
// Se anade a LevelScene con Object.assign (ver main.js).

const SPIKE_H = 18;
const CRUMBLE_DELAY = 0.4;   // segundos entre pisar un piso quebradizo y que caiga
const CRUMBLE_RETURN = 2.5;  // segundos hasta que reaparece

const TrapsMixin = {
  buildTraps({ spikes = [], fakes = [] }) {
    const base = this.floorY;
    spikes.forEach(({ x0, x1, y = base }) => {
      const g = this.add.graphics().setDepth(-1);
      const n = Math.max(1, Math.round((x1 - x0) / 16));
      const w = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        const l = x0 + i * w;
        g.fillStyle(0x6f8fb8, 1).fillTriangle(l, y, l + w, y, l + w / 2, y - SPIKE_H);
        g.fillStyle(0xcfe6ff, 1).fillTriangle(l + w * 0.25, y, l + w / 2, y, l + w / 2, y - SPIKE_H + 3);
      }
      this.spikes.push({ x0, x1, top: y - SPIKE_H, y });
    });

    const key = `${this.theme.file}_platform`;
    fakes.forEach(({ x, y, w, kind }) => {
      const parts = [];
      for (let i = 0; i < w; i++) {
        const frame = i === 0 ? 0 : i === w - 1 ? 2 : 1;
        const img = this.add.image(x + i * 32, y, key, frame).setOrigin(0, 0).setDepth(-2);
        if (kind === 'ghost') img.setTint(0xe4efff);
        parts.push(img);
      }
      const box = { x0: x, x1: x + w * 32, top: y, bottom: y + PLATFORM_H, gone: kind === 'ghost' };
      if (kind === 'crumble') {
        const cracks = this.add.graphics().setDepth(-1.9);
        cracks.lineStyle(2, 0x1c2a44, 0.8);
        for (let i = 0; i < w; i++) {
          const cx = x + i * 32 + 16;
          cracks.lineBetween(cx - 6, y + 2, cx - 1, y + 12).lineBetween(cx - 1, y + 12, cx - 7, y + 24);
        }
        parts.push(cracks);
      }
      this.platformBoxes().push(box);
      this.fakes.push({ kind, box, parts, timer: -1, back: 0 });
    });
  },

  updateTraps(dt, time) {
    const s = this.stickman;
    this.spikes.forEach((sp) => {
      if (s.y > sp.top && s.y <= sp.y + 20 && s.x + HIT_HALF_W > sp.x0 + 4 && s.x - HIT_HALF_W < sp.x1 - 4) {
        this.takeHit((sp.x0 + sp.x1) / 2, 1, 200);
      }
    });

    this.fakes.forEach((f) => {
      if (f.kind !== 'crumble') return;
      const b = f.box;
      if (!b.gone) {
        const onIt = this.grounded && Math.abs(s.y - b.top) < 1 && this.overlapsX(s.x, b);
        if (onIt && f.timer < 0) this.sfx('step', 0.4, 0.6);
        if (onIt && f.timer < 0) f.timer = CRUMBLE_DELAY;
        if (f.timer >= 0) {
          f.timer -= dt;
          const shake = Math.sin(time / 18) * 2;
          f.parts.forEach((p) => { if (p.setPosition && p.type === 'Image') p.y = b.top + shake; });
          if (f.timer < 0) {
            b.gone = true;
            f.back = CRUMBLE_RETURN;
            f.parts.forEach((p) => p.setVisible(false));
          }
        }
      } else {
        f.back -= dt;
        const inside = s.x + HIT_HALF_W > b.x0 && s.x - HIT_HALF_W < b.x1 && s.y > b.top && s.y - HIT_H < b.bottom;
        if (f.back <= 0 && !inside) {
          b.gone = false;
          f.timer = -1;
          f.parts.forEach((p) => { p.setVisible(true); if (p.type === 'Image') p.y = b.top; });
        }
      }
    });
  },
};
