// Pont vers le monde (app/world/world.js, écrit à part). S'il manque ou échoue, l'illustration statique reste en place.
// Contrat attendu : createWorld(container, options) → { render(game, tasks), play(events), setReducedMotion(bool), focusSector(id), destroy() }.
export async function initWorld({ container, slot, reducedMotion }) {
  let mod;
  try {
    mod = await import('../world/world.js');
  } catch {
    return null; // pas de monde : l'illustration statique de la coquille reste
  }
  try {
    const world = mod.createWorld(container, { reducedMotion: reducedMotion() });
    container.hidden = false;
    slot.dataset.world = 'live';
    const safe = (fn) => (...args) => {
      try { return fn.apply(world, args); } catch (e) { console.warn('monde :', e); }
    };
    return {
      render: safe(world.render),
      play: safe(world.play),
      setReducedMotion: safe(world.setReducedMotion || (() => {})),
      focusSector: safe(world.focusSector || (() => {})),
      destroy: safe(world.destroy || (() => {})),
    };
  } catch (e) {
    console.warn('monde indisponible :', e);
    container.hidden = true;
    delete slot.dataset.world;
    return null;
  }
}
