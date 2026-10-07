// Annonce de gain (voie réservée, aria-hidden) + texte complet dans la région aria-live séparée.
import { t, tn } from '../content.js';
import { $, esc, icon, restart, reducedMotion } from './dom.js';
import { numGain, entierGain } from './format.js';
import { topSheet } from './sheets.js';

/** Somme les gains d'une action à partir de ses événements, et les permis tombés (jours travaillés, rang, saison). */
export function summarize(events) {
  const s = { energy: 0, materials: 0, food: 0, permis: 0, quartier: null, noGain: false, rewards: 0, tenue: false, imprevu: null, plein: false };
  for (const e of events || []) {
    if (e.type === 'reward') {
      s.energy += e.energy || 0; s.materials += e.materials || 0; s.food += e.food || 0; // Nourriture : premiers pas
      if (e.quartier && !s.quartier) s.quartier = e.quartier;
      s.rewards++;
    } else if (e.type === 'permis') s.permis++;
    else if (e.type === 'semaine-tenue') s.tenue = true; // ses Matériaux sont déjà dans l'événement 'reward' (source 'semaine')
    else if (e.type === 'sans-gain') s.noGain = true;
    // un bon imprévu qui rapporte (lot I) : son nom finit l'annonce, « réserve pleine » quand la pêche a été plafonnée
    else if (e.type === 'imprevu' && e.nature === 'bon' && (e.energy || e.materials || e.food)) { s.imprevu = e.imprevu; s.plein = e.perdu > 0; }
  }
  s.energy = Math.round(s.energy * 10) / 10; s.materials = Math.round(s.materials * 10) / 10; s.food = Math.round(s.food * 10) / 10;
  return s;
}

/** Vrai si l'action a payé quelque chose, même un montant qui s'arrondit à 0 (l'annonce reste, sans chiffre). */
export const aGagne = (s) => s.energy > 0 || s.materials > 0 || s.food > 0 || s.permis > 0;

export function gainList(s) {
  const out = [];
  if (entierGain(s.energy) > 0) out.push(t('gain.energy', { n: numGain(s.energy) }));
  if (entierGain(s.materials) > 0) out.push(tn('gain.materials', entierGain(s.materials), { n: numGain(s.materials) }));
  if (entierGain(s.food) > 0) out.push(t('gain.food', { n: numGain(s.food) }));
  if (s.permis > 0) out.push(t('gain.permis', { n: s.permis }));
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
        if (entierGain(s.energy) > 0) items.push(`<span class="announce-item" data-res="energie">+${numGain(s.energy)} ${icon('energie')}<span class="sr-only">${esc(t('resource.energy'))}</span></span>`);
        if (entierGain(s.materials) > 0) items.push(`<span class="announce-item" data-res="materiaux">+${numGain(s.materials)} ${icon('materiaux')}<span class="sr-only">${esc(t('resource.materials.other'))}</span></span>`);
        if (entierGain(s.food) > 0) items.push(`<span class="announce-item" data-res="nourriture">+${numGain(s.food)} ${icon('nourriture')}<span class="sr-only">${esc(t('resource.food'))}</span></span>`);
        // un permis qui tombe : « +1 » et son picto, comme les ressources (le nom est lu aux lecteurs d'écran) ; la tâche compte pour son quartier : « → Champs »
        if (s.permis > 0) items.push(`<span class="announce-item" data-res="permis">+${s.permis} ${icon('permis')}<span class="sr-only">${esc(t('resource.permis'))}</span></span>`);
        // la semaine tenue : ses Matériaux sont dans le chiffre ci-dessus, le mot dit d'où vient le surplus
        if (s.tenue) items.push(`<span class="announce-item announce-tail" data-semaine>${esc(t('announce.semaine'))}</span>`);
        // la semaine tenue prend la place du quartier (qui reste lisible sur la plaque du monde) : ni mot coupé, ni séparateur orphelin
        if (s.quartier && !s.tenue) items.push(`<span class="announce-item announce-tail" data-quartier="${esc(s.quartier)}">${esc(t('announce.quartier_to', { quartier: t(`quartier.${s.quartier}.name`) }))}</span>`);
        else if (s.imprevu && !s.tenue) items.push(`<span class="announce-item announce-tail" data-imprevu="${esc(s.imprevu)}">${esc(t(`announce.imprevu.${s.imprevu}${s.plein ? '.plein' : ''}`))}</span>`);
        if (!items.length) return say(liveText);
      }
      // 4 gains et plus (ressources, permis, semaine tenue) : sans les points médians, pour que tout tienne à 320 px
      el.classList.toggle('is-dense', items.length >= 4);
      el.innerHTML = `<span class="announce-done">${icon('check')}</span>` + items.join('<span class="announce-sep">·</span>');
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      restart(el, 'is-shown');
      say(liveText);
    },
  };
}
