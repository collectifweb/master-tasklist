// Fiche d'un ouvrage des Grands travaux (lot O) : le phare. Même gabarit que la fiche d'un quartier (quartier.js) : en
// tête, le picto, le nom et « 1 étape sur 4 » ; ce que c'est (rien sur ce qu'il rapporte : il est là pour rester,
// décision d'Alex) ; en dessins, l'avant et l'après de la prochaine étape, ou l'étape que les ouvriers bâtissent et ses jours travaillés en
// crans ; les quatre étapes nommées, cochées une fois finies ; le prix en pastilles ; la règle dans le repli ; puis
// « Bâtir la tour ». Un geste impossible reste visible, à plat, avec un cadenas et la raison écrite par le cœur
// (refusTravaux) ; quand elle ne dit que ce qui manque, les pastilles la montrent et elle n'est plus que lue.
// Rien n'est calculé ici qui ne vienne de core/travaux.js ; le geste passe par data-action="trv-batir" (main.js).
import { OUVRAGES, JOURS_PAR_ETAPE, etatOuvrage, refusTravaux, manque } from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon, setHtml, setText } from './dom.js';
import { pastillesDe, prixRangHtml } from './batiment.js';
import { prixText } from './quartier.js';

/** L'état d'un ouvrage pour la carte : '0' à '4' (étapes finies), '+chantier' pendant qu'on bâtit (world/models.js). */
export const varianteDe = (e) => `${e.finies}${e.enCours ? '+chantier' : ''}`;

/** Modèle de la fiche (et de la rangée du catalogue) d'un ouvrage. */
export function travauxModel({ game, ledger, now }, id) {
  if (!Object.hasOwn(OUVRAGES, id)) return null;
  const def = OUVRAGES[id];
  const e = etatOuvrage(game, ledger, id, now);
  const nomEtape = (k) => def.etapes[k - 1].nom; // « la tour »
  const prochaine = e.prochaine && !e.enCours ? e.prochaine : null;
  const raison = e.fini ? null : refusTravaux(game, ledger, { ouvrage: id }, now);
  const cout = e.prochaine ? e.prochaine.cout : null;
  return {
    id, def, etat: e,
    nom: t(`travaux.${id}.nom`),
    ligne: e.fini ? t('travaux.fiche.ligne.fini') : e.finies ? tn('travaux.fiche.ligne', e.finies, { total: e.total }) : t('travaux.fiche.ligne.zero', { total: e.total }),
    quoi: t(e.fini ? `travaux.${id}.quoi.debout` : e.payees ? `travaux.${id}.quoi.chantier` : `travaux.${id}.quoi`),
    etapes: def.etapes.map((x, i) => ({ id: x.id, nom: t(`travaux.${id}.etape.${x.id}`), fini: i < e.finies, enCours: e.enCours?.etape === i + 1 })),
    // l'avant et l'après : maintenant, puis l'étape suivante finie ; pendant les travaux, le chantier seul
    avant: varianteDe(e),
    apres: prochaine ? String(prochaine.etape) : null,
    apresLabel: prochaine ? t('travaux.fiche.apres', { etape: nomEtape(prochaine.etape) }) : '',
    enCours: e.enCours ? { titre: t('travaux.fiche.enCours', { etape: nomEtape(e.enCours.etape) }), jours: e.enCours.jours, restants: e.enCours.restants } : null,
    geste: prochaine ? { etape: prochaine.etape, label: t('travaux.fiche.batir', { etape: nomEtape(prochaine.etape) }) } : null,
    pastilles: cout ? pastillesDe(game, cout) : [],
    prixSr: cout ? t('travaux.fiche.prix.sr', { etape: nomEtape(e.prochaine.etape), cout: prixText(cout) }) : '',
    raison,
    manque: !!raison && !!cout && raison === manque(game, cout),
    regle: t('travaux.fiche.regle', { cout: prixText(def.etapes[0].cout), n: JOURS_PAR_ETAPE }),
  };
}

const crans = (plein, total) => `<span class="crans">${Array.from({ length: total }, (_, i) => `<span${i < plein ? ' data-plein' : ''}></span>`).join('')}</span>`;

// L'avant et l'après en dessins, à la même échelle (un cadre pour les deux) ; pendant les travaux, le chantier et ses
// jours travaillés en crans.
// Muet : la phrase lue (#trv-now) dit la même chose.
function scene(m, dessin) {
  const svgs = dessin ? dessin(m.apres ? [m.avant, m.apres] : [m.avant]) : [];
  if (!svgs.length) return '';
  const fig = (k, legende, apres) => `<figure class="trv-fig${apres ? ' trv-fig--apres' : ''}">${svgs[k]}<figcaption>${esc(legende)}</figcaption></figure>`;
  if (m.enCours) {
    return `<div class="trv-scene" data-etat="chantier" aria-hidden="true">${fig(0, t('travaux.fiche.maintenant'))}
      <div class="trv-chantier"><p class="trv-chantier-t">${esc(m.enCours.titre)}</p>${crans(m.enCours.jours, JOURS_PAR_ETAPE)}
        <p class="trv-chantier-v">${esc(tn('travaux.fiche.jours', m.enCours.restants))}</p></div></div>`;
  }
  if (!m.apres) return `<div class="trv-scene" data-etat="debout" aria-hidden="true">${fig(0, t('travaux.catalogue.debout'))}</div>`;
  return `<div class="trv-scene" aria-hidden="true">${fig(0, t('travaux.fiche.maintenant'))}${icon('fleche', 'trv-fleche')}${fig(1, m.apresLabel, true)}</div>`;
}

// Les quatre étapes, nommées : cochées une fois finies, la flèche de chantier sur celle qu'on bâtit
function etapesHtml(m) {
  const li = (x) => `<li class="trv-etape"${x.fini ? ' data-fini' : x.enCours ? ' data-encours' : ''}><span class="trv-etape-cran">${x.fini ? icon('check') : x.enCours ? icon('chantier') : ''}</span><span class="trv-etape-nom">${esc(x.nom)}</span></li>`;
  return `<ol class="trv-etapes" role="list" aria-label="${esc(t('travaux.fiche.etapes.sr', { n: m.etat.finies, total: m.etat.total }))}">${m.etapes.map(li).join('')}</ol>`;
}

function maintenantText(m) {
  if (m.etat.fini) return t('travaux.fiche.debout');
  if (m.enCours) return `${m.enCours.titre}\u00a0: ${tn('travaux.fiche.jours', m.enCours.restants)}.`;
  return m.apresLabel ? `${t('travaux.catalogue.prochaine', { etape: m.def.etapes[m.geste.etape - 1].nom })}.` : '';
}

function bodyHtml(m, dessin) {
  const raison = !m.raison || m.enCours ? '' : m.manque ? `<p class="sr-only" id="trv-raison">${esc(m.raison)}</p>`
    : `<p class="bat-raison" id="trv-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>`;
  const repli = `<details class="repli"><summary>${esc(t('travaux.fiche.repli'))}${icon('chevron-down')}</summary><p>${esc(m.regle)}</p></details>`;
  return `<p class="trv-quoi">${esc(m.quoi)}</p>
    ${scene(m, dessin)}<p class="sr-only" id="trv-now">${esc(maintenantText(m))}</p>
    ${etapesHtml(m)}
    ${m.geste ? `${prixRangHtml(m.pastilles)}<p class="sr-only" id="trv-prix">${esc(m.prixSr)}</p>` : ''}${raison}${repli}`;
}

function footHtml(m) {
  if (m.etat.fini) return `<p class="qrt-max">${esc(t('travaux.fiche.debout'))}</p>`;
  const etape = m.geste ? m.geste.etape : m.etat.payees + 1;
  const label = t('travaux.fiche.batir', { etape: m.def.etapes[Math.min(etape, m.etat.total) - 1].nom });
  const off = !!m.raison;
  const desc = m.enCours ? 'trv-now' : off ? 'trv-raison' : 'trv-prix';
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="trv-batir" data-ouvrage="${esc(m.id)}"
    data-etape="${etape}"${off ? ' aria-disabled="true"' : ''} aria-describedby="${desc}">${icon(off ? 'lock' : 'chantier')}<span>${esc(label)}</span></button>`;
}

/**
 * Ouvre la fiche d'un ouvrage (phare). dessin(id, variants) (facultatif) : les dessins de ces états, dans un même cadre
 * (world.thumbOuvrage) ; sans monde, la fiche s'ouvre sans dessins. open(dlg) : ouverture de la feuille (sheets.js).
 */
export function openTravaux(c, id, { dessin, open } = {}) {
  const m = travauxModel(c, id);
  if (!m) return false;
  const dlg = $('#dlg-travaux');
  dlg.dataset.ouvrage = id;
  dlg._dessin = dessin ? (variants) => dessin(id, variants) : null;
  dlg.innerHTML = `
    <header class="sheet-head"><div class="qrt-head"><span class="bat-thumb qrt-picto" aria-hidden="true">${icon(id)}</span>
      <div class="qrt-head-text"><h2 class="sheet-title" id="trv-t"></h2><p class="qrt-ligne" id="trv-d"></p></div></div>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('travaux.fiche.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body bat-body trv-body"></div>
    <footer class="sheet-foot trv-foot"></footer>`;
  fill(dlg, m);
  open(dlg);
  return true;
}

function fill(dlg, m) {
  setText($('#trv-t', dlg), m.nom);
  setText($('#trv-d', dlg), m.ligne);
  const body = $('.trv-body', dlg);
  const repli = $('.repli', body);
  const ouvert = !!repli?.open, surRepli = !!repli?.contains(document.activeElement);
  setHtml(body, bodyHtml(m, dlg._dessin));
  if (ouvert || surRepli) {
    const r = $('.repli', body);
    r.open = ouvert;
    if (surRepli) $('summary', r).focus();
  }
  const foot = $('.trv-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, footHtml(m));
  if (had) ($('[data-action="trv-batir"]', foot) || $('[data-close]', dlg)).focus();
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation (le clavier reste sur le bouton). */
export function refreshTravaux(c) {
  const dlg = $('#dlg-travaux');
  if (!dlg || !dlg.open || !dlg.dataset.ouvrage) return;
  const m = travauxModel(c, dlg.dataset.ouvrage);
  if (m) fill(dlg, m);
}
