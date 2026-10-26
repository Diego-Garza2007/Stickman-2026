// Jefe del nivel 14: el Gusano de Brasas. Misma interfaz que Boss (x, y, alive, state, overlapsStrike, hurt, burn, update),
// asi que los golpes, el tajo, la onda y la Erupcion del jugador le funcionan sin tocar nada.
//
// Vive bajo la arena. Solo se le puede golpear cuando sale (estados 'rise' y 'exposed'):
//  - Caza: una cresta de arena sigue al jugador por debajo del suelo.
//  - Aviso: la cresta se detiene y el suelo se pone rojo; salta, o haz dash, antes de que emerja.
//  - Emerge: una columna de gusano revienta el suelo (golpe fuerte a quien este encima) y se queda fuera unos segundos:
//    es el momento de atacarle, pero escupe bolas de fuego que dejan brasas donde caen.
//  - Furia (bajo la mitad de vida): caza y emerge mas rapido, escupe en abanico y abre dos geiseres de fuego a los lados.
// Se dibuja apilando anillos (worm_seg) a lo largo de una curva hasta la cabeza (worm_head).

const WORM_HP = 90;
const WORM_H = 190;              // altura de la columna al emerger
const WORM_SEGS = 15;
const WORM_SEG_SCALE = [4.1, 3]; // escala horizontal de los anillos: gruesos en la base, mas finos junto a la cabeza
const WORM_HEAD_SCALE = 2.7;
const WORM_BODY_HALF_W = 58;
const WORM_RISE_SPEED = 1800;    // px/s al emerger
const WORM_SINK_SPEED = 700;     // px/s al sumergirse
const WORM_CONTACT_W = 52;       // si el jugador toca la columna, le hiere
const WORM_BALL_SPEED = [330, 400];
const WORM_PATCH_LIFE = 2.4;

class SandWorm {
  constructor(scene, { x, trigger, arenaL, arenaR }) {
    this.scene = scene;
    this.x = x;
    this.y = scene.floorY;
    this.trigger = trigger;
    this.arenaL = arenaL;
    this.arenaR = arenaR;
    this.maxHp = WORM_HP;
    this.hp = WORM_HP;
    this.alive = true;
    this.phase = 1;
    this.state = 'dormant';
    this.dir = -1;
    this.timer = 0;
    this.h = 0;                 // altura actual de la columna
    this.hTarget = 0;
    this.shots = [];            // tiempos (s desde que emerge) a los que escupe
    this.exposedFor = 0;
    this.balls = [];
    this.patches = [];
    this.geysers = [];
    this.mark = null;

    Boss.buildFireTextures(scene);
    this.segs = [];
    for (let i = 0; i < WORM_SEGS; i++) {
      this.segs.push(scene.add.image(x, this.y, 'worm_seg', 0).setScale(WORM_SEG_SCALE[0], 2.8).setDepth(0.5 + i * 0.001).setVisible(false));
    }
    this.head = scene.add.sprite(x, this.y, 'worm_head', 0).setScale(WORM_HEAD_SCALE).setOrigin(22 / 48, 44 / 48).setDepth(0.53).setVisible(false);
    // cresta de arena: marca por donde va y tapa la base de la columna
    this.ridge = scene.add.container(x, this.y - 2, [
      scene.add.ellipse(0, 0, 170, 32, 0x7a4a22), scene.add.ellipse(0, -5, 118, 18, 0xc99a5a),
    ]).setDepth(0.6).setVisible(false);
    this.dust = scene.add.particles(0, 0, 'mote', {
      x: { min: -44, max: 44 }, speedY: { min: -70, max: -20 }, speedX: { min: -50, max: 50 }, lifespan: 520, frequency: 35,
      scale: { start: 1.9, end: 0 }, alpha: { start: 0.85, end: 0 }, tint: [0xe8c98a, 0xc99a5a, 0xffffff],
    }).setDepth(0.65);
    this.dust.startFollow(this.ridge, 0, -8);
    this.dust.stop();
    this.buildBar();
  }

  static preload(scene) {
    scene.load.spritesheet('worm_seg', 'assets/worm_seg.png', { frameWidth: 32, frameHeight: 16 });
    scene.load.spritesheet('worm_head', 'assets/worm_head.png', { frameWidth: 48, frameHeight: 48 });
  }

  buildBar() {
    const s = this.scene;
    this.barW = 360;
    this.barBox = s.add.graphics().setScrollFactor(0).setDepth(20).setVisible(false);
    this.barName = s.add.text(WIDTH / 2, 14, 'GUSANO DE BRASAS', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffe3b8', stroke: '#1a0805', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20).setVisible(false);
  }

  drawBar() {
    const g = this.barBox;
    const x = (WIDTH - this.barW) / 2;
    g.clear().setVisible(true);
    this.barName.setVisible(true);
    g.fillStyle(0x000000, 0.8).fillRect(x - 3, 36, this.barW + 6, 16);
    g.fillStyle(0x3a1408, 1).fillRect(x, 39, this.barW, 10);
    g.fillStyle(this.phase === 2 ? 0xffd23a : 0xff7a1a, 1).fillRect(x, 39, this.barW * Math.max(0, this.hp) / this.maxHp, 10);
    g.fillStyle(0xffffff, 0.8).fillRect(x + this.barW / 2 - 1, 36, 2, 16);   // marca de la furia
  }

  // ---- interfaz con los golpes del jugador ----

  get vulnerable() { return this.alive && (this.state === 'rise' || this.state === 'exposed') && this.h > 90; }

  overlapsStrike(left, right, feetY) {
    return this.vulnerable && this.x + WORM_BODY_HALF_W > left && this.x - WORM_BODY_HALF_W < right && Math.abs(this.y - feetY) < 170;
  }

  hurt(damage) {
    if (!this.vulnerable) return false;
    const scene = this.scene;
    this.hp -= damage;
    scene.sfx('hit', 0.9, Phaser.Math.FloatBetween(0.55, 0.75));
    scene.cameras.main.shake(60, 0.003);
    this.flash(0xffffff);
    this.drawBar();
    if (this.hp <= 0) { this.die(); return true; }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) this.enrage();
    return false;
  }

  burn() {}   // arde por dentro: la quemadura no le hace nada

  flash(color) {
    this.segs.forEach((s) => s.setTintFill(color));
    this.head.setTintFill(color);
    this.scene.time.delayedCall(70, () => { if (this.alive) { this.segs.forEach((s) => s.clearTint()); this.head.clearTint(); } });
  }

  enrage() {
    this.phase = 2;
    this.state = 'enrage';
    this.timer = 1.5;
    this.hTarget = WORM_H;
    this.clearHazards();
    this.scene.sfx('alert', 1, 0.4);
    this.scene.cameras.main.shake(500, 0.012);
    this.drawBar();
  }

  // ---- ataques ----

  startHunt() {
    this.state = 'burrow';
    this.hTarget = 0;
    this.timer = this.phase === 2 ? 1.3 : 2;
    this.dust.start();
  }

  startWarn() {
    this.state = 'warn';
    this.timer = this.phase === 2 ? 0.6 : 0.85;
    this.dust.stop();
    this.scene.sfx('alert', 0.8, 0.5);
    this.mark = this.scene.add.ellipse(this.x, this.y + 2, 150, 18, 0xff3344, 0.55).setDepth(-0.5);
    this.scene.tweens.add({ targets: this.mark, alpha: 0.15, duration: 120, yoyo: true, repeat: -1 });
  }

  erupt() {
    const s = this.scene;
    const p = s.stickman;
    this.state = 'rise';
    this.hTarget = WORM_H;
    this.timer = 0.3;
    this.exposedFor = 0;
    this.shots = this.phase === 2 ? [0.7, 1.3] : [1];
    this.mark?.destroy();
    this.mark = null;
    s.sfx('land', 1, 0.4);
    s.sfx('hit', 0.8, 0.5);
    s.cameras.main.shake(260, 0.01);
    s.sparksAt(this.x, this.y - 10, 30, [0xe8c98a, 0xc99a5a, 0xffffff], [100, 340], 600);
    if (Math.abs(p.x - this.x) < 66 && p.y > this.y - WORM_H * 0.8) s.takeHit(this.x, 2);
    if (this.phase === 2) {
      [-1, 1].forEach((side) => {
        const gx = Phaser.Math.Clamp(this.x + side * 220, this.arenaL + 80, this.arenaR - 80);
        const mark = s.add.ellipse(gx, this.y + 2, 90, 14, 0xff3344, 0.55).setDepth(-0.5);
        s.tweens.add({ targets: mark, alpha: 0.15, duration: 110, yoyo: true, repeat: -1 });
        this.geysers.push({ x: gx, mark, wait: 0.55, img: null });
      });
    }
  }

  spit() {
    const s = this.scene;
    const p = s.stickman;
    s.sfx('flame', 0.7, 0.8);
    this.headOpen = 0.35;
    const hx = this.headX;
    const hy = this.y - this.h - 20;
    const aim = Math.atan2((p.y - 60) - hy, p.x - hx);
    const angles = this.phase === 2 ? [aim - 0.3, aim, aim + 0.3] : [aim];
    const speed = WORM_BALL_SPEED[this.phase - 1];
    angles.forEach((a) => {
      const img = s.add.image(hx + Math.cos(a) * 40, hy + Math.sin(a) * 40, 'fire_ball').setDepth(4).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3);
      this.balls.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 2.4, trail: 0 });
    });
  }

  addPatch(x, life = WORM_PATCH_LIFE) {
    const img = this.scene.add.image(x, this.y + 2, 'fire_flame').setOrigin(0.5, 1).setDepth(0.45).setAlpha(0.95);
    this.scene.tweens.add({ targets: img, scaleY: { from: 0.75, to: 1.15 }, scaleX: { from: 1.1, to: 0.85 }, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1 });
    this.patches.push({ x, img, life });
  }

  clearHazards() {
    const s = this.scene;
    this.balls.forEach((b) => b.img.destroy());
    this.patches.forEach((f) => { s.tweens.killTweensOf(f.img); f.img.destroy(); });
    this.geysers.forEach((g) => { g.mark.destroy(); g.img?.destroy(); });
    this.mark?.destroy();
    this.balls = []; this.patches = []; this.geysers = []; this.mark = null;
  }

  // ---- bucle ----

  update(dt, time) {
    if (this.state === 'dead') return;
    if (this.state === 'dying') { this.updateDying(dt, time); return; }
    if (!this.alive) return;
    const scene = this.scene;
    const p = scene.stickman;
    const dx = p.x - this.x;
    let frame = 0;

    this.timer -= dt;
    switch (this.state) {
      case 'dormant':
        if (p.x > this.trigger) this.wake();
        break;
      case 'intro':        // se asoma rugiendo y vuelve a sumergirse
      case 'enrage':
        this.dir = dx >= 0 ? 1 : -1;
        frame = 2;
        scene.cameras.main.shake(40, 0.004);
        if (this.timer <= 0) { this.state = 'retreat'; this.hTarget = 0; }
        break;
      case 'burrow': {
        const speed = this.phase === 2 ? 300 : 210;
        const step = Phaser.Math.Clamp(dx, -speed * dt, speed * dt);
        this.x = Phaser.Math.Clamp(this.x + step, this.arenaL + 100, this.arenaR - 100);
        if (this.timer <= 0 || Math.abs(dx) < 25) this.startWarn();
        break;
      }
      case 'warn':
        this.ridge.x = this.x + Math.sin(time / 28) * 3;   // la cresta tiembla
        if (this.timer <= 0) this.erupt();
        break;
      case 'rise':
        frame = 1;
        this.dir = dx >= 0 ? 1 : -1;
        if (this.timer <= 0) { this.state = 'exposed'; this.timer = this.phase === 2 ? 1.8 : 2.4; }
        break;
      case 'exposed': {
        this.dir = dx >= 0 ? 1 : -1;
        this.exposedFor += dt;
        if (this.shots.length && this.exposedFor >= this.shots[0]) { this.shots.shift(); this.spit(); }
        if (Math.abs(dx) < WORM_CONTACT_W && p.y > this.y - this.h * 0.9) scene.takeHit(this.x, 1);   // no te quedes pegado a el
        if (this.timer <= 0) { this.state = 'retreat'; this.hTarget = 0; }
        break;
      }
      case 'retreat':
        if (this.h <= 2) this.startHunt();
        break;
    }
    this.headOpen = Math.max(0, (this.headOpen ?? 0) - dt);
    if (this.headOpen > 0) frame = 2;

    // altura de la columna
    const sp = this.h < this.hTarget ? WORM_RISE_SPEED : WORM_SINK_SPEED;
    this.h = Phaser.Math.Clamp(this.h + Math.sign(this.hTarget - this.h) * Math.min(sp * dt, Math.abs(this.hTarget - this.h)), 0, WORM_H);

    this.head.setFrame(frame);
    this.rig(time);
    this.updateHazards(dt);
  }

  wake() {
    this.state = 'intro';
    this.timer = 1.8;
    this.hTarget = WORM_H;
    this.scene.arenaLeft = this.arenaL;   // se cierra la salida hacia atras
    this.scene.sfx('alert', 1, 0.35);
    this.scene.sparksAt(this.x, this.y - 10, 40, [0xe8c98a, 0xc99a5a, 0xffffff], [100, 360], 700);
    this.drawBar();
  }

  // Coloca los anillos a lo largo de una curva desde la base hasta la cabeza (que se inclina hacia el jugador)
  rig(time) {
    const p = this.scene.stickman;
    const show = this.h > 4;
    const lean = Phaser.Math.Clamp((p.x - this.x) / 200, -1, 1) * 30;
    const swayAmp = this.state === 'exposed' ? 16 : 11;
    const n = this.segs.length;
    const at = (t) => ({
      x: this.x + Math.sin(time / 240 + t * 4.2) * swayAmp * t + lean * t * t,
      y: this.y - t * this.h,
    });
    this.segs.forEach((seg, i) => {
      const t = (i + 0.6) / n;
      const pt = at(t);
      const next = at(Math.min(1, t + 0.04));
      seg.setVisible(show).setPosition(pt.x, pt.y).setRotation(Math.atan2(next.x - pt.x, pt.y - next.y))
        .setScale(Phaser.Math.Linear(WORM_SEG_SCALE[0], WORM_SEG_SCALE[1], t), 2.8)
        .setFrame(this.phase === 2 ? (Math.floor(time / 180) + i) % 2 : 0);
    });
    const top = at(1);
    this.headX = top.x;
    this.head.setVisible(show).setPosition(top.x, top.y + 10).setFlipX(this.dir < 0);
    this.head.setOrigin(this.dir < 0 ? 26 / 48 : 22 / 48, 44 / 48);
    // la cresta de arena: visible mientras caza, avisa o asoma la columna
    this.ridge.setVisible(this.state !== 'dormant').setX(this.state === 'warn' ? this.ridge.x : this.x);
  }

  updateHazards(dt) {
    const s = this.scene;
    const p = s.stickman;
    this.balls = this.balls.filter((b) => {
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      b.life -= dt;
      b.trail -= dt;
      if (b.trail <= 0) {
        b.trail = 0.04;
        const m = s.add.image(b.img.x, b.img.y, 'mote').setDepth(3.5).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a1e).setScale(2.2);
        s.tweens.add({ targets: m, alpha: 0, scale: 0, duration: 300, onComplete: () => m.destroy() });
      }
      let done = b.life <= 0 || b.img.x < this.arenaL - 80 || b.img.x > this.arenaR + 80;
      if (!done && Math.abs(p.x - b.img.x) < 30 && Math.abs((p.y - 60) - b.img.y) < 46) { s.takeHit(b.img.x, 1); done = true; }
      if (!done && b.img.y > this.y - 8) { this.addPatch(b.img.x); s.sparksAt(b.img.x, this.y - 10, 10, [0xff4a1a, 0xff8a1e, 0xffd23a], [60, 220], 400); done = true; }
      if (done) b.img.destroy();
      return !done;
    });
    this.patches = this.patches.filter((f) => {
      f.life -= dt;
      if (f.life < 0.5) f.img.setAlpha(Math.max(0, f.life / 0.5) * 0.95);
      if (Math.abs(p.x - f.x) < 34 && p.y > this.y - 36 && f.life > 0) s.takeHit(f.x, 1);
      if (f.life <= 0) { s.tweens.killTweensOf(f.img); f.img.destroy(); return false; }
      return true;
    });
    this.geysers = this.geysers.filter((g) => {
      if (!g.img) {
        g.wait -= dt;
        if (g.wait > 0) return true;
        g.mark.destroy();
        s.sfx('flame', 0.6, 0.9);
        s.cameras.main.shake(120, 0.006);
        g.img = s.add.image(g.x, this.y, 'fire_wave').setOrigin(0.5, 1).setDepth(3).setScale(1.5, 0.3);
        s.tweens.add({ targets: g.img, scaleY: 2.8, duration: 160, ease: 'Back.easeOut' });
        s.tweens.add({ targets: g.img, alpha: 0, delay: 380, duration: 300, onComplete: () => g.img.destroy() });
        if (Math.abs(p.x - g.x) < 44 && p.y > this.y - 200) s.takeHit(g.x, 2);
        g.life = 0.7;
        return true;
      }
      g.life -= dt;
      return g.life > 0;
    });
  }

  // ---- muerte ----

  die() {
    const scene = this.scene;
    this.alive = false;
    this.state = 'dying';
    this.timer = 2.6;
    this.puffTimer = 0;
    this.hTarget = WORM_H;
    this.clearHazards();
    this.dust.stop();
    this.barBox.setVisible(false);
    this.barName.setVisible(false);
    scene.sfx('enemy_die', 1, 0.4);
    scene.cameras.main.shake(2600, 0.01);
  }

  updateDying(dt, time) {
    const scene = this.scene;
    this.timer -= dt;
    this.puffTimer -= dt;
    this.h = Math.min(WORM_H, this.h + WORM_RISE_SPEED * dt);
    this.head.setFrame(3);
    const flick = Math.floor(time / 70) % 2 ? 0xffffff : 0xff5522;
    this.segs.forEach((s) => s.setTintFill(flick));
    this.head.setTintFill(flick);
    this.rig(time);
    if (this.puffTimer <= 0) {
      this.puffTimer = 0.13;
      scene.sparksAt(this.x + Phaser.Math.Between(-50, 50), this.y - Phaser.Math.Between(40, this.h), 14, [0xff4a1a, 0xffd23a, 0xffffff], [60, 260], 600, 6);
      scene.sfx('hit', 0.5, Phaser.Math.FloatBetween(0.4, 0.8));
    }
    if (this.timer <= 0) {   // se desploma en una explosion de arena y brasas
      this.state = 'dead';
      scene.sfx('land', 1, 0.35);
      scene.sparksAt(this.x, this.y - 60, 80, [0xff8a1e, 0xffd23a, 0xe8c98a, 0xffffff], [120, 480], 900, 6);
      scene.tweens.add({
        targets: this, h: 0, duration: 800, ease: 'Quad.easeIn',
        onUpdate: () => this.rig(scene.time.now),
        onComplete: () => {
          [...this.segs, this.head, this.ridge].forEach((o) => o.destroy());
          this.dust.destroy();
          scene.onBossDefeated();
        },
      });
    }
  }
}
