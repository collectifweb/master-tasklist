// Fiche d'un bâtiment (bible §5) : trois lignes, « Ce que c'est », « Ce que ça fait », « Maintenant », puis le seul
// geste possible ici (bâtir, semer, récolter, accueillir une famille). Un geste impossible reste visible, à plat, avec
// sa raison écrite par le cœur (« Hameau : encore 2 habitants. ») et un cadenas : le joueur sait toujours pourquoi.
// Rien n'est calculé ici qui ne vienne de core/batiments.js ; les valeurs que les niveaux de quartier changent (récolte
// selon le lieu, jours de pousse, places par chalet, prix d'une famille, stockage) sont lues au cœur, jamais des
// constantes de départ. Le geste passe par data-action="bat-geste".
import {
  BATIMENTS, CHAUFFAGE, GRENIER_STOCKAGE, EOLIENNE_ENERGIE, aBati, etatCulture, coutSemis,
  refusConstruire, refusSemer, refusRecolter, refusAccueillir, logements, stockage, gameDay, eolienneDuJour,
  recolteDe, prixFamille, placesParChalet, valeur,
} from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setHtml } from './dom.js';
import { numPossede, numManque, numGain, shortDate } from './format.js';

const typeOf = (id) => String(id ?? '').replace(/-\d+$/, '');

/** « 15 Matériaux », « 4 Énergie et 20 Matériaux » (les mêmes mots et le même ordre que le HUD et les prix des quartiers). */
export function coutText(cout) {
  const parts = [];
  if (cout.energy) parts.push(`${numManque(cout.energy)} ${t('resource.energy')}`);
  if (cout.materials) parts.push(`${numManque(cout.materials)} ${t(Math.ceil(cout.materials) < 2 ? 'resource.materials.one' : 'resource.materials.other')}`);
  return parts.join(' et ');
}

// habitants logés dans chaque chalet debout, dans l'ordre des chalets (comme la carte)
function occupantsDe(game, id) {
  let reste = logements(game).habitants;
  const places = placesParChalet(game);
  for (let k = 1; k <= BATIMENTS.chalet.max; k++) {
    const cid = `chalet-${k}`;
    if (!aBati(game, cid)) continue;
    const n = Math.min(places, reste);
    if (cid === id) return n;
    reste -= n;
  }
  return 0;
}

/** Modèle de la fiche : { id, type, bati, nom, quoi, fait, maintenant, raison, geste: { action, params, label } | null }. */
export function batimentModel(c, id) {
  const type = typeOf(id);
  if (!Object.hasOwn(BATIMENTS, type)) return null;
  const def = BATIMENTS[type];
  const { game, ledger, now } = c;
  const bati = aBati(game, id);
  const m = {
    id, type, bati,
    nom: t(`bat.${type}.${bati ? 'nom' : 'vide'}`),
    quoi: t(`bat.${type}.${bati ? 'quoi' : 'quoiVide'}`),
    fait: t(`bat.${type}.fait`, {
      loge: placesParChalet(game), recolte: recolteDe(game, def.culture), jours: valeur(game, 'joursPousse'), chauffage: CHAUFFAGE,
      n: type === 'eolienne' ? EOLIENNE_ENERGIE : GRENIER_STOCKAGE,
    }),
    maintenant: '', raison: null, geste: null,
  };
  if (!bati) {
    m.maintenant = t('bat.fiche.cout', { cout: coutText(def.cout) });
    m.raison = refusConstruire(game, type, id);
    m.geste = { action: 'construire', params: { type, id }, label: t(`bat.${type}.geste`) };
  } else if (def.culture) {
    const st = etatCulture(game, ledger, id, now);
    if (!st.semee) {
      const cs = coutSemis(id, gameDay(now));
      m.maintenant = cs.chauffage
        ? t('bat.fiche.semer.chauffage', { semis: numManque(cs.energy - cs.chauffage), chauffage: numManque(cs.chauffage) })
        : t('bat.fiche.semer.cout', { cout: coutText({ energy: cs.energy }) });
      m.raison = refusSemer(game, ledger, id, now);
      m.geste = { action: 'semer', params: { id }, label: t('bat.fiche.semer') };
    } else if (!st.mure) {
      m.maintenant = t(`bat.fiche.pousse.${st.reste === 1 ? 'one' : 'other'}`, { n: st.reste, date: shortDate(st.semeLe) });
      m.geste = { action: 'recolter', params: { id }, label: t('bat.fiche.recolter'), attente: true };
    } else {
      m.maintenant = t('bat.fiche.mure', { n: numGain(recolteDe(game, def.culture)) });
      m.raison = refusRecolter(game, ledger, id, now);
      m.geste = { action: 'recolter', params: { id }, label: t('bat.fiche.recolter') };
    }
  } else if (type === 'chalet') {
    const occupants = occupantsDe(game, id);
    m.maintenant = t(`bat.fiche.chalet.${occupants === 0 ? 'zero' : occupants === 1 ? 'one' : 'other'}`, { occupants, loge: placesParChalet(game), n: prixFamille(game) });
    m.raison = refusAccueillir(game);
    m.geste = { action: 'accueillir', params: {}, label: t('bat.fiche.accueillir') };
  } else if (type === 'eolienne') {
    m.maintenant = eolienneDuJour(ledger, gameDay(now)) > 0 ? t('bat.eolienne.maintenant.fait', { n: EOLIENNE_ENERGIE }) : t('bat.eolienne.maintenant');
  } else if (type === 'grenier') {
    m.maintenant = t('bat.grenier.maintenant', { stock: numPossede(game.resources.food), max: numPossede(stockage(game)) });
  } else {
    m.maintenant = t(`bat.${type}.maintenant`);
  }
  return m;
}

const GESTE_ICON = { construire: 'chantier', semer: 'champs', recolter: 'nourriture', accueillir: 'habitants' };

function bodyHtml(m) {
  const line = (k, html) => `<div class="help-line"><dt>${esc(t(`bat.fiche.${k}`))}</dt><dd>${html}</dd></div>`;
  const now = `<p id="bat-now">${esc(m.maintenant)}</p>${m.raison ? `<p class="bat-raison" id="bat-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>` : ''}`;
  return `<dl class="help-lines">${line('quoi', esc(m.quoi))}${line('fait', esc(m.fait))}${line('maintenant', now)}</dl>`;
}

function footHtml(m) {
  const g = m.geste;
  if (!g) return '';
  const off = !!m.raison || !!g.attente;
  const desc = m.raison ? 'bat-raison' : g.attente ? 'bat-now' : '';
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="bat-geste" data-geste="${esc(g.action)}"
    data-params="${esc(JSON.stringify(g.params))}"${off ? ' aria-disabled="true"' : ''}${desc ? ` aria-describedby="${desc}"` : ''}>${icon(off ? 'lock' : GESTE_ICON[g.action])}<span>${esc(g.label)}</span></button>`;
}

/**
 * Ouvre la fiche du bâtiment `id` (chalet-1, parcelle-2…). `thumb(id)` (facultatif) renvoie le dessin de la carte en
 * SVG, pour que la fiche montre le même objet ; sans monde, la fiche s'ouvre sans dessin.
 */
export function openBatiment(c, id, { thumb, open } = {}) {
  const m = batimentModel(c, id);
  if (!m) return false;
  const dlg = $('#dlg-batiment');
  dlg.dataset.batId = id;
  dlg._thumb = thumb || null;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title bat-title" id="bat-t"><span class="bat-thumb" aria-hidden="true"></span><span class="bat-nom"></span></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('bat.fiche.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body bat-body"></div>
    <footer class="sheet-foot bat-foot"></footer>`;
  fill(dlg, m);
  open(dlg);
  return true;
}

function fill(dlg, m) {
  $('.bat-nom', dlg).textContent = m.nom;
  dlg.dataset.bati = String(m.bati);
  const art = dlg._thumb ? dlg._thumb(m.id) : '';
  const th = $('.bat-thumb', dlg);
  setHtml(th, art || '');
  th.hidden = !art;
  setHtml($('.bat-body', dlg), bodyHtml(m));
  const foot = $('.bat-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, footHtml(m));
  foot.hidden = !m.geste;
  if (had) ($('[data-action="bat-geste"]', foot) || $('[data-close]', dlg)).focus();
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation. */
export function refreshBatiment(c) {
  const dlg = $('#dlg-batiment');
  if (!dlg || !dlg.open || !dlg.dataset.batId) return;
  const m = batimentModel(c, dlg.dataset.batId);
  if (m) fill(dlg, m);
}
