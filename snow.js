// Nieve que cae sobre el nivel (LEVELS[i].snow). Los copos son del primer plano (fijos a la camara) y empiezan siendo pocos:
// la nevada se intensifica durante SNOW_RAMP segundos.
//  snow: true        -> nevada normal.
//  snow: 'blizzard'  -> ventisca: muchisimos copos, viento fuerte, velo blanco y sonido de viento.
//  roars: [x, ...]   -> al cruzar cada x suena el rugido lejano del Dragon de Hielo (cada vez mas fuerte): preludio del jefe final.
// Se anade a LevelScene con Object.assign (ver main.js).

const SNOW_RAMP = 12;     // segundos hasta la nevada completa
const SNOW_MODES = {
  normal: { flakes: 160, wind: 60, fall: 1, veil: 0 },
  blizzard: { flakes: 420, wind: 190, fall: 1.7, veil: 0.2 },
};

const SnowMixin = {
  buildSnow() {
    this.snowMode = SNOW_MODES[this.level.snow === 'blizzard' ? 'blizzard' : 'normal'];
    if (!this.textures.exists('snowflake')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
      g.generateTexture('snowflake', 6, 6);
      g.destroy();
    }
    this.snowAge = 0;
    this.snowFlakes = Array.from({ length: this.snowMode.flakes }, () => {
      const size = Phaser.Math.FloatBetween(0.4, 1.1);
      const img = this.add.image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(-HEIGHT, 0), 'snowflake')
        .setScrollFactor(0).setDepth(6).setScale(size * (this.snowMode.veil ? 1.2 : 1), size).setAlpha(0.5 + size * 0.4).setVisible(false);
      return { img, fall: (40 + size * 90) * this.snowMode.fall, phase: Math.random() * 6.28 };
    });
    if (this.snowMode.veil) {
      this.snowVeil = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0xdfeaff, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(5.5).setAlpha(0);
      this.snowWind = this.sound.add('sfx_blizzard', { loop: true, volume: 0 });
      this.snowWind.play();
      this.events.once('shutdown', () => { this.snowWind.stop(); this.snowWind.destroy(); });
    }
    this.roarsLeft = [...(this.level.roars ?? [])];
    this.roarCount = 0;
  },

  updateSnow(dt, time) {
    this.snowAge += dt;
    // calm: la nevada se apaga (cinematica final): los copos dejan de reaparecer y el viento y el velo se desvanecen
    const calm = this.ending?.calm ?? 0;
    const ramp = Math.min(1, this.snowAge / SNOW_RAMP);
    const active = Math.floor(this.snowFlakes.length * ramp);
    const wind = (25 + (this.snowMode.wind - 25) * ramp) * (1 - calm * 0.8);
    this.snowFlakes.forEach((f, i) => {
      if (i >= active || f.done) return;
      const img = f.img;
      img.setVisible(true);
      img.y += f.fall * dt * (1 - calm * 0.5);
      img.x += (wind + Math.sin(time / 700 + f.phase) * 18) * dt;
      if (img.y > HEIGHT + 6) {
        if (calm > 0 && Math.random() < calm) { img.setVisible(false); f.done = true; return; }
        img.y = -6; img.x = Phaser.Math.Between(-60, WIDTH);
      }
      if (img.x > WIDTH + 6) img.x = -6;
    });
    if (this.snowVeil) {
      // el velo respira con las rafagas
      this.snowVeil.setAlpha(this.snowMode.veil * ramp * (1 - calm) * (0.7 + 0.3 * Math.sin(time / 900)));
      this.snowWind.setVolume(0.55 * ramp * (1 - calm) * SFX_VOLUME);
    }
    if (!this.cutscene && this.roarsLeft.length && this.stickman.x >= this.roarsLeft[0]) {
      this.roarsLeft.shift();
      this.roarCount++;
      this.playRoar(this.roarCount);
    }
  },

  // Rugido lejano: la camara tiembla y la pantalla se tine de azul; cada rugido es mas fuerte que el anterior
  playRoar(n) {
    const power = Math.min(1, 0.45 + n * 0.2);
    this.sfx('roar', power);
    this.cameras.main.shake(1800, 0.002 + 0.002 * n);
    this.cameras.main.flash(900, 120, 170, 255, true, undefined, undefined);
  },
};
