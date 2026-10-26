// Casa del nivel 15 (LEVELS[i].house = { x }): una cabana nevada con una puerta. Al pararte delante y pulsar Enter entras: la pantalla
// se funde a un interior con chimenea donde Thorvald, un anciano, te cuenta la historia del jefe final (el Dragon de Hielo) en varias
// paginas de dialogo. Enter / Espacio / clic avanzan (la primera pulsacion completa la pagina); tras la ultima pagina sales de la casa.
// Se anade a LevelScene con Object.assign (ver main.js).

const HOUSE_DOOR_RANGE = 46;
const HOUSE_SPEAKER = 'Thorvald';
const HOUSE_PAGES = [
  'Vaya... un viajero con una espada que arde. Hacia muchisimo que no veia fuego caminando por estas tierras. Pasa, pasa, y cierra la puerta o se escapara el calor.',
  'Me llaman Thorvald. Llevo cuarenta inviernos en esta cabana, y todos se los debo a una sola criatura: Kryovar, el Dragon de Hielo.',
  'Antes no era un monstruo. Hace mil anos Kryovar era el guardian de las cumbres del norte. Su aliento fresco traia la nieve que regaba los valles y mantenia el equilibrio del mundo.',
  'Entonces habia tres guardianes: el Guardian de la Cima, que custodiaba el acero; el Gusano de Brasas, que dormia sobre el fuego del desierto; y Kryovar, el guardian del frio.',
  'Pero un dia alguien robo el Corazon de Escarcha, la gema azul que calmaba el hielo de Kryovar. Sin ella, su sangre se congelo... y su razon se congelo con ella.',
  'Desde entonces vive en la Cumbre Helada, al final de este bosque. Cada invierno su aliento baja un poco mas por la montana. Los pueblos del sur ya son solo leyendas bajo la nieve.',
  'Tu vienes del desierto, asi que ya venciste al Gusano. Entonces lo entiendes: sin sus guardianes, el mundo se rompe. Y tu espada es el unico fuego al que Kryovar todavia teme.',
  'Escucha bien lo que he visto desde mi ventana. Su aliento congela todo lo que toca: salta o usa el dash para cruzarlo. Cuando bate las alas, hace llover lanzas de hielo desde el cielo.',
  'Y cuando se posa a descansar, su pecho brilla azul. Ahi esta lo que queda del Corazon de Escarcha. Golpealo con tu fuego y quizas, solo quizas, lo liberes de la maldicion.',
  'El camino sera largo: el bosque nevado esconde trampas, lobos y criaturas de hielo. Descansa un momento junto al fuego, pero no demasiado. Kryovar no espera a nadie.',
  'Anda, viajero. Que el fuego te acompane y que el hielo no te alcance. Cuando derrotes al dragon, vuelve y te servire la mejor sopa del norte.',
];

const HouseMixin = {
  // Exterior: cabana de troncos con tejado nevado, chimenea con humo, ventanas encendidas y la puerta
  buildHouse({ x }) {
    const base = 384;
    const g = this.add.graphics().setDepth(-1.5);
    g.fillStyle(0x7a4a2a, 1).fillRect(x - 130, base - 130, 260, 130);
    for (let y = base - 116; y < base; y += 14) g.fillStyle(0x5c3720, 1).fillRect(x - 130, y, 260, 2);
    g.fillStyle(0x4a2c18, 1).fillRect(x - 138, base - 134, 12, 134).fillRect(x + 126, base - 134, 12, 134);
    // chimenea (detras del tejado)
    g.fillStyle(0x6a6a78, 1).fillRect(x + 78, base - 214, 30, 90);
    g.fillStyle(0x4a4a58, 1).fillRect(x + 78, base - 214, 6, 90);
    g.fillStyle(0xf2f6ff, 1).fillRect(x + 74, base - 220, 38, 10);
    // tejado: tejas marrones con una capa gruesa de nieve
    g.fillStyle(0x5a3a2a, 1).fillTriangle(x - 172, base - 126, x, base - 208, x + 172, base - 126);
    g.fillStyle(0x3e281c, 1).fillRect(x - 172, base - 130, 344, 6);
    g.fillStyle(0xf2f6ff, 1).fillTriangle(x - 158, base - 136, x, base - 208, x + 158, base - 136);
    g.fillStyle(0xdfe6f6, 1).fillTriangle(x - 120, base - 136, x, base - 190, x + 120, base - 136);
    for (let i = -6; i <= 6; i++) g.fillStyle(0xf2f6ff, 1).fillCircle(x + i * 26, base - 124, 9);   // nieve que cuelga del alero
    // ventanas con luz calida
    [-86, 66].forEach((wx) => {
      g.fillStyle(0x3a2412, 1).fillRect(x + wx - 4, base - 100, 44, 46);
      g.fillStyle(0xffc860, 1).fillRect(x + wx, base - 96, 36, 38);
      g.fillStyle(0x3a2412, 1).fillRect(x + wx + 16, base - 96, 4, 38).fillRect(x + wx, base - 79, 36, 4);
      g.fillStyle(0xf2f6ff, 1).fillRect(x + wx - 6, base - 54, 48, 6);
    });
    // puerta
    g.fillStyle(0x3a2412, 1).fillRect(x - 24, base - 76, 48, 76);
    g.fillStyle(0x6a3f20, 1).fillRect(x - 20, base - 72, 40, 72);
    g.fillStyle(0x50301a, 1).fillRect(x - 1, base - 72, 2, 72);
    g.fillStyle(0xffd84a, 1).fillCircle(x + 12, base - 36, 3);
    g.fillStyle(0xf2f6ff, 1).fillEllipse(x, base - 1, 70, 12);                   // nieve acumulada ante la puerta
    // nieve en la base y brillo calido sobre la nieve
    g.fillStyle(0xf2f6ff, 1).fillEllipse(x - 130, base, 70, 18).fillEllipse(x + 130, base, 70, 18);
    this.add.ellipse(x, base - 2, 170, 22, 0xffc860, 0.2).setDepth(-1.4).setBlendMode(Phaser.BlendModes.ADD);

    // humo de la chimenea
    this.add.particles(x + 93, base - 222, 'mote', {
      speedY: { min: -34, max: -18 }, speedX: { min: -6, max: 14 }, lifespan: { min: 2200, max: 3400 }, frequency: 260,
      scale: { start: 1.4, end: 4 }, alpha: { start: 0.45, end: 0 }, tint: [0xd8dce8, 0xb8bccb],
    }).setDepth(-1.6);

    const prompt = this.add.text(x, base - 150, 'Enter: entrar', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8).setVisible(false);
    this.tweens.add({ targets: prompt, y: prompt.y - 5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.house = { x, prompt };
  },

  updateHouse(dt) {
    const h = this.house;
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
    this.houseCd = Math.max(0, this.houseCd - dt);
    const near = Math.abs(this.stickman.x - h.x) < HOUSE_DOOR_RANGE && this.grounded;
    h.prompt.setVisible(near);
    if (near && pressed && this.houseCd <= 0) this.enterHouse();
  },

  enterHouse() {
    this.cutscene = { lift: false, anchor: null, attach: [], rays: [] };   // el jugador queda quieto mientras dura la visita
    this.attackTime = 0; this.dashTime = 0; this.knockVx = 0; this.strike = null;
    this.house.prompt.setVisible(false);
    this.sfx('step', 0.6, 0.5);
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.buildInterior();
      cam.fadeIn(300, 0, 0, 0);
      this.time.delayedCall(500, () => this.startDialogue());
    });
  },

  // Interior (todo fijo a la pantalla, por encima del mundo): paredes de madera, ventana con nieve, cuadro del dragon,
  // chimenea encendida, alfombra, el anciano y el viajero
  buildInterior() {
    const objs = this.interior = [];
    const put = (o, depth = 60) => { o.setScrollFactor(0).setDepth(depth); objs.push(o); return o; };
    const FLOOR = 306;
    const g = put(this.add.graphics());
    g.fillStyle(0x4a3524, 1).fillRect(0, 0, WIDTH, FLOOR);
    for (let x = 0; x < WIDTH; x += 40) g.fillStyle(0x3e2c1d, 1).fillRect(x, 0, 3, FLOOR);
    g.fillStyle(0x6b4a2e, 1).fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    for (let y = FLOOR + 22; y < HEIGHT; y += 24) g.fillStyle(0x553a24, 1).fillRect(0, y, WIDTH, 3);
    g.fillStyle(0x2a1a10, 1).fillRect(0, FLOOR - 6, WIDTH, 8);
    g.fillStyle(0x7a2a2a, 1).fillEllipse(400, 352, 440, 44);                              // alfombra
    g.fillStyle(0x9a3a36, 1).fillEllipse(400, 352, 380, 32);
    // ventana con noche nevada
    g.fillStyle(0x2a1a10, 1).fillRect(66, 60, 124, 112);
    g.fillStyle(0x16213e, 1).fillRect(72, 66, 112, 100);
    g.fillStyle(0x2a1a10, 1).fillRect(125, 66, 6, 100).fillRect(72, 112, 112, 6);
    g.fillStyle(0xfff3c4, 1).fillCircle(98, 90, 8);
    g.fillStyle(0xf2f6ff, 1).fillRect(60, 170, 136, 8);
    for (let i = 0; i < 14; i++) {
      const f = put(this.add.rectangle(Phaser.Math.Between(76, 180), Phaser.Math.Between(70, 160), 3, 3, 0xffffff, 0.9), 61);
      this.tweens.add({ targets: f, y: 164, duration: Phaser.Math.Between(1400, 2600), repeat: -1, delay: Phaser.Math.Between(0, 1500),
        onRepeat: () => { f.y = 68; f.x = Phaser.Math.Between(76, 180); } });
    }
    // cuadro del dragon sobre la repisa
    g.fillStyle(0x2a1a10, 1).fillRect(300, 54, 150, 106);
    g.fillStyle(0x16304e, 1).fillRect(307, 61, 136, 92);
    g.fillStyle(0xcfe4ff, 1).fillPoints([
      { x: 322, y: 130 }, { x: 345, y: 108 }, { x: 352, y: 92 }, { x: 370, y: 78 }, { x: 392, y: 74 }, { x: 414, y: 82 }, { x: 424, y: 78 },
      { x: 420, y: 92 }, { x: 402, y: 98 }, { x: 392, y: 110 }, { x: 398, y: 126 }, { x: 380, y: 134 }, { x: 360, y: 124 }, { x: 340, y: 138 },
    ], true);
    g.fillStyle(0xcfe4ff, 1).fillTriangle(352, 100, 340, 66, 378, 90).fillTriangle(372, 96, 372, 64, 400, 86);   // alas
    g.fillStyle(0x9fd0ff, 1).fillRect(418, 83, 3, 3);
    // chimenea
    g.fillStyle(0x6a6a78, 1).fillRect(580, 130, 170, 176);
    g.fillStyle(0x84849a, 1).fillRect(572, 122, 186, 14);
    g.fillStyle(0x1a1010, 1).fillRect(612, 190, 106, 116);
    for (let y = 150; y < 300; y += 22) g.fillStyle(0x56566a, 1).fillRect(580, y, 170, 2);
    const glow = put(this.add.ellipse(665, 318, 260, 46, 0xff8a1e, 0.25).setBlendMode(Phaser.BlendModes.ADD), 61);
    this.tweens.add({ targets: glow, alpha: 0.12, scaleX: 1.08, duration: 420, yoyo: true, repeat: -1 });
    [[640, 1.1], [665, 1.5], [692, 1.0]].forEach(([fx, sc], i) => {
      const flame = put(this.add.image(fx, 304, 'fire_flame').setOrigin(0.5, 1).setScale(sc), 62);
      this.tweens.add({ targets: flame, scaleY: { from: sc * 0.75, to: sc * 1.15 }, scaleX: { from: sc * 1.1, to: sc * 0.85 }, duration: 170 + i * 50, yoyo: true, repeat: -1 });
    });
    put(this.add.particles(665, 270, 'mote', {
      x: { min: -30, max: 30 }, speedY: { min: -90, max: -40 }, lifespan: 700, frequency: 70,
      scale: { start: 1.4, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xff4a1a, 0xff8a1e, 0xffd23a], blendMode: 'ADD',
    }), 63);
    // los dos personajes: el anciano junto al fuego y el viajero enfrente
    this.createAnim({ key: 'elder_idle', frames: this.anims.generateFrameNumbers('npc_elder', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
    put(this.add.sprite(520, FLOOR + 38, 'npc_elder', 0).setOrigin(0.5, 31 / 32).setScale(5.4).setFlipX(true).play('elder_idle'), 64);
    put(this.add.sprite(270, FLOOR + 38, 'stickman_idle', 0).setOrigin(0.5, 31 / 32).setScale(5.4).play('idle'), 64);
    put(this.add.text(16, 12, 'Cabana de Thorvald', { fontFamily: 'monospace', fontSize: '14px', color: '#e8d8b8', stroke: '#000000', strokeThickness: 3 }), 65);
  },

  startDialogue() {
    const put = (o, depth = 70) => { o.setScrollFactor(0).setDepth(depth); this.interior.push(o); return o; };
    const box = put(this.add.graphics());
    box.fillStyle(0x16213e, 0.96).fillRoundedRect(24, 326, 752, 112, 10);
    box.lineStyle(3, 0xc9d6f5, 1).strokeRoundedRect(24, 326, 752, 112, 10);
    box.fillStyle(0x16213e, 1).fillRoundedRect(40, 310, 130, 26, 8).lineStyle(3, 0xc9d6f5, 1).strokeRoundedRect(40, 310, 130, 26, 8);
    put(this.add.text(105, 323, HOUSE_SPEAKER, { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffd84a' }).setOrigin(0.5), 71);
    const text = put(this.add.text(44, 346, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#f4f6ff', wordWrap: { width: 712 }, lineSpacing: 6,
    }), 71);
    const count = put(this.add.text(756, 424, '', { fontFamily: 'monospace', fontSize: '12px', color: '#6f7a99' }).setOrigin(1, 1), 71);
    const hint = put(this.add.text(44, 424, 'Enter / clic', { fontFamily: 'monospace', fontSize: '12px', color: '#9fb0d8' }).setOrigin(0, 1), 71);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    const d = this.dialog = { i: 0, typing: false, full: '', n: 0, ev: null, text, count };
    const showPage = () => {
      d.full = HOUSE_PAGES[d.i];
      d.n = 0;
      d.typing = true;
      text.setText('');
      count.setText(`${d.i + 1}/${HOUSE_PAGES.length}`);
      d.ev?.remove();
      d.ev = this.time.addEvent({
        delay: 18, repeat: d.full.length - 1,
        callback: () => {
          text.setText(d.full.slice(0, ++d.n));
          if (d.n % 3 === 0) this.sfx('step', 0.08, 1.8);
          if (d.n >= d.full.length) d.typing = false;
        },
      });
    };
    const advance = () => {
      if (!this.dialog || this.leavingHouse) return;
      Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
      if (d.typing) {                      // primera pulsacion: completa la pagina
        d.ev?.remove();
        text.setText(d.full);
        d.typing = false;
      } else if (d.i < HOUSE_PAGES.length - 1) {
        d.i++;
        this.sfx('ready', 0.25, 1.3);
        showPage();
      } else {
        this.leaveHouse();
      }
    };
    this.input.keyboard.on('keydown-ENTER', advance);
    this.input.keyboard.on('keydown-SPACE', advance);
    this.input.on('pointerdown', advance);
    d.off = () => {
      this.input.keyboard.off('keydown-ENTER', advance);
      this.input.keyboard.off('keydown-SPACE', advance);
      this.input.off('pointerdown', advance);
    };
    showPage();
  },

  leaveHouse() {
    this.leavingHouse = true;
    this.dialog.off();
    this.dialog.ev?.remove();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.interior.forEach((o) => o.destroy());
      this.interior = null;
      this.dialog = null;
      this.cutscene = null;
      this.leavingHouse = false;
      this.houseCd = 0.6;
      this.clickAttack = false;
      Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
      cam.fadeIn(300, 0, 0, 0);
    });
  },
};
