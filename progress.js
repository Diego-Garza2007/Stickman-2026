// Progreso guardado en localStorage: niveles desbloqueados y completados.
// Si el almacenamiento no esta disponible (modo privado, etc.) el juego sigue funcionando sin guardar.

const Progress = {
  KEY: 'stickman2026.progress',
  data: null,
  lastDeathMessage: null, // para no repetir la misma frase dos veces seguidas
  hp: null, // vidas actuales en mitades de corazon; null = aun sin partida (no se guarda)

  load() {
    if (this.data) return this.data;
    this.data = { unlocked: 1, done: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY));
      if (saved && Number.isInteger(saved.unlocked) && Array.isArray(saved.done)) this.data = saved;
    } catch (e) { /* sin guardado */ }
    return this.data;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* sin guardado */ }
  },

  // id empieza en 1
  isUnlocked(id) { return id <= this.load().unlocked; },
  isDone(id) { return this.load().done.includes(id); },

  // La espada (nivel 2) se queda en el inventario aunque se recargue la pagina
  hasSword() { return !!this.load().sword; },
  giveSword() {
    this.load().sword = true;
    this.save();
  },

  // El Amuleto de Acero (jefe del nivel 5) convierte la espada en acero
  hasSteel() { return !!this.load().steel; },
  giveSteel() {
    this.load().steel = true;
    this.save();
  },

  // El Nucleo de Fuego (jefe del nivel 14): espada de fuego, dash de fuego y la habilidad Erupcion
  hasFire() { return !!this.load().fire; },
  giveFire() {
    this.load().fire = true;
    this.save();
  },

  complete(id) {
    const d = this.load();
    if (!d.done.includes(id)) d.done.push(id);
    d.unlocked = Math.min(Math.max(d.unlocked, id + 1), LEVELS.length);
    this.save();
  },

  // Modo desarrollador: desbloquea todos los niveles (no marca ninguno como completado)
  unlockAll() {
    this.load().unlocked = LEVELS.length;
    this.save();
  },

  // Modo desarrollador: la espada y los dos amuletos (acero y fuego), que desbloquear niveles no concede
  giveAll() {
    const d = this.load();
    d.sword = true;
    d.steel = true;
    d.fire = true;
    this.save();
  },

  reset() {
    this.data = { unlocked: 1, done: [] };
    this.save();
  },
};
