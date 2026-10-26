// Historieta previa a un nivel (LEVELS[i].comic): paginas de 4 vinietas que van apareciendo con Enter / Espacio / clic.
// Las vinietas se dibujan con graficos y los sprites del juego; no hay imagenes nuevas.

const PANEL_W = 372;
const PANEL_H = 176;
const ART_H = 128;      // alto del arte; debajo va la franja de texto
const PANEL_GAP = 12;
const PAGE_TOP = 46;

// Escena que se carga para un nivel: con historieta (si la tiene) o directamente el nivel
function sceneFor(levelIndex) {
  return LEVELS[levelIndex].comic ? 'Comic' : 'Level';
}

// Cada vineta: dibuja su arte en coordenadas locales (0..PANEL_W, 0..ART_H) y lo registra con `add`;
// el texto va en una franja aparte, debajo del arte
const COMIC_PAGES = {
  summit: [
    {
      caption: 'Tras trepar sin descanso sobre el vacio... el viajero por fin alcanzo la cima.',
      draw(s, add) {
        sky(s, add, 0x2b1f4a, 0xf08a4b);
        add(s.add.circle(70, 78, 22, 0xffd98a, 0.9));
        hill(s, add, [[0, 128], [0, 104], [120, 104], [120, 90], [230, 90], [230, 74], [372, 74], [372, 128]], 0x1a2a2e);
        add(s.add.rectangle(0, 104, 120, 24, 0x6a4a7a, 0.55).setOrigin(0, 0));   // niebla del abismo
        hero(s, add, 'stickman_run', 2, 262, 74, 2.2);
      },
    },
    {
      caption: 'Pero no estaba solo. Alla a lo lejos, algo enorme lo esperaba.',
      draw(s, add) {
        sky(s, add, 0x1d1633, 0xc9573f);
        hill(s, add, [[0, 128], [40, 80], [90, 108], [150, 64], [210, 100], [372, 88], [372, 128]], 0x2a1f3d);
        add(s.add.rectangle(292, 70, 40, 58, 0x120c1c).setOrigin(0.5, 0));
        const far = add(s.add.sprite(292, 70, 'boss_sil', 0).setOrigin(0.5, 63 / 64));
        add(s.add.rectangle(291, 32, 3, 2, 0xff3b4d));
        add(s.add.rectangle(297, 32, 5, 2, 0xff3b4d));
        hill(s, add, [[0, 128], [0, 104], [150, 104], [150, 100], [372, 100], [372, 128]], 0x120d1a);
        hero(s, add, 'stickman_idle', 0, 72, 104, 2);
        for (let i = 0; i < 5; i++) add(s.add.rectangle(10 + i * 14, 36 + i * 9, 26, 2, 0xffffff, 0.35));   // viento
        s.tweens.add({ targets: far, alpha: 0.8, duration: 700, yoyo: true, repeat: -1 });
      },
    },
    {
      caption: 'El Guardian de la Cima. Nadie ha pasado de el... y vivido para contarlo.',
      draw(s, add) {
        sky(s, add, 0x2a0a12, 0x8a1c28);
        const bolt = s.add.graphics();
        bolt.lineStyle(3, 0xfff2c4, 1).beginPath().moveTo(320, 0).lineTo(302, 30).lineTo(316, 38).lineTo(290, 90).strokePath();
        add(bolt);
        add(s.add.sprite(186, 151, 'boss_sil', 0).setOrigin(0.5, 63 / 64).setScale(3));
        add(s.add.rectangle(183, 40, 8, 5, 0xff3b4d));
        add(s.add.rectangle(204, 40, 18, 5, 0xff3b4d));
        s.tweens.add({ targets: bolt, alpha: 0.1, duration: 90, yoyo: true, repeat: -1, repeatDelay: 900 });
      },
    },
    {
      caption: 'Pero el viajero no llego hasta aqui para detenerse. Tomo su espada.',
      draw(s, add) {
        sky(s, add, 0x1d1633, 0xd0603c);
        add(s.add.sprite(320, 118, 'boss_sil', 0).setOrigin(0.5, 63 / 64).setScale(1.8).setFlipX(true));
        add(s.add.rectangle(322, 52, 6, 3, 0xff3b4d));
        add(s.add.rectangle(311, 52, 10, 3, 0xff3b4d));
        hill(s, add, [[0, 128], [0, 118], [372, 118], [372, 128]], 0x120d1a);
        hero(s, add, 'stickman_sword_attack', 1, 110, 118, 2.4);
        const glint = add(s.add.star(150, 34, 4, 2, 9, 0xffffff));
        s.tweens.add({ targets: glint, angle: 90, scale: 1.6, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      },
    },
  ],
  // cambio de bioma: de la pradera al desierto (nivel 8)
  desert: [
    {
      caption: 'La pradera quedo atras. El viajero siguio el camino hasta donde termina la hierba...',
      draw(s, add) {
        sky(s, add, 0x5aa8ee, 0xd6edff);
        hill(s, add, [[0, 128], [0, 84], [90, 66], [180, 82], [260, 76], [372, 92], [372, 128]], 0x4f8f4a);
        hill(s, add, [[0, 128], [0, 104], [372, 104], [372, 128]], 0x3f7a3a);
        add(s.add.rectangle(236, 104, 136, 24, 0xe0b872).setOrigin(0, 0));   // la arena empieza
        add(s.add.rectangle(236, 104, 136, 4, 0xc99a5a).setOrigin(0, 0));
        for (let i = 0; i < 6; i++) add(s.add.rectangle(20 + i * 34, 100, 4, 6, 0x2d6a2e));   // pasto
        hero(s, add, 'stickman_run', 2, 120, 104, 2.2);
      },
    },
    {
      caption: 'Y entonces la hierba se acabo. Ante el, un mar de arena dorada se extendia hasta el horizonte.',
      draw(s, add) {
        sky(s, add, 0xf0a04a, 0xffe7a8);
        const sun = add(s.add.circle(286, 58, 26, 0xfff3c4, 0.95));
        add(s.add.circle(286, 58, 38, 0xffe08a, 0.25));
        hill(s, add, [[0, 128], [0, 92], [80, 76], [170, 98], [260, 70], [372, 90], [372, 128]], 0xd49a52);
        hill(s, add, [[0, 128], [0, 110], [110, 100], [240, 112], [372, 102], [372, 128]], 0xe8b868);
        hero(s, add, 'stickman_idle', 0, 90, 112, 2.2);
        s.tweens.add({ targets: sun, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    },
    {
      caption: 'El sol quemaba y el viento borraba sus huellas. Pero algo se movia bajo las dunas...',
      draw(s, add) {
        sky(s, add, 0xe88a3c, 0xfbd78a);
        add(s.add.circle(60, 30, 30, 0xfff3c4, 0.95));
        hill(s, add, [[0, 128], [0, 100], [120, 84], [250, 104], [372, 88], [372, 128]], 0xc98b46);
        hill(s, add, [[0, 128], [0, 112], [372, 112], [372, 128]], 0xdca95a);
        // cactus y craneo
        add(s.add.rectangle(318, 82, 8, 30, 0x3f8a3a).setOrigin(0.5, 0));
        add(s.add.rectangle(308, 92, 6, 4, 0x3f8a3a)); add(s.add.rectangle(306, 86, 4, 10, 0x3f8a3a));
        add(s.add.rectangle(328, 90, 6, 4, 0x3f8a3a)); add(s.add.rectangle(330, 84, 4, 10, 0x3f8a3a));
        add(s.add.ellipse(220, 108, 14, 11, 0xf2ead6)); add(s.add.rectangle(217, 107, 3, 3, 0x2a1a10)); add(s.add.rectangle(223, 107, 3, 3, 0x2a1a10));
        hero(s, add, 'stickman_run', 2, 130, 112, 2.2);
        for (let i = 0; i < 4; i++) {   // aire que tiembla por el calor
          const w = add(s.add.rectangle(30 + i * 90, 96, 50, 2, 0xffffff, 0.35));
          s.tweens.add({ targets: w, y: 92, alpha: 0.1, duration: 700 + i * 120, yoyo: true, repeat: -1 });
        }
        for (let i = 0; i < 3; i++) {   // algo se mueve bajo la arena
          const m = add(s.add.ellipse(250 + i * 38, 113, 26, 6, 0x9a6a30));
          s.tweens.add({ targets: m, scaleX: 1.4, alpha: 0.6, duration: 500, yoyo: true, repeat: -1, delay: i * 200 });
        }
      },
    },
    {
      caption: 'Escorpiones y momias de arena. El desierto no daria la bienvenida a nadie.',
      draw(s, add) {
        sky(s, add, 0x7a2a18, 0xe8903c);
        add(s.add.circle(186, 52, 34, 0xffd070, 0.6));
        hill(s, add, [[0, 128], [0, 96], [100, 84], [200, 100], [300, 80], [372, 94], [372, 128]], 0x8a5224);
        hill(s, add, [[0, 128], [0, 112], [372, 112], [372, 128]], 0xc48a46);
        hero(s, add, 'stickman_sword_attack', 1, 76, 112, 2.4);
        const scorp = add(s.add.sprite(230, 112, 'scorpion_idle', 0).setOrigin(0.5, 31 / 32).setScale(2.6).setFlipX(true));
        const mummy = add(s.add.sprite(310, 112, 'mummy_idle', 0).setOrigin(0.5, 31 / 32).setScale(2.4).setFlipX(true));
        s.tweens.add({ targets: scorp, y: 109, duration: 300, yoyo: true, repeat: -1 });
        s.tweens.add({ targets: mummy, scaleY: 2.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const glint = add(s.add.star(110, 34, 4, 2, 9, 0xffffff));
        s.tweens.add({ targets: glint, angle: 90, scale: 1.6, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      },
    },
  ],
  // cambio de bioma: del desierto al bosque nevado (nivel 15)
  snow: [
    {
      caption: 'Con el Nucleo de Fuego a su lado, el viajero dejo atras el desierto y siguio hacia el norte.',
      draw(s, add) {
        sky(s, add, 0x7a2a4a, 0xf0a050);
        add(s.add.circle(300, 84, 26, 0xffd98a, 0.95));
        hill(s, add, [[0, 128], [0, 92], [90, 76], [190, 98], [280, 82], [372, 96], [372, 128]], 0xb06a3a);
        hill(s, add, [[0, 128], [0, 110], [372, 110], [372, 128]], 0xd49a52);
        hero(s, add, 'stickman_run', 2, 120, 112, 2.2);
        const glow = add(s.add.circle(140, 76, 16, 0xff8a1e, 0.35));   // el brillo de la espada de fuego
        s.tweens.add({ targets: glow, scale: 1.4, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
      },
    },
    {
      caption: 'El aire cambio. Primero fue un frio ligero... despues llegaron los primeros copos.',
      draw(s, add) {
        sky(s, add, 0x2a3358, 0x8a8fb8);
        hill(s, add, [[0, 128], [0, 96], [110, 82], [220, 100], [372, 84], [372, 128]], 0x5a5a7a);
        hill(s, add, [[0, 128], [0, 110], [372, 110], [372, 128]], 0xc9c4b4);
        for (let i = 0; i < 6; i++) add(s.add.rectangle(20 + i * 62, 110, 22, 3, 0xffffff, 0.8).setOrigin(0, 0));   // primeras manchas de nieve
        hero(s, add, 'stickman_idle', 0, 130, 112, 2.2);
        flakes(s, add, 14);
        for (let i = 0; i < 4; i++) add(s.add.rectangle(230 + i * 30, 40 + i * 14, 36, 2, 0xffffff, 0.3));   // viento
      },
    },
    {
      caption: 'La arena se volvio escarcha, y la escarcha, nieve. Habia llegado a un mundo blanco.',
      draw(s, add) {
        sky(s, add, 0x38426c, 0xc4cce6);
        hill(s, add, [[0, 128], [0, 84], [80, 62], [160, 88], [250, 58], [372, 80], [372, 128]], 0x8a94b8);
        pine(s, add, 300, 100, 54, 0x24405a); pine(s, add, 340, 102, 66, 0x1c3550);
        hill(s, add, [[0, 128], [0, 106], [372, 106], [372, 128]], 0xf2f6ff);
        hero(s, add, 'stickman_run', 2, 120, 110, 2.2);
        flakes(s, add, 26);
      },
    },
    {
      caption: 'Solo la espada de fuego mantenia el frio a raya. Ante el, el bosque nevado lo esperaba.',
      draw(s, add) {
        sky(s, add, 0x1c2a4a, 0x6a7ab0);
        for (let i = 0; i < 6; i++) pine(s, add, 160 + i * 42, 104, 58 + (i % 3) * 14, i % 2 ? 0x1c3550 : 0x24405a);
        hill(s, add, [[0, 128], [0, 106], [372, 106], [372, 128]], 0xf2f6ff);
        add(s.add.ellipse(92, 100, 150, 70, 0xff8a1e, 0.28));        // la nieve se derrite alrededor del fuego
        add(s.add.ellipse(92, 108, 90, 14, 0x6a8ad0, 0.7));
        const glow = add(s.add.ellipse(92, 80, 90, 90, 0xffb050, 0.25));
        hero(s, add, 'stickman_fire_attack', 1, 92, 108, 2.4);
        flakes(s, add, 22);
        s.tweens.add({ targets: glow, scale: 1.2, alpha: 0.12, duration: 600, yoyo: true, repeat: -1 });
      },
    },
  ],
  // el viajero llega a la Cumbre Helada y encuentra a Kryovar
  dragon: [
    {
      caption: 'Siguiendo un rugido lejano, el viajero cruzo la ventisca. Cada paso costaba mas.',
      draw(s, add) {
        sky(s, add, 0x141a30, 0x4a5678);
        for (let i = 0; i < 5; i++) pine(s, add, 190 + i * 38, 104, 50 + (i % 3) * 14, i % 2 ? 0x1c3550 : 0x24405a);
        hill(s, add, [[0, 128], [0, 108], [372, 108], [372, 128]], 0xdfe6f5);
        hero(s, add, 'stickman_run', 2, 90, 112, 2.2);
        for (let i = 0; i < 5; i++) add(s.add.rectangle(10 + i * 70, 30 + (i % 3) * 22, 60, 2, 0xffffff, 0.4));   // rachas de viento
        flakes(s, add, 40);
      },
    },
    {
      caption: 'Al final del bosque se abrio la Cumbre Helada. Arriba, una luz azul latia.',
      draw(s, add) {
        sky(s, add, 0x0c1226, 0x2a3a66);
        hill(s, add, [[0, 128], [0, 100], [100, 80], [200, 46], [250, 22], [300, 46], [372, 70], [372, 128]], 0x3a4a78);
        hill(s, add, [[0, 128], [0, 112], [140, 100], [372, 108], [372, 128]], 0xdfe6f5);
        const halo = add(s.add.circle(250, 20, 30, 0x4ab8ff, 0.3));
        add(s.add.circle(250, 20, 5, 0xbfe8ff, 1));
        s.tweens.add({ targets: halo, scale: 1.8, alpha: 0.08, duration: 900, yoyo: true, repeat: -1 });
        hero(s, add, 'stickman_idle', 0, 70, 104, 2);
        flakes(s, add, 20);
      },
    },
    {
      caption: 'Thorvald tenia razon: entre ruinas de hielo dormia algo enorme, con el pecho azul.',
      draw(s, add) {
        sky(s, add, 0x080c1c, 0x1c2a52);
        for (let i = 0; i < 4; i++) add(s.add.rectangle(40 + i * 96, 34, 14, 94 - (i % 2) * 24, 0x2a3a66).setOrigin(0.5, 0));   // columnas rotas
        hill(s, add, [[0, 128], [0, 108], [372, 108], [372, 128]], 0xaab8d8);
        // Kryovar dormido, todo en una pieza: cola, cuerpo, ala plegada, cuello y cabeza apoyada en el suelo
        const T = 0x4a6aa0;
        neck(s, add, [300, 96], [345, 100], [378, 120], 2.6, 1.2, T);                       // cola (sale de la vineta)
        const body = add(s.add.sprite(250, 149, 'dragon_body', 1).setOrigin(0.5, 1).setScale(2.4).setTint(T));
        add(s.add.sprite(247, 44, 'dragon_wing', 6).setOrigin(10 / 64, 50 / 64).setScale(2.4).setTint(0x6a88b8));
        neck(s, add, [196, 74], [158, 66], [140, 104], 3, 2.6, T);                         // cuello
        add(s.add.sprite(125, 100, 'dragon_head', 0).setOrigin(26 / 40, 12 / 34).setScale(2.4).setTint(T));
        const heart = add(s.add.circle(212, 82, 6, 0x4ab8ff, 0.9));
        const glow = add(s.add.circle(212, 82, 15, 0x4ab8ff, 0.3));
        s.tweens.add({ targets: [heart, glow], alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
        s.tweens.add({ targets: body, scaleY: 2.48, duration: 1100, yoyo: true, repeat: -1 });   // respira dormido
        hero(s, add, 'stickman_idle', 0, 30, 112, 1.8);
        flakes(s, add, 14);
      },
    },
    {
      caption: 'Kryovar abrio los ojos. El viajero desenvaino su espada de fuego.',
      draw(s, add) {
        sky(s, add, 0x0a1022, 0x28407a);
        const T = 0x7a9ad0;
        neck(s, add, [304, 102], [362, 104], [420, 40], 5.5, 6.5, T, 18);                  // el cuello entra desde fuera de la vineta
        const dragon = add(s.add.sprite(280, 94, 'dragon_head', 2).setOrigin(26 / 40, 12 / 34).setScale(4.2).setTint(T));
        add(s.add.circle(270, 86, 5, 0xff4466, 0.95));
        const eye = add(s.add.circle(270, 86, 14, 0xff4466, 0.3));
        hill(s, add, [[0, 128], [0, 110], [372, 110], [372, 128]], 0xdfe6f5);
        add(s.add.ellipse(80, 102, 130, 60, 0xff8a1e, 0.28));
        const glow = add(s.add.ellipse(80, 76, 90, 90, 0xffb050, 0.25));
        hero(s, add, 'stickman_fire_attack', 1, 80, 108, 2.4);
        flakes(s, add, 22);
        s.tweens.add({ targets: glow, scale: 1.2, alpha: 0.12, duration: 600, yoyo: true, repeat: -1 });
        s.tweens.add({ targets: eye, scale: 1.6, alpha: 0.1, duration: 500, yoyo: true, repeat: -1 });
        s.tweens.add({ targets: dragon, x: 284, duration: 90, yoyo: true, repeat: -1, repeatDelay: 600 });   // gruñe
      },
    },
  ],
};

// Cuello o cola de Kryovar: segmentos de pixel art a lo largo de una curva (a -> c -> b), de escala k0 a k1
function neck(s, add, a, c, b, k0, k1, tint, n = 9) {
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0];
    const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1];
    add(s.add.image(x, y, 'dragon_seg').setScale(Phaser.Math.Linear(k0, k1, u)).setTint(tint));
  }
}

// Copos de nieve que caen en bucle dentro de la vineta
function flakes(s, add, n) {
  for (let i = 0; i < n; i++) {
    const f = add(s.add.rectangle(Phaser.Math.Between(0, PANEL_W), Phaser.Math.Between(-10, ART_H), 3, 3, 0xffffff, 0.9));
    s.tweens.add({
      targets: f, y: ART_H + 6, x: f.x - 30, duration: Phaser.Math.Between(1800, 3200), repeat: -1, delay: Phaser.Math.Between(0, 1500),
      onRepeat: () => { f.y = -6; f.x = Phaser.Math.Between(20, PANEL_W + 30); },
    });
  }
}

// Pino nevado: tres capas de triangulos con nieve en la punta
function pine(s, add, x, base, h, color) {
  add(s.add.rectangle(x, base, 5, 10, 0x4a3426).setOrigin(0.5, 1));
  for (let k = 0; k < 3; k++) {
    const w = 30 - k * 7;
    const top = base - h + k * (h / 4);
    add(s.add.triangle(x, top + (h * 0.55) / 2, -w / 2, (h * 0.55) / 2, w / 2, (h * 0.55) / 2, 0, -(h * 0.55) / 2, color));
    add(s.add.triangle(x, top + 8, -w / 4, 6, w / 4, 6, 0, -8, 0xf2f6ff));
  }
}

function sky(s, add, top, bottom) {
  const bands = 16;   // (el cielo ocupa solo el area del arte)
  const a = Phaser.Display.Color.ValueToColor(top);
  const b = Phaser.Display.Color.ValueToColor(bottom);
  const g = s.add.graphics();
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, bands - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(0, Math.floor(i * ART_H / bands), PANEL_W, Math.ceil(ART_H / bands) + 1);
  }
  add(g);
}

function hill(s, add, pts, color) {
  add(s.add.polygon(0, 0, pts.flat(), color).setOrigin(0, 0));
}

// El protagonista: pies en (x, feetY). El sprite de golpe con espada es de 48x48 (pies en la fila 46), el resto de 32x32.
function hero(s, add, key, frame, x, feetY, scale) {
  const big = key.endsWith('_attack') && key !== 'stickman_attack';   // los sprites de golpe con espada son de 48x48
  add(s.add.sprite(x, feetY, key, frame).setOrigin(0.5, big ? 47 / 48 : 31 / 32).setScale(scale));
}

// Copia de la primera pose del jefe pintada de un solo color (silueta), para las vinietas
function makeSilhouette(scene, key, color) {
  if (scene.textures.exists(key)) return;
  const src = scene.textures.get('boss').getSourceImage();
  const tex = scene.textures.createCanvas(key, 64, 64);
  const c = tex.getContext();
  c.drawImage(src, 0, 0, 64, 64, 0, 0, 64, 64);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, 64, 64);
  tex.refresh();
}

class ComicScene extends Phaser.Scene {
  constructor() {
    super('Comic');
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
    this.freshRun = data.freshRun ?? false;
    this.panels = COMIC_PAGES[LEVELS[this.levelIndex].comic];
    this.shown = 0;
    this.leaving = false;
  }

  preload() {
    ['idle', 'run', 'sword_attack', 'fire_attack'].forEach((name) => {
      const size = name.endsWith('_attack') ? 48 : 32;
      this.load.spritesheet(`stickman_${name}`, `assets/stickman_${name}.png`, { frameWidth: size, frameHeight: size });
    });
    this.load.spritesheet('boss', 'assets/boss.png', { frameWidth: 64, frameHeight: 64 });
    if (LEVELS[this.levelIndex].comic === 'dragon') {
      this.load.spritesheet('dragon_body', 'assets/dragon_body.png', { frameWidth: 64, frameHeight: 48 });
      this.load.spritesheet('dragon_head', 'assets/dragon_head.png', { frameWidth: 40, frameHeight: 34 });
      this.load.spritesheet('dragon_wing', 'assets/dragon_wing.png', { frameWidth: 64, frameHeight: 64 });
      this.load.image('dragon_seg', 'assets/dragon_seg.png');
    }
    ['scorpion', 'mummy'].forEach((k) => this.load.spritesheet(`${k}_idle`, `assets/${k}_idle.png`, { frameWidth: 32, frameHeight: 32 }));
  }

  create() {
    this.cameras.main.setBackgroundColor(0xefe6d2).fadeIn(400);
    makeSilhouette(this, 'boss_sil', '#0a0610');
    const title = this.add.text(WIDTH / 2, 22, LEVELS[this.levelIndex].comicTitle ?? '', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#1a1424',
    }).setOrigin(0.5, 0.5);

    const left = (WIDTH - (PANEL_W * 2 + PANEL_GAP)) / 2;
    this.items = this.panels.map((panel, i) => {
      const px = left + (i % 2) * (PANEL_W + PANEL_GAP);
      const py = PAGE_TOP + Math.floor(i / 2) * (PANEL_H + PANEL_GAP);
      const made = [];
      panel.draw(this, (o) => { made.push(o); return o; });
      const box = this.add.container(px, py, made).setAlpha(0);
      const maskG = this.make.graphics({ x: px, y: py, add: false }).fillRect(0, 0, PANEL_W, ART_H);
      box.setMask(maskG.createGeometryMask());
      const frame = this.add.graphics().setAlpha(0);
      frame.fillStyle(0xfff7dc, 1).fillRect(px, py + ART_H, PANEL_W, PANEL_H - ART_H);
      frame.lineStyle(4, 0x1a1424, 1).strokeRect(px, py, PANEL_W, PANEL_H);
      frame.lineStyle(3, 0x1a1424, 1).lineBetween(px, py + ART_H, px + PANEL_W, py + ART_H);
      const text = this.add.text(px + 12, py + ART_H + 6, panel.caption, {
        fontFamily: 'monospace', fontSize: '12px', color: '#1a1424', wordWrap: { width: PANEL_W - 24 }, lineSpacing: 3,
      }).setAlpha(0);
      return { box, frame, text };
    });

    this.hint = this.add.text(WIDTH / 2, HEIGHT - 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#5a4f6e',
    }).setOrigin(0.5, 1);
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });

    const next = () => this.advance();
    this.input.on('pointerdown', next);
    this.input.keyboard.on('keydown-ENTER', next);
    this.input.keyboard.on('keydown-SPACE', next);
    this.input.keyboard.on('keydown-ESC', () => this.finish());
    this.time.delayedCall(500, () => this.advance());
  }

  advance() {
    if (this.leaving) return;
    if (this.shown >= this.items.length) { this.finish(); return; }
    const { box, frame, text } = this.items[this.shown++];
    this.cameras.main.flash(120, 255, 255, 255);
    this.tweens.add({ targets: [box, frame], alpha: 1, duration: 260 });
    this.tweens.add({ targets: text, alpha: 1, delay: 220, duration: 300 });
    this.hint.setText(this.shown >= this.items.length ? 'Enter / clic: comenzar' : 'Enter / clic: siguiente    Esc: saltar');
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(400);
    cam.once('camerafadeoutcomplete', () => this.scene.start('Level', { levelIndex: this.levelIndex, freshRun: this.freshRun }));
  }
}
