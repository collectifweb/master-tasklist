// Pont vers le monde (app/world/world.js). S'il manque ou échoue, l'illustration statique de la coquille reste en place.
// Le monde ne connaît ni le magasin ni l'écran : tout passe par les options ci-dessous.
//
//   const w = await initWorld({ container, slot, content, announce, onImpact, onSelect, onHarvest, threadFrom, now, reducedMotion });
//   onSelect({ type: 'sector' | 'object' | 'plot' | 'landmark' | 'placement', id, … }) ; onHarvest(plotId) : récolte au glissé.
//   w.render(game, tasks); w.play(events, { from }); w.refletEvents(game, tasks, tasksBefore, now); w.clearSelection()
//   w.plan(conteneur, { onFocusSector }) → { render, focus, destroy }
export async function initWorld({ container, slot, content, announce, onImpact, onSelect, onHarvest, threadFrom, now, reducedMotion }) {
  let mod, view;
  try {
    [mod, view] = await Promise.all([import('../world/world.js'), import('../world/view.js')]);
  } catch (e) {
    console.warn('monde absent :', e && e.message);
    return null; // pas de monde : l'illustration statique reste
  }
  try {
    const texts = content.ui;
    const anchors = content.ancres;
    const world = mod.createWorld(container, { texts, anchors, announce, onImpact, onSelect, onHarvest, threadFrom, now });
    world.setReducedMotion(reducedMotion());
    container.hidden = false;
    slot.dataset.world = 'live';
    const safe = (fn, fallback) => (...args) => {
      try { return fn.apply(world, args); } catch (e) { console.warn('monde :', e); return fallback; }
    };
    const reflets = (game, tasks) => {
      try { return view.deriveView(game, tasks, { now: now(), anchors }).reflets; } catch { return new Set(); }
    };
    return {
      render: safe(world.render),
      play: safe(world.play, Promise.resolve()),
      setReducedMotion: safe(world.setReducedMotion),
      focusSector: safe(world.focusSector),
      clearSelection: safe(world.clearSelection),
      skip: safe(world.skip),
      on: safe(world.on, () => {}),
      get playing() { return world.playing; },
      /** Objets de la carte qui se mettent à reluire à cause de la quête qui vient d'être faite (événements « reflet »). */
      refletEvents(game, tasksAfter, tasksBefore) {
        const before = reflets(game, tasksBefore);
        return [...reflets(game, tasksAfter)].filter((id) => !before.has(id)).map((objectId) => ({ type: 'reflet', objectId }));
      },
      plan(host, { onFocusSector } = {}) {
        const p = mod.createWorldPlan(host, { texts, anchors, now, onFocusSector });
        return { render: safe(p.render), focus: safe(p.focus), destroy: safe(p.destroy) };
      },
      destroy: safe(world.destroy),
    };
  } catch (e) {
    console.warn('monde indisponible :', e);
    container.hidden = true;
    delete slot.dataset.world;
    return null;
  }
}
