// Enemigo basico: patrulla; al verte te persigue y ataca con un garrote (aviso, golpe, recuperacion).
// Sus golpes solo hacen dano si te alcanzan en el momento del golpe, y el dash los esquiva.

const ENEMY_HP = 4;
const ENEMY_PATROL_SPEED = 50;
const ENEMY_CHASE_SPEED = 130;
const ENEMY_SIGHT = 380;        // distancia a la que te ve hacia delante
const ENEMY_BEHIND = 110;       // distancia a la que te nota si estas a su espalda
const ENEMY_LOSE = 620;         // si te alejas mas que esto deja de perseguirte
const ENEMY_ATTACK_RANGE = 74;  // a esta distancia empieza a atacar
const ENEMY_REACH = 92;         // alcance del garrote
const ENEMY_WINDUP = 0.45;      // aviso antes de golpear (esquivable con dash)
const ENEMY_STRIKE = 0.2;
const ENEMY_RECOVER = 0.7;
const ENEMY_STAGGER = 0.35;

// Variante con armadura (nivel 6): mas vida, ataca antes y mas fuerte. La armadura resta ARMOR_ABSORB al dano de cada golpe
// (minimo ARMOR_MIN) salvo que el jugador lleve la espada de acero, que la atraviesa.
const ARMORED = { hp: 8, windup: 0.32, reach: 104, chaseSpeed: 150, damage: 2, stagger: 0.12 };
const ARMOR_ABSORB = 1;
const ARMOR_MIN = 0.5;

// Tipos de enemigo (kind). Cada uno tiene su spritesheet `${tex}_idle|run|attack|hurt`.
//  basic / armor: ver arriba. height = alto aproximado del sprite (barra de vida y signo de alerta).
//  scorpion (desierto): bajito y rapido, su aguijon llega lejos pero avisa poco.
//  wolf (bosque nevado): rapido, con colmillos que alcanzan lejos y poco aviso; suelen venir en manada.
//  mummy (desierto): empieza enterrado (solo se ve un monton de arena, no se le puede golpear) y emerge al acercarte.
const KINDS = {
  basic: { tex: 'enemy', hp: ENEMY_HP, windup: ENEMY_WINDUP, reach: ENEMY_REACH, chaseSpeed: ENEMY_CHASE_SPEED, patrolSpeed: ENEMY_PATROL_SPEED, attackRange: ENEMY_ATTACK_RANGE, recover: ENEMY_RECOVER, damage: 1, sight: ENEMY_SIGHT, height: 134 },
  armor: { tex: 'enemy_armor', hp: ARMORED.hp, windup: ARMORED.windup, reach: ARMORED.reach, chaseSpeed: ARMORED.chaseSpeed, patrolSpeed: ENEMY_PATROL_SPEED, attackRange: ENEMY_ATTACK_RANGE, recover: ENEMY_RECOVER, damage: ARMORED.damage, sight: ENEMY_SIGHT, height: 134 },
  scorpion: { tex: 'scorpion', hp: 3, windup: 0.28, reach: 120, chaseSpeed: 200, patrolSpeed: 90, attackRange: 100, recover: 0.45, damage: 1, sight: 440, height: 84 },
  wolf: { tex: 'wolf', hp: 4, windup: 0.3, reach: 112, chaseSpeed: 235, patrolSpeed: 80, attackRange: 92, recover: 0.5, damage: 1, sight: 470, height: 92 },
  mummy: { tex: 'mummy', hp: 6, windup: 0.42, reach: 100, chaseSpeed: 105, patrolSpeed: 40, attackRange: 80, recover: 0.7, damage: 1, sight: 380, height: 134, buried: true },
};
const MUMMY_WAKE = 190;         // distancia a la que la momia sale de la arena
const MUMMY_RISE = 0.75;        // segundos que tarda en emerger

class Enemy {
  static kindOf(cfg) { return cfg.kind ?? (cfg.armored ? 'armor' : 'basic'); }
  static texOf(cfg) { return KINDS[Enemy.kindOf(cfg)]?.tex; }   // el murcielago ('bat') no es un Enemy: ver bats.js

  // kind: ver KINDS (armored: true equivale a kind 'armor').
  // y: para ponerlo sobre una plataforma (y = su superficie); entonces no se sale de ella (bounds = [x0, x1] a medida)
  constructor(scene, { x, range = 110, armored = false, kind = armored ? 'armor' : 'basic', y = scene.floorY, bounds = null }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    const K = KINDS[kind];
    this.kind = kind;
    this.armored = kind === 'armor';
    // un enemigo que aparece sobre una plataforma no se sale de ella
    this.bounds = bounds ?? (y < scene.floorY - 0.5
      ? scene.platformBoxes().filter((b) => Math.abs(b.top - y) < 1 && x >= b.x0 && x <= b.x1).map((b) => [b.x0, b.x1])[0] ?? null
      : null);
    this.tex = K.tex;
    this.maxHp = K.hp;
    this.windup = K.windup;
    this.reach = K.reach;
    this.chaseSpeed = K.chaseSpeed;
    this.patrolSpeed = K.patrolSpeed;
    this.attackRange = K.attackRange;
    this.recover = K.recover;
    this.damage = K.damage;
    this.sight = K.sight;
    this.height = K.height;
    this.x0 = x;
    this.range = range;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = K.buried ? 'buried' : 'patrol';
    this.dir = -1;          // mira hacia donde llegara el jugador
    this.timer = 0;
    this.pause = 0;
    this.knockVx = 0;
    this.stepFrame = 0;

    this.sprite = scene.add.sprite(x, this.y, `${this.tex}_idle`, 0)
      .setOrigin(0.5, 31 / 32).setScale(SPRITE_SCALE).setDepth(0.5).setFlipX(true);
    this.bar = scene.add.graphics().setDepth(9).setVisible(false);
    if (K.buried) {   // monton de arena bajo el que espera
      this.mound = scene.add.graphics().setDepth(0.4);
      this.mound.fillStyle(0x8a5a2c, 1).fillEllipse(x, this.y - 2, 84, 22);
      this.mound.fillStyle(0xc99a5a, 1).fillEllipse(x, this.y - 6, 60, 16);
      this.sprite.setVisible(false);
    }
    this.mark = scene.add.text(x, this.y - this.height - 16, '!', {
      fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: '#ffd84a', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(9).setVisible(false);
  }

  static buildAnims(scene) {
    Object.values(KINDS).map((k) => k.tex).filter((t) => scene.textures.exists(`${t}_idle`) && scene.textures.exists(`${t}_run`)).forEach((t) => {
      scene.createAnim({ key: `${t}_idle`, frames: scene.anims.generateFrameNumbers(`${t}_idle`, { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
      scene.createAnim({ key: `${t}_run`, frames: scene.anims.generateFrameNumbers(`${t}_run`, { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
    });
  }

  // zona del cuerpo (x, y de los pies) para los golpes del jugador
  overlapsStrike(left, right, feetY) {
    if (this.state === 'buried') return false;
    return this.x + 12 > left && this.x - 12 < right && Math.abs(this.y - feetY) < 70;
  }

  canStep(nx) {
    const s = this.scene;
    if (this.bounds) return nx > this.bounds[0] + 20 && nx < this.bounds[1] - 20;
    return nx > 120 && nx < s.worldWidth - 220 && !s.inPit(nx - 16) && !s.inPit(nx + 16);
  }

  sees(px, py) {
    const dx = px - this.x;
    if (Math.abs(py - this.y) > 100) return false;
    return (Math.abs(dx) < this.sight && dx * this.dir > 0) || Math.abs(dx) < ENEMY_BEHIND;
  }

  alert() {
    this.state = 'chase';
    this.scene.sfx('alert', 0.7);
    this.showMark('#ffd84a', 600);
  }

  showMark(color, ms) {
    this.mark.setColor(color).setVisible(true);
    this.markUntil = this.scene.time.now + ms;
  }

  update(dt, time) {
    if (!this.alive) return;
    const scene = this.scene;
    const p = scene.stickman;
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const sameLevel = Math.abs(p.y - this.y) < 100;
    let moving = false;

    // empuje al recibir un golpe (decae solo)
    if (this.knockVx !== 0) {
      const nx = this.x + this.knockVx * dt;
      if (this.canStep(nx)) this.x = nx;
      this.knockVx = Math.abs(this.knockVx) < 10 ? 0 : this.knockVx * Math.pow(0.001, dt);
    }

    switch (this.state) {
      case 'buried':
        if (adx < MUMMY_WAKE && sameLevel) this.emerge();
        break;
      case 'emerge':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.sprite.setScale(SPRITE_SCALE);
          this.alert();
        }
        break;
      case 'patrol': {
        if (this.sees(p.x, p.y)) { this.alert(); break; }
        if (this.pause > 0) { this.pause -= dt; break; }
        const nx = this.x + this.dir * this.patrolSpeed * dt;
        if (!this.canStep(nx) || Math.abs(nx - this.x0) > this.range) {
          this.dir = -this.dir;
          this.pause = 0.8;
        } else {
          this.x = nx;
          moving = true;
        }
        break;
      }
      case 'chase': {
        if (adx > ENEMY_LOSE || !sameLevel) { this.state = 'patrol'; break; }
        this.dir = dx >= 0 ? 1 : -1;
        if (adx > this.attackRange) {
          const nx = this.x + this.dir * this.chaseSpeed * dt;
          if (this.canStep(nx)) { this.x = nx; moving = true; }
        } else {
          this.state = 'windup';
          this.timer = this.windup;
          this.showMark('#ff4455', this.windup * 1000);
        }
        break;
      }
      case 'windup':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'strike';
          this.timer = ENEMY_STRIKE;
          this.struck = false;
          scene.sfx('attack', 0.6, 0.7);
        }
        break;
      case 'strike': {
        this.timer -= dt;
        if (!this.struck) {
          const inFront = dx * this.dir > -10 && adx < this.reach;
          if (inFront && sameLevel) {
            this.struck = true;
            scene.takeHit(this.x, this.damage);
          }
        }
        if (this.timer <= 0) { this.state = 'recover'; this.timer = this.recover; }
        break;
      }
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'chase';
        break;
      case 'hurt':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.dir = dx >= 0 ? 1 : -1;
          this.state = 'chase';
        }
        break;
    }

    this.draw(moving, time);
  }

  // La momia sale de la arena: nube de polvo, el sprite crece desde el suelo y el monton se deshace
  emerge() {
    const scene = this.scene;
    this.state = 'emerge';
    this.timer = MUMMY_RISE;
    this.dir = scene.stickman.x >= this.x ? 1 : -1;
    scene.sfx('land', 0.6, 0.6);
    scene.cameras.main.shake(180, 0.004);
    const dust = scene.add.particles(this.x, this.y, 'mote', {
      speed: { min: 60, max: 240 }, angle: { min: 200, max: 340 }, lifespan: 600,
      scale: { start: 2.2, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xe8c98a, 0xc99a5a, 0xffffff], emitting: false,
    }).setDepth(3);
    dust.explode(26);
    scene.time.delayedCall(700, () => dust.destroy());
    scene.tweens.add({ targets: this.mound, alpha: 0, scaleY: 0.2, duration: 600, onComplete: () => this.mound.destroy() });
  }

  draw(moving, time) {
    const s = this.sprite;
    if (this.state === 'buried') return;
    if (this.state === 'emerge') {
      const t = 1 - this.timer / MUMMY_RISE;
      s.setVisible(true).setPosition(this.x, this.y).setFlipX(this.dir < 0);
      s.setScale(SPRITE_SCALE, SPRITE_SCALE * Phaser.Math.Easing.Back.Out(t)).setTint(0xd8c090);
      s.anims.play(`${this.tex}_idle`, true);
      return;
    }
    s.setPosition(this.x, this.y).setFlipX(this.dir < 0);
    switch (this.state) {
      case 'windup':
        s.anims.stop();
        s.setTexture(`${this.tex}_attack`, 0);
        s.setTint(Math.floor(time / 90) % 2 ? 0xffffff : 0xffaaaa);
        break;
      case 'strike':
        s.anims.stop();
        s.clearTint();
        s.setTexture(`${this.tex}_attack`, this.timer > ENEMY_STRIKE / 2 ? 1 : 2);
        break;
      case 'recover':
        s.anims.stop();
        s.setTexture(`${this.tex}_attack`, 3);
        break;
      case 'hurt':
        s.anims.stop();
        s.setTexture(`${this.tex}_hurt`, 0);
        break;
      default:
        s.clearTint();
        s.anims.play(moving ? `${this.tex}_run` : `${this.tex}_idle`, true);
        if (moving && this.scene.cameras.main.worldView.contains(this.x, this.y)) {
          const f = s.anims.currentFrame?.index;
          if (f !== this.stepFrame) {
            this.stepFrame = f;
            if (f === 1 || f === 5) this.scene.sfx('step', 0.18, 0.7);
          }
        }
    }
    if (this.mark.visible) {
      this.mark.setPosition(this.x, this.y - this.height - 16 - Math.sin(time / 90) * 3);
      if (this.scene.time.now > this.markUntil) this.mark.setVisible(false);
    }
    if (this.bar.visible) this.bar.setPosition(this.x - 22, this.y - this.height);
  }

  // dir = hacia donde sale despedido (+1 derecha); devuelve true si lo mata
  hurt(damage, dir, knock = 260) {
    if (!this.alive || this.state === 'buried') return false;
    const scene = this.scene;
    this.sprite.setScale(SPRITE_SCALE);   // por si le golpean mientras emerge
    // la armadura amortigua el golpe y casi no deja aturdido; el acero la atraviesa
    const deflected = this.armored && !scene.hasSteel;
    if (deflected) {
      damage = Math.max(ARMOR_MIN, damage - ARMOR_ABSORB);
      knock *= 0.4;
      this.sparks(dir);
    }
    this.hp -= damage;
    scene.sfx(deflected ? 'armor' : 'hit', 0.9, Phaser.Math.FloatBetween(0.9, 1.1));
    scene.cameras.main.shake(70, 0.004);
    this.sprite.setTintFill(deflected ? 0xaab8d0 : 0xffffff);
    scene.time.delayedCall(90, () => { if (this.alive) this.sprite.clearTint(); });
    this.knockVx = dir * knock;
    if (this.hp <= 0) { this.die(dir); return true; }
    this.state = 'hurt';
    this.timer = deflected ? ARMORED.stagger : ENEMY_STAGGER;
    this.mark.setVisible(false);
    this.drawBar();
    return false;
  }

  // Quemadura de la espada de fuego: dano directo (ignora la armadura), sin aturdir
  burn(amount) {
    if (!this.alive || this.state === 'buried') return;
    this.hp -= amount;
    if (this.hp <= 0) { this.die(1); return; }
    this.drawBar();
  }

  // chispas metalicas donde rebota el golpe
  sparks(dir) {
    const scene = this.scene;
    const fx = scene.add.particles(this.x - dir * 14, this.y - 70, 'mote', {
      speed: { min: 80, max: 300 }, angle: { min: dir > 0 ? 150 : -30, max: dir > 0 ? 210 : 30 }, lifespan: 320,
      scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xffe9a0, 0xbcd0ee],
      blendMode: 'ADD', emitting: false,
    }).setDepth(3);
    fx.explode(10);
    scene.time.delayedCall(450, () => fx.destroy());
  }

  drawBar() {
    const w = 44;
    this.bar.clear().setVisible(true);
    this.bar.fillStyle(0x000000, 0.75).fillRect(-2, -2, w + 4, 9);
    this.bar.fillStyle(0x4a1f2e, 1).fillRect(0, 0, w, 5);
    this.bar.fillStyle(0xe03442, 1).fillRect(0, 0, w * Math.max(0, this.hp) / this.maxHp, 5);
  }

  die(dir) {
    const scene = this.scene;
    this.alive = false;
    scene.sfx('enemy_die', 0.9);
    this.bar.destroy();
    this.mark.destroy();
    this.mound?.destroy();
    const s = this.sprite;
    s.anims.stop();
    s.setTexture(`${this.tex}_hurt`, 0).setTint(0xff6677);
    scene.tweens.add({ targets: s, angle: dir * 90, x: s.x + dir * 40, duration: 260, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: s, alpha: 0, delay: 500, duration: 500, onComplete: () => s.destroy() });
    const puff = scene.add.particles(s.x, s.y - 60, 'mote', {
      speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 }, lifespan: 700,
      scale: { start: 1.6, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0xe03442, 0xffd84a, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(3);
    puff.explode(24);
    scene.time.delayedCall(900, () => puff.destroy());
  }
}
