// Annonce de gain (voie réservée, aria-hidden) + texte complet dans la région aria-live séparée.
import { t, tn } from '../content.js';
import { $, esc, icon, restart, reducedMotion } from './dom.js';
import { num } from './format.js';

/** Somme les gains d'une action à partir de ses événements. */
export function summarize(events) {
  const s = { energy: 0, materials: 0, lueur: 0, filLibre: 0, confidence: 0, sector: null, noGain: false, rewards: 0 };
  for (const e of events || []) {
    if (e.type === 'reward') {
      s.energy += e.energy || 0; s.materials += e.materials || 0; s.lueur += e.lueur || 0; s.filLibre += e.filLibre || 0;
      if (e.sector && !s.sector) s.sector = e.sector;
      s.rewards++;
    } else if (e.type === 'lisiere-allumee' || e.type === 'semaine-tenue') s.confidence += 1;
    else if (e.type === 'sans-gain') s.noGain = true;
  }
  s.energy = Math.round(s.energy * 10) / 10; s.materials = Math.round(s.materials * 10) / 10;
  s.lueur = Math.round(s.lueur); s.filLibre = Math.round(s.filLibre);
  return s;
}

export function gainList(s) {
  const out = [];
  if (s.energy > 0) out.push(t('gain.energy', { n: num(s.energy) }));
  if (s.materials > 0) out.push(tn('gain.materials', s.materials, { n: num(s.materials) }));
  if (s.confidence > 0) out.push(t('gain.confidence', { n: s.confidence }));
  if (s.lueur > 0 && s.sector) out.push(t('gain.lueur', { n: s.lueur, secteur: t(`sector.${s.sector}.the`) }));
  if (s.filLibre > 0) out.push(t('gain.fil_libre', { n: s.filLibre }));
  return out;
}

export function createAnnounce(lane, live) {
  const el = $('#announce', lane);
  let liveTimer = null;

  function say(text) {
    live.textContent = '';
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { live.textContent = text; }, 60);
  }

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
        if (s.confidence > 0) items.push(`<span class="announce-item" data-res="confiance">+${num(s.confidence)} ${icon('confiance')}<span class="sr-only">${esc(t('resource.confidence'))}</span></span>`);
        if (s.lueur > 0 && s.sector) items.push(`<span class="announce-item announce-tail" data-res="lueur">${esc(t('announce.lueur_to', { secteur: t(`sector.${s.sector}.name`) }))}</span>`);
        if (!items.length) return say(liveText);
      }
      el.innerHTML = `<span class="announce-done">${icon('check')}</span>` + items.join('<span class="announce-sep">·</span>');
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      restart(el, 'is-shown');
      say(liveText);
    },
  };
}
