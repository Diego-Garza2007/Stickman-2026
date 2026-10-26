// Jefe del nivel 5: el Guardian de la Cima. Misma interfaz que Enemy (x, y, alive, overlapsStrike, hurt, update),
// asi que los golpes, el tajo y la onda del jugador le funcionan sin tocar nada.
//
// Ataques (todos avisan antes de golpear y se esquivan con salto o dash):
//  - Mazazo: levanta la maza (aviso) y la estrella delante; lanza una onda de choque por el suelo (salta o haz dash).
//  - Embestida: se agacha, se pone rojo y carga en linea recta; si se estrella contra el borde queda aturdido.
//  - Lluvia de rocas (fase 2): marca el suelo con circulos rojos y deja caer rocas encima.
// Al bajar de la mitad de vida entra en furia: mas rapido, mazazos dobles y ondas hacia los dos lados.

const BOSS_HP = 80;
// Temas de jefe (cfg.kind): sprite, texturas de sus proyectiles y colores. El jefe del nivel 14 es otro: el Gusano de Brasas (worm.js).
const BOSS_THEMES = {
  guardian: {
    tex: 'boss', waveTex: 'boss_wave', rockTex: 'boss_rock', title: 'GUARDIAN DE LA CIMA', hp: BOSS_HP,
    bar1: 0xe03442, bar2: 0xff7a2a, enrageTint: 0xffb0a8, dust: [0xd8c8a8, 0xffffff, 0x8a7a60], rockDust: [0x9fa2b8, 0xffffff],
  },
};
const BOSS_SCALE = 4;
const BOSS_FRAME = { idle: 0, walk: 4, windup: 10, slam: 11, charge: 12, hurt: 13 };
const BOSS_BODY_HALF_W = 44;
const BOSS_SMASH_REACH = 165;     // alcance del mazazo hacia delante
const BOSS_SMASH_RANGE = 150;     // distancia a la que empieza a atacar
const BOSS_WAVE_SPEED = 380;
const BOSS_CHARGE_SPEED = 780;
const BOSS_STUN_BONUS = 1.5;      // dano extra mientras esta aturdido

class Boss {
  constructor(scene, { x, trigger, arenaL, arenaR, kind = 'guardian' }) {
    this.theme = BOSS_THEMES[kind];
    this.scene = scene;
    this.x = x;
    this.y = scene.floorY;
    this.trigger = trigger;
    this.arenaL = arenaL;
    this.arenaR = arenaR;
    this.maxHp = this.theme.hp;
    this.hp = this.maxHp;
    this.alive = true;
    this.phase = 1;
    this.state = 'dormant';
    this.dir = -1;
    this.timer = 0;
    this.think = 1;
    this.chargeCd = 3;
    this.rocksCd = 4;
    this.combo = false;
    this.struck = false;
    this.waves = [];
    this.rocks = [];

    Boss.buildTextures(scene);
    this.sprite = scene.add.sprite(x, this.y, this.theme.tex, BOSS_FRAME.idle)
      .setOrigin(0.5, 63 / 64).setScale(BOSS_SCALE).setDepth(0.5).setFlipX(true);
    this.buildBar();
  }

  static buildTextures(scene) {
    if (!scene.textures.exists('boss_wave')) {
      const tex = scene.textures.createCanvas('boss_wave', 44, 60);
      const c = tex.getContext();
      const g = c.createLinearGradient(0, 60, 0, 0);
      g.addColorStop(0, '#ff3b4d'); g.addColorStop(1, '#ffe0a0');
      c.fillStyle = g;
      c.beginPath();
      [[0, 60], [8, 26], [14, 40], [22, 0], [30, 40], [36, 26], [44, 60]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath(); c.fill();
      c.strokeStyle = '#3a0a10'; c.lineWidth = 2; c.stroke();
      tex.refresh();
    }
    if (!scene.textures.exists('boss_rock')) {
      const tex = scene.textures.createCanvas('boss_rock', 44, 44);
      const c = tex.getContext();
      c.fillStyle = '#787a8c';
      c.beginPath();
      [[4, 14], [16, 2], [34, 4], [42, 20], [36, 40], [14, 42], [2, 30]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath(); c.fill();
      c.fillStyle = '#9fa2b8'; c.fillRect(12, 8, 14, 6);
      c.fillStyle = '#4e506a'; c.fillRect(20, 30, 14, 8);
      c.strokeStyle = '#14101c'; c.lineWidth = 2; c.stroke();
      tex.refresh();
    }
  }

  // Texturas de fuego compartidas (pilares de la Erupcion, rastro del dash, bolas y brasas del Gusano)
  static buildFireTextures(scene) {
    if (!scene.textures.exists('fire_wave')) {
      const tex = scene.textures.createCanvas('fire_wave', 56, 72);
      const c = tex.getContext();
      const g = c.createLinearGradient(0, 72, 0, 0);
      g.addColorStop(0, '#d6280e'); g.addColorStop(0.5, '#ff8a1e'); g.addColorStop(1, '#fff3b0');
      c.fillStyle = g;
      c.beginPath();
      [[0, 72], [6, 34], [14, 48], [20, 10], [28, 0], [36, 12], [42, 46], [50, 32], [56, 72]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath(); c.fill();
      c.strokeStyle = '#3a0a08'; c.lineWidth = 2; c.stroke();
      tex.refresh();
    }
    if (!scene.textures.exists('fire_ball')) {   // bola de fuego escupida
      const tex = scene.textures.createCanvas('fire_ball', 32, 32);
      const c = tex.getContext();
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.35, 'rgba(255,214,70,0.95)'); g.addColorStop(0.7, 'rgba(255,100,20,0.7)'); g.addColorStop(1, 'rgba(214,40,14,0)');
      c.fillStyle = g; c.fillRect(0, 0, 32, 32);
      tex.refresh();
    }
    if (!scene.textures.exists('fire_flame')) {   // llama de suelo (rastro de la embestida, restos de los meteoros)
      const tex = scene.textures.createCanvas('fire_flame', 40, 56);
      const c = tex.getContext();
      const g = c.createLinearGradient(0, 56, 0, 0);
      g.addColorStop(0, '#d6280e'); g.addColorStop(0.55, '#ff8a1e'); g.addColorStop(1, 'rgba(255,240,170,0.85)');
      c.fillStyle = g;
      c.beginPath();
      [[2, 56], [8, 30], [14, 40], [20, 4], [26, 38], [32, 28], [38, 56]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath(); c.fill();
      tex.refresh();
    }
  }

  buildBar() {
    const s = this.scene;
    this.barW = 360;
    this.barBox = s.add.graphics().setScrollFactor(0).setDepth(20).setVisible(false);
    this.barName = s.add.text(WIDTH / 2, 14, this.theme.title, {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffd9d9', stroke: '#1a0508', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20).setVisible(false);
  }

  drawBar() {
    const g = this.barBox;
    const x = (WIDTH - this.barW) / 2;
    g.clear().setVisible(true);
    this.barName.setVisible(true);
    g.fillStyle(0x000000, 0.8).fillRect(x - 3, 36, this.barW + 6, 16);
    g.fillStyle(0x3a1018, 1).fillRect(x, 39, this.barW, 10);
    g.fillStyle(this.phase === 2 ? this.theme.bar2 : this.theme.bar1, 1).fillRect(x, 39, this.barW * Math.max(0, this.hp) / this.maxHp, 10);
    g.fillStyle(0xffffff, 0.8).fillRect(x + this.barW / 2 - 1, 36, 2, 16);   // marca de la furia
  }

  // ---- interfaz con los golpes del jugador ----

  overlapsStrike(left, right, feetY) {
    if (!this.alive || this.state === 'dormant') return false;
    return this.x + BOSS_BODY_HALF_W > left && this.x - BOSS_BODY_HALF_W < right && Math.abs(this.y - feetY) < 120;
  }

  // dir = hacia donde sale despedido; el jefe casi no retrocede. Devuelve true si lo mata
  hurt(damage, dir) {
    if (!this.alive) return false;
    const scene = this.scene;
    if (this.state === 'stun') damage *= BOSS_STUN_BONUS;
    this.hp -= damage;
    scene.sfx('hit', 0.9, Phaser.Math.FloatBetween(0.6, 0.8));
    scene.cameras.main.shake(60, 0.003);
    this.sprite.setTintFill(0xffffff);
    scene.time.delayedCall(70, () => { if (this.alive) this.sprite.clearTint(); });
    this.x = Phaser.Math.Clamp(this.x + dir * 4, this.arenaL + 90, this.arenaR - 90);
    this.drawBar();
    if (this.hp <= 0) { this.die(); return true; }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) this.enrage();
    return false;
  }

  enrage() {
    this.phase = 2;
    this.state = 'enrage';
    this.timer = 1.5;
    this.clearHazards();
    this.scene.sfx('alert', 1, 0.45);
    this.scene.cameras.main.shake(500, 0.012);
    this.drawBar();
  }

  // ---- ataques ----

  startSmash() {
    this.state = 'smashWind';
    this.timer = this.phase === 2 ? 0.55 : 0.8;
    this.struck = false;
    this.scene.sfx('attack', 0.8, 0.5);
  }

  startCharge() {
    this.state = 'chargeWind';
    this.timer = this.phase === 2 ? 0.65 : 0.9;
    this.chargeCd = this.phase === 2 ? 4 : 6;
    this.chargeFrom = this.x;
    this.scene.sfx('alert', 0.8, 0.7);
  }

  startRocks() {
    this.state = 'rocksWind';
    this.timer = 1;
    this.rocksCd = 8;
    this.scene.sfx('alert', 0.9, 0.5);
    const p = this.scene.stickman;
    const spots = [p.x, p.x - 170, p.x + 170, p.x - 340, p.x + 340]
      .map((x) => Phaser.Math.Clamp(x, this.arenaL + 40, this.arenaR - 40));
    spots.forEach((x, i) => {
      const mark = this.scene.add.ellipse(x, this.y + 2, 80, 14, 0xff3344, 0.55).setDepth(-0.5);
      this.scene.tweens.add({ targets: mark, alpha: 0.15, duration: 140, yoyo: true, repeat: -1 });
      this.rocks.push({ x, mark, img: null, wait: 0.9 + i * 0.12, vy: 0 });
    });
  }

  slam() {
    const s = this.scene;
    const p = s.stickman;
    this.state = 'smash';
    this.timer = 0.25;
    s.sfx('land', 1, 0.5);
    s.sfx('hit', 0.8, 0.5);
    s.cameras.main.shake(220, 0.01);
    const front = this.x + this.dir * (BOSS_SMASH_REACH / 2);
    s.add.particles(front, this.y, 'mote', {
      speed: { min: 60, max: 260 }, angle: { min: 200, max: 340 }, lifespan: 500,
      scale: { start: 2, end: 0 }, alpha: { start: 1, end: 0 }, tint: this.theme.dust,
      emitting: false,
    }).setDepth(3).explode(18);
    const dx = (p.x - this.x) * this.dir;
    if (dx > -20 && dx < BOSS_SMASH_REACH && p.y > this.y - 70) s.takeHit(this.x, 2);
    // onda de choque: una hacia delante (dos en furia)
    this.spawnWave(this.dir);
    if (this.phase === 2) this.spawnWave(-this.dir);
  }

  spawnWave(dir) {
    const x = this.x + dir * 90;
    const img = this.scene.add.image(x, this.y, this.theme.waveTex).setOrigin(0.5, 1).setFlipX(dir < 0).setDepth(0.4);
    this.waves.push({ x, dir, img });
  }

  clearHazards() {
    this.waves.forEach((w) => w.img.destroy());
    this.rocks.forEach((r) => { r.mark.destroy(); r.img?.destroy(); });
    this.waves = [];
    this.rocks = [];
  }

  // Quemadura de la espada de fuego: dano directo, sin aturdir ni sonido
  burn(amount) {
    if (!this.alive || this.state === 'dormant' || this.state === 'dying') return;
    this.hp -= amount;
    this.drawBar();
    if (this.hp <= 0) { this.die(); return; }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) this.enrage();
  }

  // ---- bucle ----

  update(dt, time) {
    if (this.state === 'dying') { this.updateDying(dt, time); return; }
    if (!this.alive) return;
    const scene = this.scene;
    const p = scene.stickman;
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const face = () => { this.dir = dx >= 0 ? 1 : -1; };
    let frame = BOSS_FRAME.idle + Math.floor(time / 220) % 4;
    let tint = null;

    this.chargeCd -= dt;
    this.rocksCd -= dt;

    switch (this.state) {
      case 'dormant':
        if (p.x > this.trigger) this.wake();
        break;
      case 'roar':
      case 'enrage':
        face();
        this.timer -= dt;
        frame = BOSS_FRAME.windup;
        scene.cameras.main.shake(40, 0.004);
        if (this.timer <= 0) { this.state = 'approach'; this.think = 0.6; }
        break;
      case 'approach': {
        face();
        const speed = this.phase === 2 ? 135 : 95;
        this.think -= dt;
        if (adx <= BOSS_SMASH_RANGE) {
          this.startSmash();
        } else if (this.think <= 0) {
          this.think = 0.7;
          if (adx > 300 && this.chargeCd <= 0 && Math.random() < 0.6) this.startCharge();
          else if (this.phase === 2 && this.rocksCd <= 0 && Math.random() < 0.5) this.startRocks();
        }
        if (this.state === 'approach') {
          this.x = Phaser.Math.Clamp(this.x + this.dir * speed * dt, this.arenaL + 90, this.arenaR - 90);
          frame = BOSS_FRAME.walk + Math.floor(time / (this.phase === 2 ? 85 : 110)) % 6;
        }
        break;
      }
      case 'smashWind':
        this.timer -= dt;
        frame = BOSS_FRAME.windup;
        tint = Math.floor(time / 80) % 2 ? 0xffffff : 0xff9999;
        if (this.timer <= 0) this.slam();
        break;
      case 'smash':
        this.timer -= dt;
        frame = BOSS_FRAME.slam;
        if (this.timer <= 0) {
          // en furia, a veces encadena un segundo mazazo sin pausa
          if (this.phase === 2 && !this.combo && Math.random() < 0.45) { this.combo = true; face(); this.startSmash(); }
          else { this.combo = false; this.state = 'smashRecover'; this.timer = this.phase === 2 ? 0.65 : 0.95; }
        }
        break;
      case 'smashRecover':
        this.timer -= dt;
        frame = BOSS_FRAME.slam;
        if (this.timer <= 0) { this.state = 'approach'; this.think = 0.4; }
        break;
      case 'chargeWind':
        face();
        this.timer -= dt;
        frame = BOSS_FRAME.charge;
        tint = Math.floor(time / 70) % 2 ? 0xff5566 : 0xffffff;
        if (this.timer <= 0) { this.state = 'charge'; this.struck = false; this.chargeFrom = this.x; scene.sfx('dash', 0.9, 0.5); }
        break;
      case 'charge': {
        frame = BOSS_FRAME.charge;
        tint = 0xff7788;
        this.x += this.dir * BOSS_CHARGE_SPEED * dt;
        const min = this.arenaL + 90;
        const max = this.arenaR - 90;
        if (!this.struck && Math.abs(p.x - this.x) < 80 && p.y > this.y - 100) {
          this.struck = true;
          scene.takeHit(this.x, 2);
        }
        if (this.x <= min || this.x >= max || Math.abs(this.x - this.chargeFrom) > 1300) {
          this.x = Phaser.Math.Clamp(this.x, min, max);
          this.state = 'stun';
          this.timer = this.phase === 2 ? 1.3 : 1.7;
          scene.sfx('land', 1, 0.45);
          scene.cameras.main.shake(350, 0.014);
          if (this.phase === 2) this.rocksCd = Math.min(this.rocksCd, 1);
        }
        break;
      }
      case 'stun':
        this.timer -= dt;
        frame = BOSS_FRAME.hurt;
        tint = Math.floor(time / 120) % 2 ? 0xffffaa : null;
        if (this.timer <= 0) { this.state = 'approach'; this.think = 0.4; }
        break;
      case 'rocksWind':
        face();
        this.timer -= dt;
        frame = BOSS_FRAME.windup;
        if (this.timer <= 0) { this.state = 'rocksRecover'; this.timer = 1.4; }
        break;
      case 'rocksRecover':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'approach'; this.think = 0.4; }
        break;
    }

    if (this.phase === 2 && !tint) tint = this.theme.enrageTint;
    this.sprite.setPosition(this.x, this.y).setFlipX(this.dir < 0).setFrame(frame);
    if (tint !== null) this.sprite.setTint(tint); else this.sprite.clearTint();

    this.updateWaves(dt);
    this.updateRocks(dt);
  }

  wake() {
    this.state = 'roar';
    this.timer = 1.6;
    this.scene.arenaLeft = this.arenaL;   // se cierra la salida hacia atras
    this.scene.sfx('alert', 1, 0.4);
    this.drawBar();
  }

  updateWaves(dt) {
    const s = this.scene;
    const p = s.stickman;
    this.waves = this.waves.filter((w) => {
      w.x += w.dir * BOSS_WAVE_SPEED * dt;
      w.img.setX(w.x);
      if (Math.abs(p.x - w.x) < 28 && p.y > this.y - 44) s.takeHit(w.x, 1);   // se salta o se atraviesa con dash
      if (w.x < this.arenaL - 40 || w.x > this.arenaR + 40) { w.img.destroy(); return false; }
      return true;
    });
  }

  updateRocks(dt) {
    const s = this.scene;
    const p = s.stickman;
    this.rocks = this.rocks.filter((r) => {
      if (!r.img) {
        r.wait -= dt;
        if (r.wait > 0) return true;
        r.img = s.add.image(r.x, -60, this.theme.rockTex).setDepth(4);
      }
      r.vy += 1500 * dt;
      r.img.y += r.vy * dt;
      if (r.img.y < this.y - 22) return true;
      s.cameras.main.shake(90, 0.005);
      s.sfx('land', 0.6, 0.7);
      if (Math.abs(p.x - r.x) < 46 && p.y > this.y - 60) s.takeHit(r.x, 2);
      s.add.particles(r.x, this.y, 'mote', {
        speed: { min: 40, max: 180 }, angle: { min: 200, max: 340 }, lifespan: 380,
        scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 }, tint: this.theme.rockDust, emitting: false,
      }).setDepth(3).explode(10);
      r.mark.destroy();
      s.tweens.add({ targets: r.img, alpha: 0, delay: 200, duration: 300, onComplete: () => r.img.destroy() });
      return false;
    });
  }

  // ---- muerte ----

  die() {
    const scene = this.scene;
    this.alive = false;
    this.state = 'dying';
    this.timer = 2.4;
    this.puffTimer = 0;
    this.clearHazards();
    this.barBox.setVisible(false);
    this.barName.setVisible(false);
    scene.sfx('enemy_die', 1, 0.5);
    scene.cameras.main.shake(2200, 0.01);
  }

  updateDying(dt, time) {
    const scene = this.scene;
    this.timer -= dt;
    this.puffTimer -= dt;
    this.sprite.setFrame(BOSS_FRAME.hurt).setTint(Math.floor(time / 70) % 2 ? 0xffffff : 0xff4455);
    if (this.puffTimer <= 0) {
      this.puffTimer = 0.14;
      const bx = this.x + Phaser.Math.Between(-60, 60);
      const by = this.y - Phaser.Math.Between(30, 200);
      const puff = scene.add.particles(bx, by, 'mote', {
        speed: { min: 60, max: 260 }, angle: { min: 0, max: 360 }, lifespan: 600,
        scale: { start: 2, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xe03442, 0xffd84a, 0xffffff], blendMode: 'ADD', emitting: false,
      }).setDepth(6);
      puff.explode(14);
      scene.time.delayedCall(800, () => puff.destroy());
      scene.sfx('hit', 0.5, Phaser.Math.FloatBetween(0.5, 0.9));
    }
    if (this.timer <= 0) {
      this.state = 'dead';
      scene.tweens.add({ targets: this.sprite, alpha: 0, scaleY: BOSS_SCALE * 0.6, duration: 500, onComplete: () => this.sprite.destroy() });
      scene.onBossDefeated();
    }
  }
}

