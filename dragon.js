// Jefe final (nivel 20): Kryovar, el Dragon de Hielo. Misma interfaz que Boss / SandWorm (x, y, alive, state, overlapsStrike, hurt, burn, update).
//
// El jugador NO puede danarlo siempre: solo cuando se posa a descansar (estado 'exposed'), con el Corazon de Escarcha brillando en su pecho.
// El resto del tiempo el pecho esta cubierto por placas de hielo y los golpes rebotan. El combate tiene 3 fases (por vida restante):
//  - Aliento: baja la cabeza y lanza ondas de hielo por el suelo (salta o haz dash).
//  - Lanzas: vuela, bate las alas y llueven lanzas de hielo sobre zonas marcadas en el suelo.
//  - Columnas (desde la fase 2): el suelo marcado bajo el jugador revienta en columnas de hielo.
//  - Combo (fase 3): aliento y lanzas a la vez, todo mas rapido.
// Tras cada serie de ataques aterriza agotado: ahi hay una ventana para atacar (cada fase es mas corta).
// Al morir se libera de la maldicion: asciende convertido en luz y suelta el Corazon de Escarcha (ver EndingMixin al final).
// Esta dibujado con graphics (sin spritesheet) y siempre mira hacia la izquierda, donde esta el jugador.

const DRAGON_HP = 120;
const DRAGON_PHASE_HP = [80, 40];          // al bajar de estos valores empieza la fase 2 y la 3
const DRAGON_HIT_HALF_W = 115;             // zona donde se le puede golpear (centrada en x)
const DRAGON_WALL = 185;                   // el jugador no puede pasar de x - DRAGON_WALL
const DRAGON_OFFSCREEN = 600;              // altura desde la que desciende en la intro
const DRAGON_INTRO = 6.6;                  // duracion de la entrada (s)
const DRAGON_FLY = 125;                    // altura a la que vuela al llover lanzas
const DRAGON_ATTACKS = [2, 3, 3];          // ataques por serie, segun la fase
const DRAGON_OPEN = [5.2, 4.4, 3.6];       // segundos de ventana de ataque, segun la fase
const DRAGON_WAVE_SPEED = [290, 330, 370];
const DRAGON_SPEARS = [5, 7, 9];
const DRAGON_EYE = [0x66e0ff, 0xffe066, 0xff4466];

const DR = {
  body: 0x5a8fc4, bodyDark: 0x35608f, belly: 0xbfe0f5, wing: 0x7fb4e6, wingDark: 0x3f6ea4, bone: 0xe8f4ff,
  plate: 0x9bbfe0, plateEdge: 0xe6f4ff, crystal: 0x37b8ff, horn: 0xd9ecff,
};

class Dragon {
  constructor(scene, { x, trigger }) {
    this.scene = scene;
    this.x = x;
    this.y = scene.floorY;
    this.trigger = trigger;
    this.maxHp = DRAGON_HP;
    this.hp = DRAGON_HP;
    this.alive = true;
    this.ending = true;          // al caer lanza la cinematica final (ver onBossDefeated en main.js)
    this.phase = 1;
    this.state = 'dormant';
    this.timer = 0;
    this.fly = DRAGON_OFFSCREEN; // altura sobre el suelo (empieza fuera de pantalla: entra volando en la intro)
    this.flyTarget = 0;
    this.headDown = 0;           // 0 = cabeza alta, 1 = pegada al suelo
    this.headTarget = 0;
    this.mouth = 0;              // 0 = cerrada, 1 = abierta
    this.mouthTarget = 0;
    this.plate = 1;              // 1 = pecho cubierto por el hielo, 0 = descubierto
    this.plateTarget = 1;
    this.flap = 0;
    this.attacksLeft = DRAGON_ATTACKS[0];
    this.lastAttack = null;
    this.flashT = 0;
    this.fade = 1;
    this.waves = [];
    this.waveQueue = [];         // ondas pendientes: { t, speed }
    this.spears = [];
    this.columns = [];
    this.puff = 0;

    this.buildSprites();
    this.buildBar();
  }

  static preload(scene) {
    const sheet = (key, w, h) => scene.load.spritesheet(key, `assets/${key}.png`, { frameWidth: w, frameHeight: h });
    scene.load.audio('sfx_boss_theme', 'assets/sfx/boss_theme.wav');
    sheet('dragon_body', 64, 48);
    sheet('dragon_head', 40, 34);
    sheet('dragon_wing', 64, 64);
    sheet('dragon_plate', 16, 8);
    sheet('dragon_crystal', 8, 12);
    ['dragon_seg', 'dragon_tip', 'ice_wave', 'ice_spear'].forEach((key) => scene.load.image(key, `assets/${key}.png`));
  }

  // Pixel art (tools/make_dragon_sprite.py) a escala x4, montado por piezas: alas, cola, cuerpo, cuello, pecho y cabeza
  buildSprites() {
    const s = this.scene;
    s.buildSkillTextures();
    s.buildAmuletTextures();   // trae 'fx_glow'
    const ADD = Phaser.BlendModes.ADD;
    const spr = (key, frame, depth) => s.add.sprite(0, 0, key, frame).setScale(4).setDepth(depth);
    this.farWing = spr('dragon_wing', 0, 0.48).setOrigin(10 / 64, 50 / 64);
    this.tailSegs = Array.from({ length: 10 }, () => s.add.image(0, 0, 'dragon_seg').setDepth(0.49));
    this.tailTip = spr('dragon_tip', 0, 0.49).setOrigin(0, 0.5);
    this.bodySpr = spr('dragon_body', 0, 0.5).setOrigin(0.5, 1);
    this.neckSegs = Array.from({ length: 10 }, () => s.add.image(0, 0, 'dragon_seg').setDepth(0.51));
    this.crystal = spr('dragon_crystal', 0, 0.52);
    this.plateTop = spr('dragon_plate', 0, 0.54).setOrigin(0.5, 1);
    this.plateBot = spr('dragon_plate', 1, 0.54).setOrigin(0.5, 0);
    this.nearWing = spr('dragon_wing', 0, 0.55).setOrigin(10 / 64, 50 / 64);
    this.head = spr('dragon_head', 0, 0.56).setOrigin(26 / 40, 12 / 34);
    this.crystalGlow = s.add.image(0, 0, 'fx_glow').setBlendMode(ADD).setTint(0x4ab8ff).setDepth(0.53);
    this.eyeGlow = s.add.image(0, 0, 'fx_glow').setBlendMode(ADD).setDepth(0.57).setScale(0.22);
    this.parts = [this.farWing, ...this.tailSegs, this.tailTip, this.bodySpr, ...this.neckSegs, this.crystal, this.plateTop, this.plateBot, this.nearWing, this.head];
    this.glows = [this.crystalGlow, this.eyeGlow];
  }

  buildBar() {
    const s = this.scene;
    this.barW = 400;
    this.barBox = s.add.graphics().setScrollFactor(0).setDepth(20).setVisible(false);
    this.barName = s.add.text(WIDTH / 2, 14, 'KRYOVAR - DRAGON DE HIELO', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#d8f0ff', stroke: '#06142a', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20).setVisible(false);
  }

  drawBar() {
    const g = this.barBox;
    const x = (WIDTH - this.barW) / 2;
    g.clear().setVisible(true);
    this.barName.setVisible(true);
    g.fillStyle(0x000000, 0.8).fillRect(x - 3, 36, this.barW + 6, 16);
    g.fillStyle(0x0b2040, 1).fillRect(x, 39, this.barW, 10);
    g.fillStyle([0x4ab8ff, 0xffd23a, 0xff4a66][this.phase - 1], 1).fillRect(x, 39, this.barW * Math.max(0, this.hp) / this.maxHp, 10);
    DRAGON_PHASE_HP.forEach((hp) => g.fillStyle(0xffffff, 0.8).fillRect(x + this.barW * hp / this.maxHp - 1, 36, 2, 16));   // marcas de fase
  }

  // ---- interfaz con los golpes del jugador ----

  get vulnerable() { return this.alive && this.state === 'exposed' && this.plate < 0.2; }

  // Se le puede alcanzar solo si esta a ras de suelo (aunque el golpe rebote si no esta vulnerable)
  overlapsStrike(left, right) {
    if (!this.alive || this.state === 'dormant' || this.fly > 40) return false;
    return this.x + DRAGON_HIT_HALF_W > left && this.x - DRAGON_HIT_HALF_W < right;
  }

  hurt(damage) {
    const scene = this.scene;
    if (!this.vulnerable) {   // el hielo del pecho lo protege
      scene.sfx('clang', 0.7, 1.1);
      scene.sparksAt(this.x - 60, this.y - 115, 8, [0xffffff, 0x9fd8ff], [60, 220], 300, 4);
      return false;
    }
    this.hp -= damage;
    scene.sfx('hit', 0.9, Phaser.Math.FloatBetween(0.5, 0.7));
    scene.cameras.main.shake(70, 0.004);
    this.flashT = 0.08;
    scene.sparksAt(this.x - 60, this.y - 115, 10, [0xffffff, 0x4ab8ff], [80, 260], 400, 4);
    this.drawBar();
    if (this.hp <= 0) { this.die(); return true; }
    const nextPhase = this.phase === 1 && this.hp <= DRAGON_PHASE_HP[0] ? 2 : this.phase === 2 && this.hp <= DRAGON_PHASE_HP[1] ? 3 : 0;
    if (nextPhase) this.enrage(nextPhase);
    return false;
  }

  burn() {}   // el hielo no arde: la quemadura no le hace nada

  // ---- maquina de estados ----

  update(dt, time) {
    if (this.state === 'dead') return;
    if (this.state === 'dying') { this.updateDying(dt, time); return; }
    if (!this.alive) return;
    const scene = this.scene;
    const p = scene.stickman;
    p.x = Math.min(p.x, this.x - DRAGON_WALL);   // el dragon ocupa ese lado de la arena
    this.timer -= dt;
    this.flashT = Math.max(0, this.flashT - dt);

    switch (this.state) {
      case 'dormant':
        if (p.x > this.trigger) this.intro();
        break;
      case 'intro':
        this.updateIntro(dt, time);
        break;
      case 'enrage':
        scene.cameras.main.shake(40, 0.006);
        if (this.timer <= 0) { this.attacksLeft = DRAGON_ATTACKS[this.phase - 1]; this.next(); }
        break;
      case 'breathWind':
        this.mist(time, 0.04);
        if (this.timer <= 0) this.breathFire();
        break;
      case 'breathFire':
        this.fireQueued(dt);
        if (this.timer <= 0) this.next();
        break;
      case 'spearWind':
        if (this.timer <= 0) this.spearRain();
        break;
      case 'spearRain':
        this.fireQueued(dt);
        if (this.timer <= 0) this.next();
        break;
      case 'eruptWind':
        if (this.timer <= 0) { this.state = 'eruptWait'; this.timer = 1.1; }
        break;
      case 'eruptWait':
        if (this.timer <= 0) this.next();
        break;
      case 'land':   // desciende agotado
        if (this.fly <= 4) {
          this.state = 'exposed';
          this.timer = DRAGON_OPEN[this.phase - 1];
          this.plateTarget = 0;
          scene.sfx('land', 1, 0.4);
          scene.cameras.main.shake(300, 0.012);
          scene.sparksAt(this.x - 120, this.y - 6, 18, [0xffffff, 0x9fd8ff], [80, 280], 500, 4);
        }
        break;
      case 'exposed':
        this.mist(time, 0.15);
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.7; this.plateTarget = 1; scene.sfx('alert', 0.7, 0.5); }
        break;
      case 'recover':
        if (this.timer <= 0) { this.attacksLeft = DRAGON_ATTACKS[this.phase - 1]; this.next(); }
        break;
    }

    // el cuerpo se mueve suavemente hacia sus objetivos
    this.fly += Math.sign(this.flyTarget - this.fly) * Math.min(Math.abs(this.flyTarget - this.fly), 260 * dt);
    this.headDown += Math.sign(this.headTarget - this.headDown) * Math.min(Math.abs(this.headTarget - this.headDown), 2.2 * dt);
    this.mouth += Math.sign(this.mouthTarget - this.mouth) * Math.min(Math.abs(this.mouthTarget - this.mouth), 3 * dt);
    this.plate += Math.sign(this.plateTarget - this.plate) * Math.min(Math.abs(this.plateTarget - this.plate), 2.5 * dt);
    this.flap = this.fly > 20 || this.state === 'spearWind' ? time / (this.state === 'intro' ? 65 : 110) : this.flap;

    this.updateHazards(dt, time);
    this.draw(time);
  }

  // Entrada epica: el viajero queda quieto, bajan las franjas negras, el cielo se oscurece y Kryovar desciende rugiendo entre la
  // ventisca; al aterrizar tiembla todo, empieza la musica y aparece su nombre.
  intro() {
    const s = this.scene;
    const ADD = Phaser.BlendModes.ADD;
    this.state = 'intro';
    this.timer = DRAGON_INTRO;
    this.introLanded = false;
    this.introRoared = false;
    this.flyTarget = DRAGON_OFFSCREEN;
    this.mouthTarget = 0.3;
    s.cutscene = { lift: false, anchor: null, attach: [], rays: [], keepBoss: true };
    s.attackTime = 0; s.dashTime = 0; s.knockVx = 0; s.strike = null;
    s.stickman.setFlipX(false);
    const at = (ms, fn) => s.time.delayedCall(ms, fn);
    this.introObjs = [];
    const keep = (o) => { this.introObjs.push(o); return o; };
    const bar = (y, oy) => keep(s.add.rectangle(0, y, WIDTH, 52, 0x000000, 1).setOrigin(0, oy).setScrollFactor(0).setDepth(45).setScale(1, 0));
    const top = bar(0, 0);
    const bottom = bar(HEIGHT, 1);
    s.tweens.add({ targets: [top, bottom], scaleY: 1, duration: 700, ease: 'Sine.easeOut' });
    this.dim = keep(s.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02040e, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(5.9).setAlpha(0));
    s.tweens.add({ targets: this.dim, alpha: 0.5, duration: 1600 });
    this.shadow = keep(s.add.ellipse(this.x + 20, this.y + 2, 40, 6, 0x000000, 0).setDepth(-0.4));
    this.introBars = [top, bottom];
    at(300, () => { s.sfx('roar', 0.5, 1.3); s.cameras.main.shake(2200, 0.0035); });   // rugido lejano: algo se acerca

    // titulo
    const text = (y, str, size, color, stroke) => keep(s.add.text(WIDTH / 2, y, str, {
      fontFamily: 'monospace', fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center', stroke, strokeThickness: Math.round(size / 5),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(46).setAlpha(0));
    const title = text(HEIGHT / 2 - 40, 'K R Y O V A R', 54, '#e6f6ff', '#06142a');
    const sub = text(HEIGHT / 2 + 14, 'EL DRAGON DE HIELO', 20, '#9fd8ff', '#06142a');
    at(4000, () => {
      title.setScale(1.5);
      s.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 500, ease: 'Back.easeOut' });
      s.tweens.add({ targets: sub, alpha: 1, delay: 500, duration: 600 });
      s.sfx('alert', 0.9, 0.3);
    });
    at(6000, () => s.tweens.add({ targets: [title, sub], alpha: 0, duration: 500 }));
    this.drawBar();
    this.barBox.setVisible(false); this.barName.setVisible(false);   // la barra aparece al terminar la entrada
    this.introUI = { ring: (x, y, tint, to, dur) => {
      const r = s.add.image(x, y, 'fx_ring').setDepth(36).setBlendMode(ADD).setTint(tint).setScale(0.3).setAlpha(0.9);
      s.tweens.add({ targets: r, scale: to, alpha: 0, duration: dur, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    } };
  }

  updateIntro(dt, time) {
    const s = this.scene;
    const e = DRAGON_INTRO - this.timer;
    // 0.8 - 3.0 s: desciende en picado; el aleteo levanta nieve
    if (e < 3 && e > 0.8) {
      const k = Phaser.Math.Easing.Quadratic.In((e - 0.8) / 2.2);
      this.fly = Phaser.Math.Linear(DRAGON_OFFSCREEN, 0, k);
      this.flap = time / 65;
      this.shadow.setSize(Phaser.Math.Linear(40, 330, k), Phaser.Math.Linear(6, 34, k)).setFillStyle(0x000000, 0.45 * k);
      if (Math.random() < 0.5) s.sparksAt(this.x + Phaser.Math.Between(-150, 150), this.y - 20, 3, [0xffffff, 0xcfe8ff], [60, 220], 700, 6);
    }
    if (e >= 3 && !this.introLanded) {    // impacto
      this.introLanded = true;
      this.fly = 0;
      this.headTarget = 0;
      this.shadow.setFillStyle(0x000000, 0.3);
      s.sfx('land', 1, 0.3);
      s.sfx('hit', 1, 0.4);
      s.cameras.main.shake(1000, 0.02);
      s.cameras.main.flash(500, 220, 240, 255, true);
      s.sparksAt(this.x - 60, this.y - 6, 90, [0xffffff, 0xcfe8ff, 0x9fd8ff], [120, 520], 1100, 6);
      this.introUI.ring(this.x - 60, this.y - 10, 0x9fd8ff, 9, 900);
      this.introUI.ring(this.x - 60, this.y - 10, 0xffffff, 6, 650);
      s.tweens.add({ targets: this.dim, alpha: 0.25, duration: 900 });
      this.startMusic();
    }
    if (e >= 3 && e < 3.6) this.mouthTarget = 0;
    if (e >= 3.6 && !this.introRoared) {  // rugido de desafio
      this.introRoared = true;
      this.mouthTarget = 1;
      s.sfx('roar', 1);
      s.cameras.main.shake(1500, 0.01);
      this.introUI.ring(this.x - 180, this.y - 200, 0xcfe8ff, 10, 1300);
    }
    if (e >= 3.6 && e < 6) s.sparksAt(this.x - 215 + Phaser.Math.Between(-20, 20), this.y - 120, 2, [0xffffff, 0x9fd8ff], [60, 220], 500, 6);
    this.flyTarget = this.fly;            // la entrada mueve al dragon a mano: el suavizado general no debe tirar de el
    if (this.timer <= 0) {                // fin de la entrada: se devuelve el control
      s.tweens.add({ targets: this.introBars, scaleY: 0, duration: 600, ease: 'Sine.easeIn' });
      s.tweens.add({ targets: this.dim, alpha: 0, duration: 600 });
      s.time.delayedCall(700, () => this.introObjs.forEach((o) => o.destroy()));
      s.cutscene = null;
      this.shadow.setFillStyle(0x000000, 0);
      this.drawBar();
      this.mouthTarget = 0;
      this.next();
    }
  }

  // ---- musica de la pelea (assets/sfx/boss_theme.wav, bucle) ----

  startMusic() {
    const s = this.scene;
    this.music = s.sound.add('sfx_boss_theme', { loop: true, volume: 0 });
    this.music.play();
    s.tweens.add({ targets: this.music, volume: 0.5 * SFX_VOLUME, duration: 1200 });
    s.events.once('shutdown', () => this.killMusic());
  }

  stopMusic(ms = 1500) {
    if (!this.music) return;
    const m = this.music;
    this.music = null;
    this.scene.tweens.add({ targets: m, volume: 0, duration: ms, onComplete: () => { m.stop(); m.destroy(); } });
  }

  killMusic() {
    if (!this.music) return;
    this.music.stop();
    this.music.destroy();
    this.music = null;
  }

  // Cambio de fase: ruge, se vuelve invulnerable y limpia los peligros
  enrage(n) {
    this.phase = n;
    this.state = 'enrage';
    this.timer = 2.2;
    this.plateTarget = 1;
    this.flyTarget = 0;
    this.headTarget = 0;
    this.mouthTarget = 1;
    this.clearHazards();
    this.scene.sfx('roar', 1, n === 3 ? 0.8 : 1);
    this.music?.setRate(n === 3 ? 1.1 : 1.03);   // la musica se acelera con cada fase
    this.scene.cameras.main.shake(900, 0.012);
    this.scene.cameras.main.flash(500, 120, 170, 255, true);
    this.drawBar();
  }

  next() {
    this.mouthTarget = 0;
    this.headTarget = 0;
    if (this.attacksLeft <= 0) { this.rest(); return; }
    this.attacksLeft--;
    const pool = [['breath', 'spears'], ['breath', 'spears', 'erupt'], ['combo', 'breath', 'erupt', 'spears']][this.phase - 1]
      .filter((a) => a !== this.lastAttack);
    const attack = Phaser.Utils.Array.GetRandom(pool);
    this.lastAttack = attack;
    if (attack === 'breath') this.breathWind();
    else if (attack === 'erupt') this.eruptWind();
    else this.spearWind(attack === 'combo');
  }

  rest() {
    this.state = 'land';
    this.flyTarget = 0;
    this.headTarget = 0.85;   // agotado: la cabeza cae
    this.mouthTarget = 0.35;
    this.lastAttack = null;
  }

  // ---- ataques ----

  breathWind() {
    this.state = 'breathWind';
    this.timer = [1.05, 0.9, 0.75][this.phase - 1];
    this.flyTarget = 0;
    this.headTarget = 0.9;
    this.mouthTarget = 1;
    this.scene.sfx('alert', 0.7, 0.5);
  }

  breathFire() {
    this.state = 'breathFire';
    this.timer = (this.phase - 1) * 0.55 + 0.9;
    this.queueWaves();
  }

  // una onda por fase, escalonadas y cada vez mas rapidas
  queueWaves() {
    const n = this.phase;
    for (let i = 0; i < n; i++) this.waveQueue.push({ t: i * 0.55, speed: DRAGON_WAVE_SPEED[n - 1] + i * 25 });
    this.scene.sfx('flame', 0.7, 0.6);
  }

  spearWind(combo = false) {
    this.state = 'spearWind';
    this.combo = combo;
    this.timer = [1.0, 0.85, 0.7][this.phase - 1];
    this.flyTarget = DRAGON_FLY;
    this.headTarget = 0;
    this.mouthTarget = 0.6;
    this.scene.sfx('alert', 0.7, 0.4);
  }

  // Marca el suelo y, tras el aviso, caen las lanzas
  spearRain() {
    const s = this.scene;
    const p = s.stickman;
    const n = DRAGON_SPEARS[this.phase - 1];
    const stagger = [0.28, 0.22, 0.17][this.phase - 1];
    const warn = [0.95, 0.85, 0.7][this.phase - 1];
    const xs = [p.x];
    let guard = 0;
    while (xs.length < n && guard++ < 80) {
      const x = Phaser.Math.Clamp(p.x + Phaser.Math.Between(-320, 320), 60, this.x - DRAGON_WALL);
      if (xs.every((o) => Math.abs(o - x) > 50)) xs.push(x);
    }
    Phaser.Utils.Array.Shuffle(xs).forEach((x, i) => {
      const mark = s.add.ellipse(x, this.y + 2, 64, 12, 0x9fd8ff, 0.7).setDepth(-0.5);
      s.tweens.add({ targets: mark, alpha: 0.2, duration: 110, yoyo: true, repeat: -1 });
      this.spears.push({ x, mark, wait: warn + i * stagger, img: null, life: 0 });
    });
    this.state = 'spearRain';
    this.timer = warn + n * stagger + 0.9;
    s.sfx('wave', 0.8, 0.5);
    if (this.combo) this.queueWaves();   // combo: el aliento sale mientras llueven las lanzas
  }

  eruptWind() {
    const s = this.scene;
    const p = s.stickman;
    this.state = 'eruptWind';
    this.flyTarget = 0;
    this.headTarget = 0.3;
    this.mouthTarget = 0.8;
    const offsets = this.phase === 2 ? [0, -140, 140] : [0, -110, 110, -220, 220];
    this.timer = 0.3;
    s.sfx('alert', 0.7, 0.45);
    offsets.forEach((o, i) => {
      const x = Phaser.Math.Clamp(p.x + o, 60, this.x - DRAGON_WALL);
      const mark = s.add.ellipse(x, this.y + 2, 80, 12, 0x9fd8ff, 0.7).setDepth(-0.5);
      s.tweens.add({ targets: mark, alpha: 0.2, duration: 100, yoyo: true, repeat: -1 });
      this.columns.push({ x, mark, wait: (this.phase === 2 ? 0.95 : 0.8) + i * 0.1, img: null, life: 0 });
    });
  }

  fireQueued(dt) {
    this.waveQueue = this.waveQueue.filter((w) => {
      w.t -= dt;
      if (w.t > 0) return true;
      const s = this.scene;
      const x = this.x - DRAGON_WALL + 10;   // sale justo bajo el hocico, donde esta el jugador mas cercano
      const img = s.add.image(x, this.y, 'ice_wave').setOrigin(0.5, 1).setDepth(3).setScale(3.6, 3.4);
      this.waves.push({ img, x, speed: w.speed, trail: 0 });
      s.sfx('flame', 0.5, 1.5);
      s.sparksAt(x, this.y - 30, 12, [0xffffff, 0x9fd8ff], [60, 240], 400, 4);
      return false;
    });
  }

  // vaho helado que sale de la boca
  mist(time, rate) {
    this.puff -= rate;
    if (this.puff > 0) return;
    this.puff = 1;
    const { hx, hy } = this.headPos();
    this.scene.sparksAt(this.x + hx - 58, this.y - this.fly + hy + 10, 2, [0xffffff, 0x9fd8ff], [20, 90], 500, 4);
  }

  clearHazards() {
    [...this.waves, ...this.spears, ...this.columns].forEach((h) => { h.img?.destroy(); h.mark?.destroy(); });
    this.waves = []; this.spears = []; this.columns = []; this.waveQueue = [];
  }

  updateHazards(dt, time) {
    const s = this.scene;
    const p = s.stickman;
    const grounded = (r) => p.y > this.y - r;

    this.waves = this.waves.filter((w) => {
      w.x -= w.speed * dt;
      w.img.x = w.x;
      w.trail -= dt;
      if (w.trail <= 0) { w.trail = 0.07; s.sparksAt(w.x, this.y - 20, 2, [0xffffff, 0x9fd8ff], [20, 90], 300, 4); }
      let done = w.x < -60;
      if (!done && Math.abs(p.x - w.x) < 26 && grounded(46)) s.takeHit(w.x, 1);   // salta o haz dash
      if (done) w.img.destroy();
      return !done;
    });

    this.spears = this.spears.filter((sp) => {
      if (!sp.img) {
        sp.wait -= dt;
        if (sp.wait > 0) return true;
        sp.mark.destroy();
        sp.img = s.add.image(sp.x, -60, 'ice_spear').setOrigin(0.5, 1).setDepth(4).setScale(4);
        sp.fall = true;
        return true;
      }
      if (sp.fall) {
        sp.img.y += 1150 * dt;
        if (sp.img.y >= this.y + 2) {
          sp.img.y = this.y + 2;
          sp.fall = false;
          sp.life = 0.55;
          s.sfx('hit', 0.4, 1.6);
          s.cameras.main.shake(70, 0.004);
          s.sparksAt(sp.x, this.y - 6, 12, [0xffffff, 0x9fd8ff], [60, 240], 400, 4);
          if (Math.abs(p.x - sp.x) < 28 && grounded(80)) s.takeHit(sp.x, 1);
        }
        return true;
      }
      sp.life -= dt;
      sp.img.setAlpha(Math.max(0, sp.life / 0.3));
      if (sp.life <= 0) { sp.img.destroy(); return false; }
      return true;
    });

    this.columns = this.columns.filter((c) => {
      if (!c.img) {
        c.wait -= dt;
        if (c.wait > 0) return true;
        c.mark.destroy();
        s.sfx('hit', 0.6, 0.9);
        s.cameras.main.shake(120, 0.006);
        c.img = s.add.image(c.x, this.y, 'ice_wave').setOrigin(0.5, 1).setDepth(3).setScale(6, 1.2);
        s.tweens.add({ targets: c.img, scaleY: 11.6, duration: 150, ease: 'Back.easeOut' });
        s.sparksAt(c.x, this.y - 10, 14, [0xffffff, 0x9fd8ff], [80, 300], 450, 4);
        if (Math.abs(p.x - c.x) < 40 && grounded(190)) s.takeHit(c.x, 1);
        c.life = 0.7;
        return true;
      }
      c.life -= dt;
      if (c.life < 0.3) c.img.setAlpha(Math.max(0, c.life / 0.3));
      if (c.life <= 0) { c.img.destroy(); return false; }
      return true;
    });
  }

  // ---- dibujo ----

  headPos() {
    return { hx: Phaser.Math.Linear(-165, -190, this.headDown), hy: Phaser.Math.Linear(-215, -62, this.headDown) };
  }

  // Coloca los sprites `segs` a lo largo de una curva cuadratica, con escala decreciente (cuello y cola)
  tube(segs, a, c, b, k0, k1) {
    segs.forEach((seg, i) => {
      const t = i / (segs.length - 1);
      seg.setPosition((1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1])
        .setScale(Math.round(Phaser.Math.Linear(k0, k1, t) * 2) / 2);
    });
  }

  // Frame del ala (de arriba a abajo) para el angulo `theta`
  static wingFrame(theta) { return Phaser.Math.Clamp(Math.round((theta - 0.2) / (1.5 / 7)), 0, 7); }

  draw(time) {
    const flash = this.flashT > 0;
    const gx = this.x;
    const gy = this.y - this.fly;
    const by = gy + (this.fly > 20 ? Math.sin(time / 260) * 6 : 0);
    const flying = this.fly > 20;
    const flapA = flying || this.state === 'spearWind' ? 0.5 + 0.55 * Math.sin(this.flap) : (this.state === 'intro' || this.state === 'enrage' ? 0.3 + 0.2 * Math.sin(time / 90) : 1.35);
    const { hx, hy } = this.headPos();

    this.farWing.setPosition(gx - 15, by - 175).setFrame(Dragon.wingFrame(flapA * 0.9 + 0.1));
    this.nearWing.setPosition(gx + 15, by - 175).setFrame(Dragon.wingFrame(flapA));
    this.bodySpr.setPosition(gx + 20, by).setFrame(flying ? 1 : 0);

    // cola con balanceo; la punta sigue el ultimo segmento
    const sway = Math.sin(time / 420) * 14;
    const tailEnd = [gx + 290, by - (flying ? 70 : 12) - sway * 0.6];
    this.tube(this.tailSegs, [gx + 90, by - 105], [gx + 190, by - 60 + sway], tailEnd, 5, 2);
    this.tailTip.setPosition(tailEnd[0] + 4, tailEnd[1]);

    // cuello hasta la cabeza
    const neckBase = [gx - 60, by - 150];
    const head = [gx + hx + 25, by + hy + 8];
    this.tube(this.neckSegs, neckBase, [(neckBase[0] + head[0]) / 2 - 25, Math.min(neckBase[1], head[1]) - 35], head, 5, 4);

    // pecho: el cristal brilla al abrirse las placas de hielo
    const cx = gx - 45;
    const cy = by - 112;
    const open = 1 - this.plate;
    const pulse = 0.5 + 0.5 * Math.sin(time / 200);
    this.crystal.setPosition(cx, cy).setVisible(open > 0.02);
    this.crystalGlow.setPosition(cx, cy).setVisible(open > 0.02).setScale(1.1 + pulse * 0.25).setAlpha((0.45 + 0.3 * pulse) * open);
    const off = open * 30;
    this.plateTop.setPosition(cx, cy - off).setVisible(this.plate > 0.02);
    this.plateBot.setPosition(cx, cy + off).setVisible(this.plate > 0.02);

    // cabeza
    this.head.setPosition(gx + hx, by + hy).setFrame(this.mouth < 0.25 ? 0 : this.mouth < 0.7 ? 1 : 2);
    this.eyeGlow.setPosition(gx + hx - 10, by + hy - 8).setTint(DRAGON_EYE[this.phase - 1]).setAlpha(0.7);

    // destello al recibir un golpe; cola y ala lejana mas oscuras para dar profundidad
    this.parts.forEach((p) => (flash ? p.setTintFill(0xffffff) : p.clearTint()));
    if (!flash) {
      this.farWing.setTint(0x9fb4d0);
      this.tailSegs.forEach((seg) => seg.setTint(0xb0c4de));
    }
  }

  setAlphaAll(a) {
    this.parts.forEach((p) => p.setAlpha(a));
    this.glows.forEach((g) => g.setAlpha(a));
  }

  // ---- muerte: se libera de la maldicion ----

  die() {
    const scene = this.scene;
    this.alive = false;
    this.state = 'dying';
    this.timer = 3.4;
    this.deathStage = 0;
    this.clearHazards();
    this.barBox.setVisible(false);
    this.barName.setVisible(false);
    this.flyTarget = 0;
    this.plateTarget = 0;
    this.headTarget = 0.2;
    this.mouthTarget = 1;
    this.puff = 0;
    scene.sfx('roar', 1, 0.7);
    scene.cameras.main.shake(3400, 0.008);
    this.stopMusic(2200);
  }

  updateDying(dt, time) {
    const scene = this.scene;
    this.timer -= dt;
    this.puff -= dt;
    this.plate += Math.sign(this.plateTarget - this.plate) * Math.min(Math.abs(this.plateTarget - this.plate), 2.5 * dt);
    this.headDown += Math.sign(this.headTarget - this.headDown) * Math.min(Math.abs(this.headTarget - this.headDown), 2.2 * dt);
    this.mouth += Math.sign(this.mouthTarget - this.mouth) * Math.min(Math.abs(this.mouthTarget - this.mouth), 3 * dt);
    this.fly += Math.sign(this.flyTarget - this.fly) * Math.min(Math.abs(this.flyTarget - this.fly), 260 * dt);
    this.flashT = Math.floor(time / 90) % 2 ? 0.05 : 0;
    this.draw(time);

    if (this.deathStage === 0) {
      // la luz del Corazon de Escarcha se desborda
      if (this.puff <= 0) {
        this.puff = 0.12;
        scene.sparksAt(this.x - 45 + Phaser.Math.Between(-60, 60), this.y - 115 + Phaser.Math.Between(-60, 60), 10, [0x4ab8ff, 0xffffff, 0xbfe8ff], [60, 260], 600, 6);
        scene.sfx('hit', 0.4, Phaser.Math.FloatBetween(0.5, 0.9));
      }
      if (this.timer <= 0) {
        // el Corazon sale volando del pecho y el dragon se vuelve luz
        this.deathStage = 1;
        this.timer = 3;
        scene.sfx('amulet_equip', 0.9, 0.8);
        scene.sparksAt(this.x - 45, this.y - 115, 60, [0x4ab8ff, 0xffffff, 0xbfe8ff], [120, 460], 900, 6);
        scene.cameras.main.flash(700, 190, 225, 255, true);
        this.heart = makeHeart(scene);
        this.heartPos = { x: this.x - 45, y: this.y - 115 };
        scene.tweens.add({ targets: this.heartPos, y: this.y - 270, x: this.x - 45, duration: 2600, ease: 'Sine.easeInOut' });
      }
    } else {
      const k = 1 - Math.max(0, this.timer) / 3;
      this.fly += 55 * dt;                                    // asciende
      this.setAlphaAll(Math.max(0, 1 - k * 1.05));
      if (this.puff <= 0) {
        this.puff = 0.06;
        scene.sparksAt(this.x + Phaser.Math.Between(-130, 130), this.y - this.fly - Phaser.Math.Between(20, 230), 4, [0xffffff, 0xbfe8ff, 0xfff2b0], [10, 90], 1100, 6);
      }
      updateHeart(this.heart, this.heartPos.x, this.heartPos.y, time, 0);
      if (this.timer <= 0) {
        this.state = 'dead';
        [...this.parts, ...this.glows].forEach((o) => o.destroy());
        scene.heart = { h: this.heart, pos: this.heartPos };
        scene.onBossDefeated();
      }
    }
  }
}

// Corazon de Escarcha: el cristal del pecho con brillo. `t` pasa de 0 (azul, maldito) a 1 (dorado, liberado).
function makeHeart(scene, depth = 7) {
  return {
    glow: scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(depth - 0.1),
    blue: scene.add.sprite(0, 0, 'dragon_crystal', 0).setDepth(depth),
    gold: scene.add.sprite(0, 0, 'dragon_crystal', 1).setDepth(depth).setAlpha(0),
  };
}

function updateHeart(h, x, y, time, t, size = 1) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  h.blue.setPosition(x, y).setScale(5 * size).setAlpha(1 - t);
  h.gold.setPosition(x, y).setScale(5 * size).setAlpha(t);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(0x37, 0xb8, 0xff), new Phaser.Display.Color(0xff, 0xe0, 0x7a), 100, t * 100);
  h.glow.setPosition(x, y).setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).setScale((1.5 + 0.25 * pulse) * size).setAlpha(0.55 + 0.2 * pulse);
}

// Final del juego: la maldicion se rompe. Se anade a LevelScene con Object.assign (ver main.js).
const EndingMixin = {
  playEnding() {
    this.buildSkillTextures();
    this.buildAmuletTextures();
    const cam = this.cameras.main;
    const s = this.stickman;
    const ADD = Phaser.BlendModes.ADD;
    const at = (ms, fn) => this.time.delayedCall(ms, fn);
    const { h: heartObj, pos } = this.heart;
    const hx = pos.x;
    const floorY = this.floorY;

    this.bossDown = true;
    this.attackTime = 0; this.dashTime = 0; this.knockVx = 0; this.strike = null; this.invuln = 0;
    s.setAlpha(1).clearTint().setOrigin(0.5, 31 / 32).setFlipX(false);
    this.cutscene = { lift: false, anchor: null, attach: [], rays: [] };
    this.ending = { calm: 0 };   // 0 = nevando, 1 = la nieve ha cesado (ver snow.js)
    cam.stopFollow();
    cam.pan(Phaser.Math.Clamp(hx, WIDTH / 2, this.worldWidth - WIDTH / 2), floorY - 140, 1400, 'Sine.easeInOut');

    // el viajero camina hasta ponerse bajo el Corazon
    const runTo = Phaser.Math.Clamp(hx - 160, 80, this.worldWidth - 200);
    s.setFlipX(runTo < s.x);
    s.anims.play('run', true);
    this.tweens.add({
      targets: s, x: runTo, duration: Math.abs(runTo - s.x) * 4 + 200, ease: 'Linear',
      onComplete: () => { s.anims.play('idle', true); s.setFlipX(false); },
    });

    // luz calida sobre todo el cielo y rayos de sol
    const warm = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0xffd890, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(5.8).setBlendMode(ADD).setAlpha(0);
    const sun = this.add.image(WIDTH / 2, -30, 'fx_rays').setScrollFactor(0).setDepth(5.6).setBlendMode(ADD).setTint(0xfff0b0).setScale(0).setAlpha(0);
    const text = (y, str, size, color, stroke) => this.add.text(WIDTH / 2, y, str, {
      fontFamily: 'monospace', fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center',
      stroke, strokeThickness: Math.round(size / 5), lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(46).setAlpha(0);
    const ring = (x, y, tint, to, dur) => {
      const r = this.add.image(x, y, 'fx_ring').setDepth(36).setBlendMode(ADD).setTint(tint).setScale(0.3).setAlpha(0.9);
      this.tweens.add({ targets: r, scale: to, alpha: 0, duration: dur, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    };
    const heartState = { t: 0, size: 1 };
    this.heartDraw = (time) => updateHeart(heartObj, pos.x, pos.y, time, heartState.t, heartState.size);

    // 1. el Corazon late; al calmarse pasa de azul a dorado
    at(1800, () => {
      this.sfx('hum', 0.8, 0.6);
      ring(pos.x, pos.y, 0x9fd8ff, 6, 1400);
    });
    at(3000, () => {
      this.tweens.addCounter({
        from: 0, to: 1, duration: 1800,
        onUpdate: (tw) => {
          const t = tw.getValue();
          heartState.t = t;
          heartState.size = 1 + 0.5 * Math.sin(t * Math.PI);
        },
      });
      this.sfx('amulet_appear', 0.9);
      ring(pos.x, pos.y, 0xffffff, 9, 1800);
      ring(pos.x, pos.y, 0xffe08a, 7, 1500);
    });

    // 2. la maldicion se rompe: estalla la luz y la nevada se detiene
    at(4800, () => {
      this.sfx('win', 0.9);
      this.sfx('amulet_equip', 0.7, 1.2);
      cam.flash(900, 255, 240, 190, true);
      cam.shake(500, 0.006);
      ring(pos.x, pos.y, 0xffffff, 14, 2000);
      ring(pos.x, pos.y, 0xffd84a, 10, 2400);
      this.sparksAt(pos.x, pos.y, 90, [0xffffff, 0xffe08a, 0xfff2b0], [120, 520], 1600, 37);
      this.tweens.add({ targets: warm, alpha: 0.28, duration: 3000 });
      this.tweens.add({ targets: sun, alpha: 0.55, scale: 3, duration: 3500, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: this.ending, calm: 1, duration: 5000 });   // la nieve y el viento se apagan
      this.thaw();
    });

    // 3. mensaje y fin
    const title = text(HEIGHT / 2 - 40, 'LA MALDICION SE HA ROTO', 30, '#fff4cc', '#4a3410');
    const sub = text(HEIGHT / 2 + 8, 'Kryovar es libre. El invierno termina\ny la tierra del norte vuelve a florecer.', 17, '#ffffff', '#2a3a1a');
    at(8200, () => this.tweens.add({ targets: [title, sub], alpha: 1, duration: 900 }));
    at(14500, () => this.tweens.add({ targets: [title, sub], alpha: 0, duration: 700 }));
    at(15500, () => {
      cam.fadeOut(1500);
      cam.once('camerafadeoutcomplete', () => {
        Progress.complete(this.level.id);
        this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(60);
        const fin = this.add.text(WIDTH / 2, HEIGHT / 2 - 20, 'FIN', {
          fontFamily: 'monospace', fontSize: '64px', fontStyle: 'bold', color: '#ffe9a8', stroke: '#3a2a08', strokeThickness: 10,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(61).setAlpha(0);
        const thanks = this.add.text(WIDTH / 2, HEIGHT / 2 + 40, 'Gracias por jugar', {
          fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(61).setAlpha(0);
        cam.resetFX();
        this.tweens.add({ targets: [fin, thanks], alpha: 1, duration: 1200 });
        at(5200, () => this.goTo('Menu'));
      });
    });
  },

  // El suelo se deshiela: la hierba avanza desde el centro hacia los lados y brotan flores
  thaw() {
    const g = this.add.graphics().setDepth(-4.8);
    const half = this.worldWidth;
    const cx = this.heart.pos.x;
    const state = { r: 0 };
    const rnd = new Phaser.Math.RandomDataGenerator(['kryovar']);
    const flowers = [];
    for (let i = 0; i < 70; i++) flowers.push({ x: rnd.between(10, this.worldWidth - 10), c: rnd.pick([0xff6b8a, 0xffd84a, 0xffffff, 0xb78aff, 0xff9a4a]), h: rnd.between(6, 14), shown: false, img: null });
    this.tweens.add({
      targets: state, r: half, duration: 6500, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const x0 = Math.max(0, cx - state.r);
        const x1 = Math.min(this.worldWidth, cx + state.r);
        g.clear();
        g.fillStyle(0x5cb84c, 1).fillRect(x0, GROUND_Y, x1 - x0, 14);
        g.fillStyle(0x3f8f3a, 1).fillRect(x0, GROUND_Y + 10, x1 - x0, 5);
        g.fillStyle(0x7ad66a, 1);
        for (let x = Math.ceil(x0 / 8) * 8; x < x1; x += 8) g.fillTriangle(x, GROUND_Y + 2, x + 3, GROUND_Y - 6 - ((x / 8) % 3) * 2, x + 6, GROUND_Y + 2);
        flowers.forEach((f) => {
          if (f.shown || f.x < x0 || f.x > x1) return;
          f.shown = true;
          const stem = this.add.rectangle(f.x, GROUND_Y + 2, 2, f.h, 0x3f8f3a).setOrigin(0.5, 1).setDepth(-4.7).setScale(1, 0);
          const head = this.add.circle(f.x, GROUND_Y + 2 - f.h, 4, f.c).setDepth(-4.6).setScale(0);
          this.tweens.add({ targets: stem, scaleY: 1, duration: 500, ease: 'Back.easeOut' });
          this.tweens.add({ targets: head, scale: 1, delay: 300, duration: 400, ease: 'Back.easeOut' });
        });
      },
    });
  },
};
