// Fiche d'un ouvrage des Grands travaux (lot O) : le phare. Même gabarit que la fiche d'un quartier (quartier.js) : en
// tête, le picto, le nom et « 1 étape sur 4 » ; ce que c'est (rien sur ce qu'il rapporte : il est là pour rester,
// décision d'Alex) ; en dessins, l'avant et l'après de la prochaine étape, ou l'étape que les ouvriers bâtissent et ses jours travaillés en
// crans ; les quatre étapes nommées, cochées une fois finies ; le prix en pastilles ; la règle dans le repli ; puis
// « Bâtir la tour ». Un geste impossible reste visible, à plat, avec un cadenas et la raison écrite par le cœur
// (refusTravaux) ; quand elle ne dit que ce qui manque, les pastilles la montrent et elle n'est plus que lue.
// Rien n'est calculé ici qui ne vienne de core/travaux.js ; le geste passe par data-action="trv-batir" (main.js).
// Le phare debout (lot Y, core/escales.js) : en tête, sa lanterne (allumée jusqu'à dimanche, ou éteinte) ; puis les
// plaisanciers, au gabarit de la commande du quai (batiment.js) : ce qu'ils demandent en pastille à jauge, une flèche, le
// décor qu'ils laisseront, et « Accueillir » ; ou une ligne quand leur voilier arrive demain. En bas, « Allumer le phare »,
// verrouillé avec la raison du cœur (refusAllumer) tant qu'il brille ou que des plaisanciers attendent. Gestes :
// data-action="esc-allumer" et "esc-accueillir" (main.js).
import { OUVRAGES, JOURS_PAR_ETAPE, etatOuvrage, refusTravaux, manque, etatEscales, refusAllumer, refusAccueillirEscale } from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon, setHtml, setText } from './dom.js';
import { pastillesDe, prixRangHtml, commandeResHtml } from './batiment.js';
import { prixText } from './quartier.js';
import { numPossede } from './format.js';

/** L'état d'un ouvrage pour la carte : '0' à '4' (étapes finies), '+chantier' pendant qu'on bâtit (world/models.js). */
export const varianteDe = (e) => `${e.finies}${e.enCours ? '+chantier' : ''}`;

/** Le phare debout et ses escales (lot Y) : la lanterne, les plaisanciers, les deux gestes et leurs raisons. */
function escalesModel(game, ledger, now) {
  const s = etatEscales(game, ledger, now);
  const prix = s.cout.accueillir.food, a = game.resources.food;
  const raisonAllumer = refusAllumer(game, ledger, {}, now);
  return {
    allume: s.allume, escale: s.escale,
    decor: s.decor, decorNom: t(`decors.${s.decor}.nom`), decorLe: t(`decors.${s.decor}.le`),
    demande: { res: 'nourriture', n: prix, nom: t('resource.food'), a: numPossede(a), assez: a >= prix, pct: Math.max(0, Math.min(100, Math.round((100 * a) / prix))) },
    raisonAccueil: s.escale === 'attend' ? refusAccueillirEscale(game, ledger, {}, now) : null,
    raisonAllumer,
    manqueAllumer: !!raisonAllumer && raisonAllumer === manque(game, s.cout.allumer),
    pastilles: pastillesDe(game, s.cout.allumer),
    prixSr: t('escales.allumer.prix.sr', { cout: prixText(s.cout.allumer) }),
    regle: t('escales.regle', { allumer: prixText(s.cout.allumer), accueillir: `${prix} ${t('resource.food')}` }),
  };
}

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
    ligne: e.fini ? t(id === 'phare' && etatEscales(game, ledger, now).allume ? 'escales.ligne.allume' : 'travaux.fiche.ligne.fini') : e.finies ? tn('travaux.fiche.ligne', e.finies, { total: e.total }) : t('travaux.fiche.ligne.zero', { total: e.total }),
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
    escales: e.fini && id === 'phare' ? escalesModel(game, ledger, now) : null,
  };
}

const crans = (plein, total) => `<span class="crans">${Array.from({ length: total }, (_, i) => `<span${i < plein ? ' data-plein' : ''}></span>`).join('')}</span>`;

// L'avant et l'après en dessins, à la même échelle (un cadre pour les deux) ; pendant les travaux, le chantier et ses
// jours travaillés en crans.
// Muet : la phrase lue (#trv-now) dit la même chose.
function scene(m, dessin) {
  const avant = m.escales?.escale === 'attend' ? `${m.avant}+escale` : m.avant; // le voilier des plaisanciers (lot Y)
  const svgs = dessin ? dessin(m.apres ? [avant, m.apres] : [avant]) : [];
  if (!svgs.length) return '';
  const fig = (k, legende, apres) => `<figure class="trv-fig${apres ? ' trv-fig--apres' : ''}">${svgs[k]}<figcaption>${esc(legende)}</figcaption></figure>`;
  if (m.enCours) {
    return `<div class="trv-scene" data-etat="chantier" aria-hidden="true">${fig(0, t('travaux.fiche.maintenant'))}
      <div class="trv-chantier"><p class="trv-chantier-t">${esc(m.enCours.titre)}</p>${crans(m.enCours.jours, JOURS_PAR_ETAPE)}
        <p class="trv-chantier-v">${esc(tn('travaux.fiche.jours', m.enCours.restants))}</p></div></div>`;
  }
  if (!m.apres) {
    const x = m.escales;
    return `<div class="trv-scene" data-etat="debout"${x?.allume ? ' data-allume' : ''} aria-hidden="true">${fig(0, t(x?.allume ? 'escales.fig.allume' : 'travaux.catalogue.debout'))}</div>`;
  }
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

// Les plaisanciers au phare : la carte de la commande du quai (Demande → Laisse, « Accueillir » ou sa raison sur le bouton)
function escaleHtml(x, thumbDecor) {
  if (x.escale === 'en-route') return `<p class="esc-route">${icon('voilier')}<span>${esc(t('escales.route'))}</span></p>`;
  if (x.escale !== 'attend') return '';
  const off = !!x.raisonAccueil;
  const laisse = `<span class="commande-res commande-res--laisse esc-decor"><span class="esc-decor-dessin" aria-hidden="true">${thumbDecor ? thumbDecor(x.decor) : ''}</span><span class="esc-decor-nom">${esc(x.decorNom)}</span></span>`;
  return `<section class="commande esc" data-etat="${off ? 'verrou' : 'libre'}" aria-labelledby="esc-t">
    <h3 class="commande-titre" id="esc-t">${icon('voilier')}<span>${esc(t('escales.titre'))}</span></h3>
    <p class="commande-qui">${esc(t('escales.qui'))}</p>
    <div class="commande-echange">
      <p class="commande-demande"><span class="sr-only">${esc(t('bat.commande.demande'))}\u00a0: </span>${commandeResHtml(x.demande)}</p>
      ${icon('fleche', 'commande-fleche')}
      <p class="commande-laisse"><span class="sr-only">${esc(t('bat.commande.laisse'))}\u00a0: </span>${laisse}</p>
    </div>
    <button class="btn btn--block ${off ? '' : 'btn--primary '}commande-go" type="button" data-action="esc-accueillir"
      aria-label="${esc(t('escales.accueillir.label', { cout: `${x.demande.n} ${x.demande.nom}`, decor: x.decorLe }))}"${off ? ' aria-disabled="true" aria-describedby="esc-raison"' : ''}>${icon(off ? 'lock' : 'habitants')}<span>${esc(t('escales.accueillir'))}</span>${
      off ? `<span class="commande-raison" id="esc-raison">${esc(x.raisonAccueil)}</span>` : ''}</button></section>`;
}

// Le phare debout : la lanterne, les plaisanciers, le prix pour l'allumer et la règle dans le repli
function deboutHtml(m, dessin, thumbDecor) {
  const x = m.escales;
  // la raison n'est que lue quand l'écran la montre déjà : les pastilles en pointillés, ou la ligne du voilier en route
  const raison = !x.raisonAllumer ? '' : x.manqueAllumer || x.escale === 'en-route' ? `<p class="sr-only" id="esc-allumer-raison">${esc(x.raisonAllumer)}</p>`
    : `<p class="bat-raison" id="esc-allumer-raison">${icon('lock')}<span>${esc(x.raisonAllumer)}</span></p>`;
  const lanterne = `<p class="esc-lanterne"${x.allume ? ' data-allume' : ''}>${icon('phare')}<span>${esc(t(x.allume ? 'escales.lanterne.allume' : 'escales.lanterne.eteinte'))}</span></p>`;
  const prix = !x.raisonAllumer || x.manqueAllumer ? `${prixRangHtml(x.pastilles)}<p class="sr-only" id="esc-allumer-prix">${esc(x.prixSr)}</p>` : '';
  return `<p class="trv-quoi">${esc(m.quoi)}</p>
    ${scene(m, dessin)}${lanterne}${escaleHtml(x, thumbDecor)}${prix}${raison}
    <details class="repli"><summary>${esc(t('travaux.fiche.repli'))}${icon('chevron-down')}</summary><p>${esc(x.regle)}</p></details>`;
}

function bodyHtml(m, dessin, thumbDecor) {
  if (m.escales) return deboutHtml(m, dessin, thumbDecor);
  const raison = !m.raison || m.enCours ? '' : m.manque ? `<p class="sr-only" id="trv-raison">${esc(m.raison)}</p>`
    : `<p class="bat-raison" id="trv-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>`;
  const repli = `<details class="repli"><summary>${esc(t('travaux.fiche.repli'))}${icon('chevron-down')}</summary><p>${esc(m.regle)}</p></details>`;
  return `<p class="trv-quoi">${esc(m.quoi)}</p>
    ${scene(m, dessin)}<p class="sr-only" id="trv-now">${esc(maintenantText(m))}</p>
    ${etapesHtml(m)}
    ${m.geste ? `${prixRangHtml(m.pastilles)}<p class="sr-only" id="trv-prix">${esc(m.prixSr)}</p>` : ''}${raison}${repli}`;
}

function footHtml(m) {
  if (m.escales) {
    const x = m.escales, off = !!x.raisonAllumer;
    return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="esc-allumer"${off ? ' aria-disabled="true"' : ''}
      aria-describedby="${off ? 'esc-allumer-raison' : 'esc-allumer-prix'}">${icon(off ? 'lock' : 'phare')}<span>${esc(t('escales.allumer'))}</span></button>`;
  }
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
 * (world.thumbOuvrage) ; sans monde, la fiche s'ouvre sans dessins. thumbDecor(decor) (facultatif) : le dessin du décor
 * que laisseront les plaisanciers (world.thumbDecor). open(dlg) : ouverture de la feuille (sheets.js).
 */
export function openTravaux(c, id, { dessin, thumbDecor, open } = {}) {
  const m = travauxModel(c, id);
  if (!m) return false;
  const dlg = $('#dlg-travaux');
  dlg.dataset.ouvrage = id;
  dlg._dessin = dessin ? (variants) => dessin(id, variants) : null;
  dlg._thumbDecor = thumbDecor || null;
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
  const surAccueil = !!$('[data-action="esc-accueillir"]', body)?.contains(document.activeElement);
  setHtml(body, bodyHtml(m, dlg._dessin, dlg._thumbDecor));
  if (surAccueil) ($('[data-action="esc-accueillir"]', body) || $('[data-close]', dlg)).focus();
  if (ouvert || surRepli) {
    const r = $('.repli', body);
    r.open = ouvert;
    if (surRepli) $('summary', r).focus();
  }
  const foot = $('.trv-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, footHtml(m));
  if (had) ($('[data-action="trv-batir"], [data-action="esc-allumer"]', foot) || $('[data-close]', dlg)).focus();
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation (le clavier reste sur le bouton). */
export function refreshTravaux(c) {
  const dlg = $('#dlg-travaux');
  if (!dlg || !dlg.open || !dlg.dataset.ouvrage) return;
  const m = travauxModel(c, dlg.dataset.ouvrage);
  if (m) fill(dlg, m);
}
