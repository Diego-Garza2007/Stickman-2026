const WIDTH = 800;
const HEIGHT = 450;
const GROUND_Y = 380;
const EXIT_MARGIN = 40;     // distancia al borde derecho que dispara el cambio de escena
const SPEED = 220;
const SPRITE_SCALE = 4;
const GRAVITY = 1800;
const JUMP_VELOCITY = -620;
const JUMP_CUT = 0.45;      // al soltar la tecla en la subida, se recorta el salto
const LAND_TIME = 0.1;      // segundos que dura el frame de aterrizaje
const FRAME_RISE = 0;
const FRAME_APEX = 1;
const FRAME_FALL = 2;
const FRAME_LAND = 3;
const DASH_SPEED = 640;
const DASH_DURATION = 0.18; // segundos
const DASH_COOLDOWN = 0.45; // segundos desde que empieza un dash hasta poder repetirlo
const ATTACK_DURATION = 0.29;
const ATTACK_FRAMES = 4;
const SWORD_ATTACK_FRAMES = 5;
const ATTACK_MOVE = 0.3;    // fraccion de velocidad que se conserva mientras se golpea
const HIT_HALF_W = 10;      // mitad del ancho de la caja de colision del personaje (px)
const CROUCH_H = 64;        // alto de la caja agachado (cabe bajo plataformas bajas)
const CROUCH_SPEED = 0.45;  // fraccion de velocidad al caminar agachado
const HIT_H = 116;          // alto de la caja de colision (de los pies a la cabeza)
const PLATFORM_H = 28;      // grosor solido de las plataformas (el dibujo mide 32)
const MAX_HEARTS = 3;
const HALF_HEARTS = MAX_HEARTS * 2; // cada corazon vale 2 mitades; caer o recibir un golpe quita 1
const INVULN_TIME = 1.2;    // segundos sin recibir dano tras un golpe o una caida
const KNOCKBACK = 260;      // empuje horizontal (px/s) al recibir un golpe
const SKILLS = [
  { id: 'slash', name: 'Tajo', key: 'Q', cooldown: 2 },
  { id: 'wave', name: 'Onda', key: 'R', cooldown: 5 },
  { id: 'storm', name: 'Furia de acero', key: 'E', cooldown: 8, req: 'steel' },   // req: reliquia que la desbloquea (ver RELICS)
  { id: 'fire', name: 'Erupcion', key: 'F', cooldown: 7, req: 'fire' },
];
const SLASH_LUNGE = 320;    // impulso hacia delante (px/s) al hacer el tajo
const WAVE_SPEED = 520;
const WAVE_LIFE = 0.9;      // segundos que viaja la onda
const SWORD_PICKUP_RANGE = 34;
const SWORD_SCALE = 3;
const ALTAR_TOP = GROUND_Y - 28; // superficie del altar dibujado en sword_shrine.png
const SWORD_REACH = 105;    // alcance del golpe basico con espada (sin espada: PUNCH_REACH)
const PUNCH_REACH = 70;
const SLASH_REACH = 130;
const DAMAGE = { punch: 1, sword: 2, slash: 3, wave: 2 };
const DAMAGE_STEEL = { sword: 3, slash: 5, wave: 3, storm: 4 };
const DAMAGE_FIRE = { sword: 4, slash: 6, wave: 4, storm: 5, eruption: 6 };   // la espada de fuego conserva el acero y suma un punto mas
const DASH_SPEED_FIRE = 820;        // el dash de fuego llega mas lejos (820 x 0.22s = 180px frente a 115px) y deja un rastro de llamas
const DASH_DURATION_FIRE = 0.22;
const TRAIL_LIFE = 1.4;             // segundos que dura cada llama del rastro
const TRAIL_DAMAGE = 2;
const BURN_TIME = 2;                // la espada de fuego prende a los enemigos: BURN_DAMAGE cada BURN_TICK durante BURN_TIME segundos
const BURN_TICK = 0.5;
const BURN_DAMAGE = 0.5;
const ERUPTION_PILLARS = 6;
const STORM_REACH = 175;    // radio del torbellino de la Furia de acero     // con el Amuleto de Acero la espada pega mas fuerte
const STEEL_REACH = { sword: 120, slash: 150 };
const SFX = ['jump', 'land', 'step', 'dash', 'attack', 'slash', 'wave', 'hurt', 'fall', 'death', 'ready', 'win', 'sword', 'hum', 'hit', 'enemy_die', 'alert', 'amulet_appear', 'amulet_equip', 'clang', 'armor', 'flame', 'roar', 'blizzard'];
const SFX_VOLUME = 0.6;
const LOAD_STALL_MS = 6000;   // sin avanzar la barra de carga durante este tiempo se reintenta
const LOAD_MAX_TRIES = 3;
const NPC_TALK_RANGE = 230; // distancia a la que el NPC empieza a hablar

const DEATH_MESSAGES = [
  'El suelo te echaba de menos.',
  'Eso fue... una decision.',
  'Los palitos tambien se rompen.',
  'Intentalo otra vez, campeon.',
  'Casi. Bueno, no tanto.',
  'La gravedad gana de nuevo.',
  'Tranquilo, nadie vio eso.',
  'Hasta el sabio hubiera esquivado eso.',
  'Pista: el dash existe por algo.',
  'Un corazon menos, una leccion mas.',
  'El vacio te manda saludos.',
  'Respira hondo y vuelve a intentarlo.',
];

// Reliquias que sueltan los jefes (boss.relic en levels.js). Cada una lanza la cinematica de playRelicCutscene y concede mejoras.
//  tex / hud: sprite del objeto e icono del HUD; skill: id de la habilidad que se muestra al terminarla;
//  from / to: la espada antes y despues de la forja; owned(): ya se tiene (entonces no hay cinematica).
const RELICS = {
  steel: {
    tex: 'amulet', hud: 'amuletHud', skill: 'storm',
    tints: [0xffffff, 0xcfe4ff, 0x9fd0ff, 0xffd84a], glow: 0xaed4ff, rays: 0xcfe6ff, rings: [0xcfe4ff, 0x9fd0ff, 0xffffff, 0xffd84a], flash: [190, 225, 255],
    title: '¡AMULETO DE ACERO!', sub: 'Lo guardaba el Guardian de la Cima', titleColor: '#eaf4ff', titleStroke: '#16243d', subColor: '#9fd8ff',
    from: ['sword', 6], to: 'sword_steel', title2: 'TU ESPADA AHORA ES DE ACERO',
    stats: 'Golpe 2→3   Tajo 3→5   Onda 2→3   Nueva: Furia de acero (E)',
    done: '¡Espada de acero conseguida!\nNueva habilidad: Furia de acero (E)',
    give: (scene) => { Progress.giveSteel(); scene.hasSteel = true; },
    owned: () => Progress.hasSteel(),
  },
  fire: {
    tex: 'ember', hud: 'emberHud', skill: 'fire',
    tints: [0xffffff, 0xffd23a, 0xff8a1e, 0xff4a1a], glow: 0xff9a40, rays: 0xffc070, rings: [0xffe08a, 0xff8a1e, 0xffffff, 0xff4a1a], flash: [255, 190, 90],
    title: '¡NUCLEO DE FUEGO!', sub: 'Arrancado del corazon del Gusano de Brasas', titleColor: '#fff1cc', titleStroke: '#4a1408', subColor: '#ffb060',
    from: ['sword_steel', 0], to: 'sword_fire', title2: 'TU ESPADA ARDE',
    stats: 'Quema a los enemigos   Dash de fuego   Nueva: Erupcion (F)',
    done: '¡Espada de fuego conseguida!\nNueva habilidad: Erupcion (F)   Dash de fuego',
    give: (scene) => { Progress.giveFire(); scene.hasFire = true; },
    owned: () => Progress.hasFire(),
  },
};

class LevelScene extends Phaser.Scene {
  constructor() {
    super('Level');
  }

  // data.levelIndex: posicion en LEVELS (0 = primer nivel)
  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
    this.level = LEVELS[this.levelIndex];
    this.theme = this.level.theme;
    this.worldWidth = this.level.worldWidth;
    // la escena se reutiliza entre niveles: hay que limpiar lo que quedo del anterior
    this.npc = null;
    this._boxes = null;
    this.dying = false;
    this.sword = null;
    this.shrine = null;
    this.enemies = [];
    this.boss = null;
    this.bossDown = false;
    this.arenaLeft = null;   // la arena del jefe se cierra por detras: limite izquierdo del jugador
    this.strike = null;
    this.stepFrame = 0;
    this.projectiles = [];
    this.cd = { slash: 0, wave: 0, storm: 0, fire: 0 };
    this.burning = new Map();   // enemigo -> { t, tick, ember } (espada de fuego)
    this.fireTrail = [];        // llamas que deja el dash de fuego
    this.dashId = 0;
    this.trailHit = new Map();  // enemigo -> dashId del ultimo dash que le hizo dano
    this.cutscene = null;    // animacion del amuleto en curso (el jugador no controla nada)
    this.house = null;       // casa con anciano (house.js)
    this.interior = null;
    this.dialog = null;
    this.houseCd = 0;
    this.crouching = false;
    this.hitH = HIT_H;
    this.spikes = [];        // pinchos y pisos falsos (traps.js)
    this.fakes = [];
    this.snowFlakes = null;  // nevada (snow.js)
    this.heart = null;       // Corazon de Escarcha del final (dragon.js)
    this.heartDraw = null;
    this.ending = null;
    this.leavingHouse = false;
    this.failed = false;
    // las vidas son globales: pasan de un nivel al siguiente; solo se rellenan al empezar una partida nueva
    if (data.freshRun || Progress.hp === null || this.level.boss) Progress.hp = HALF_HEARTS; // el jefe siempre se pelea con la vida llena
  }

  preload() {
    this.load.maxParallelDownloads = 6;
    this.buildLoadingBar();
    ['run', 'idle', 'jump', 'attack', 'dash', 'crouch'].forEach((name) => {
      this.load.spritesheet(`stickman_${name}`, `assets/stickman_${name}.png`, { frameWidth: 32, frameHeight: 32 });
    });
    this.load.spritesheet('stickman_sword_attack', 'assets/stickman_sword_attack.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('npc_sage', 'assets/npc_sage.png', { frameWidth: 32, frameHeight: 32 });
    loadBackground(this, this.theme);
    SFX.forEach((name) => this.load.audio(`sfx_${name}`, `assets/sfx/${name}.wav`));
    this.load.spritesheet('sword', 'assets/sword.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('stickman_steel_attack', 'assets/stickman_steel_attack.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('amulet', 'assets/amulet.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('sword_steel', 'assets/sword_steel.png');
    this.load.spritesheet('stickman_fire_attack', 'assets/stickman_fire_attack.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('ember', 'assets/ember.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('sword_fire', 'assets/sword_fire.png');
    if (this.level.boss?.kind === 'worm') SandWorm.preload(this);
    else if (this.level.boss?.kind === 'dragon') Dragon.preload(this);
    else if (this.level.boss) this.load.spritesheet('boss', 'assets/boss.png', { frameWidth: 64, frameHeight: 64 });
    // cada tipo de enemigo del nivel carga su propio juego de spritesheets
    if (this.level.enemies.some((e) => e.kind === 'bat')) Bat.preload(this);
    new Set(this.level.enemies.map((e) => Enemy.texOf(e)).filter(Boolean)).forEach((tex) => {
      ['idle', 'run', 'attack', 'hurt'].forEach((name) => {
        this.load.spritesheet(`${tex}_${name}`, `assets/${tex}_${name}.png`, { frameWidth: 32, frameHeight: 32 });
      });
    });
    if (this.level.house) this.load.spritesheet('npc_elder', 'assets/npc_elder.png', { frameWidth: 32, frameHeight: 32 });
    if (this.level.sword) {
      this.load.image('sword_shrine', 'assets/bg/sword_shrine.png');
      this.load.image('sword_beam', 'assets/bg/sword_beam.png');
    }
  }

  // Barra de carga: sin ella, mientras se descargan los recursos del nivel la pantalla se ve negra y parece colgada
  buildLoadingBar() {
    this.cameras.main.setBackgroundColor(0x0b1020);
    const text = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, 'Cargando...', {
      fontFamily: 'monospace', fontSize: '18px', color: '#e6eeff',
    }).setOrigin(0.5);
    const box = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 8, 304, 14, 0x1a2440).setStrokeStyle(2, 0x5a6a9a);
    const bar = this.add.rectangle(WIDTH / 2 - 148, HEIGHT / 2 + 8, 296, 8, 0x7fa8ff).setOrigin(0, 0.5).setScale(0, 1);
    const onProgress = (v) => bar.setScale(v, 1);
    const onError = (file) => console.error(`No se pudo cargar ${file.src}`);
    this.load.on('progress', onProgress);
    this.load.on('loaderror', onError);
    // Si una descarga se queda colgada (el servidor local no responde) la barra se congela para siempre: si no avanza en
    // LOAD_STALL_MS se reinicia la escena, y lo ya descargado esta en cache, asi que solo se repite lo que faltaba.
    let lastProgress = -1;
    let lastChange = Date.now();
    const watchdog = window.setInterval(() => {
      if (this.load.progress !== lastProgress) { lastProgress = this.load.progress; lastChange = Date.now(); return; }
      if (Date.now() - lastChange < LOAD_STALL_MS) return;
      window.clearInterval(watchdog);
      const tries = (this.sys.settings.data.loadTries ?? 0) + 1;
      console.warn(`La carga se quedo en ${Math.round(lastProgress * 100)}% (intento ${tries}/${LOAD_MAX_TRIES})`);
      if (tries >= LOAD_MAX_TRIES) {
        text.setText('No se pudo cargar el nivel.\nRevisa que el servidor siga abierto y pulsa F5.');
        return;
      }
      this.load.reset();
      this.scene.restart({ ...this.sys.settings.data, loadTries: tries });
    }, 1000);
    // si todo ya estaba en cache el cargador no emite 'complete': por eso se limpia al empezar create()
    this.loadUI = () => {
      window.clearInterval(watchdog);
      this.load.off('progress', onProgress);
      this.load.off('loaderror', onError);
      [text, box, bar].forEach((o) => o.destroy());
      this.loadUI = null;
    };
    this.load.once('complete', () => this.loadUI?.());
  }

  // Si algo falla al construir el nivel se muestra el error en pantalla (y en la consola) en vez de dejarla en negro
  create() {
    this.loadUI?.();
    try {
      this.buildLevel();
    } catch (err) {
      console.error(err);
      this.failed = true;
      this.cameras.main.resetFX();
      this.cameras.main.setBackgroundColor(0x2a0a12);
      this.add.text(WIDTH / 2, HEIGHT / 2, `Error al cargar el nivel ${this.level.id}:\n${err.message}\n\nEsc: volver al menu`, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffd0d0', align: 'center', wordWrap: { width: WIDTH - 60 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
    }
  }

  buildLevel() {
    this.layers = buildBackground(this, this.theme, this.worldWidth, this.level.pits, this.level.skyOnly).layers;
    buildPlatforms(this, this.theme, this.level.platforms);
    buildHills(this, this.theme, this.level.hills);
    this.transitioning = false;

    this.createAnim({
      key: 'run',
      frames: this.anims.generateFrameNumbers('stickman_run', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });

    this.createAnim({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('stickman_idle', { start: 0, end: 5 }),
      frameRate: 5,
      repeat: -1,
    });

    this.createAnim({
      key: 'crouch_walk',
      frames: this.anims.generateFrameNumbers('stickman_crouch', { start: 1, end: 4 }),
      frameRate: 8,
      repeat: -1,
    });

    this.createAnim({
      key: 'dash',
      frames: this.anims.generateFrameNumbers('stickman_dash', { start: 0, end: 2 }),
      frameRate: 18,
      repeat: -1,
    });

    // el origen apunta a la fila de los pies (30 de 32) para que pise el suelo
    this.floorY = GROUND_Y + 8;
    this.vy = 0;
    this.landTimer = 0;
    this.jumpCut = false;
    this.grounded = true;
    const start = this.level.start ?? { x: 80, y: this.floorY };
    this.lastSafe = { x: start.x, y: start.y };
    this.attackTime = 0;
    this.dashTime = 0;
    this.dashDir = 1;
    this.dashCooldown = 0;
    this.ghostTimer = 0;
    this.invuln = 0;
    this.knockVx = 0;
    this.stickman = this.add.sprite(start.x, start.y, 'stickman_idle', 0)
      .setOrigin(0.5, 31 / 32)
      .setScale(SPRITE_SCALE);

    const cam = this.cameras.main;
    cam.setBounds(0, -this.level.rise, this.worldWidth, HEIGHT + this.level.rise);
    cam.centerOn(start.x, start.y);
    cam.startFollow(this.stickman, true, 0.12, 0.12);
    cam.fadeIn(400);

    this.add.text(16, 12, `Nivel ${this.level.id}/${LEVELS.length} - ${this.level.name}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(10);

    this.buildMenuButton();
    this.buildHearts();
    if (this.level.grantSword) Progress.giveSword();
    this.hasSword = Progress.hasSword();
    this.hasSteel = Progress.hasSteel();
    this.hasFire = Progress.hasFire();
    this.buildSkillHud();
    this.buildAmuletHud();
    if (this.level.sword) {
      this.buildShrine(this.level.sword);
      if (!this.hasSword) this.buildSword(this.level.sword);
    }
    this.buildMuteLabel();
    if (this.level.enemies.length) {
      Enemy.buildAnims(this);
      if (this.level.enemies.some((e) => e.kind === 'bat')) Bat.buildAnims(this);
      this.enemies = this.level.enemies.map((cfg) => (cfg.kind === 'bat' ? new Bat(this, cfg) : new Enemy(this, cfg)));
    }
    if (this.level.boss) {
      const BossClass = { worm: SandWorm, dragon: Dragon }[this.level.boss.kind] ?? Boss;
      this.boss = new BossClass(this, this.level.boss);
      this.enemies.push(this.boss);
    } else {
      this.buildExitMarker();
    }
    if (this.level.npc) this.buildNpc(this.level.npc);
    if (this.level.house) this.buildHouse(this.level.house);
    this.buildTraps(this.level);
    if (this.level.snow) this.buildSnow();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,S,W,SPACE,Q,R,E,F,K,C,SHIFT,M,ESC,ENTER');
    // golpe basico: clic izquierdo (se ignora si el clic es sobre un boton, como "Salir")
    this.clickAttack = false;
    this.input.on('pointerdown', (pointer, over) => {
      if (pointer.leftButtonDown() && over.length === 0) this.clickAttack = true;
    });
  }

  update(time, delta) {
    if (this.failed) return;
    const dt = delta / 1000;

    if (this.transitioning) {
      if (!this.dying) this.stickman.anims.play('idle', true);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      this.sound.mute = !this.sound.mute;
      this.muteLabel.setVisible(this.sound.mute);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.goTo('Menu');
      return;
    }

    if (this.cutscene) {
      this.updateCutsceneBody(dt);
      if (this.cutscene.keepBoss) this.boss.update(dt, time);   // la entrada del dragon es una cinematica que el propio jefe dirige
      if (this.snowFlakes) this.updateSnow(dt, time);
      this.heartDraw?.(time);
      this.updateParallax(time);
      return;
    }

    // Direccion pedida
    const leftKeys = [this.cursors.left, this.keys.A];
    const rightKeys = [this.cursors.right, this.keys.D];
    let dir = 0;
    if (leftKeys.some((k) => k.isDown)) dir -= 1;
    if (rightKeys.some((k) => k.isDown)) dir += 1;

    // Dash: boton dedicado (Shift / K / C), hacia donde se mueve o, si esta quieto, hacia donde mira
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    const dashPressed = [this.keys.SHIFT, this.keys.K, this.keys.C].some((k) => Phaser.Input.Keyboard.JustDown(k));
    if (dashPressed && this.dashCooldown <= 0 && this.dashTime <= 0) {
      this.dashTime = this.hasFire ? DASH_DURATION_FIRE : DASH_DURATION;
      this.dashId++;
      if (this.hasFire) this.sfx('flame', 0.5, 1.3); else this.sfx('dash', 0.8);
      this.dashCooldown = DASH_COOLDOWN;
      this.dashDir = dir !== 0 ? dir : (this.stickman.flipX ? -1 : 1);
      this.ghostTimer = 0;
      this.attackTime = 0; // el dash cancela el golpe
    }

    // Golpe
    const attackPressed = this.clickAttack;
    this.clickAttack = false;
    const slashPressed = Phaser.Input.Keyboard.JustDown(this.keys.Q);
    const wavePressed = Phaser.Input.Keyboard.JustDown(this.keys.R);
    this.cd.slash = Math.max(0, this.cd.slash - dt);
    this.cd.wave = Math.max(0, this.cd.wave - dt);
    this.cd.storm = Math.max(0, this.cd.storm - dt);
    this.cd.fire = Math.max(0, this.cd.fire - dt);
    const firePressed = Phaser.Input.Keyboard.JustDown(this.keys.F);
    const stormPressed = Phaser.Input.Keyboard.JustDown(this.keys.E);
    if (this.attackTime <= 0 && this.dashTime <= 0) {
      if (attackPressed) this.castBasic();
      else if (this.hasSword && slashPressed && this.cd.slash <= 0) this.castSlash();
      else if (this.hasSword && wavePressed && this.cd.wave <= 0) this.castWave();
      else if (this.hasSteel && stormPressed && this.cd.storm <= 0) this.castStorm();
      else if (this.hasFire && firePressed && this.cd.fire <= 0) this.castEruption();
    }
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.updateStrike();
    const dashing = this.dashTime > 0;
    const attacking = this.attackTime > 0;

    // Agacharse (S / flecha abajo): en el suelo y sin dash ni golpe; si hay un techo bajo encima, sigue agachado
    const downHeld = [this.cursors.down, this.keys.S].some((k) => k.isDown);
    this.crouching = this.grounded && !dashing && !attacking && (downHeld || (this.crouching && !this.canStand()));
    this.hitH = this.crouching ? CROUCH_H : HIT_H;

    // Movimiento horizontal
    let vx = dir * SPEED;
    if (this.crouching) vx *= CROUCH_SPEED;
    if (attacking) vx *= ATTACK_MOVE;
    if (dashing) {
      vx = this.dashDir * (this.hasFire ? DASH_SPEED_FIRE : DASH_SPEED);
      this.dashTime -= dt;
      this.spawnGhost(dt);
    }
    if (dashing) this.stickman.setFlipX(this.dashDir < 0);
    else if (dir !== 0 && !attacking) this.stickman.setFlipX(dir < 0);
    if (this.knockVx !== 0) {
      vx += this.knockVx;
      this.knockVx = Math.abs(this.knockVx) < 10 ? 0 : this.knockVx * Math.pow(0.001, dt);
    }
    const prevX = this.stickman.x;
    this.stickman.x = Phaser.Math.Clamp(prevX + vx * dt, this.arenaLeft ?? 40, this.worldWidth - EXIT_MARGIN);
    this.collideSides(prevX);

    // Salida por la derecha: siguiente escena (o fin del juego en la ultima)
    if (this.reachedExit()) this.onReachEnd();

    // Salto, gravedad y colisiones (suelo con fosos + plataformas solidas)
    const s = this.stickman;
    const jumpPressed = [this.cursors.up, this.keys.SPACE]
      .some((k) => Phaser.Input.Keyboard.JustDown(k));
    const jumpHeld = this.cursors.up.isDown || this.keys.SPACE.isDown;

    // si camina fuera del borde de la plataforma o del suelo, empieza a caer
    if (this.grounded && !this.supportAt(s.x, s.y)) this.grounded = false;

    if (this.grounded && jumpPressed && !dashing && this.canStand()) {
      this.vy = JUMP_VELOCITY;
      this.sfx('jump', 0.7);
      this.jumpCut = false;
      this.grounded = false;
    } else if (!this.grounded && !jumpHeld && this.vy < 0 && !this.jumpCut) {
      this.vy *= JUMP_CUT; // salto corto si se suelta la tecla (una sola vez)
      this.jumpCut = true;
    }

    if (!this.grounded) {
      if (dashing) this.vy = 0; // el dash en el aire flota en linea recta
      else this.vy += GRAVITY * dt;
      const prevY = s.y;
      s.y += this.vy * dt;
      if (this.vy < 0) {
        const ceiling = this.findCeiling(s.x, prevY, s.y);
        if (ceiling !== null) { // se golpea la cabeza con la parte de abajo de una plataforma
          s.y = ceiling + this.hitH;
          this.vy = 0;
        }
      } else {
        const landY = this.findLanding(s.x, prevY, s.y);
        if (landY !== null) {
          if (this.vy > 350) this.sfx('land', Phaser.Math.Clamp(this.vy / 900, 0.3, 0.8));
          s.y = landY;
          this.vy = 0;
          this.grounded = true;
          this.landTimer = LAND_TIME;
        }
      }
      if (s.y > HEIGHT + 80) this.fallIntoPit();
    }
    if (this.grounded && this.isSafeSpot(s.x, s.y)) this.lastSafe = { x: s.x, y: s.y };

    // parpadeo mientras dura la invulnerabilidad
    this.invuln = Math.max(0, this.invuln - dt);
    this.stickman.setAlpha(this.invuln > 0 && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);

    // el sprite de golpe con espada es de 48x48 (pies en la fila 46): el origen cambia segun el lienzo
    this.stickman.setOrigin(0.5, attacking && !dashing && this.hasSword ? 47 / 48 : 31 / 32);

    // Animacion segun estado (prioridad: dash > golpe > aire > aterrizaje > correr > idle)
    if (dashing) {
      this.stickman.anims.play('dash', true);
    } else if (attacking) {
      const frames = this.hasSword ? SWORD_ATTACK_FRAMES : ATTACK_FRAMES;
      const frame = Math.min(frames - 1, Math.floor((1 - this.attackTime / ATTACK_DURATION) * frames));
      this.stickman.anims.stop();
      this.stickman.setTexture(this.swordAttackTexture(), frame);
    } else if (!this.grounded) {
      let frame = FRAME_APEX;
      if (this.vy < -150) frame = FRAME_RISE;
      else if (this.vy > 150) frame = FRAME_FALL;
      this.stickman.anims.stop();
      this.stickman.setTexture('stickman_jump', frame);
    } else if (this.crouching) {
      if (dir !== 0) this.stickman.anims.play('crouch_walk', true);
      else { this.stickman.anims.stop(); this.stickman.setTexture('stickman_crouch', 0); }
    } else if (this.landTimer > 0 && dir === 0) {
      this.landTimer -= dt;
      this.stickman.anims.stop();
      this.stickman.setTexture('stickman_jump', FRAME_LAND);
    } else if (dir !== 0) {
      this.landTimer = 0;
      this.stickman.anims.play('run', true);
      const runFrame = this.stickman.anims.currentFrame?.index;
      if (runFrame !== this.stepFrame) {
        this.stepFrame = runFrame;
        if (runFrame === 1 || runFrame === 5) this.sfx('step', 0.3, Phaser.Math.FloatBetween(0.9, 1.1));
      }
    } else {
      this.stickman.anims.play('idle', true);
    }

    if (this.npc) this.updateNpc(time);
    if (this.house) this.updateHouse(dt);
    this.updateTraps(dt, time);
    if (this.snowFlakes) this.updateSnow(dt, time);
    if (this.sword) this.updateSword();
    this.enemies.forEach((e) => e.update(dt, time));
    if (this.shrine) this.updateShrine();
    this.updateProjectiles(dt);
    this.updateFireTrail(dt);
    this.updateBurning(dt);
    this.updateSkillHud();

    this.updateParallax(time);
  }

  // Parallax: cada capa se desplaza una fraccion de lo que se mueve la camara
  updateParallax(time) {
    const scrollX = this.cameras.main.scrollX;
    this.layers.forEach(({ ts, factor, drift }) => {
      ts.tilePositionX = Math.round(scrollX * factor + drift * (time / 1000));
    });
  }

  swordAttackTexture() {
    if (!this.hasSword) return 'stickman_attack';
    if (this.hasFire) return 'stickman_fire_attack';
    return this.hasSteel ? 'stickman_steel_attack' : 'stickman_sword_attack';
  }

  // Dano / alcance de un golpe de espada segun la espada (hierro, acero o fuego)
  damageOf(kind) {
    if (this.hasFire && DAMAGE_FIRE[kind]) return DAMAGE_FIRE[kind];
    return this.hasSteel && DAMAGE_STEEL[kind] ? DAMAGE_STEEL[kind] : DAMAGE[kind];
  }

  reachOf(kind, base) {
    return this.hasSteel && STEEL_REACH[kind] ? STEEL_REACH[kind] : base;
  }

  // Las animaciones son globales: solo se crean la primera vez que se entra a un nivel.
  // Una animacion sin frames (la textura aun no estaba cargada) se descarta: si se guardara, romperia al usarla despues.
  createAnim(config) {
    if (!this.anims.exists(config.key) && config.frames.length) this.anims.create(config);
  }

  // Estela azulada que se desvanece detras del personaje durante el dash
  spawnGhost(dt) {
    this.ghostTimer -= dt;
    if (this.ghostTimer > 0) return;
    this.ghostTimer = 0.04;
    const s = this.stickman;
    const ghost = this.add.image(s.x, s.y, s.texture.key, s.frame.name)
      .setOrigin(0.5, 31 / 32).setScale(SPRITE_SCALE).setFlipX(s.flipX)
      .setTint(this.hasFire ? 0xff7a2a : 0x66ccff).setAlpha(0.55).setDepth(-0.5);
    if (this.hasFire) this.addTrailFlame(s.x, s.y);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
  }

  buildNpc({ x, lines }) {
    this.createAnim({
      key: 'sage_idle',
      frames: this.anims.generateFrameNumbers('npc_sage', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    // mira hacia donde llega el jugador y queda detras de el al cruzarse
    const sprite = this.add.sprite(x, this.floorY, 'npc_sage', 0)
      .setOrigin(0.5, 31 / 32).setScale(SPRITE_SCALE).setFlipX(true).setDepth(-1);
    sprite.play('sage_idle');

    // signo de exclamacion que rebota mientras el jugador esta lejos
    const hint = this.add.text(x, this.floorY - 150, '!', {
      fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffd84a',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: hint, y: hint.y - 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // globo de dialogo (el texto se escribe letra a letra al aparecer)
    const full = lines.join('\n');
    const text = this.add.text(0, 0, full, {
      fontFamily: 'monospace', fontSize: '15px', color: '#1a1a2e', lineSpacing: 5,
    });
    const pad = 14;
    const bw = text.width + pad * 2;
    const bh = text.height + pad * 2;
    text.setPosition(-bw / 2 + pad, -bh + pad);
    const box = this.add.graphics();
    box.fillStyle(0xfdfdf5, 1).lineStyle(3, 0x1a1a2e, 1);
    box.fillRoundedRect(-bw / 2, -bh, bw, bh, 8).strokeRoundedRect(-bw / 2, -bh, bw, bh, 8);
    box.fillTriangle(-8, 0, 8, 0, 0, 12);
    box.lineStyle(3, 0x1a1a2e, 1).lineBetween(-8, 0, 0, 12).lineBetween(8, 0, 0, 12);
    box.fillStyle(0xfdfdf5, 1).fillRect(-7, -3, 14, 4);
    const bubble = this.add.container(x, this.floorY - 140, [box, text]).setDepth(9).setVisible(false);

    this.npc = { x, sprite, hint, bubble, text, full, talking: false, typer: null };
  }

  updateNpc() {
    const npc = this.npc;
    const near = Math.abs(this.stickman.x - npc.x) < NPC_TALK_RANGE;
    // el sabio mira al jugador
    npc.sprite.setFlipX(this.stickman.x < npc.x);

    if (near && !npc.talking) {
      npc.talking = true;
      npc.hint.setVisible(false);
      npc.bubble.setVisible(true).setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: npc.bubble, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
      npc.text.setText('');
      let n = 0;
      npc.typer?.remove();
      npc.typer = this.time.addEvent({
        delay: 22, repeat: npc.full.length - 1,
        callback: () => npc.text.setText(npc.full.slice(0, ++n)),
      });
    } else if (!near && npc.talking) {
      npc.talking = false;
      npc.typer?.remove();
      npc.bubble.setVisible(false);
      npc.hint.setVisible(true);
    }
  }

  // Salida: borde derecho del nivel o, si el nivel define `exit`, esa posicion (x e y)
  reachedExit() {
    const { exit } = this.level;
    const s = this.stickman;
    if (this.level.boss && !this.bossDown) return false;
    if (!exit) return s.x >= this.worldWidth - EXIT_MARGIN;
    return Math.abs(s.x - exit.x) < 40 && Math.abs(s.y - exit.y) < 40;
  }

  buildExitMarker() {
    const exit = this.level.exit;
    const x = exit ? exit.x : this.worldWidth - 110;
    const base = exit ? exit.y - 8 : GROUND_Y; // donde apoya el poste
    const g = this.add.graphics().setDepth(-1);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(x - 4, base - 70, 8, 74);
    if (this.levelIndex < LEVELS.length - 1) {
      g.fillStyle(0xd9a65a, 1);
      g.fillRect(x - 4, base - 78, 62, 26);
      g.fillTriangle(x + 58, base - 78, x + 58, base - 52, x + 76, base - 65);
      g.fillStyle(0x3b2a18, 1);
      g.fillRect(x + 6, base - 67, 36, 4);
      g.fillTriangle(x + 40, base - 74, x + 40, base - 56, x + 52, base - 65);
    } else {
      g.fillStyle(0xe03442, 1);
      g.fillTriangle(x + 4, base - 70, x + 4, base - 36, x + 50, base - 53);
    }
  }

  inPit(x) {
    return this.level.pits.some((p) => x > p.x0 && x < p.x1);
  }

  // Cajas de las plataformas: { x0, x1, top, bottom }
  platformBoxes() {
    if (!this._boxes) {
      this._boxes = [
        ...this.level.platforms.map((p) => ({ x0: p.x, x1: p.x + p.w * 32, top: p.y, bottom: p.y + PLATFORM_H })),
        ...this.level.hills.map((h) => ({ x0: h.x, x1: h.x + h.w, top: h.y, bottom: HEIGHT + 500 })), // llegan hasta el fondo
      ];
    }
    return this._boxes.filter((b) => !b.gone);
  }

  // Se puede levantar si ninguna plataforma queda entre la altura agachada y la de pie
  canStand() {
    const s = this.stickman;
    return !this.platformBoxes().some((b) => this.overlapsX(s.x, b) && b.bottom > s.y - HIT_H + 0.5 && b.top < s.y - CROUCH_H);
  }

  overlapsX(x, b) {
    return x + HIT_HALF_W > b.x0 && x - HIT_HALF_W < b.x1;
  }

  // Que hay bajo los pies en (x, y): 'floor', 'platform' o null
  supportAt(x, y) {
    if (y >= this.floorY - 0.5) return this.inPit(x) ? null : 'floor';
    return this.platformBoxes().some((b) => Math.abs(y - b.top) < 1 && this.overlapsX(x, b)) ? 'platform' : null;
  }

  // Las paredes laterales de las plataformas bloquean el paso
  collideSides(prevX) {
    const s = this.stickman;
    const feet = s.y;
    const head = s.y - this.hitH;
    this.platformBoxes().forEach((b) => {
      const overlapsY = feet > b.top + 0.5 && head < b.bottom - 0.5;
      if (!overlapsY || !this.overlapsX(s.x, b)) return;
      s.x = prevX <= (b.x0 + b.x1) / 2 ? b.x0 - HIT_HALF_W : b.x1 + HIT_HALF_W;
      this.dashTime = Math.min(this.dashTime, 0); // un dash se corta al chocar
    });
  }

  // Al caer de prevY a newY: devuelve la superficie (la mas alta) que se cruza, o null
  findLanding(x, prevY, newY) {
    let best = null;
    this.platformBoxes().forEach((b) => {
      if (this.overlapsX(x, b) && prevY <= b.top + 0.5 && newY >= b.top && (best === null || b.top < best)) best = b.top;
    });
    if (newY >= this.floorY && prevY <= this.floorY && !this.inPit(x) && (best === null || this.floorY < best)) {
      best = this.floorY;
    }
    return best;
  }

  // Al subir de prevY a newY: devuelve el borde inferior de la plataforma que golpea la cabeza, o null
  findCeiling(x, prevY, newY) {
    let best = null;
    this.platformBoxes().forEach((b) => {
      if (this.overlapsX(x, b) && prevY - this.hitH >= b.bottom - 0.5 && newY - this.hitH < b.bottom && (best === null || b.bottom > best)) {
        best = b.bottom;
      }
    });
    return best;
  }

  // Sitio estable para reaparecer: lejos de los bordes de fosos y plataformas
  isSafeSpot(x, y) {
    if (y >= this.floorY - 0.5) {
      // tampoco sirve el suelo encajonado entre plataformas: ahi el personaje queda atrapado
      const boxed = this.platformBoxes().some((b) => b.bottom > this.floorY - HIT_H && x > b.x0 - 80 && x < b.x1 + 80);
      return !boxed && this.level.pits.every((p) => x < p.x0 - 40 || x > p.x1 + 40);
    }
    return this.platformBoxes().some((b) => Math.abs(y - b.top) < 1 && x - 12 >= b.x0 && x + 12 <= b.x1);
  }

  // Caida a un foso: pierde media vida y vuelve al ultimo sitio seguro donde estuvo parado
  fallIntoPit() {
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(200, 20, 10, 5);
    this.sfx('fall', 0.8);
    if (this.loseHalfHeart(this.level.fallDamage)) return;
    this.respawn();
  }

  respawn() {
    const s = this.stickman;
    s.setPosition(this.lastSafe.x, this.lastSafe.y);
    this.vy = 0;
    this.grounded = true;
    this.dashTime = 0;
    this.knockVx = 0;
    this.invuln = INVULN_TIME;
  }

  // Llamar cuando algo golpea al personaje (enemigo, trampa...); fromX = posicion de quien golpea
  takeHit(fromX, damage = 1, knock = KNOCKBACK) {
    if (this.invuln > 0 || this.dashTime > 0 || this.transitioning) return; // el dash esquiva
    this.cameras.main.shake(120, 0.006);
    this.attackTime = 0;
    this.strike = null;
    if (this.loseHalfHeart(damage)) return;
    this.sfx('hurt', 0.8);
    this.invuln = INVULN_TIME;
    this.dashTime = 0;
    this.knockVx = (this.stickman.x < fromX ? -1 : 1) * knock;
    this.vy = -280;
    this.grounded = false;
  }

  // Quita media vida; devuelve true si era la ultima y se acabo la partida
  loseHalfHeart(amount = 1) {
    Progress.hp = Math.max(0, Progress.hp - amount);
    this.drawHearts();
    if (Progress.hp > 0) return false;
    this.playDeath();
    return true;
  }

  // Muerte: el personaje se desploma en rojo, la pantalla se funde a negro y aparece "MORISTE" con una frase al azar
  playDeath() {
    this.transitioning = true;
    this.dying = true;
    this.sfx('death', 0.9);
    if (this.shrine) this.shrine.hum.stop();
    const s = this.stickman;
    s.anims.stop();
    s.setTint(0xff4455).setAlpha(1);
    this.tweens.add({ targets: s, angle: s.flipX ? -90 : 90, y: s.y - 30, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: s, y: s.y + 10, alpha: 0.6, delay: 220, duration: 380, ease: 'Bounce.easeOut' });
    this.cameras.main.shake(300, 0.012);

    const cover = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(50).setAlpha(0);
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, 'MORISTE', {
      fontFamily: 'monospace', fontSize: '64px', fontStyle: 'bold', color: '#e03442', stroke: '#3a0a10', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51).setAlpha(0).setScale(1.4);
    const msg = this.add.text(WIDTH / 2, HEIGHT / 2 + 30, this.pickDeathMessage(), {
      fontFamily: 'monospace', fontSize: '18px', color: '#c9d6f5', align: 'center', wordWrap: { width: WIDTH - 120 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51).setAlpha(0);
    const hint = this.add.text(WIDTH / 2, HEIGHT - 40, 'Enter / clic para reintentar', {
      fontFamily: 'monospace', fontSize: '13px', color: '#6f7a99',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51).setAlpha(0);

    this.tweens.add({ targets: cover, alpha: 1, delay: 500, duration: 700 });
    this.tweens.add({ targets: title, alpha: 1, scale: 1, delay: 1200, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: msg, alpha: 1, delay: 1700, duration: 500 });
    this.tweens.add({ targets: hint, alpha: 1, delay: 2400, duration: 400, yoyo: true, repeat: -1, hold: 400 });

    let leaving = false;
    const retry = () => {
      if (leaving) return;
      leaving = true;
      this.goTo('Level', { levelIndex: this.levelIndex, freshRun: true });
    };
    this.time.delayedCall(2400, () => {
      this.input.once('pointerdown', retry);
      this.input.keyboard.once('keydown-ENTER', retry);
      this.input.keyboard.once('keydown-SPACE', retry);
    });
    this.time.delayedCall(5500, retry);
  }

  // Frase al azar, distinta de la anterior
  pickDeathMessage() {
    const options = DEATH_MESSAGES.filter((m) => m !== Progress.lastDeathMessage);
    Progress.lastDeathMessage = Phaser.Utils.Array.GetRandom(options);
    return Progress.lastDeathMessage;
  }

  // ---- Espada y habilidades ----

  // Texturas de efectos e iconos, dibujadas una sola vez en canvas
  buildSkillTextures() {
    if (this.textures.exists('fx_slash')) return;
    if (!this.textures.exists('mote')) {
      const tex = this.textures.createCanvas('mote', 8, 8);
      const c = tex.getContext();
      const g = c.createRadialGradient(4, 4, 0, 4, 4, 4);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 8, 8);
      tex.refresh();
    }
    // media luna con la punta hacia atras: borde convexo a la derecha
    const crescent = (c, cx, cy, ro, a, k) => {
      const px = cx + ro * Math.cos(a);
      const dy = ro * Math.sin(a);
      const ix = cx - k;
      const ri = Math.hypot(px - ix, dy);
      const b = Math.atan2(dy, px - ix);
      c.beginPath();
      c.arc(cx, cy, ro, -a, a, false);
      c.arc(ix, cy, ri, b, -b, true);
      c.closePath();
    };
    const make = (key, w, h, fn) => {
      const tex = this.textures.createCanvas(key, w, h);
      fn(tex.getContext());
      tex.refresh();
    };
    const gradient = (c, x0, x1, from, to) => {
      const g = c.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, from); g.addColorStop(1, to);
      return g;
    };

    make('fx_slash', 100, 100, (c) => {
      crescent(c, 20, 50, 44, 1.15, 26);
      c.fillStyle = gradient(c, 0, 66, '#6fd8ff', '#ffffff'); c.fill();
    });
    make('fx_wave', 56, 56, (c) => {
      crescent(c, 10, 28, 26, 1.1, 16);
      c.fillStyle = gradient(c, 4, 38, '#ff9a3c', '#fff1b0'); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#7a2e0c'; c.stroke();
    });
    make('fx_slash_steel', 100, 100, (c) => {
      crescent(c, 20, 50, 44, 1.15, 26);
      c.fillStyle = gradient(c, 0, 66, '#8fa3bf', '#ffffff'); c.fill();
      c.lineWidth = 3; c.strokeStyle = '#bfe4ff'; c.stroke();
    });
    make('fx_wave_steel', 56, 56, (c) => {
      crescent(c, 10, 28, 26, 1.1, 16);
      c.fillStyle = gradient(c, 4, 38, '#9fb4d0', '#ffffff'); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#2a4466'; c.stroke();
    });
    make('fx_slash_fire', 100, 100, (c) => {
      crescent(c, 20, 50, 44, 1.15, 26);
      c.fillStyle = gradient(c, 0, 66, '#ff5a1a', '#fff3b0'); c.fill();
      c.lineWidth = 3; c.strokeStyle = '#ffd23a'; c.stroke();
    });
    make('fx_wave_fire', 56, 56, (c) => {
      crescent(c, 10, 28, 26, 1.1, 16);
      c.fillStyle = gradient(c, 4, 38, '#d6280e', '#fff3b0'); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#ffb030'; c.stroke();
    });
    make('icon_fire', 44, 44, (c) => {
      const flame = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
      flame([[22, 3], [30, 16], [35, 26], [30, 39], [22, 41], [14, 39], [9, 28], [14, 18], [17, 24], [19, 12]]);
      c.fillStyle = '#0b1020'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#0b1020'; c.stroke();
      flame([[22, 4], [29, 16], [33, 26], [29, 37], [22, 39], [15, 37], [11, 28], [15, 20], [18, 25], [20, 13]]);
      c.fillStyle = '#ff7a1a'; c.fill();
      flame([[22, 17], [27, 27], [25, 35], [22, 37], [19, 35], [17, 28], [20, 25]]);
      c.fillStyle = '#ffe27a'; c.fill();
    });
    make('icon_slash', 44, 44, (c) => {
      c.lineCap = 'round';
      c.strokeStyle = '#8fe3ff'; c.lineWidth = 5;
      c.beginPath(); c.arc(22, 26, 16, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.strokeStyle = '#0b1020'; c.lineWidth = 8;
      c.beginPath(); c.moveTo(11, 36); c.lineTo(33, 12); c.stroke();
      c.strokeStyle = '#eef4ff'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(11, 36); c.lineTo(33, 12); c.stroke();
      c.strokeStyle = '#d9a65a'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(10, 24); c.lineTo(20, 34); c.stroke();
    });
    make('icon_storm', 44, 44, (c) => {
      c.lineCap = 'round';
      c.strokeStyle = '#0b1020'; c.lineWidth = 7;
      c.beginPath(); c.arc(22, 22, 14, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#cfe4ff'; c.lineWidth = 4;
      c.beginPath(); c.arc(22, 22, 14, 0.3, Math.PI * 1.55); c.stroke();
      c.strokeStyle = '#7ab8e8'; c.lineWidth = 4;
      c.beginPath(); c.arc(22, 22, 14, Math.PI * 1.7, Math.PI * 2.1); c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(22, 6); c.lineTo(28, 14); c.lineTo(16, 14); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(22, 38); c.lineTo(16, 30); c.lineTo(28, 30); c.closePath(); c.fill();
    });
    make('icon_wave', 44, 44, (c) => {
      c.lineCap = 'round'; c.strokeStyle = '#ffd9a0'; c.lineWidth = 2;
      [14, 22, 30].forEach((y) => { c.beginPath(); c.moveTo(3, y); c.lineTo(11, y); c.stroke(); });
      crescent(c, 16, 22, 20, 1.1, 12);
      c.fillStyle = gradient(c, 10, 36, '#ff9a3c', '#fff1b0'); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#7a2e0c'; c.stroke();
    });
  }

  // Espada (sprite assets/sword.png) flotando sobre el altar; al pasar por ella se equipa
  buildSword({ x }) {
    this.createAnim({
      key: 'sword_glint',
      frames: this.anims.generateFrameNumbers('sword', { start: 0, end: 5 }),
      frameRate: 7,
      repeat: -1,
    });
    const y = ALTAR_TOP - 56;
    const holder = this.add.sprite(x, y, 'sword', 0).setScale(SWORD_SCALE).setDepth(2);
    holder.play('sword_glint');
    this.tweens.add({ targets: holder, y: y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.sword = { x, holder };
  }

  // Santuario: parche de fondo distinto (cielo magico, pilares, altar) con haz de luz, particulas y un zumbido ambiental
  buildShrine({ x }) {
    const patch = this.add.image(x, 0, 'sword_shrine').setOrigin(0.5, 0).setDepth(-6);
    let beam = null;
    if (!this.hasSword) {
      beam = this.add.image(x, 0, 'sword_beam').setOrigin(0.5, 0).setDepth(-5.5)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
      this.tweens.add({ targets: beam, alpha: 0.45, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // motas de luz que suben alrededor del altar
    this.add.particles(x, this.floorY, 'mote', {
      x: { min: -120, max: 120 }, y: { min: -260, max: 0 },
      speedY: { min: -30, max: -10 }, speedX: { min: -6, max: 6 },
      lifespan: { min: 2200, max: 3600 }, frequency: 130,
      scale: { start: 1.1, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [0x8fe3ff, 0xffffff, 0xc79bff], blendMode: 'ADD',
    }).setDepth(-4);

    const hum = this.sound.add('sfx_hum', { loop: true, volume: 0 });
    hum.play();
    this.events.once('shutdown', () => { hum.stop(); hum.destroy(); });
    this.shrine = { x, patch, beam, hum };
  }

  // El zumbido se oye mas cerca del altar, y mucho menos cuando la espada ya no esta
  updateShrine() {
    const { x, hum } = this.shrine;
    const near = Phaser.Math.Clamp(1 - Math.abs(this.stickman.x - x) / 650, 0, 1);
    hum.setVolume(near * (this.hasSword ? 0.12 : 0.4) * SFX_VOLUME);
  }

  buildMuteLabel() {
    this.muteLabel = this.add.text(WIDTH - 14, 54, 'sin sonido (M)', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c9d6f5', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10).setVisible(this.sound.mute);
  }

  sfx(name, volume = 1, rate = 1) {
    this.sound.play(`sfx_${name}`, { volume: volume * SFX_VOLUME, rate });
  }

  updateSword() {
    const s = this.stickman;
    if (Math.abs(s.x - this.sword.x) > SWORD_PICKUP_RANGE) return;
    if (s.y < this.floorY - 140) return; // saltando muy alto, pasa por encima
    this.pickUpSword();
  }

  pickUpSword() {
    const { holder } = this.sword;
    this.sword = null;
    this.hasSword = true;
    Progress.giveSword();
    this.tweens.killTweensOf(holder);
    this.tweens.add({ targets: holder, y: holder.y - 40, scale: SWORD_SCALE * 2, alpha: 0, duration: 350, onComplete: () => holder.destroy() });
    this.cameras.main.flash(250, 255, 245, 190);
    this.cameras.main.shake(450, 0.004);
    this.sfx('sword', 1);

    // el santuario reacciona: estallido de luz y el haz se apaga
    const burst = this.add.particles(holder.x, holder.y, 'mote', {
      speed: { min: 60, max: 280 }, angle: { min: 0, max: 360 }, lifespan: 1000,
      scale: { start: 1.8, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0x8fe3ff, 0xffffff, 0xffd84a], blendMode: 'ADD', emitting: false,
    }).setDepth(3);
    burst.explode(45);
    this.time.delayedCall(1300, () => burst.destroy());
    const { beam } = this.shrine;
    if (beam) {
      this.tweens.killTweensOf(beam);
      this.tweens.add({ targets: beam, alpha: 1, duration: 150 });
      this.tweens.add({ targets: beam, alpha: 0, delay: 150, duration: 1200, onComplete: () => beam.destroy() });
      this.shrine.beam = null;
    }

    this.skillHud.filter(({ def }) => !def.req).forEach(({ box }, i) => {
      box.setVisible(true).setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: box, scale: 1, alpha: 1, delay: 200 + i * 120, duration: 260, ease: 'Back.easeOut' });
    });

    const toast = this.add.text(WIDTH / 2, 96, '¡Espada obtenida!\nQ: Tajo   R: Onda   Clic: golpe', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 5, lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: 88, duration: 300 });
    this.tweens.add({ targets: toast, alpha: 0, delay: 2800, duration: 600, onComplete: () => toast.destroy() });
  }

  // ---- Amuleto de Acero ----

  // Icono junto a las habilidades; se muestra una vez conseguido el amuleto
  // true si se tiene la reliquia que pide una habilidad ('steel' | 'fire')
  owns(req) {
    return req === 'steel' ? this.hasSteel : this.hasFire;
  }

  buildAmuletHud() {
    const x = 16 + SKILLS.length * 60 + 22;
    this.amuletHud = this.add.image(x, HEIGHT - 42, 'amulet', 6).setScale(1.4).setScrollFactor(0).setDepth(10).setVisible(this.hasSteel);
    this.emberHud = this.add.image(x + 40, HEIGHT - 42, 'ember', 6).setScale(1.4).setScrollFactor(0).setDepth(10).setVisible(this.hasFire);
  }

  // Texturas de la cinematica (brillo, rayos de luz, onda expansiva, columna de luz), dibujadas una sola vez
  buildAmuletTextures() {
    if (this.textures.exists('fx_rays')) return;
    const make = (key, w, h, fn) => {
      const tex = this.textures.createCanvas(key, w, h);
      fn(tex.getContext());
      tex.refresh();
    };
    make('fx_glow', 128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(200,225,255,0.55)'); g.addColorStop(1, 'rgba(160,200,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    });
    make('fx_rays', 256, 256, (c) => {
      c.translate(128, 128);
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 128);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const half = i % 2 ? 5 : 10;
        c.rotate(Math.PI * 2 / n);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(128, -half); c.lineTo(128, half); c.closePath(); c.fill();
      }
    });
    make('fx_ring', 128, 128, (c) => {
      c.strokeStyle = '#ffffff'; c.lineWidth = 5;
      c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 0.45; c.lineWidth = 2;
      c.beginPath(); c.arc(64, 64, 49, 0, Math.PI * 2); c.stroke();
    });
    make('fx_pillar', 64, 16, (c) => {
      const g = c.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, 'rgba(180,215,255,0)'); g.addColorStop(0.5, 'rgba(235,245,255,0.95)'); g.addColorStop(1, 'rgba(180,215,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 16);
    });
  }

  // El jefe cayo: se abre la arena y aparece la salida (con su reliquia y la cinematica, si aun no la tienes)
  onBossDefeated() {
    this.bossDown = true;
    this.arenaLeft = null;
    if (this.boss.ending) { this.playEnding(); return; }   // el dragon final: cinematica que cierra el juego
    const relic = RELICS[this.level.boss.relic];
    if (!relic || relic.owned()) {
      this.finishBossDefeat('¡Jefe derrotado!\nLa salida esta al final del camino');
      return;
    }
    this.playRelicCutscene(this.boss.x, relic, () => this.finishBossDefeat(relic.done));
  }

  finishBossDefeat(message) {
    this.buildExitMarker();
    this.sfx('win', 0.8);
    const toast = this.add.text(WIDTH / 2, 96, message, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 5, lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: 88, duration: 300 });
    this.tweens.add({ targets: toast, alpha: 0, delay: 3200, duration: 600, onComplete: () => toast.destroy() });
  }

  // Mientras dura la cinematica el jugador no controla nada: solo termina de caer si estaba en el aire
  updateCutsceneBody(dt) {
    const c = this.cutscene;
    const s = this.stickman;
    if (!c.lift && !this.grounded) {
      const prevY = s.y;
      this.vy += GRAVITY * dt;
      s.y += this.vy * dt;
      const landY = this.findLanding(s.x, prevY, s.y);
      if (landY !== null) { s.y = landY; this.vy = 0; this.grounded = true; }
    }
    if (c.lift || this.grounded) s.anims.play('idle', true);
    if (c.anchor) {
      c.attach.forEach(({ o, dy }) => o.setPosition(c.anchor.x, c.anchor.y + dy));
      c.rays.forEach((r) => { r.angle += 24 * dt; });
    }
    this.updateProjectiles(dt);
  }

  // Cinematica al derrotar al jefe: el amuleto surge de sus restos, vuela hasta el jugador y forja la espada en acero.
  // La camara se recoge en dos franjas negras; todo ocurre sobre una pantalla oscurecida.
  playRelicCutscene(bossX, R, onDone) {
    this.buildSkillTextures();   // trae la textura 'mote'
    this.buildAmuletTextures();
    this.createAnim({ key: `${R.tex}_glint`, frames: this.anims.generateFrameNumbers(R.tex, { start: 0, end: 5 }), frameRate: 7, repeat: -1 });

    const cam = this.cameras.main;
    const s = this.stickman;
    const ADD = Phaser.BlendModes.ADD;
    const at = (ms, fn) => this.time.delayedCall(ms, fn);
    const hoverX = Phaser.Math.Clamp(bossX, WIDTH / 2, this.worldWidth - WIDTH / 2);
    const hoverY = this.floorY - 175;
    const BAR = 46;

    // el jugador queda quieto, mirando al amuleto, por encima de la pantalla oscurecida
    this.attackTime = 0; this.dashTime = 0; this.knockVx = 0; this.strike = null; this.invuln = 0;
    s.setAlpha(1).clearTint().setOrigin(0.5, 31 / 32).setFlipX(hoverX < s.x).setDepth(35);
    const c = this.cutscene = { lift: false, anchor: null, attach: [], rays: [] };
    cam.stopFollow();
    cam.pan(hoverX, this.floorY - 120, 1200, 'Sine.easeInOut');

    const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x050818, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(30).setAlpha(0);
    const top = this.add.rectangle(0, 0, WIDTH, BAR, 0x000000, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(45).setScale(1, 0);
    const bottom = this.add.rectangle(0, HEIGHT, WIDTH, BAR, 0x000000, 1).setOrigin(0, 1).setScrollFactor(0).setDepth(45).setScale(1, 0);
    this.tweens.add({ targets: dim, alpha: 0.62, duration: 900 });
    this.tweens.add({ targets: [top, bottom], scaleY: 1, duration: 600, ease: 'Sine.easeOut' });

    const burst = (x, y, n, tints, speed = [80, 320], life = 700) => {
      const e = this.add.particles(x, y, 'mote', {
        speed: { min: speed[0], max: speed[1] }, angle: { min: 0, max: 360 }, lifespan: life,
        scale: { start: 2, end: 0 }, alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', emitting: false,
      }).setDepth(37);
      e.explode(n);
      at(life + 100, () => e.destroy());
    };
    const ring = (x, y, tint, to = 5, dur = 700, delay = 0) => at(delay, () => {
      const r = this.add.image(x, y, 'fx_ring').setDepth(36).setBlendMode(ADD).setTint(tint).setScale(0.3).setAlpha(0.9);
      this.tweens.add({ targets: r, scale: to, alpha: 0, duration: dur, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    });
    const text = (y, str, size, color, stroke) => this.add.text(WIDTH / 2, y, str, {
      fontFamily: 'monospace', fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center',
      stroke, strokeThickness: Math.round(size / 5), lineSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(46).setAlpha(0);
    const STEEL_TINTS = R.tints;

    // 1. el amuleto surge de los restos del jefe entre un haz de luz y rayos giratorios
    const T_RISE = 500;
    const amulet = this.add.sprite(bossX, this.floorY - 70, R.tex, 0).setScale(0.4).setDepth(34).setAlpha(0);
    amulet.play(`${R.tex}_glint`);
    const glow = this.add.image(bossX, 0, 'fx_glow').setDepth(32).setBlendMode(ADD).setTint(R.glow).setScale(0).setAlpha(0);
    const rays = this.add.image(bossX, 0, 'fx_rays').setDepth(32.5).setBlendMode(ADD).setTint(R.rays).setScale(0).setAlpha(0);
    const pillar = this.add.image(bossX, 0, 'fx_pillar').setOrigin(0.5, 1).setDepth(31.5).setBlendMode(ADD)
      .setDisplaySize(0, 800).setAlpha(0);
    c.anchor = amulet;
    c.attach = [{ o: glow, dy: 0 }, { o: rays, dy: 0 }, { o: pillar, dy: 0 }];
    c.rays = [rays];
    at(200, () => this.sfx('amulet_appear', 1));
    at(T_RISE, () => {
      cam.flash(350, ...R.flash);
      cam.shake(1100, 0.006);
      this.tweens.add({ targets: amulet, x: hoverX, y: hoverY, scale: 5, alpha: 1, duration: 1300, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: glow, scale: 4.5, alpha: 0.9, duration: 1200, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: rays, scale: 3.2, alpha: 0.5, duration: 1400, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: pillar, displayWidth: 150, alpha: 0.5, duration: 900, ease: 'Quad.easeOut' });
      [0, 220, 440].forEach((d, i) => ring(hoverX, hoverY, R.rings[i], 4.5, 800, d));
      burst(bossX, this.floorY - 70, 40, STEEL_TINTS, [120, 380], 900);
    });
    at(T_RISE + 1300, () => {
      this.tweens.add({ targets: amulet, y: hoverY - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glow, scale: 5.2, alpha: 0.65, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    // motas de luz que convergen hacia el amuleto
    at(1000, () => this.time.addEvent({
      delay: 35, repeat: 44,
      callback: () => {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const r = Phaser.Math.Between(300, 380);
        const m = this.add.image(amulet.x + Math.cos(a) * r, amulet.y + Math.sin(a) * r * 0.7, 'mote')
          .setDepth(34).setBlendMode(ADD).setTint(Phaser.Utils.Array.GetRandom(STEEL_TINTS)).setScale(2.4);
        this.tweens.add({ targets: m, x: amulet.x, y: amulet.y, scale: 0.4, duration: 600, ease: 'Quad.easeIn', onComplete: () => m.destroy() });
      },
    }));

    // 2. el titulo
    const T_TITLE = 2200;
    const title = text(318, R.title, 40, R.titleColor, R.titleStroke);
    const sub = text(366, R.sub, 15, R.subColor, '#0b1020');
    at(T_TITLE, () => {
      title.setScale(2.6);
      this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut' });
      cam.shake(250, 0.005);
    });
    at(T_TITLE + 600, () => this.tweens.add({ targets: sub, alpha: 1, duration: 500 }));

    // 3. vuela hasta el jugador dejando una estela
    const T_FLY = 4300;
    at(T_FLY, () => {
      this.tweens.killTweensOf([amulet, glow]);
      this.tweens.add({ targets: [title, sub], alpha: 0, duration: 300 });
      cam.pan(s.x, s.y - 80, 900, 'Sine.easeInOut');
      this.sfx('wave', 0.9, 0.6);
      this.tweens.add({ targets: amulet, x: s.x, y: s.y - 80, scale: 1.3, angle: 720, duration: 900, ease: 'Cubic.easeIn' });
      this.tweens.add({ targets: glow, scale: 2.4, duration: 900 });
      this.time.addEvent({
        delay: 28, repeat: 30,
        callback: () => {
          const m = this.add.image(amulet.x, amulet.y, 'mote').setDepth(33).setBlendMode(ADD)
            .setTint(Phaser.Utils.Array.GetRandom(STEEL_TINTS)).setScale(2.2);
          this.tweens.add({ targets: m, alpha: 0, scale: 0, duration: 420, onComplete: () => m.destroy() });
        },
      });
    });

    // 4. el amuleto se funde con el jugador: estallido, el jugador levita y la luz lo envuelve
    const T_ARRIVE = T_FLY + 920;
    at(T_ARRIVE, () => {
      R.give(this);
      this.sfx('amulet_equip', 1);
      cam.flash(600, 255, 255, 255);
      cam.shake(1400, 0.012);
      amulet.destroy();
      const chest = { get x() { return s.x; }, get y() { return s.y - 70; } };
      c.anchor = chest;
      c.lift = true;
      swordY = s.y - 34 - 195;
      [iron, steel, forgeGlow].forEach((o) => o.setPosition(s.x, swordY));
      s.setTint(R.tints[1]);
      this.tweens.add({ targets: s, y: s.y - 34, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: glow, scale: 3.4, alpha: 0.8, duration: 500 });
      this.tweens.add({ targets: rays, scale: 3.8, alpha: 0.5, duration: 700 });
      this.tweens.add({ targets: pillar, displayWidth: 190, alpha: 0.65, duration: 600 });
      [0, 150, 300, 450].forEach((d, i) => ring(s.x, s.y - 70, R.rings[i], 7 + i, 900, d));
      burst(s.x, s.y - 70, 70, STEEL_TINTS, [140, 460], 1100);
    });

    // 5. la espada se forja en acero a golpes de yunque
    const T_FORGE = T_ARRIVE + 1100;
    let swordY = 0;   // se fija al llegar el amuleto, cuando el jugador ya esta en el suelo
    const iron = this.add.image(s.x, swordY, R.from[0], R.from[1]).setDepth(36).setScale(0).setAlpha(0).setAngle(-50);
    const steel = this.add.image(s.x, swordY, R.to).setDepth(36.5).setScale(0).setAlpha(0).setAngle(-50);
    const forgeGlow = this.add.image(s.x, swordY, 'fx_glow').setDepth(35.5).setBlendMode(ADD).setTint(0xffc060).setScale(0).setAlpha(0);
    const title2 = text(72, R.title2, 26, '#ffffff', R.titleStroke);
    const stats = text(104, R.stats, 14, '#ffd84a', '#0b1020');
    const SW = 3.2;
    at(T_FORGE, () => {
      this.tweens.add({ targets: [iron, steel], scale: SW, angle: 0, duration: 600, ease: 'Back.easeOut' });
      this.tweens.add({ targets: iron, alpha: 1, duration: 400 });
      this.tweens.add({ targets: forgeGlow, scale: 2.6, alpha: 0.55, duration: 600 });
      this.sfx('sword', 0.7, 0.8);
    });
    [700, 1250, 1800].forEach((d, k) => at(T_FORGE + d, () => {
      this.sfx('clang', 0.95, 0.9 + 0.14 * k);
      cam.shake(130 + 70 * k, 0.006 + 0.004 * k);
      iron.setTintFill(0xffffff); steel.setTintFill(0xffffff);
      at(80, () => { iron.clearTint(); steel.clearTint(); });
      this.tweens.add({ targets: [iron, steel], scale: SW * 1.22, duration: 70, yoyo: true });
      this.tweens.add({ targets: steel, alpha: (k + 1) / 3, duration: 90 });
      this.tweens.add({ targets: forgeGlow, scale: 4.2, alpha: 0.9, duration: 90, yoyo: true });
      burst(s.x, swordY, 16 + 8 * k, [0xffffff, 0xffe9a0, ...R.tints], [100, 360], 450);
      ring(s.x, swordY, 0xffe9a0, 2.6 + k * 0.5, 450);
    }));
    at(T_FORGE + 1800, () => {
      this.tweens.add({ targets: iron, alpha: 0, duration: 200 });
      this.sfx('amulet_equip', 0.55, 1.25);
      cam.flash(300, 255, 255, 255);
      title2.setScale(1.8);
      this.tweens.add({ targets: title2, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });
      this.tweens.add({ targets: stats, alpha: 1, duration: 600, delay: 500 });
      this.tweens.add({ targets: steel, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // 6. el acero se asienta en el jugador y se devuelve el control
    const T_END = T_FORGE + 4900;
    at(T_END, () => {
      this.tweens.killTweensOf(steel);
      this.tweens.add({ targets: [title2, stats], alpha: 0, duration: 350 });
      this.tweens.add({ targets: steel, x: s.x, y: s.y - 70, scale: 0.6, alpha: 0, angle: 0, duration: 550, ease: 'Cubic.easeIn' });
      this.tweens.add({ targets: [forgeGlow, glow, rays, pillar], alpha: 0, duration: 700 });
      this.sfx('dash', 0.7, 0.6);
    });
    at(T_END + 600, () => {
      cam.flash(250, 220, 235, 255);
      burst(s.x, s.y - 70, 30, STEEL_TINTS, [100, 300], 600);
      s.clearTint();
      this.tweens.add({ targets: s, y: s.y + 34, duration: 380, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: dim, alpha: 0, duration: 700 });
      this.tweens.add({ targets: [top, bottom], scaleY: 0, duration: 600, ease: 'Sine.easeIn' });
    });
    at(T_END + 1000, () => {
      this.sfx('land', 0.6);
      cam.shake(160, 0.006);
      cam.startFollow(s, true, 0.12, 0.12);
      s.setDepth(0);
      this.cutscene = null;
      [dim, top, bottom, iron, steel, forgeGlow, glow, rays, pillar, title, sub, title2, stats].forEach((o) => o.destroy());
      // el amuleto vuela al HUD: aparece junto a las habilidades con un pequeno rebote
      const storm = this.skillHud.find(({ def }) => def.id === R.skill).box;
      storm.setVisible(true).setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: storm, scale: 1, alpha: 1, delay: 250, duration: 400, ease: 'Back.easeOut' });
      this[R.hud].setVisible(true).setScale(0).setAlpha(0);
      this.tweens.add({ targets: this[R.hud], scale: 1.4, alpha: 1, duration: 450, ease: 'Back.easeOut' });
      this.sfx('ready', 0.7, 0.8);
      onDone();
    });
  }

  // Golpe basico (clic izquierdo): con espada llega mas lejos y hace el doble de dano
  castBasic() {
    const f = this.stickman.flipX ? -1 : 1;
    this.attackTime = ATTACK_DURATION;
    this.sfx(this.hasSword ? 'slash' : 'attack', 0.7, Phaser.Math.FloatBetween(0.95, 1.1));
    this.strike = {
      f,
      damage: this.hasSword ? this.damageOf('sword') : DAMAGE.punch,
      reach: this.hasSword ? this.reachOf('sword', SWORD_REACH) : PUNCH_REACH,
      from: 0.08, to: 0.2, knock: 260, hit: new Set(),
    };
    if (this.hasSword) {
      const s = this.stickman;
      const fx = this.add.image(s.x + f * 56, s.y - 66, this.fxKey('fx_slash')).setFlipX(f < 0).setScale(0.5).setDepth(3).setAlpha(0.7);
      this.tweens.add({ targets: fx, scale: this.hasSteel ? 1.15 : 0.95, alpha: 0, duration: 220, delay: 70, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
    }
  }

  fxKey(base) {
    if (this.hasFire) return `${base}_fire`;
    return this.hasSteel ? `${base}_steel` : base;
  }

  // Aplica el dano del golpe en curso a los enemigos que alcanza (una vez por enemigo)
  updateStrike() {
    const k = this.strike;
    if (!k) return;
    if (this.attackTime <= 0) { this.strike = null; return; }
    const elapsed = ATTACK_DURATION - this.attackTime;
    if (elapsed < k.from || elapsed > k.to) return;
    const s = this.stickman;
    const left = k.radial || k.f < 0 ? s.x - k.reach : s.x - HIT_HALF_W;
    const right = k.radial || k.f > 0 ? s.x + k.reach : s.x + HIT_HALF_W;
    this.enemies.forEach((e) => {
      if (!e.alive || k.hit.has(e) || !e.overlapsStrike(left, right, s.y)) return;
      k.hit.add(e);
      if (this.hasFire) this.ignite(e);
      e.hurt(k.damage, k.radial ? Math.sign(e.x - s.x) || k.f : k.f, k.knock);
    });
  }

  // Tajo: golpe rapido con impulso hacia delante
  castSlash() {
    const s = this.stickman;
    const f = s.flipX ? -1 : 1;
    this.attackTime = ATTACK_DURATION;
    this.cd.slash = SKILLS[0].cooldown;
    this.sfx('slash', 0.8);
    this.knockVx = f * SLASH_LUNGE;
    this.strike = { f, damage: this.damageOf('slash'), reach: this.reachOf('slash', SLASH_REACH), from: 0.04, to: 0.22, knock: 380, hit: new Set() };
    const fx = this.add.image(s.x + f * 56, s.y - 62, this.fxKey('fx_slash'))
      .setFlipX(f < 0).setScale(0.6).setDepth(3).setAlpha(0.95);
    this.tweens.add({ targets: fx, scale: this.hasSteel ? 1.6 : 1.3, alpha: 0, duration: 240, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
  }

  // ---- Fuego: quemaduras, rastro del dash y Erupcion ----

  sparksAt(x, y, n, tints, speed = [60, 240], life = 450, depth = 3) {
    const e = this.add.particles(x, y, 'mote', {
      speed: { min: speed[0], max: speed[1] }, angle: { min: 0, max: 360 }, lifespan: life,
      scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', emitting: false,
    }).setDepth(depth);
    e.explode(n);
    this.time.delayedCall(life + 100, () => e.destroy());
  }

  // Prende a un enemigo: BURN_DAMAGE cada BURN_TICK durante BURN_TIME (se renueva al volver a golpearlo)
  ignite(e) {
    if (!e.burn || !e.alive) return;
    const b = this.burning.get(e);
    if (b) b.t = BURN_TIME;
    else this.burning.set(e, { t: BURN_TIME, tick: BURN_TICK, ember: 0 });
  }

  updateBurning(dt) {
    this.burning.forEach((b, e) => {
      if (!e.alive) { this.burning.delete(e); return; }
      b.t -= dt;
      b.tick -= dt;
      b.ember -= dt;
      if (b.ember <= 0) {   // brasas que suben del enemigo
        b.ember = 0.12;
        const m = this.add.image(e.x + Phaser.Math.Between(-16, 16), e.y - Phaser.Math.Between(20, 100), 'mote')
          .setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(Phaser.Utils.Array.GetRandom([0xff4a1a, 0xff8a1e, 0xffd23a])).setScale(1.3);
        this.tweens.add({ targets: m, y: m.y - 34, alpha: 0, scale: 0, duration: 380, onComplete: () => m.destroy() });
      }
      if (b.tick <= 0) { b.tick = BURN_TICK; e.burn(BURN_DAMAGE); }
      if (b.t <= 0) this.burning.delete(e);
    });
  }

  // Llama del rastro del dash de fuego
  addTrailFlame(x, y) {
    const img = this.add.image(x, y + 2, 'fire_flame').setOrigin(0.5, 1).setDepth(0.45).setAlpha(0.95).setScale(0.9);
    this.tweens.add({ targets: img, scaleY: { from: 0.7, to: 1.1 }, scaleX: { from: 1, to: 0.8 }, duration: 150 + Math.random() * 100, yoyo: true, repeat: -1 });
    this.fireTrail.push({ x, y, img, life: TRAIL_LIFE, dash: this.dashId });
  }

  // El rastro quema a los enemigos que lo tocan (dano una vez por dash y enemigo; la quemadura se renueva mientras lo pisan)
  updateFireTrail(dt) {
    this.fireTrail = this.fireTrail.filter((f) => {
      f.life -= dt;
      if (f.life < 0.4) f.img.setAlpha(Math.max(0, f.life / 0.4) * 0.95);
      this.enemies.forEach((e) => {
        if (!e.alive || e.state === 'dormant' || e.state === 'buried') return;
        if (Math.abs(e.x - f.x) > 40 || Math.abs(e.y - f.y) > 70) return;
        this.ignite(e);
        if (this.trailHit.get(e) !== f.dash) {
          this.trailHit.set(e, f.dash);
          e.hurt(TRAIL_DAMAGE, Math.sign(e.x - this.stickman.x) || 1, 120);
        }
      });
      if (f.life <= 0) { this.tweens.killTweensOf(f.img); f.img.destroy(); return false; }
      return true;
    });
  }

  // Erupcion (F, solo con el Nucleo de Fuego): columnas de fuego que brotan del suelo una tras otra hacia delante
  castEruption() {
    const s = this.stickman;
    const f = s.flipX ? -1 : 1;
    this.attackTime = ATTACK_DURATION;
    this.cd.fire = SKILLS.find((d) => d.id === 'fire').cooldown;
    this.invuln = Math.max(this.invuln, 0.3);
    this.sfx('flame', 1);
    this.cameras.main.shake(260, 0.007);
    const hit = new Set();
    const baseY = s.y;
    for (let i = 0; i < ERUPTION_PILLARS; i++) {
      const px = s.x + f * (70 + i * 75);
      this.time.delayedCall(i * 90, () => {
        const pillar = this.add.image(px, baseY, 'fire_wave').setOrigin(0.5, 1).setDepth(3).setScale(0.5, 0.15).setAlpha(0.95);
        this.tweens.add({ targets: pillar, scaleX: 1.2, scaleY: 1.9, duration: 170, ease: 'Back.easeOut' });
        this.tweens.add({ targets: pillar, alpha: 0, scaleX: 0.7, delay: 260, duration: 320, onComplete: () => pillar.destroy() });
        this.sparksAt(px, baseY - 40, 10, [0xff4a1a, 0xff8a1e, 0xffd23a], [80, 300], 500);
        this.enemies.forEach((e) => {
          if (!e.alive || hit.has(e) || e.state === 'dormant' || e.state === 'buried') return;
          if (Math.abs(e.x - px) > 62 || Math.abs(e.y - baseY) > 90) return;
          hit.add(e);
          this.ignite(e);
          e.hurt(this.damageOf('eruption'), f, 180);
        });
      });
    }
  }

  // Furia de acero (E, solo con el amuleto): torbellino que golpea a ambos lados, atraviesa armaduras y da un instante de invulnerabilidad
  castStorm() {
    const s = this.stickman;
    this.attackTime = ATTACK_DURATION;
    this.cd.storm = SKILLS.find((d) => d.id === 'storm').cooldown;
    this.invuln = Math.max(this.invuln, 0.5);
    this.sfx('slash', 0.9, 0.8);
    this.sfx('clang', 0.7, 0.8);
    this.cameras.main.shake(160, 0.006);
    this.strike = { f: s.flipX ? -1 : 1, radial: true, damage: this.damageOf('storm'), reach: STORM_REACH, from: 0.03, to: 0.25, knock: 420, hit: new Set() };
    [1, -1].forEach((f) => {
      const fx = this.add.image(s.x + f * 40, s.y - 62, this.fxKey('fx_slash')).setFlipX(f < 0).setScale(0.7).setDepth(3).setAlpha(0.95);
      this.tweens.add({ targets: fx, x: s.x + f * 120, scale: 1.7, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
    });
    const ring = this.add.image(s.x, s.y - 62, 'fx_ring').setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0xcfe4ff).setScale(0.4).setAlpha(0.9);
    this.tweens.add({ targets: ring, scale: STORM_REACH / 55, alpha: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    const sparks = this.add.particles(s.x, s.y - 62, 'mote', {
      speed: { min: 120, max: 380 }, angle: { min: 0, max: 360 }, lifespan: 450,
      scale: { start: 1.6, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xcfe4ff, 0x9fd0ff], blendMode: 'ADD', emitting: false,
    }).setDepth(3);
    sparks.explode(26);
    this.time.delayedCall(550, () => sparks.destroy());
  }

  // Onda: media luna que viaja en linea recta hasta chocar con una plataforma
  castWave() {
    const s = this.stickman;
    const f = s.flipX ? -1 : 1;
    this.attackTime = ATTACK_DURATION;
    this.cd.wave = SKILLS[1].cooldown;
    this.sfx('wave', 0.8);
    const img = this.add.image(s.x + f * 44, s.y - 62, this.fxKey('fx_wave')).setFlipX(f < 0).setDepth(3);
    this.projectiles.push({ img, vx: f * WAVE_SPEED, life: WAVE_LIFE, trail: 0, hit: new Set() });
  }

  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter((p) => {
      p.img.x += p.vx * dt;
      p.life -= dt;
      p.trail -= dt;
      if (p.trail <= 0) {
        p.trail = 0.05;
        const echo = this.add.image(p.img.x, p.img.y, p.img.texture.key).setFlipX(p.img.flipX)
          .setDepth(2.5).setAlpha(0.4).setScale(0.8);
        this.tweens.add({ targets: echo, alpha: 0, scale: 0.4, duration: 220, onComplete: () => echo.destroy() });
      }
      this.enemies.forEach((e) => {
        if (!e.alive || p.hit.has(e)) return;
        if (Math.abs(e.x - p.img.x) < 36 && Math.abs(e.y - 60 - p.img.y) < 70) {
          p.hit.add(e);
          if (this.hasFire) this.ignite(e);
          e.hurt(this.damageOf('wave'), Math.sign(p.vx), 220);
        }
      });
      const hitWall = this.platformBoxes().some((b) => p.img.x > b.x0 && p.img.x < b.x1 && p.img.y > b.top && p.img.y < b.bottom);
      const outside = p.img.x < 0 || p.img.x > this.worldWidth;
      if (p.life > 0 && !hitWall && !outside) {
        if (p.life < 0.2) p.img.setAlpha(p.life / 0.2);
        return true;
      }
      this.tweens.add({ targets: p.img, scale: 1.6, alpha: 0, duration: 160, onComplete: () => p.img.destroy() });
      return false;
    });
  }

  // Dos recuadros abajo a la izquierda (uno por habilidad) con icono, tecla y cooldown
  buildSkillHud() {
    this.buildSkillTextures();
    this.buildAmuletTextures();
    Boss.buildFireTextures(this);   // llamas compartidas (Erupcion, rastro del dash, Gusano de Brasas)
    const size = 52;
    const inner = size - 6;
    this.skillHud = SKILLS.map((def, i) => {
      const bg = this.add.graphics();
      bg.fillStyle(0x16213e, 0.92).fillRoundedRect(0, 0, size, size, 8);
      bg.lineStyle(3, 0xc9d6f5, 1).strokeRoundedRect(0, 0, size, size, 8);
      const icon = this.add.image(size / 2, size / 2, `icon_${def.id}`);
      const cover = this.add.graphics();
      const timeText = this.add.text(size / 2, size / 2, '', {
        fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);
      const key = this.add.text(size - 5, size - 3, def.key, {
        fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(1, 1);
      // contenido centrado en el contenedor para que los efectos de escala salgan desde el centro
      [bg, icon, cover, timeText, key].forEach((o) => o.setPosition(o.x - size / 2, o.y - size / 2));
      const box = this.add.container(16 + i * (size + 8) + size / 2, HEIGHT - size / 2 - 16, [bg, icon, cover, timeText, key])
        
        .setScrollFactor(0).setDepth(10).setVisible(def.req ? this.owns(def.req) : this.hasSword);
      return { box, cover, timeText, def, inner, wasCooling: false };
    });
  }

  updateSkillHud() {
    if (!this.hasSword) return;
    this.skillHud.forEach((h) => {
      if (h.def.req && !this.owns(h.def.req)) return;
      const left = this.cd[h.def.id];
      h.cover.clear();
      if (left > 0) {
        h.cover.fillStyle(0x000000, 0.7).fillRect(3, 3, h.inner, h.inner * (left / h.def.cooldown));
        h.timeText.setText(left.toFixed(1));
      } else {
        h.timeText.setText('');
        if (h.wasCooling) {
          this.sfx('ready', 0.5);
          this.tweens.add({ targets: h.box, scale: 1.18, duration: 110, yoyo: true });
        }
      }
      h.wasCooling = left > 0;
    });
  }

  // Corazones fijos arriba a la izquierda; texturas lleno / mitad / vacio dibujadas una sola vez
  buildHearts() {
    const size = 28;
    if (!this.textures.exists('heart_full')) {
      const draw = (key, fill) => {
        const tex = this.textures.createCanvas(key, size, size);
        const c = tex.getContext();
        const path = () => {
          c.beginPath();
          c.moveTo(14, 25);
          c.bezierCurveTo(-4, 13, 3, 1, 14, 8);
          c.bezierCurveTo(25, 1, 32, 13, 14, 25);
          c.closePath();
        };
        path(); c.fillStyle = '#2a1420'; c.fill();
        if (fill > 0) {
          c.save(); c.beginPath(); c.rect(0, 0, size * fill, size); c.clip();
          path(); c.fillStyle = '#e03442'; c.fill(); c.restore();
        }
        path(); c.lineWidth = 2; c.strokeStyle = '#000000'; c.stroke();
        tex.refresh();
      };
      draw('heart_full', 1); draw('heart_half', 0.5); draw('heart_empty', 0);
    }
    this.hearts = [];
    for (let i = 0; i < MAX_HEARTS; i++) {
      this.hearts.push(this.add.image(16 + i * (size + 4), 38, 'heart_full').setOrigin(0, 0).setScrollFactor(0).setDepth(10));
    }
    this.drawHearts();
  }

  drawHearts() {
    this.hearts.forEach((img, i) => {
      const halves = Phaser.Math.Clamp(Progress.hp - i * 2, 0, 2);
      img.setTexture(['heart_empty', 'heart_half', 'heart_full'][halves]);
    });
  }

  // Boton fijo arriba a la derecha para salir al menu (tambien con Esc)
  buildMenuButton() {
    const w = 96;
    const h = 32;
    const draw = (g, hover) => {
      g.clear();
      g.fillStyle(hover ? 0x2c3a66 : 0x16213e, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      g.lineStyle(3, hover ? 0xffffff : 0xc9d6f5, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    };
    const bg = this.add.graphics();
    draw(bg, false);
    const label = this.add.text(0, 0, '✕ Salir', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.container(WIDTH - w / 2 - 14, 14 + h / 2, [bg, label])
      .setScrollFactor(0).setDepth(10).setSize(w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(bg, true))
      .on('pointerout', () => draw(bg, false))
      .on('pointerdown', () => { if (!this.transitioning) this.goTo('Menu'); });
  }

  // Fundido a negro y cambio de escena
  goTo(sceneKey, data) {
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(400);
    cam.once('camerafadeoutcomplete', () => this.scene.start(sceneKey, data));
  }

  onReachEnd() {
    if (this.transitioning) return;
    this.transitioning = true;
    Progress.complete(this.level.id);
    this.sfx('win', 0.8);

    const last = this.levelIndex === LEVELS.length - 1;
    this.add.text(WIDTH / 2, HEIGHT / 2 - 40, last ? '¡Completaste todos los niveles!' : '¡Nivel completado!', {
      fontFamily: 'monospace', fontSize: last ? '30px' : '40px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.time.delayedCall(last ? 2500 : 900, () => {
      if (last) this.goTo('Menu');
      else this.goTo(sceneFor(this.levelIndex + 1), { levelIndex: this.levelIndex + 1 });
    });
  }
}

Object.assign(LevelScene.prototype, HouseMixin, TrapsMixin, SnowMixin, EndingMixin);

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,
  scene: [MenuScene, ComicScene, LevelScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
