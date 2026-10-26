// Escenas y capas de fondo pixel art (generadas con tools/make_backgrounds.py en assets/bg/).
// Cada capa es una imagen de 800x452 que se repite sin costuras en horizontal.

// Temas visuales (conjuntos de capas de fondo). `accent` colorea los botones del menu.
const THEMES = [
  { file: 'level1', name: 'Pradera', accent: 0x5cb84c },
  { file: 'level2', name: 'Desierto', accent: 0xe8934a },
  { file: 'level3', name: 'Bosque nevado', accent: 0x7fa8ff },
];

const TUTORIAL_NPC = {
  x: 360,
  lines: [
    '¡Hola, viajero!',
    '',
    '← →  / A D : moverte',
    'Espacio / ↑ : saltar',
    'Clic : golpear',
    'Shift / K / C : dash',
    '↓ / S : agacharte',
    '',
    'Camina a la derecha',
    'para llegar a la salida.',
  ],
};

// Cuantos niveles usan cada tema, en orden. Para anadir niveles basta con subir `count`
// o anadir una zona nueva (con su tema); el menu se ajusta solo.
const ZONES = [
  { theme: THEMES[0], count: 7 },
  { theme: THEMES[1], count: 7 },
  { theme: THEMES[2], count: 6 },
];

// Disenos a medida por id de nivel (los demas, por ahora, solo tienen suelo plano).
//  platforms: { x, y, w } -> x = borde izquierdo, y = superficie donde pisa el personaje,
//             w = ancho en piezas de 32px (minimo 2). Son solidas: se pisan, bloquean los lados y golpean la cabeza.
//  sword:     { x } -> espada coleccionable sobre el suelo (si el jugador aun no la tiene)
//  enemies:   [{ x, range?, armored?, y?, bounds? }] -> enemigos (ver enemies.js). kind = basic | armor | scorpion | mummy; armored = con armadura (solo los atraviesa el acero);
//             y los pone sobre una plataforma (y = su superficie): no se salen de ella.
//  pits:      { x0, x1 }  -> huecos en el suelo; al caer, el personaje reaparece antes del hueco.
//  hills:     { x, y, w } -> bloques de tierra con pasto (w en px) que bajan hasta el fondo: la cima de una colina.
//             Son solidos igual que las plataformas; varios bloques escalonados dan la subida.
//  rise:      px que el mundo se extiende hacia arriba (niveles verticales; la camara tambien sube).
//  exit:      { x, y } -> salida a medida (y = superficie donde pisa); por defecto, el borde derecho del suelo.
//  boss:      { x, trigger, arenaL, arenaR, kind?, relic? } -> jefe (boss.js; kind 'worm' = Gusano de Brasas); la salida solo aparece al derrotarlo.
//             relic = reliquia que suelta ('steel' | 'fire', ver RELICS en main.js).
//  grantSword: true -> entrega la espada al entrar si aun no la tienes (el jefe esta pensado para pelearse con ella).
//  comic / comicTitle: historieta previa al nivel (ver comic.js).
//  skyOnly:   true -> fondo de solo cielo (sin montanas, arboles ni pasto).
//  house:     { x } -> cabana con puerta y un anciano que cuenta la historia del jefe final (house.js)
//  start:     { x, y } -> donde aparece el jugador (y = superficie de la plataforma); por defecto, el suelo a la izquierda.
//  snow:      true -> nieve cayendo sobre el nivel, cada vez mas fuerte; 'blizzard' -> ventisca. roars: [x...] -> rugidos lejanos del jefe final (snow.js).
//  spikes / fakes: pinchos y pisos falsos (traps.js).
//  fallDamage: mitades de corazon que cuesta caer a un foso (por defecto 1).
const LAYOUTS = {
  1: {
    platforms: [
      // escalera opcional sobre el suelo
      { x: 560, y: 318, w: 3 }, { x: 720, y: 262, w: 3 }, { x: 880, y: 318, w: 3 },
      // despues del primer foso: subida a las alturas
      { x: 1230, y: 320, w: 2 }, { x: 1360, y: 265, w: 2 }, { x: 1430, y: 205, w: 2 },
      // piedras para cruzar el segundo foso
      { x: 1500, y: 340, w: 2 }, { x: 1600, y: 335, w: 2 },
    ],
    pits: [{ x0: 1010, x1: 1140 }, { x0: 1470, x1: 1690 }],
  },
  // espada en el suelo: al pasar por encima se equipa y da acceso a las 2 habilidades
  2: { sword: { x: 640 } },
  // 5 enemigos basicos (dos de ellos juntos); x = donde patrullan, range = cuanto se alejan de ahi
  3: {
    enemies: [{ x: 650 }, { x: 960 }, { x: 1260 }, { x: 1360 }, { x: 1800 }],
  },
  // parkour vertical: casi todo es vacio y hay que subir por plataformas hasta la salida, arriba a la derecha.
  // Los saltos normales miden ~60-80px de subida y ~70-100px de hueco (el salto completo llega a ~107px de alto
  // y ~150px de largo); los huecos de ~190px o mas solo se cruzan con dash en el aire.
  4: {
    worldWidth: 2750,
    rise: 260,
    skyOnly: true,
    fallDamage: 4,
    exit: { x: 2610, y: 60 },
    pits: [{ x0: 330, x1: 800 }, { x0: 900, x1: 1250 }, { x0: 1350, x1: 2750 }],
    platforms: [
      // primer vacio: dos piedras y un hueco de dash hasta la isla
      { x: 400, y: 330, w: 2 }, { x: 540, y: 340, w: 2 },
      // segundo vacio
      { x: 1000, y: 320, w: 2 }, { x: 1130, y: 320, w: 2 },
      // la subida, con dos huecos de dash
      { x: 1430, y: 322, w: 2 }, { x: 1560, y: 262, w: 2 }, { x: 1814, y: 262, w: 2 },
      { x: 1944, y: 202, w: 2 }, { x: 2170, y: 142, w: 2 },
      { x: 2330, y: 100, w: 2 },
    ],
    // meta: una colina de tierra con dos escalones, como si hubieras subido hasta la cima
    hills: [{ x: 2450, y: 84, w: 50 }, { x: 2500, y: 60, w: 250 }],
  },
  // mini jefe: un tramo corto con dos fosos y, pasando x=1700, la arena del Guardian de la Cima (llano, sin plataformas)
  5: {
    worldWidth: 3000,
    comic: 'summit',
    comicTitle: 'LA CIMA',
    grantSword: true,
    pits: [{ x0: 520, x1: 650 }, { x0: 980, x1: 1140 }],
    platforms: [{ x: 1030, y: 342, w: 2 }],
    boss: { x: 2450, trigger: 1850, arenaL: 1700, arenaR: 2960, relic: 'steel' },
  },
  // el Guardian suelta el Amuleto de Acero: este nivel ya pide la espada de acero. Plataformas, fosos y enemigos con armadura
  // (algunos patrullan sobre plataformas). Bajo la escalera hay un foso en vez de suelo: asi no quedan huecos entre plataformas
  // de los que no se pueda salir. Los saltos siguen las medidas del nivel 4 (~60px de subida y <=100px de hueco).
  6: {
    worldWidth: 2900,
    grantSword: true,
    pits: [{ x0: 780, x1: 920 }, { x0: 980, x1: 2000 }],
    platforms: [
      // piedra para el primer foso
      { x: 820, y: 345, w: 2 },
      // escalera hacia la plataforma alta y bajada
      { x: 1030, y: 318, w: 3 }, { x: 1180, y: 262, w: 3 }, { x: 1330, y: 206, w: 4 },
      { x: 1510, y: 262, w: 2 }, { x: 1620, y: 318, w: 3 },
      // piedras para salir del foso
      { x: 1770, y: 340, w: 2 }, { x: 1895, y: 330, w: 2 },
      // plataforma larga sobre el tramo final
      { x: 2200, y: 300, w: 5 },
    ],
    enemies: [
      { x: 540, armored: true },
      { x: 1228, armored: true, y: 262, range: 30 },
      { x: 1394, armored: true, y: 206, range: 40 },
      { x: 2280, armored: true, y: 300, range: 50 },
      { x: 2130, armored: true },
      { x: 2480, armored: true },
      { x: 2580, armored: true },
    ],
  },
  // parkour de cielo, pero bajando: se empieza muy arriba y las plataformas descienden hasta el suelo del final (la entrada al desierto).
  // Los enemigos basicos patrullan las plataformas largas y empujan al jugador, asi que hay que esquivar, golpear o saltar por encima.
  // El primer hueco ancho (~220px) solo se cruza con dash en el aire.
  7: {
    worldWidth: 3900,
    rise: 640,
    skyOnly: true,
    grantSword: true,
    start: { x: 100, y: -480 },
    pits: [{ x0: 0, x1: 3450 }],
    platforms: [
      { x: 40, y: -480, w: 5 },
      { x: 330, y: -425, w: 3 },
      { x: 560, y: -365, w: 4 },
      { x: 820, y: -310, w: 2 },
      { x: 1030, y: -245, w: 3 },
      { x: 1350, y: -190, w: 5 },
      { x: 1640, y: -130, w: 2 },
      { x: 1840, y: -65, w: 3 },
      { x: 2060, y: -10, w: 4 },
      { x: 2330, y: 50, w: 2 },
      { x: 2520, y: 110, w: 3 },
      { x: 2740, y: 170, w: 5 },
      { x: 3030, y: 230, w: 2 },
      { x: 3230, y: 290, w: 4 },
    ],
    enemies: [
      { x: 624, y: -365, range: 40 }, { x: 1430, y: -190, range: 60 }, { x: 2124, y: -10, range: 40 },
      { x: 2820, y: 170, range: 60 }, { x: 3294, y: 290, range: 40 },
      { x: 3560 }, { x: 3650 },
    ],
  },
  // primer nivel del desierto (cambio de bioma, con historieta): suelo llano con un foso y los enemigos de arena.
  // Las momias empiezan enterradas (solo se ve el monton de arena) y los escorpiones son rapidos.
  8: {
    comic: 'desert',
    comicTitle: 'EL DESIERTO',
    grantSword: true,
    pits: [{ x0: 1000, x1: 1150 }],
    platforms: [{ x: 1040, y: 345, w: 2 }],
    enemies: [
      { x: 560, kind: 'scorpion', range: 90 },
      { x: 820, kind: 'mummy' },
      { x: 1330, kind: 'scorpion' }, { x: 1440, kind: 'scorpion' },
      { x: 1620, kind: 'mummy' },
      { x: 1700, kind: 'scorpion', range: 140 },
    ],
  },
  // parkour con enemigos (desierto), en tres pasos de dificultad. Medidas de salto: ver el nivel 4 (el salto completo llega a ~107px de
  // alto y ~150px de largo; con un dash en el aire se cruzan huecos de hasta ~250px).
  // 9: mitad del nivel a pie con enemigos de arena y la otra mitad saltando entre plataformas, con tres huecos que exigen dash.
  9: {
    worldWidth: 3400,
    grantSword: true,
    pits: [{ x0: 1450, x1: 3150 }],
    platforms: [
      { x: 1530, y: 330, w: 3 },
      { x: 1836, y: 320, w: 4 },
      { x: 2074, y: 300, w: 2 },
      { x: 2258, y: 270, w: 3 },
      { x: 2580, y: 300, w: 4 },
      { x: 2808, y: 330, w: 2 },
      { x: 2992, y: 320, w: 3 },
    ],
    enemies: [
      { x: 600, kind: 'scorpion', range: 90 }, { x: 850, kind: 'mummy' },
      { x: 1080, kind: 'scorpion' }, { x: 1170, kind: 'scorpion' },
      { x: 1320, armored: true },
      { x: 1900, y: 320, kind: 'scorpion' }, { x: 2644, y: 300, kind: 'mummy' },
    ],
  },
  // 10: solo saltos (sin suelo), dificiles pero sin dash obligatorio: plataformas pequenas, alturas distintas y murcielagos
  10: {
    worldWidth: 3700,
    grantSword: true,
    pits: [{ x0: 300, x1: 3390 }],
    platforms: [
      { x: 370, y: 340, w: 3 },
      { x: 560, y: 315, w: 2 },
      { x: 740, y: 290, w: 2 },
      { x: 930, y: 310, w: 4 },
      { x: 1178, y: 285, w: 2 },
      { x: 1362, y: 260, w: 2 },
      { x: 1550, y: 285, w: 3 },
      { x: 1776, y: 315, w: 2 },
      { x: 1970, y: 340, w: 4 },
      { x: 2224, y: 315, w: 2 },
      { x: 2408, y: 290, w: 2 },
      { x: 2600, y: 300, w: 3 },
      { x: 2826, y: 330, w: 2 },
      { x: 3010, y: 305, w: 2 },
      { x: 3200, y: 335, w: 3 },
    ],
    enemies: [
      { x: 994, y: 310, kind: 'scorpion' }, { x: 2034, y: 340, kind: 'mummy' },
      { kind: 'bat', x: 1120, y: 190 }, { kind: 'bat', x: 1700, y: 215 }, { kind: 'bat', x: 2560, y: 190 },
    ],
  },
  // 11: el mas dificil: sube sobre el vacio con plataformas diminutas, tres huecos de dash (el ultimo casi al limite), enemigos y muchos murcielagos
  11: {
    worldWidth: 3300,
    rise: 480,
    skyOnly: true,
    grantSword: true,
    fallDamage: 2,
    exit: { x: 3080, y: -195 },
    pits: [{ x0: 300, x1: 3300 }],
    // meta: una cima de tierra con un escalon y una meseta ancha hasta el borde del mundo, un lugar firme tras tanto vacio
    hills: [{ x: 2830, y: -165, w: 70 }, { x: 2900, y: -195, w: 400 }],
    platforms: [
      { x: 380, y: 330, w: 2 },
      { x: 549, y: 270, w: 2 },
      { x: 723, y: 215, w: 2 },
      { x: 963, y: 215, w: 3 },
      { x: 1164, y: 160, w: 2 },
      { x: 1338, y: 100, w: 2 },
      { x: 1622, y: 100, w: 2 },
      { x: 1796, y: 40, w: 3 },
      { x: 2002, y: -20, w: 2 },
      { x: 2176, y: -75, w: 2 },
      { x: 2466, y: -75, w: 3 },
      { x: 2667, y: -135, w: 2 },
    ],
    enemies: [
      { x: 1844, y: 40, kind: 'scorpion', range: 25 },
      { x: 3000, y: -195, kind: 'scorpion' }, { x: 3140, y: -195, kind: 'scorpion' },
      { kind: 'bat', x: 860, y: 150 }, { kind: 'bat', x: 1280, y: 60 }, { kind: 'bat', x: 1540, y: 30 },
      { kind: 'bat', x: 2120, y: -150 }, { kind: 'bat', x: 2380, y: -160 },
    ],
  },
  // 12 y 13: arenas llanas con una cantidad abrumadora de enemigos de todos los tipos (el 13, mas y mas duros, con murcielagos y mas acorazados).
  // Avanzar por el suelo es lineal; cada tramo trae un escalon, una plataforma alta y una cima: los enemigos de suelo pierden de vista al jugador
  // que esta arriba, asi que sirven para respirar, golpear con la onda y elegir el momento. Algunas plataformas tienen enemigos propios.
  // Las plataformas altas (superficie en y=240) dejan pasar por debajo; el escalon (y=318) se salta, no atrapa.
  12: {
    worldWidth: 2900,
    grantSword: true,
    platforms: [
      { x: 600, y: 318, w: 3 },
      { x: 730, y: 240, w: 6 },
      { x: 1150, y: 318, w: 3 },
      { x: 1290, y: 240, w: 5 },
      { x: 1480, y: 170, w: 4 },
      { x: 1750, y: 318, w: 3 },
      { x: 1880, y: 240, w: 6 },
      { x: 2300, y: 318, w: 3 },
      { x: 2430, y: 240, w: 5 },
    ],
    enemies: [
      { x: 650, kind: 'scorpion' }, { x: 720, kind: 'scorpion' }, { x: 900 }, { x: 960 },
      { x: 1080, kind: 'mummy' }, { x: 1160, kind: 'mummy' }, { x: 1350, armored: true }, { x: 1420, kind: 'scorpion' },
      { x: 1600 }, { x: 1650 }, { x: 1700, kind: 'scorpion' }, { x: 1950, armored: true },
      { x: 2030, kind: 'mummy' }, { x: 2200, kind: 'scorpion' }, { x: 2260 }, { x: 2330, kind: 'scorpion' },
      { x: 2480, armored: true }, { x: 2560, kind: 'mummy' }, { x: 2640, kind: 'scorpion' }, { x: 820, kind: 'scorpion', y: 240 },
      { x: 1544, kind: 'mummy', y: 170 }, { x: 1976, armored: true, y: 240 }, { x: 2510, kind: 'scorpion', y: 240 }, { kind: 'bat', x: 1000, y: 285 },
      { kind: 'bat', x: 2100, y: 285 },
    ],
  },
  13: {
    worldWidth: 3300,
    grantSword: true,
    platforms: [
      { x: 550, y: 318, w: 3 },
      { x: 690, y: 240, w: 6 },
      { x: 910, y: 170, w: 4 },
      { x: 1180, y: 318, w: 3 },
      { x: 1320, y: 240, w: 6 },
      { x: 1540, y: 170, w: 4 },
      { x: 1850, y: 318, w: 3 },
      { x: 1990, y: 240, w: 5 },
      { x: 2180, y: 170, w: 5 },
      { x: 2500, y: 318, w: 3 },
      { x: 2640, y: 240, w: 6 },
      { x: 2860, y: 170, w: 4 },
    ],
    enemies: [
      { x: 600, kind: 'scorpion' }, { x: 660, kind: 'scorpion' }, { x: 720 }, { x: 950, armored: true },
      { x: 1010 }, { x: 1060, kind: 'scorpion' }, { x: 1250, kind: 'mummy' }, { x: 1300, kind: 'mummy' },
      { x: 1360, kind: 'scorpion' }, { x: 1420, armored: true }, { x: 1650 }, { x: 1700, armored: true },
      { x: 1760, kind: 'scorpion' }, { x: 1800, kind: 'scorpion' }, { x: 2100, armored: true }, { x: 2160, kind: 'mummy' },
      { x: 2230, armored: true }, { x: 2290, kind: 'scorpion' }, { x: 2420 }, { x: 2480, kind: 'scorpion' },
      { x: 2700, armored: true }, { x: 2760, armored: true }, { x: 2820, kind: 'mummy' }, { x: 2900, kind: 'scorpion' },
      { x: 2960, armored: true }, { x: 3040, kind: 'scorpion' }, { x: 790, kind: 'scorpion', y: 240 }, { x: 975, kind: 'mummy', y: 170 },
      { x: 1416, armored: true, y: 240 }, { x: 1600, kind: 'scorpion', y: 170 }, { x: 2070, armored: true, y: 240 }, { x: 2260, kind: 'mummy', y: 170 },
      { x: 2736, armored: true, y: 240 }, { x: 2924, kind: 'scorpion', y: 170 }, { kind: 'bat', x: 800, y: 285 }, { kind: 'bat', x: 1250, y: 270 },
      { kind: 'bat', x: 1700, y: 270 }, { kind: 'bat', x: 2150, y: 250 }, { kind: 'bat', x: 2650, y: 270 }, { kind: 'bat', x: 3000, y: 280 },
    ],
  },
  // jefe final del desierto: el Gusano de Brasas (arena y fuego). Suelta el Nucleo de Fuego: espada de fuego, dash de fuego y la Erupcion.
  // Un tramo corto con dos fosos (como el del nivel 5) y la arena llana a partir de x=1700.
  14: {
    worldWidth: 2900,
    grantSword: true,
    pits: [{ x0: 520, x1: 650 }, { x0: 980, x1: 1140 }],
    platforms: [{ x: 1030, y: 342, w: 2 }],
    boss: { x: 2350, trigger: 1850, arenaL: 1700, arenaR: 2860, kind: 'worm', relic: 'fire' },
  },
  // primer nivel del bosque nevado (cambio de bioma, con historieta): suelo llano de momento
  15: {
    comic: 'snow',
    comicTitle: 'EL BOSQUE NEVADO',
    grantSword: true,
    house: { x: 900 },
  },
  // parkour con trampas: pinchos de hielo en el suelo (saltalos o usa el dash) y un largo foso con plataformas. Algunas son falsas:
  // las 'ghost' no son solidas y las 'crumble' (con grietas) se desmoronan al pisarlas. Siempre hay una ruta real (saltos del nivel 4).
  16: {
    worldWidth: 3600,
    grantSword: true,
    pits: [{ x0: 700, x1: 1980 }],
    spikes: [
      { x0: 360, x1: 408 }, { x0: 520, x1: 600 }, { x0: 650, x1: 690 },
      { x0: 2100, x1: 2148 }, { x0: 2260, x1: 2340 }, { x0: 2440, x1: 2488 }, { x0: 2540, x1: 2620 },
      { x0: 2740, x1: 2788 }, { x0: 2830, x1: 2878 }, { x0: 3000, x1: 3100 }, { x0: 3220, x1: 3268 },
    ],
    platforms: [
      { x: 740, y: 342, w: 3 }, { x: 910, y: 285, w: 2 }, { x: 1130, y: 285, w: 2 }, { x: 1350, y: 342, w: 3 },
      { x: 1490, y: 290, w: 2 }, { x: 1710, y: 290, w: 2 }, { x: 1830, y: 342, w: 3 },
    ],
    fakes: [
      { x: 900, y: 342, w: 2, kind: 'ghost' },
      { x: 1020, y: 285, w: 2, kind: 'crumble' },
      { x: 1240, y: 342, w: 2, kind: 'crumble' },
      { x: 1480, y: 342, w: 2, kind: 'ghost' },
      { x: 1600, y: 342, w: 2, kind: 'crumble' },
      { x: 1690, y: 342, w: 2, kind: 'ghost' },
    ],
  },
  // manada de lobos (rapidos, atacan en grupo) y un salto de 320px: con el dash normal se llega a ~265px y con el dash de fuego
  // (el Nucleo del nivel 14) a ~330px, asi que solo se cruza saltando y usando el dash de fuego en el aire.
  17: {
    worldWidth: 3200,
    grantSword: true,
    pits: [{ x0: 1500, x1: 1820 }],
    enemies: [
      { kind: 'wolf', x: 620 }, { kind: 'wolf', x: 780 },
      { kind: 'wolf', x: 1050 }, { kind: 'wolf', x: 1220, range: 160 },
      { kind: 'wolf', x: 2050 }, { kind: 'wolf', x: 2200 }, { kind: 'wolf', x: 2450 },
      { kind: 'wolf', x: 2620 }, { kind: 'wolf', x: 2780 },
    ],
  },
  // muchos monstruos (lobos, soldados con armadura y basicos; algunos sobre la escalera) y el salto gigante: una escalera de 5 plataformas
  // sube hasta y=98 y desde arriba hay 360px de vacio hasta el suelo. Con el dash de fuego desde la cima se llega (~400px); desde el suelo
  // no (~330px). Empieza a nevar.
  18: {
    worldWidth: 3500,
    rise: 200,
    snow: true,
    grantSword: true,
    pits: [{ x0: 1760, x1: 2140 }],
    platforms: [
      { x: 1000, y: 330, w: 3 }, { x: 1150, y: 272, w: 3 }, { x: 1300, y: 214, w: 3 }, { x: 1450, y: 156, w: 3 }, { x: 1600, y: 98, w: 5 },
    ],
    enemies: [
      { kind: 'wolf', x: 450 }, { kind: 'wolf', x: 600 }, { kind: 'armor', x: 740, armored: true }, { kind: 'wolf', x: 880 },
      { kind: 'wolf', x: 1060, range: 60 }, { kind: 'basic', x: 1190, y: 272, range: 20 }, { kind: 'wolf', x: 1250 },
      { kind: 'armor', x: 1340, y: 214, range: 20 }, { kind: 'wolf', x: 1360 }, { kind: 'basic', x: 1650, y: 98, range: 40 },
      { kind: 'wolf', x: 2300 }, { kind: 'wolf', x: 2420 }, { kind: 'armor', x: 2560 }, { kind: 'basic', x: 2700 },
      { kind: 'wolf', x: 2800 }, { kind: 'wolf', x: 2920 }, { kind: 'armor', x: 3050 }, { kind: 'wolf', x: 3180 }, { kind: 'basic', x: 3290 },
    ],
  },
  // preludio del jefe final: una ventisca con mucha nieve y viento. Casi sin enemigos, solo unos lobos y dos fosos pequenos; al avanzar suenan
  // tres rugidos lejanos de Kryovar, cada vez mas fuertes (con temblor de camara).
  19: {
    worldWidth: 3400,
    snow: 'blizzard',
    roars: [900, 1900, 2800],
    grantSword: true,
    pits: [{ x0: 1000, x1: 1130 }, { x0: 2200, x1: 2340 }],
    platforms: [{ x: 1040, y: 345, w: 2 }, { x: 2245, y: 345, w: 2 }],
    enemies: [
      { kind: 'wolf', x: 600 }, { kind: 'wolf', x: 1500 }, { kind: 'wolf', x: 1650 },
      { kind: 'wolf', x: 2550 }, { kind: 'wolf', x: 2700 }, { kind: 'wolf', x: 3000 },
    ],
  },
  // Jefe final: Kryovar, el Dragon de Hielo (dragon.js). Arena de una sola pantalla (sin scroll) bajo la ventisca: el dragon vive a la derecha y no se le
  // puede danar salvo cuando aterriza agotado. Al derrotarlo, cinematica final: la maldicion se rompe y la nieve deja de caer.
  20: {
    comic: 'dragon',
    comicTitle: 'LA CUMBRE HELADA',
    worldWidth: 800,
    snow: 'blizzard',
    grantSword: true,
    boss: { x: 680, trigger: 220, kind: 'dragon' },
  },
};

// Lista plana de niveles: { id, theme, name, worldWidth, npc, platforms, pits, sword, enemies }
const LEVELS = [];
ZONES.forEach(({ theme, count }) => {
  for (let i = 0; i < count; i++) {
    const id = LEVELS.length + 1;
    LEVELS.push({
      id,
      theme,
      name: `${theme.name} ${i + 1}`,
      worldWidth: 2000 + i * 150,   // los niveles de cada zona son cada vez mas largos
      npc: id === 1 ? TUTORIAL_NPC : null,
      platforms: [],
      pits: [],
      sword: null,
      enemies: [],
      rise: 0,
      hills: [],
      boss: null,
      grantSword: false,
      comic: null,
      comicTitle: '',
      skyOnly: false,
      fallDamage: 1,
      exit: null,
      start: null,
      house: null,
      spikes: [],
      fakes: [],
      snow: false,
      roars: [],
      ...LAYOUTS[id],
    });
  }
});

// factor = cuanto se desplaza la capa respecto a la camara (0 = fija, 1 = como el suelo).
// drift = deriva propia en px/seg (nubes). Se listan de atras hacia adelante.
const BACK_LAYERS = [
  { name: 'sky', factor: 0 },
  { name: 'clouds', factor: 0.03, drift: 6 },
  { name: 'far', factor: 0.08 },
  { name: 'mid', factor: 0.2 },
  { name: 'near', factor: 0.4 },
  { name: 'trees', factor: 0.65 },
];
const FRONT_LAYERS = [
  { name: 'fg', factor: 1.5 }, // pasto del primer plano: se mueve mas rapido que el personaje
];

function loadBackground(scene, th) {
  [...BACK_LAYERS, ...FRONT_LAYERS].forEach(({ name }) => {
    scene.load.image(`${th.file}_${name}`, `assets/bg/${th.file}_${name}.png`);
  });
  scene.load.image(`${th.file}_ground`, `assets/bg/${th.file}_ground.png`);
  scene.load.spritesheet(`${th.file}_platform`, `assets/bg/${th.file}_platform.png`, { frameWidth: 32, frameHeight: 32 });
}

// Crea las capas y devuelve { layers, ground }: `layers` se actualiza cada frame (parallax).
// skyOnly: solo cielo y nubes (sin montanas, arboles ni pasto), para niveles que suben.
function buildBackground(scene, th, worldWidth, pits = [], skyOnly = false) {
  const layers = [];
  const addLayer = ({ name, factor, drift = 0 }, depth) => {
    const ts = scene.add.tileSprite(0, 0, WIDTH, HEIGHT, `${th.file}_${name}`)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    layers.push({ ts, factor, drift });
  };

  BACK_LAYERS.filter(({ name }) => !skyOnly || name === 'sky' || name === 'clouds').forEach((layer) => addLayer(layer, -10));

  // el suelo es parte del mundo: se mueve junto con el personaje
  // el suelo es parte del mundo: se mueve junto con el personaje (con huecos donde hay fosos)
  let ground = null;
  let from = 0;
  [...pits, { x0: worldWidth, x1: worldWidth }].forEach(({ x0, x1 }) => {
    if (x0 > from) {
      const seg = scene.add.tileSprite(from, GROUND_Y, x0 - from, HEIGHT - GROUND_Y, `${th.file}_ground`)
        .setOrigin(0, 0).setDepth(-5);
      ground = ground || seg;
    }
    from = x1;
  });
  pits.forEach(({ x0, x1 }) => {
    const pit = scene.add.graphics().setDepth(-4);
    pit.fillGradientStyle(0x3a2616, 0x3a2616, 0x080503, 0x080503, 1);
    pit.fillRect(x0, GROUND_Y, x1 - x0, HEIGHT - GROUND_Y);
    pit.fillStyle(0x1a1008, 1).fillRect(x0, GROUND_Y, 4, HEIGHT - GROUND_Y).fillRect(x1 - 4, GROUND_Y, 4, HEIGHT - GROUND_Y);
  });

  if (!skyOnly) FRONT_LAYERS.forEach((layer) => addLayer(layer, 5));
  return { layers, ground };
}

// Dibuja las plataformas: pieza izquierda + piezas del medio + pieza derecha.
function buildPlatforms(scene, th, platforms) {
  const key = `${th.file}_platform`;
  platforms.forEach(({ x, y, w }) => {
    for (let i = 0; i < w; i++) {
      const frame = i === 0 ? 0 : i === w - 1 ? 2 : 1;
      scene.add.image(x + i * 32, y, key, frame).setOrigin(0, 0).setDepth(-2);
    }
  });
}

// Colinas: pasto arriba (la parte superior del tile del suelo) y tierra hacia abajo, hasta el borde del mundo.
function buildHills(scene, th, hills) {
  if (!hills.length) return;
  const ground = `${th.file}_ground`;
  const dirt = `${th.file}_hill_dirt`;
  if (!scene.textures.exists(dirt)) {
    // la parte de tierra del tile (sin pasto) para repetirla hacia abajo
    const src = scene.textures.get(ground).getSourceImage();
    const tex = scene.textures.createCanvas(dirt, src.width, src.height - 24);
    tex.getContext().drawImage(src, 0, 24, src.width, src.height - 24, 0, 0, src.width, src.height - 24);
    tex.refresh();
  }
  hills.forEach(({ x, y, w }) => {
    const top = y - 8; // el suelo normal tambien dibuja su superficie 8px sobre donde pisa el personaje
    scene.add.tileSprite(x, top, w, 72, ground).setOrigin(0, 0).setDepth(-3);
    scene.add.tileSprite(x, top + 72, w, HEIGHT + 40 - (top + 72), dirt).setOrigin(0, 0).setDepth(-3);
  });
}
