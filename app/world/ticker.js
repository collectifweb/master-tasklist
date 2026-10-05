// UNE seule boucle d'animation pour tout le monde. Elle tourne seulement tant qu'une tâche est active,
// puis s'arrête d'elle-même : au repos, aucun requestAnimationFrame n'est demandé.
// Une tâche est une fonction (now, dt) → false quand elle a fini.

export function createTicker(win = globalThis) {
  const tasks = new Set();
  let raf = 0;
  let last = 0;
  let frames = 0;

  function frame(now) {
    raf = 0;
    frames++;
    const dt = last ? Math.min(64, now - last) : 16.7;
    last = now;
    for (const task of [...tasks]) {
      let keep = false;
      try { keep = task(now, dt) !== false; } catch (err) { console.error(err); }
      if (!keep) tasks.delete(task);
    }
    if (tasks.size) raf = win.requestAnimationFrame(frame);
    else last = 0;
  }

  return {
    /** Ajoute une tâche ; renvoie la fonction qui la retire. */
    add(task) {
      tasks.add(task);
      if (!raf) raf = win.requestAnimationFrame(frame);
      return () => tasks.delete(task);
    },
    get active() { return tasks.size > 0; },
    get frames() { return frames; },
    stop() { tasks.clear(); if (raf) win.cancelAnimationFrame(raf); raf = 0; last = 0; },
  };
}

/** Petit bus d'événements (le monde publie ; l'hôte, le plan et les effets écoutent). */
export function createBus() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(fn);
      return () => map.get(type)?.delete(fn);
    },
    emit(type, data) {
      for (const fn of map.get(type) ?? []) { try { fn(data); } catch (err) { console.error(err); } }
    },
    clear() { map.clear(); },
  };
}
