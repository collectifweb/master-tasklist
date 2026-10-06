// Catalogue « Construire » (bouton de la carte) : une ligne par type de bâtiment, avec son dessin, son coût, et
// « Disponible » ou la raison écrite par le cœur (la même que dans la fiche et la carte en liste). Le bouton bâtit sur
// le premier emplacement libre de ce type, dans l'ordre du cœur (world/view.js, batimentsView) : data-id le fixe, pour
// qu'un double toucher ne bâtisse pas deux fois. Le geste passe par data-action="cat-construire" (main.js).
// En tête, les permis en main ; en bas, la section « Quartiers » : une ligne par quartier (niveau, effet du suivant,
// prix, « Disponible » ou la raison du cœur, comme les bâtiments) qui ouvre sa fiche par-dessus le catalogue
// (data-action="qrt-ouvrir").
// La feuille est construite une fois, puis mise à jour sur place : le focus ne saute pas pendant une synchronisation.
import { BATIMENTS, BATIMENT_IDS, refusConstruire, QUARTIER_IDS, niveauDe, niveauMax, coutNiveau, refusMonter } from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setText, setAttr, setHtml } from './dom.js';
import { coutText } from './batiment.js';
import { effetText, prixText, permisText } from './quartier.js';

/** Lignes du catalogue. slots : emplacements de batimentsView ({ id, type, bati }), dans l'ordre du cœur. */
function rows(c, slots) {
  return BATIMENT_IDS.map((type) => {
    const libre = slots.find((b) => b.type === type && !b.bati);
    return {
      type,
      nom: t(`bat.${type}.nom`),
      geste: t(`bat.${type}.geste`),
      cout: t('bat.fiche.cout', { cout: coutText(BATIMENTS[type].cout) }),
      id: libre ? libre.id : null,
      raison: refusConstruire(c.game, type),
    };
  });
}

function build(dlg, thumb) {
  const row = (type) => `<li class="ow-plan-bat cat-row" data-type="${type}">
      <span class="cat-thumb" aria-hidden="true">${thumb ? thumb(type) : ''}</span>
      <div class="ow-plan-bat-text">
        <p class="ow-plan-bat-name cat-nom"></p>
        <p class="ow-plan-bat-etat cat-cout" id="cat-${type}-cout"></p>
        <p class="cat-etat" id="cat-${type}-etat"></p>
      </div>
      <button class="btn btn--small cat-go" type="button" data-action="cat-construire" data-type="${type}"
        aria-describedby="cat-${type}-etat cat-${type}-cout"></button>
    </li>`;
  dlg.innerHTML = `
    <header class="sheet-head"><h2 class="sheet-title" id="construire-t">${esc(t('bat.catalogue.titre'))}</h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('bat.catalogue.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body cat-body">
      <p class="cat-permis" id="cat-permis"></p>
      <p class="cat-intro">${esc(t('bat.catalogue.intro'))}</p>
      <section aria-labelledby="cat-bats-t">
        <h3 class="ow-plan-subtitle cat-section" id="cat-bats-t">${esc(t('bat.catalogue.section'))}</h3>
        <ul class="ow-plan-bats" role="list">${BATIMENT_IDS.map(row).join('')}</ul>
      </section>
      <section aria-labelledby="cat-qrts-t">
        <h3 class="ow-plan-subtitle cat-section" id="cat-qrts-t">${esc(t('quartier.catalogue.section'))}</h3>
        <ul class="ow-plan-bats" role="list">${QUARTIER_IDS.map(quartierRow).join('')}</ul>
      </section>
    </div>`;
  dlg.dataset.built = '1';
}

// Une ligne par quartier : tout le rang est un bouton (44 px au moins) qui ouvre la fiche du quartier.
const quartierRow = (q) => `<li class="ow-plan-bat cat-qrt" data-quartier="${q}">
      <button class="cat-qrt-go" type="button" data-action="qrt-ouvrir" data-quartier="${q}">
        <span class="cat-thumb cat-qrt-picto" aria-hidden="true">${icon(q)}</span>
        <span class="ow-plan-bat-text">
          <span class="ow-plan-bat-name cat-nom"></span>
          <span class="ow-plan-bat-etat cat-suivant"></span>
          <span class="ow-plan-bat-etat cat-prix"></span>
          <span class="cat-etat"></span>
        </span>
        ${icon('chevron-down', 'cat-qrt-chev')}
      </button>
    </li>`;

function fillQuartiers(dlg, c) {
  setText($('#cat-permis', dlg), permisText(c));
  for (const q of QUARTIER_IDS) {
    const li = $(`.cat-qrt[data-quartier="${q}"]`, dlg);
    const n = niveauDe(c.game, q);
    const haut = n >= niveauMax(q);
    li.dataset.niveau = String(n);
    setText($('.cat-nom', li), t('quartier.catalogue.nom', { quartier: t(`quartier.${q}.name`), n }));
    setText($('.cat-suivant', li), haut ? t('quartier.catalogue.max') : t('quartier.catalogue.suivant', { n: n + 1, effet: effetText(q, n + 1) }));
    setText($('.cat-prix', li), haut ? '' : prixText(coutNiveau(n + 1)));
    $('.cat-prix', li).hidden = haut;
    // « Disponible » ou ce qui manque (la phrase de la fiche) ; au plus haut, la ligne du suivant le dit déjà
    const raison = haut ? null : refusMonter(c.game, c.ledger, { quartier: q });
    setAttr(li, 'data-etat', haut ? null : raison ? 'verrou' : 'libre');
    setHtml($('.cat-etat', li), haut ? '' : raison
      ? `${icon('lock')}<span>${esc(raison)}</span>`
      : `${icon('check')}<span>${esc(t('bat.catalogue.dispo'))}</span>`);
    $('.cat-etat', li).hidden = haut;
  }
}

function fill(dlg, list) {
  for (const r of list) {
    const li = $(`.cat-row[data-type="${r.type}"]`, dlg);
    const off = !!r.raison || !r.id;
    li.dataset.etat = off ? 'verrou' : 'libre';
    setText($('.cat-nom', li), r.nom);
    setText($('.cat-cout', li), r.cout);
    setHtml($('.cat-etat', li), off
      ? `${icon('lock')}<span>${esc(r.raison)}</span>`
      : `${icon('check')}<span>${esc(t('bat.catalogue.dispo'))}</span>`);
    const b = $('.cat-go', li);
    setAttr(b, 'data-id', r.id);
    setAttr(b, 'aria-disabled', off ? 'true' : null);
    setAttr(b, 'aria-label', t('bat.catalogue.geste.label', { geste: r.geste, nom: r.nom }));
    setHtml(b, `${icon(off ? 'lock' : 'chantier')}<span>${esc(r.geste)}</span>`);
  }
}

/**
 * Ouvre le catalogue. slots() : emplacements de batimentsView ; thumb(type) : dessin SVG d'un type debout (facultatif) ;
 * open(dlg) : ouverture de la feuille (sheets.js).
 */
export function openCatalogue(c, { slots, thumb, open }) {
  const dlg = $('#dlg-construire');
  if (!dlg.dataset.built) build(dlg, thumb);
  fill(dlg, rows(c, slots()));
  fillQuartiers(dlg, c);
  open(dlg);
}

/** Remet le catalogue ouvert à jour après un geste ou une synchronisation (sur place : le focus reste où il est). */
export function refreshCatalogue(c, { slots }) {
  const dlg = $('#dlg-construire');
  if (!dlg || !dlg.open || !dlg.dataset.built) return;
  fill(dlg, rows(c, slots()));
  fillQuartiers(dlg, c);
}
