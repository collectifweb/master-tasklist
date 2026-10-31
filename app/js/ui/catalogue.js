// Catalogue « Construire » (bouton de la carte ; lot L) : trois onglets, « Bâtiments », « Quartiers » et « Décors »
// (lot K, js/ui/decors.js).
// Bâtiments : une rangée par type qu'on peut encore bâtir (un type au complet, un bâtiment unique déjà debout, n'y
// figure plus). Toute la rangée est le bouton : le dessin, le nom, l'effet en une ligne à picto (« +3 par jour »), le
// prix en pastilles (en pointillés, avec « il manque N », quand il en manque). Verrouillée par le rang ou un autre
// bâtiment, elle passe à plat, sans prix, avec le cadenas et la raison écrite par le cœur (la même que dans la fiche et
// la carte en liste) ; quand la raison ne dit que ce qui manque, les pastilles la montrent, elle n'est plus que lue. Le
// bouton bâtit sur le premier emplacement libre de ce type, dans l'ordre du cœur (world/view.js, batimentsView) :
// data-id le fixe, pour qu'un double toucher ne bâtisse pas deux fois. Le geste passe par data-action="cat-construire"
// (main.js) ; la phrase lue de chaque rangée est la règle « Ce que ça fait » de la fiche, puis le prix.
// Quartiers : une rangée par quartier, « 4 → 5 par récolte » (la ligne comparative de la fiche, en petit) et le prix du
// niveau suivant en pastilles ; toute la rangée ouvre la fiche du quartier par-dessus le catalogue (data-action="qrt-ouvrir").
// Le phare (lot O) est un bâtiment comme les autres pour Alex : sa rangée suit les bâtiments, avec son dessin debout, ses
// quatre étapes en crans et la prochaine, son prix en pastilles ; verrouillée avant le Bourg, ou pendant que les ouvriers
// bâtissent (avec les jours qui restent). Il se paie par étapes : la rangée ouvre sa fiche (data-action="trv-ouvrir",
// js/ui/travaux.js), d'où le chevron. Debout, il n'y figure plus.
// La feuille est construite une fois, puis mise à jour sur place : le focus ne saute pas pendant une synchronisation.
// Elle s'ouvre sur « Bâtiments », sauf au retour d'une pose de décor annulée : sur « Décors ».
import { BATIMENTS, BATIMENT_IDS, refusConstruire, QUARTIER_IDS, EFFETS_QUARTIERS, niveauDe, niveauMax, coutNiveau, refusMonter,
  compte, manque, placesParChalet, recolteDe, valeur, EOLIENNE_ENERGIE, GRENIER_STOCKAGE, PRODUCTION, TOUR_ANNONCE, OUVRAGE_IDS } from '../../core/index.js';
import { t } from '../content.js';
import { $, $$, esc, icon, setText, setAttr, setHtml } from './dom.js';
import { coutText, faitText, pastillesDe, pastilleHtml } from './batiment.js';
import { compareModel, prixText } from './quartier.js';
import { travauxModel } from './travaux.js';
import { decorsPanel, fillDecors } from './decors.js';

// La ligne courte d'un type : son picto (la ressource qu'il donne) et ses valeurs, lues au cœur comme dans la fiche
const EFFET = {
  chalet: (g) => ({ picto: 'habitants', n: placesParChalet(g) }),
  parcelle: (g) => ({ picto: 'nourriture', n: recolteDe(g, 'potager'), jours: valeur(g, 'joursPousse') }),
  atelier: () => ({ picto: 'cle' }),
  serre: (g) => ({ picto: 'nourriture', n: recolteDe(g, 'serre'), jours: valeur(g, 'joursPousse') }),
  eolienne: () => ({ picto: 'energie', n: EOLIENNE_ENERGIE }),
  grenier: () => ({ picto: 'nourriture', n: GRENIER_STOCKAGE }),
  quai: () => ({ picto: 'echange' }),
  tour: () => ({ picto: 'flocon', n: TOUR_ANNONCE }),
  scierie: () => ({ picto: 'materiaux', n: PRODUCTION.scierie.materials }),
  poulailler: () => ({ picto: 'nourriture', n: PRODUCTION.poulailler.food }),
  cabane: () => ({ picto: 'nourriture', n: PRODUCTION.cabane.food }),
};
// la couleur de l'effet : celle de sa ressource, sinon l'encre douce
const RES = new Set(['energie', 'materiaux', 'nourriture', 'habitants']);

/** Rangées du catalogue. slots : emplacements de batimentsView ({ id, type, bati }), dans l'ordre du cœur. */
function rows(c, slots) {
  return BATIMENT_IDS.map((type) => {
    const def = BATIMENTS[type];
    const libre = slots.find((b) => b.type === type && !b.bati);
    const raison = refusConstruire(c.game, type);
    const e = EFFET[type](c.game);
    return {
      type,
      complet: compte(c.game, type) >= def.max,
      nom: t(`bat.${type}.nom`),
      geste: t(`bat.${type}.geste`),
      effet: { picto: e.picto, texte: t(`bat.catalogue.effet.${type}`, e) },
      fait: faitText(c.game, type),
      cout: t('bat.fiche.cout', { cout: coutText(def.cout) }),
      id: libre ? libre.id : null,
      raison,
      // la raison ne dit que ce qui manque : les pastilles en pointillés le montrent
      manque: !!raison && raison === manque(c.game, def.cout),
      pastilles: pastillesDe(c.game, def.cout),
    };
  });
}

const row = (thumb) => (type) => `<li class="cat-row" data-type="${type}">
      <button class="cat-btn cat-go" type="button" data-action="cat-construire" data-type="${type}"
        aria-describedby="cat-${type}-etat cat-${type}-fait cat-${type}-cout">
        <span class="cat-thumb" aria-hidden="true">${thumb ? thumb(type) : ''}</span>
        <span class="cat-text">
          <span class="cat-nom"></span>
          <span class="cat-effet" aria-hidden="true"></span>
          <span class="cat-etat" id="cat-${type}-etat"></span>
        </span>
        <span class="cat-prix" aria-hidden="true"></span>
        <span class="sr-only" id="cat-${type}-fait"></span><span class="sr-only cat-cout" id="cat-${type}-cout"></span>
      </button>
    </li>`;

// Une rangée par quartier : toute la rangée est un bouton (44 px au moins) qui ouvre la fiche du quartier.
const quartierRow = (q) => `<li class="cat-qrt" data-quartier="${q}">
      <button class="cat-btn cat-qrt-go" type="button" data-action="qrt-ouvrir" data-quartier="${q}"
        aria-describedby="cat-q-${q}-etat cat-q-${q}-sr">
        <span class="cat-thumb cat-qrt-picto" aria-hidden="true">${icon(q)}</span>
        <span class="cat-text">
          <span class="cat-nom"></span>
          <span class="cat-effet cat-compare" aria-hidden="true"></span>
          <span class="cat-etat" id="cat-q-${q}-etat"></span>
        </span>
        <span class="cat-prix" aria-hidden="true"></span>
        ${icon('chevron-down', 'cat-qrt-chev')}
        <span class="sr-only cat-suivant" id="cat-q-${q}-sr"></span>
      </button>
    </li>`;

// Une rangée par ouvrage (le phare), sous les bâtiments : toute la rangée est un bouton qui ouvre sa fiche.
const travauxRow = (thumb) => (id) => `<li class="cat-trv" data-ouvrage="${id}">
      <button class="cat-btn cat-trv-go" type="button" data-action="trv-ouvrir" data-ouvrage="${id}"
        aria-describedby="cat-t-${id}-etat cat-t-${id}-sr">
        <span class="cat-thumb" aria-hidden="true">${(thumb && thumb(id)) || icon(id)}</span>
        <span class="cat-text">
          <span class="cat-nom"></span>
          <span class="cat-effet cat-trv-etapes" aria-hidden="true"></span>
          <span class="cat-etat" id="cat-t-${id}-etat"></span>
        </span>
        <span class="cat-prix" aria-hidden="true"></span>
        ${icon('chevron-down', 'cat-qrt-chev')}
        <span class="sr-only" id="cat-t-${id}-sr"></span>
      </button>
    </li>`;

function build(dlg, thumb, thumbOuvrage, thumbDecor) {
  const tab = (id, panel, label, on) => `<button class="cat-tab" type="button" role="tab" id="${id}" aria-controls="${panel}"
      aria-selected="${on}" tabindex="${on ? 0 : -1}">${esc(label)}</button>`;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title" id="construire-t">${esc(t('bat.catalogue.titre'))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('bat.catalogue.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body cat-body">
      <div class="cat-tabs" role="tablist" aria-label="${esc(t('bat.catalogue.onglets'))}">
        ${tab('cat-bats-t', 'cat-bats', t('bat.catalogue.section'), true)}${tab('cat-qrts-t', 'cat-qrts', t('quartier.catalogue.section'), false)}${tab('cat-decs-t', 'cat-decs', t('decors.catalogue.section'), false)}
      </div>
      <section class="cat-panel" role="tabpanel" id="cat-bats" aria-labelledby="cat-bats-t">
        <ul class="cat-list" role="list">${BATIMENT_IDS.map(row(thumb)).join('')}${OUVRAGE_IDS.map(travauxRow(thumbOuvrage)).join('')}</ul>
        <p class="cat-vide" hidden>${esc(t('bat.catalogue.vide'))}</p>
      </section>
      <section class="cat-panel" role="tabpanel" id="cat-qrts" aria-labelledby="cat-qrts-t" hidden>
        <ul class="cat-list" role="list">${QUARTIER_IDS.map(quartierRow).join('')}</ul>
      </section>
      ${decorsPanel(thumbDecor)}
    </div>`;
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('.cat-tab');
    if (b) choisir(dlg, b.id);
  });
  // flèches, Début et Fin d'un onglet à l'autre ; l'onglet atteint s'affiche aussitôt
  dlg.addEventListener('keydown', (e) => {
    const b = e.target.closest('.cat-tab');
    if (!b) return;
    const tabs = $$('.cat-tab', dlg);
    const i = tabs.indexOf(b);
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    const next = tabs[(j + tabs.length) % tabs.length];
    choisir(dlg, next.id);
    next.focus();
  });
  dlg._thumbDecor = thumbDecor;
  dlg.dataset.built = '1';
}

/** Affiche l'onglet `id` (cat-bats-t, cat-qrts-t ou cat-decs-t) et son panneau. */
function choisir(dlg, id) {
  for (const b of $$('.cat-tab', dlg)) {
    const on = b.id === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    $(`#${b.getAttribute('aria-controls')}`, dlg).hidden = !on;
  }
}

// Cadenas et raison ; quand elle ne dit que ce qui manque, elle n'est plus que lue (les pastilles la montrent) : du texte
// seul, qu'aucune boîte ne déborde de la ligne d'un pixel
function etat(el, raison, lue) {
  if (lue) setText(el, raison);
  else setHtml(el, raison ? `${icon('lock')}<span>${esc(raison)}</span>` : '');
  el.classList.toggle('sr-only', !!raison && lue);
  el.hidden = !raison;
}

function fill(dlg, list) {
  for (const r of list) {
    const li = $(`.cat-row[data-type="${r.type}"]`, dlg);
    li.hidden = r.complet;
    if (r.complet) continue;
    const off = !!r.raison || !r.id;
    // verrou : le rang ou un autre bâtiment manque (à plat, sans prix) ; manque : il manque des ressources
    li.dataset.etat = !off ? 'libre' : r.manque ? 'manque' : 'verrou';
    setText($('.cat-nom', li), r.nom);
    setAttr($('.cat-effet', li), 'data-res', RES.has(r.effet.picto) ? r.effet.picto : null);
    setHtml($('.cat-effet', li), `${icon(r.effet.picto)}<span>${esc(r.effet.texte)}</span>`);
    etat($('.cat-etat', li), r.raison, r.manque);
    setHtml($('.cat-prix', li), off && !r.manque ? '' : r.pastilles.map(pastilleHtml).join(''));
    setText($(`#cat-${r.type}-fait`, li), r.fait);
    setText($('.cat-cout', li), r.cout);
    const b = $('.cat-go', li);
    setAttr(b, 'data-id', r.id);
    setAttr(b, 'aria-disabled', off ? 'true' : null);
    setAttr(b, 'aria-label', t('bat.catalogue.geste.label', { geste: r.geste, nom: r.nom }));
  }
}

function fillQuartiers(dlg, c) {
  for (const q of QUARTIER_IDS) {
    const li = $(`.cat-qrt[data-quartier="${q}"]`, dlg);
    const n = niveauDe(c.game, q);
    const max = niveauMax(q);
    const haut = n >= max;
    const cmp = compareModel(c.game, q, n, max);
    const unite = t(`quartier.catalogue.unite.${EFFETS_QUARTIERS[q].reglage}`);
    const nom = t('quartier.catalogue.nom', { quartier: t(`quartier.${q}.name`), n });
    li.dataset.niveau = String(n);
    setText($('.cat-nom', li), nom);
    setAttr($('.cat-qrt-go', li), 'aria-label', nom);
    // « 4 → 5 par récolte » ; au plus haut, la valeur seule et « Le plus haut pour l'instant »
    setHtml($('.cat-compare', li), haut
      ? `${icon(cmp.picto)}<b>${esc(cmp.avant)}</b><span class="cat-unite">${esc(unite)}</span>`
      : `${icon(cmp.picto)}<span class="cat-avant">${esc(cmp.avant)}</span>${icon('fleche', 'cat-fleche')}<b>${esc(cmp.apres)}</b><span class="cat-unite">${esc(unite)}</span>`);
    const cout = haut ? null : coutNiveau(n + 1);
    const raison = haut ? null : refusMonter(c.game, c.ledger, { quartier: q });
    const parManque = !!raison && raison === manque(c.game, cout);
    li.dataset.etat = haut ? 'max' : !raison ? 'libre' : parManque ? 'manque' : 'verrou';
    const el = $('.cat-etat', li);
    if (haut) {
      setHtml(el, `<span>${esc(t('quartier.catalogue.max'))}</span>`);
      el.classList.remove('sr-only');
      el.hidden = false;
    } else etat(el, raison, parManque);
    setHtml($('.cat-prix', li), cout && (!raison || parManque) ? pastillesDe(c.game, cout).map(pastilleHtml).join('') : '');
    setText($('.cat-suivant', li), [cmp.sr, cout ? t('quartier.fiche.prix.sr', { cout: prixText(cout) }) : ''].filter(Boolean).join(' '));
  }
}

function fillTravaux(dlg, c) {
  for (const id of OUVRAGE_IDS) {
    const li = $(`.cat-trv[data-ouvrage="${id}"]`, dlg);
    const m = travauxModel(c, id);
    const e = m.etat;
    li.hidden = e.fini;
    if (e.fini) continue;
    li.dataset.etat = m.enCours ? 'chantier' : !m.raison ? 'libre' : m.manque ? 'manque' : 'verrou';
    setText($('.cat-nom', li), m.nom);
    setAttr($('.cat-trv-go', li), 'aria-label', m.nom);
    const crans = `<span class="crans crans--mini">${m.etapes.map((x) => `<span${x.fini ? ' data-plein' : x.enCours ? ' data-encours' : ''}></span>`).join('')}</span>`;
    const suite = m.enCours ? m.enCours.titre : e.payees ? t('travaux.catalogue.prochaine', { etape: m.def.etapes[e.payees].nom })
      : t('travaux.catalogue.etapes', { total: e.total });
    setHtml($('.cat-trv-etapes', li), `${crans}<span>${esc(suite)}</span>`);
    const el = $('.cat-etat', li);
    if (m.enCours) {
      setHtml(el, `${icon('chantier')}<span>${esc(t(`travaux.fiche.jours.${m.enCours.restants > 1 ? 'other' : 'one'}`, { n: m.enCours.restants }))}</span>`);
      el.classList.remove('sr-only');
      el.hidden = false;
    } else etat(el, m.raison, m.manque);
    setHtml($('.cat-prix', li), m.geste && (!m.raison || m.manque) ? m.pastilles.map(pastilleHtml).join('') : '');
    setText($(`#cat-t-${id}-sr`, li), [`${t('travaux.fiche.etapes.sr', { n: e.finies, total: e.total })}`, m.prixSr].filter(Boolean).join(' '));
  }
}

function remplir(dlg, c, slots) {
  fill(dlg, rows(c, slots()));
  fillQuartiers(dlg, c);
  fillTravaux(dlg, c);
  fillDecors(dlg, c, { thumb: dlg._thumbDecor, etat });
  $('.cat-vide', dlg).hidden = !!$('#cat-bats .cat-list > li:not([hidden])', dlg);
}

/**
 * Ouvre le catalogue, sur l'onglet « Bâtiments » (onglet : 'decors' pour « Décors », au retour d'une pose annulée).
 * slots() : emplacements de batimentsView ; thumb(type) : dessin SVG d'un type debout (facultatif) ; thumbOuvrage(id) :
 * celui d'un ouvrage debout (facultatif, sinon son picto) ; thumbDecor(decor, coin?) : celui d'un décor (facultatif) ;
 * open(dlg) : ouverture de la feuille (sheets.js).
 */
export function openCatalogue(c, { slots, thumb, thumbOuvrage, thumbDecor, open, onglet }) {
  const dlg = $('#dlg-construire');
  if (!dlg.dataset.built) build(dlg, thumb, thumbOuvrage, thumbDecor);
  choisir(dlg, onglet === 'decors' ? 'cat-decs-t' : 'cat-bats-t');
  remplir(dlg, c, slots);
  open(dlg);
}

/** Remet le catalogue ouvert à jour après un geste ou une synchronisation (sur place : le focus reste où il est). */
export function refreshCatalogue(c, { slots }) {
  const dlg = $('#dlg-construire');
  if (!dlg || !dlg.open || !dlg.dataset.built) return;
  remplir(dlg, c, slots);
}
