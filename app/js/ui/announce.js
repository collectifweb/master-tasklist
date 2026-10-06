// Annonce de gain (voie réservée, aria-hidden) + texte complet dans la région aria-live séparée.
import { t, tn } from '../content.js';
import { $, esc, icon, restart, reducedMotion } from './dom.js';
import { num } from './format.js';
import { topSheet } from './sheets.js';

/** Somme les gains d'une action à partir de ses événements, et le niveau de quartier atteint s'il y en a un. */
export function summarize(events) {
  const s = { energy: 0, materials: 0, food: 0, quartier: null, niveau: null, noGain: false, rewards: 0 };
  for (const e of events || []) {
    if (e.type === 'reward') {
      s.energy += e.energy || 0; s.materials += e.materials || 0; s.food += e.food || 0; // Nourriture : premiers pas
      if (e.quartier && !s.quartier) s.quartier = e.quartier;
      s.rewards++;
    } else if (e.type === 'quartier-niveau') s.niveau = { quartier: e.quartier, niveau: e.niveau };
    else if (e.type === 'sans-gain') s.noGain = true;
  }
  s.energy = Math.round(s.energy * 10) / 10; s.materials = Math.round(s.materials * 10) / 10; s.food = Math.round(s.food * 10) / 10;
  return s;
}

export function gainList(s) {
  const out = [];
  if (s.energy > 0) out.push(t('gain.energy', { n: num(s.energy) }));
  if (s.materials > 0) out.push(tn('gain.materials', s.materials, { n: num(s.materials) }));
  if (s.food > 0) out.push(t('gain.food', { n: num(s.food) }));
  if (s.niveau) out.push(t('gain.niveau', { quartier: t(`quartier.${s.niveau.quartier}.name`), n: s.niveau.niveau }));
  return out;
}

/**
 * Voix lue (role=status) : `say(texte)` écrit dans la région de la feuille modale du dessus (le reste de la page est
 * alors inerte pour un lecteur d'écran), sinon dans `fallback` (#live, #live-world). La région est choisie au moment
 * d'écrire : une feuille qui se ferme (400 ms) est encore modale, l'annonce attend qu'elle soit partie.
 */
export function createVoice(fallback) {
  let timer = null;
  let text = '';
  let last = null;
  function put() {
    const top = topSheet();
    if (top && top.classList.contains('is-closing')) { timer = setTimeout(put, 100); return; }
    last = (top && top.querySelector(`:scope > [data-live="${fallback.id}"]`)) || fallback;
    last.textContent = text;
  }
  return (next) => {
    text = next;
    clearTimeout(timer);
    if (last) last.textContent = '';
    timer = setTimeout(put, 60);
  };
}

export function createAnnounce(lane, live) {
  const el = $('#announce', lane);
  const say = createVoice(live);

  return {
    say,
    /** summary : résultat de summarize() ; kind : 'gain' | 'none' | 'undo'. */
    show(s, kind = 'gain', { title = '', liveText = '' } = {}) {
      const items = [];
      if (kind === 'none') {
        items.push(`<span class="announce-item">${esc(t('announce.none'))}</span>`);
      } else if (kind === 'undo') {
        items.push(`<span class="announce-item">${esc(t('announce.undo'))}</span>`);
      } else {
        if (s.energy > 0) items.push(`<span class="announce-item" data-res="energie">+${num(s.energy)} ${icon('energie')}<span class="sr-only">${esc(t('resource.energy'))}</span></span>`);
        if (s.materials > 0) items.push(`<span class="announce-item" data-res="materiaux">+${num(s.materials)} ${icon('materiaux')}<span class="sr-only">${esc(t('resource.materials.other'))}</span></span>`);
        if (s.food > 0) items.push(`<span class="announce-item" data-res="nourriture">+${num(s.food)} ${icon('nourriture')}<span class="sr-only">${esc(t('resource.food'))}</span></span>`);
        // la tâche compte pour son quartier : « → Champs », ou « Champs · niveau 2 » quand il monte
        if (s.niveau) items.push(`<span class="announce-item announce-tail" data-quartier="${esc(s.niveau.quartier)}">${icon(s.niveau.quartier)}${esc(t('announce.niveau', { quartier: t(`quartier.${s.niveau.quartier}.name`), n: s.niveau.niveau }))}</span>`);
        else if (s.quartier) items.push(`<span class="announce-item announce-tail" data-quartier="${esc(s.quartier)}">${esc(t('announce.quartier_to', { quartier: t(`quartier.${s.quartier}.name`) }))}</span>`);
        if (!items.length) return say(liveText);
      }
      el.innerHTML = `<span class="announce-done">${icon('check')}</span>` + items.join('<span class="announce-sep">·</span>');
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      restart(el, 'is-shown');
      say(liveText);
    },
  };
}
