// Murcielago: vuela sobre su zona y, al verte, avisa y se lanza en picado; el golpe te empuja con fuerza (y quita media vida),
// asi que en el plataformeo puede tirarte al vacio. El dash lo esquiva. Misma interfaz que Enemy (x, y, alive, overlapsStrike, hurt, update).
// Por compatibilidad con los golpes del jugador, `y` son los "pies": 60px por debajo del centro del cuerpo (bodyY).

const BAT_HP = 2;
const BAT_SCALE = 3;
const BAT_SIGHT_X = 380;
const BAT_SIGHT_Y = 280;
const BAT_ALERT = 0.5;       // aviso antes de lanzarse (esquivable con dash)
const BAT_DIVE_SPEED = 430;
const BAT_DIVE_TIME = 0.8;
const BAT_RETREAT_SPEED = 240;
const BAT_COOLDOWN = 2;
const BAT_PUSH = 520;        // empuje horizontal (px/s) al golpear al jugador
const BAT_HIT_W = 44;
const BAT_HIT_H = 48;

class Bat {
  // x, y = posicion de vuelo (centro del cuerpo, en coordenadas del mundo); range = cuanto patrulla a cada lado
  constructor(scene, { x, y, range = 90 }) {
    this.scene = scene;
    this.x = x;
    this.homeX = x;
    this.homeY = y;
    this.bodyY = y;
    this.range = range;
    this.phase = Math.random() * 6;
    this.hp = BAT_HP;
    this.maxHp = BAT_HP;
    this.alive = true;
    this.state = 'hover';
    this.dir = -1;
    this.timer = 0;
    this.cooldown = 0;
    this.vx = 0;
    this.vy = 0;
    this.kx = 0;
    this.hit = false;

    this.sprite = scene.add.sprite(x, y, 'bat_fly', 0).setScale(BAT_SCALE).setDepth(0.6);
    this.sprite.play('bat_fly');
    this.bar = scene.add.graphics().setDepth(9).setVisible(false);
    this.mark = scene.add.text(x, y - 50, '!', {
      fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: '#ff4455', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(9).setVisible(false);
  }

  get y() { return this.bodyY + 60; }

  static preload(scene) {
    scene.load.spritesheet('bat_fly', 'assets/bat_fly.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('bat_dive', 'assets/bat_dive.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('bat_hurt', 'assets/bat_hurt.png', { frameWidth: 32, frameHeight: 32 });
  }

  static buildAnims(scene) {
    scene.createAnim({ key: 'bat_fly', frames: scene.anims.generateFrameNumbers('bat_fly', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
  }

  overlapsStrike(left, right, feetY) {
    return this.x + 22 > left && this.x - 22 < right && Math.abs(this.y - feetY) < 70;
  }

  update(dt, time) {
    if (!this.alive) return;
    const scene = this.scene;
    const p = scene.stickman;
    const chestY = p.y - 60;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.kx !== 0) {   // empuje al recibir un golpe (decae solo)
      this.x += this.kx * dt;
      this.kx = Math.abs(this.kx) < 10 ? 0 : this.kx * Math.pow(0.001, dt);
    }

    switch (this.state) {
      case 'hover': {
        this.x = this.homeX + Math.sin(time / 1100 + this.phase) * this.range;
        this.bodyY = this.homeY + Math.sin(time / 380 + this.phase) * 8;
        this.dir = p.x >= this.x ? 1 : -1;
        const sees = Math.abs(p.x - this.x) < BAT_SIGHT_X && Math.abs(chestY - this.bodyY) < BAT_SIGHT_Y;
        if (sees && this.cooldown <= 0) {
          this.state = 'alert';
          this.timer = BAT_ALERT;
          this.mark.setVisible(true);
          scene.sfx('alert', 0.6, 1.6);
        }
        break;
      }
      case 'alert':
        this.timer -= dt;
        this.dir = p.x >= this.x ? 1 : -1;
        this.sprite.x = this.x + Math.sin(time / 25) * 2;   // tiembla antes de lanzarse
        if (this.timer <= 0) {
          const dx = p.x - this.x;
          const dy = chestY - this.bodyY;
          const len = Math.hypot(dx, dy) || 1;
          this.vx = (dx / len) * BAT_DIVE_SPEED;
          this.vy = (dy / len) * BAT_DIVE_SPEED;
          this.state = 'dive';
          this.timer = BAT_DIVE_TIME;
          this.hit = false;
          this.mark.setVisible(false);
          scene.sfx('dash', 0.5, 1.8);
        }
        break;
      case 'dive':
        this.timer -= dt;
        this.x += this.vx * dt;
        this.bodyY += this.vy * dt;
        this.dir = this.vx >= 0 ? 1 : -1;
        if (!this.hit && Math.abs(p.x - this.x) < BAT_HIT_W && Math.abs(chestY - this.bodyY) < BAT_HIT_H) {
          this.hit = true;
          scene.takeHit(this.x, 1, BAT_PUSH);
        }
        if (this.timer <= 0) this.state = 'retreat';
        break;
      case 'retreat': {
        const dx = this.homeX - this.x;
        const dy = this.homeY - this.bodyY;
        const len = Math.hypot(dx, dy);
        if (len < 8) {
          this.state = 'hover';
          this.cooldown = BAT_COOLDOWN;
        } else {
          this.x += (dx / len) * BAT_RETREAT_SPEED * dt;
          this.bodyY += (dy / len) * BAT_RETREAT_SPEED * dt;
          this.dir = dx >= 0 ? 1 : -1;
        }
        break;
      }
      case 'hurt':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'retreat';
        break;
    }

    this.draw();
  }

  draw() {
    const s = this.sprite;
    if (this.state !== 'alert') s.x = this.x;
    s.y = this.bodyY;
    s.setFlipX(this.dir < 0);
    if (this.state === 'dive') {
      s.anims.stop();
      s.setTexture('bat_dive', 0);
    } else if (this.state === 'hurt') {
      s.anims.stop();
      s.setTexture('bat_hurt', 0);
    } else {
      s.anims.play('bat_fly', true);
    }
    if (this.mark.visible) this.mark.setPosition(this.x, this.bodyY - 52);
    if (this.bar.visible) this.bar.setPosition(this.x - 22, this.bodyY - 44);
  }

  hurt(damage, dir, knock = 260) {
    if (!this.alive) return false;
    const scene = this.scene;
    this.hp -= damage;
    scene.sfx('hit', 0.9, Phaser.Math.FloatBetween(1.2, 1.4));
    scene.cameras.main.shake(70, 0.004);
    this.sprite.setTintFill(0xffffff);
    scene.time.delayedCall(90, () => { if (this.alive) this.sprite.clearTint(); });
    this.kx = dir * knock;
    this.mark.setVisible(false);
    if (this.hp <= 0) { this.die(dir); return true; }
    this.state = 'hurt';
    this.timer = 0.35;
    this.cooldown = BAT_COOLDOWN;
    this.drawBar();
    return false;
  }

  // Quemadura de la espada de fuego: dano directo, sin aturdir
  burn(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) { this.die(1); return; }
    this.drawBar();
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
    scene.sfx('enemy_die', 0.8, 1.4);
    this.bar.destroy();
    this.mark.destroy();
    const s = this.sprite;
    s.anims.stop();
    s.setTexture('bat_hurt', 0).setTint(0xff6677);
    scene.tweens.add({ targets: s, angle: dir * 540, x: s.x + dir * 60, y: s.y + 240, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    const puff = scene.add.particles(s.x, s.y, 'mote', {
      speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 }, lifespan: 600,
      scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0xb06cff, 0xff4455, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(3);
    puff.explode(18);
    scene.time.delayedCall(800, () => puff.destroy());
  }
}
