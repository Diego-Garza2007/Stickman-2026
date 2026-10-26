// Menu principal: cuadricula con todos los niveles (los no alcanzados aparecen bloqueados).

const MENU_COLS = 5;
const CELL_W = 100;
const CELL_H = 56;
const CELL_GAP_X = 16;
const CELL_GAP_Y = 14;
const GRID_TOP = 132;

class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    loadBackground(this, THEMES[0]);
  }

  create() {
    const { layers, ground } = buildBackground(this, THEMES[0], WIDTH);
    this.layers = layers;
    this.ground = ground;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1020, 0.45).setOrigin(0, 0).setDepth(6);
    this.cameras.main.fadeIn(300);
    this.starting = false;

    this.add.text(WIDTH / 2, 52, 'STICKMAN 2026', {
      fontFamily: 'monospace', fontSize: '46px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#1a1a2e', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(10);
    this.add.text(WIDTH / 2, 98, 'Elige un nivel', {
      fontFamily: 'monospace', fontSize: '18px', color: '#e6eeff', stroke: '#1a1a2e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.buildGrid();
    this.buildButton(16, 'Reiniciar progreso', 0xe03442, () => Progress.reset(), 0, '¿Borrar todo el progreso (niveles y espada)?');
    this.buildButton(WIDTH - 16, '[DEV] Desbloquear todo', 0x7fa8ff, () => Progress.unlockAll(), 1);
    this.buildButton(WIDTH - 16, '[DEV] Espada + 2 amuletos', 0xffb060, () => Progress.giveAll(), 1, null, 48);

    this.label = this.add.text(WIDTH / 2, 410, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);
    this.add.text(WIDTH / 2, 435, '← ↑ ↓ → elegir    Enter / Espacio jugar    Esc en el nivel: volver aqui', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c9d6f5', stroke: '#1a1a2e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ENTER,SPACE,A,D,W,S');

    const next = Math.min(Progress.load().unlocked, LEVELS.length) - 1;
    this.select(next);
  }

  buildGrid() {
    const gridW = MENU_COLS * CELL_W + (MENU_COLS - 1) * CELL_GAP_X;
    const left = (WIDTH - gridW) / 2;
    this.cells = LEVELS.map((level, i) => {
      const col = i % MENU_COLS;
      const row = Math.floor(i / MENU_COLS);
      const cx = left + col * (CELL_W + CELL_GAP_X) + CELL_W / 2;
      const cy = GRID_TOP + row * (CELL_H + CELL_GAP_Y) + CELL_H / 2;
      const unlocked = Progress.isUnlocked(level.id);
      const done = Progress.isDone(level.id);

      const g = this.add.graphics();
      g.fillStyle(unlocked ? 0x16213e : 0x2b2f3a, unlocked ? 0.92 : 0.8);
      g.fillRoundedRect(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H, 8);
      g.lineStyle(3, unlocked ? level.theme.accent : 0x555b6b, 1);
      g.strokeRoundedRect(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H, 8);
      const parts = [g];

      if (unlocked) {
        parts.push(this.add.text(0, -2, String(level.id), {
          fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5));
      } else {
        const lock = this.add.graphics();   // candado dibujado
        lock.fillStyle(0x8a90a3, 1);
        lock.fillRoundedRect(-9, -2, 18, 14, 3);
        lock.lineStyle(3, 0x8a90a3, 1);
        lock.beginPath().arc(0, -2, 6, Math.PI, 0, false).strokePath();
        lock.fillStyle(0x2b2f3a, 1).fillCircle(0, 5, 2);
        parts.push(lock);
      }
      if (done) parts.push(this.add.star(CELL_W / 2 - 14, -CELL_H / 2 + 14, 5, 4, 9, 0xffd84a).setStrokeStyle(2, 0x8a6a10));

      const cell = this.add.container(cx, cy, parts).setDepth(8).setSize(CELL_W, CELL_H);
      cell.setInteractive({ useHandCursor: unlocked });
      cell.on('pointerover', () => this.select(i));
      cell.on('pointerdown', () => { this.select(i); this.activate(i); });
      return { cell, level, unlocked, cx, cy };
    });

    // marco de seleccion
    this.highlight = this.add.graphics().setDepth(9);
    this.highlight.lineStyle(4, 0xffffff, 1)
      .strokeRoundedRect(-CELL_W / 2 - 4, -CELL_H / 2 - 4, CELL_W + 8, CELL_H + 8, 10);
  }

  // Boton de texto en la esquina superior; `originX` 0 = ancla a la izquierda, 1 = a la derecha.
  // Al pulsarlo aplica la accion y recarga el menu para reflejar el progreso.
  buildButton(x, text, color, action, originX = 0, confirmText = null, y = 14) {
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    const btn = this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', backgroundColor: '#16213e',
      padding: { x: 10, y: 6 },
    }).setOrigin(originX, 0).setDepth(10).setInteractive({ useHandCursor: true });
    btn.setStroke(hex, 0).setAlpha(0.85);
    btn.on('pointerover', () => btn.setAlpha(1).setColor(hex));
    btn.on('pointerout', () => btn.setAlpha(0.85).setColor('#ffffff'));
    btn.on('pointerdown', () => {
      if (this.starting || (confirmText && !window.confirm(confirmText))) return;
      this.starting = true;
      action();
      this.scene.restart();
    });
  }

  select(i) {
    this.selected = Phaser.Math.Clamp(i, 0, LEVELS.length - 1);
    this.cells.forEach(({ cell }, k) => cell.setScale(k === this.selected ? 1.08 : 1));
    const { cx, cy, level, unlocked } = this.cells[this.selected];
    this.highlight.setPosition(cx, cy);
    this.label.setText(unlocked ? `Nivel ${level.id} - ${level.name}` : `Nivel ${level.id} - Bloqueado`);
  }

  activate(i) {
    if (this.starting) return;
    const { cell, unlocked } = this.cells[i];
    if (!unlocked) {  // sacudida para indicar que esta bloqueado
      this.tweens.add({ targets: cell, x: cell.x + 6, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.starting = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => this.scene.start(sceneFor(i), { levelIndex: i, freshRun: true }));
  }

  update(time) {
    // el fondo se desplaza solo
    const scrollX = time / 1000 * 40;
    this.layers.forEach(({ ts, factor, drift }) => {
      ts.tilePositionX = Math.round(scrollX * factor + drift * (time / 1000));
    });
    this.ground.tilePositionX = Math.round(scrollX);

    const J = Phaser.Input.Keyboard.JustDown;
    if (J(this.cursors.left) || J(this.keys.A)) this.select(this.selected - 1);
    if (J(this.cursors.right) || J(this.keys.D)) this.select(this.selected + 1);
    // arriba/abajo saltan una fila, y se quedan donde estan si no hay fila
    const up = this.selected - MENU_COLS;
    const down = this.selected + MENU_COLS;
    if ((J(this.cursors.up) || J(this.keys.W)) && up >= 0) this.select(up);
    if ((J(this.cursors.down) || J(this.keys.S)) && down < LEVELS.length) this.select(down);
    if (J(this.keys.ENTER) || J(this.keys.SPACE)) this.activate(this.selected);
  }
}
