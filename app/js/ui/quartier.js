// Fiche d'un quartier (docs/conception-niveaux-quartiers.md, §7 ; lot L) : l'avant et l'après du niveau suivant
// (« 4 → 5 », « +1 »), son prix en pastilles (permis, Énergie, Matériaux ; en pointillés avec « il manque N » quand il en
// manque), la règle dans un repli « Comment ça marche », puis « Monter au niveau n ». Un achat impossible reste visible,
// à plat, avec un cadenas ; la raison écrite par le cœur (refusMonter) n'est plus qu'une phrase lue, les pastilles la
// montrent. Les permis en main et le prochain ne s'y lisent plus : la tuile « Permis » de la barre les dit. Même gabarit
// que la fiche d'un bâtiment (batiment.js), avec ses propres identifiants : elle s'ouvre aussi par-dessus le catalogue
// « Construire » ou la Carte en liste.
// Rien n'est calculé ici qui ne vienne de core/quartiers.js ; l'achat passe par data-action="qrt-monter", l'ancien
// filtre de la liste par data-action="qrt-quetes" (main.js). Un achat réussi range la fiche (main.js) : le moment se joue
// sur la plaque, puis la carte de récompense (openRecompense) ; le niveau suivant se lit à la prochaine ouverture.
// La fiche de la Place porte aussi ce que la Nourriture achète (lot N, core/nourriture.js et objectifs.js) : du 1er mars
// au 30 avril, la partie de sucre, au dessin de la commande du quai (Demande / Laisse, « Faire la partie de sucre » en
// bouton secondaire : « Monter au niveau » reste le seul geste principal de la fiche), puis le repas de la semaine, au
// dessin d'une offre du comptoir (le troc, « Servir le repas »). Chacun : le cadenas et la raison du cœur, ou sa ligne
// cochée à la même place. Les gestes passent par data-action="bat-geste", comme ceux d'un bâtiment.
import {
  QUARTIERS, EFFETS_QUARTIERS, niveauDe, niveauMax, valeur, coutNiveau, refusMonter,
  quartierOfTask, potagerOuvert, compte, gameDay, PLACE_ID, repasDeLaSemaine, refusServirRepas, objectifSaison,
  OBJECTIFS_SAISON, refusFaireLesSucres,
} from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setHtml, setText } from './dom.js';
import { num } from './format.js';
import { ressource, ressourcesText, resHtml, pastillesDe, prixRangHtml } from './batiment.js';

/** « 6 Nourriture par récolte du potager » : l'effet d'un niveau, sans point final (valeur au niveau n, 0 = départ). */
export function effetText(quartier, n) {
  const e = EFFETS_QUARTIERS[quartier];
  const v = n > 0 ? e.niveaux[n - 1] : valeur({}, e.reglage);
  return t(`quartier.effet.${e.reglage}`, { n: num(v) });
}

/** « 2 permis, 160 Énergie et 120 Matériaux » (les mêmes mots que le HUD). */
export function prixText(cout) {
  const parts = [];
  if (cout.permis) parts.push(t('quartier.cout.permis', { n: num(cout.permis) }));
  if (cout.energy) parts.push(`${num(cout.energy)} ${t('resource.energy')}`);
  if (cout.materials) parts.push(`${num(cout.materials)} ${t(cout.materials < 2 ? 'resource.materials.one' : 'resource.materials.other')}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts.join('');
}

/** Quêtes à faire du quartier : celles que « Voir les quêtes » montre dans la liste. */
const quetesDe = (tasks, quartier) => tasks.filter((x) => x.status === 'todo' && quartierOfTask(x) === quartier).length;

/** Le repas de la semaine (Place) : { donne, recoit (ressources), servi, raison, label }. */
function repasModel({ game, ledger, now }) {
  const r = repasDeLaSemaine(game, ledger, now);
  return {
    donne: ressource(r.donne), recoit: ressource(r.recoit), servi: r.servi,
    raison: r.servi ? null : refusServirRepas(game, ledger, {}, now),
    label: t('quartier.fiche.repas.geste.label', { donne: ressourcesText(r.donne), recoit: ressourcesText(r.recoit) }),
  };
}

/**
 * La partie de sucre (Place), du 1er mars au 30 avril seulement, sinon null : { demande, laisse (ressources), faite,
 * ralenti, raison, label }. Son prix est la cible de l'objectif de printemps (objectifSaison du cœur).
 */
function sucresModel({ game, ledger, now }) {
  const mois = Number(gameDay(now).slice(5, 7));
  if (mois < 3 || mois > 4) return null;
  const o = objectifSaison(game, ledger, now);
  const rec = OBJECTIFS_SAISON.printemps.recompense;
  const faite = o.atteint || o.faite;
  return {
    demande: [ressource({ food: o.max })],
    laisse: [ressource({ energy: rec.energy }), ressource({ materials: rec.materials }), { res: 'permis', n: rec.permis, nom: t('bat.commande.recoit.permis') }],
    faite, ralenti: !!o.ralenti,
    raison: faite ? null : refusFaireLesSucres(game, ledger, {}, now),
    label: t('quartier.fiche.sucres.geste.label', { demande: ressourcesText({ food: o.max }) }),
  };
}

// Picto de la ligne comparative, par réglage ; les réglages où un chiffre plus bas est meilleur disent leur sens en
// toutes lettres (« moins cher », « plus vite ») : le signe seul ressemblerait à une perte.
const PICTO = { recoltePotager: 'nourriture', recolteSerre: 'nourriture', prixFamille: 'nourriture', placesParChalet: 'habitants', joursPousse: 'calendar', stockagePlace: 'nourriture' };
const SENS = { prixFamille: 'quartier.compare.moinsCher', joursPousse: 'quartier.compare.plusVite' };
const liste = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} et ${xs.at(-1)}` : xs.join(''));

/**
 * L'avant et l'après : { picto, label, avant, apres (null au plus haut), niveau (« niveau 2 »), ecart (« +1 », « −3 »),
 * sens (« moins cher » ou ''), sr (la phrase lue) }. Valeurs du cœur (valeur, EFFETS_QUARTIERS).
 */
export function compareModel(game, quartier, niveau, max) {
  const { reglage, niveaux } = EFFETS_QUARTIERS[quartier];
  const avant = valeur(game, reglage);
  const apres = niveau < max ? niveaux[niveau] : null;
  const ecart = apres === null ? 0 : apres - avant;
  const maintenant = effetText(quartier, niveau);
  return {
    picto: PICTO[reglage], label: t(`quartier.compare.${reglage}`),
    avant: num(avant), apres: apres === null ? null : num(apres), niveau: t('quartier.compare.niveau', { n: niveau + 1 }),
    ecart: ecart > 0 ? `+${num(ecart)}` : `−${num(-ecart)}`,
    sens: SENS[reglage] ? t(SENS[reglage]) : '',
    sr: apres === null ? t('quartier.compare.sr.max', { maintenant })
      : t('quartier.compare.sr', { maintenant, n: niveau + 1, suivant: effetText(quartier, niveau + 1) }),
  };
}

/**
 * Modèle de la fiche : { id, nom, ligne, niveau, max, compare, maintenant, suivant: { n } | null, pastilles, prixSr,
 * regle, raison, quetes, repas, sucres } (repas et sucres : la Place seulement, voir repasModel et sucresModel).
 */
export function quartierModel(c, quartier) {
  if (!Object.hasOwn(EFFETS_QUARTIERS, quartier)) return null;
  const { game, ledger, tasks, now } = c;
  const niveau = niveauDe(game, quartier);
  const max = niveauMax(quartier);
  const domaine = QUARTIERS[quartier].domain;
  const { niveaux } = EFFETS_QUARTIERS[quartier];
  let maintenant = '';
  if (quartier === 'champs' && !potagerOuvert(gameDay(now))) maintenant = t('quartier.fiche.dort');
  else if (quartier === 'atelier' && !compte(game, 'serre')) maintenant = t('quartier.fiche.sansSerre');
  const n = quetesDe(tasks, quartier);
  const cout = niveau < max ? coutNiveau(niveau + 1) : null;
  return {
    id: quartier,
    nom: t(`quartier.${quartier}.name`),
    ligne: t('quartier.fiche.ligne', { n: niveau }),
    niveau, max,
    compare: compareModel(game, quartier, niveau, max),
    maintenant,
    suivant: cout ? { n: niveau + 1 } : null,
    pastilles: cout ? pastillesDe(game, cout) : [],
    prixSr: cout ? t('quartier.fiche.prix.sr', { cout: prixText(cout) }) : '',
    regle: t('quartier.fiche.regle', { depart: effetText(quartier, 0), niveaux: liste(niveaux.map((_, i) => String(i + 1))), valeurs: liste(niveaux.map(num)) }),
    raison: cout ? refusMonter(game, ledger, { quartier }) : null,
    quetes: domaine ? t('quartier.fiche.quetes', { domaine, n }) : t('quartier.fiche.quetes.place', { n }),
    repas: quartier === PLACE_ID ? repasModel(c) : null,
    sucres: quartier === PLACE_ID ? sucresModel(c) : null,
  };
}

// La partie de sucre, au dessin de la commande du quai : titre (la feuille d'érable) et « jusqu'au 30 avril », ce que
// c'est, Demande / Laisse, la note du ralenti, le geste (secondaire) ou le cadenas et la raison, ou la ligne cochée ; la règle.
function sucresHtml(s) {
  const etat = s.faite ? 'fait' : s.raison ? 'verrou' : 'libre';
  const plus = (r, i) => (i ? `<span class="commande-plus"><span class="commande-et" aria-hidden="true">+</span><span class="sr-only"> ${esc(t('bat.commande.et'))} </span>${resHtml(r)}</span>` : resHtml(r));
  const action = s.faite
    ? `<p class="commande-fait" id="sucres-etat" tabindex="-1">${icon('check')}<span>${esc(t('quartier.fiche.sucres.fait'))} <small>${esc(t('quartier.fiche.sucres.fait.quand'))}</small></span></p>`
    : `<button class="btn btn--block commande-go" type="button" data-action="bat-geste" data-geste="faireLesSucres" data-params="{}"
      aria-label="${esc(s.label)}"${s.raison ? ' aria-disabled="true" aria-describedby="sucres-raison"' : ''}>${icon(s.raison ? 'lock' : 'erable')}<span>${esc(t('quartier.fiche.sucres.geste'))}</span></button>
      ${s.raison ? `<p class="commande-raison" id="sucres-raison">${icon('lock')}<span>${esc(s.raison)}</span></p>` : ''}`;
  return `<section class="commande fete fete--sucres" data-etat="${etat}" aria-labelledby="sucres-t">
    <h3 class="commande-titre" id="sucres-t">${icon('erable')}<span>${esc(t('quartier.fiche.sucres.titre'))}</span><small class="commande-jours">${esc(t('quartier.fiche.sucres.jours'))}</small></h3>
    <p class="commande-qui">${esc(t('quartier.fiche.sucres.qui'))}</p>
    <dl class="commande-troc">
      <div><dt>${esc(t('bat.commande.demande'))}</dt><dd>${s.demande.map(plus).join('')}</dd></div>
      <div><dt>${esc(t('bat.commande.laisse'))}</dt><dd>${s.laisse.map(plus).join('')}</dd></div>
    </dl>
    ${s.ralenti && !s.faite ? `<p class="commande-taille">${esc(t('quartier.fiche.sucres.ralenti'))}</p>` : ''}
    ${action}
    <p class="commande-regle">${esc(t('quartier.fiche.sucres.regle'))}</p></section>`;
}

// Le repas de la semaine, au dessin d'une offre du comptoir : le troc sur une ligne et « Servir le repas » (secondaire),
// ou « ✓ Servi cette semaine » ; impossible, le bouton verrouillé et la raison du cœur sous la ligne.
function repasHtml(r) {
  const etat = r.servi ? 'fait' : r.raison ? 'verrou' : 'libre';
  const action = r.servi
    ? `<p class="offre-fait" id="repas-etat" tabindex="-1">${icon('check')}<span>${esc(t('quartier.fiche.repas.fait'))} <small>${esc(t('quartier.fiche.repas.fait.quand'))}</small></span></p>`
    : `<button class="btn btn--small offre-go" type="button" data-action="bat-geste" data-geste="servirRepas" data-params="{}"
      aria-label="${esc(r.label)}"${r.raison ? ' aria-disabled="true" aria-describedby="repas-raison"' : ''}>${icon(r.raison ? 'lock' : 'repas')}<span>${esc(t('quartier.fiche.repas.geste'))}</span></button>`;
  return `<section class="comptoir fete fete--repas" aria-labelledby="repas-t">
    <h3 class="comptoir-titre" id="repas-t">${icon('repas')}<span>${esc(t('quartier.fiche.repas.titre'))}</span></h3>
    <p class="comptoir-intro">${esc(t('quartier.fiche.repas.intro'))}</p>
    <ul class="comptoir-offres" role="list"><li class="offre" data-etat="${etat}">
      <p class="offre-troc">${resHtml(r.donne)}${icon('fleche', 'offre-fleche')}<span class="sr-only"> ${esc(t('bat.comptoir.contre'))} </span>${resHtml(r.recoit)}</p>
      ${action}${r.raison ? `<p class="offre-raison" id="repas-raison">${icon('lock')}<span>${esc(r.raison)}</span></p>` : ''}</li></ul></section>`;
}

// « 4 → 5 +1 » : la valeur d'aujourd'hui en encre douce, celle du niveau suivant en sauge et en gros, l'écart en pastille
// (et son sens en toutes lettres quand plus bas est meilleur) ; au plus haut, la valeur seule. Dessin muet, phrase lue à côté.
function compareHtml(c) {
  const val = (v, apres) => `<span class="qrt-val${apres ? ' qrt-val--apres' : ''}">${icon(c.picto)}<b>${esc(v)}</b></span>`;
  const legende = (s, sorte) => `<span class="qrt-legende${sorte ? ` qrt-legende--${sorte}` : ''}">${esc(s)}</span>`;
  const haut = [val(c.avant)], bas = [legende(t('quartier.compare.maintenant'))];
  if (c.apres !== null) {
    haut.push(icon('fleche', 'qrt-fleche'), val(c.apres, true), `<span class="qrt-ecart">${esc(c.ecart)}</span>`);
    bas.push('<span></span>', legende(c.niveau, 'apres'), c.sens ? legende(c.sens, 'sens') : '<span></span>');
  }
  return `<div class="qrt-compare"><p class="qrt-compare-t">${esc(c.label)}</p>
    <div class="qrt-compare-row" aria-hidden="true">${haut.join('')}${bas.join('')}</div><p class="sr-only">${esc(c.sr)}</p></div>`;
}

// Le prix en pastilles, muettes ; la phrase lue (#qrt-prix) décrit le bouton d'achat. Une pastille qui manque passe en
// pointillés, avec « il manque N » dessous.
function prixHtml(m) {
  return `${prixRangHtml(m.pastilles)}
    <p class="sr-only" id="qrt-prix">${esc(m.prixSr)}</p>${m.raison ? `<p class="sr-only" id="qrt-raison">${esc(m.raison)}</p>` : ''}`;
}

function bodyHtml(m) {
  const note = m.maintenant ? `<p class="qrt-note">${esc(m.maintenant)}</p>` : '';
  const repli = `<details class="repli"><summary>${esc(t('quartier.fiche.repli'))}${icon('chevron-down')}</summary><p>${esc(m.regle)}</p></details>`;
  return `${compareHtml(m.compare)}${note}${m.suivant ? prixHtml(m) : ''}${repli}${m.sucres ? sucresHtml(m.sucres) : ''}${m.repas ? repasHtml(m.repas) : ''}`;
}

function footHtml(m) {
  const quetes = `<button class="btn btn--quiet btn--block" type="button" data-action="qrt-quetes" data-quartier="${esc(m.id)}">${esc(m.quetes)}</button>`;
  if (!m.suivant) return `<p class="qrt-max">${esc(t('quartier.fiche.max', { n: m.niveau }))}</p>${quetes}`;
  const off = !!m.raison;
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="qrt-monter" data-quartier="${esc(m.id)}"
    data-niveau="${m.suivant.n}"${off ? ' aria-disabled="true" aria-describedby="qrt-raison"' : ' aria-describedby="qrt-prix"'}>${icon(off ? 'lock' : 'chevron-up')}<span>${esc(t('quartier.fiche.monter', { n: m.suivant.n }))}</span></button>${quetes}`;
}

/** Ouvre la fiche du quartier (champs, atelier…). open(dlg) : ouverture de la feuille (sheets.js). */
export function openQuartier(c, quartier, { open } = {}) {
  const m = quartierModel(c, quartier);
  if (!m) return false;
  const dlg = $('#dlg-quartier');
  dlg.dataset.quartier = quartier;
  dlg.innerHTML = `
    <header class="sheet-head"><div class="qrt-head"><span class="bat-thumb qrt-picto" aria-hidden="true"></span>
      <div class="qrt-head-text"><h2 class="sheet-title" id="qrt-t"></h2><p class="qrt-ligne" id="qrt-d"></p></div></div>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('quartier.fiche.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body bat-body qrt-body"></div>
    <footer class="sheet-foot qrt-foot"></footer>`;
  fill(dlg, m);
  open(dlg);
  return true;
}

function fill(dlg, m) {
  setHtml($('.qrt-picto', dlg), icon(m.id));
  setText($('#qrt-t', dlg), m.nom);
  setText($('#qrt-d', dlg), m.ligne);
  dlg.dataset.niveau = String(m.niveau);
  // un repas servi ou une partie de sucre faite change de bouton : le focus reste à sa place (bouton, ou la ligne cochée)
  const body = $('.qrt-body', dlg);
  const fete = body.contains(document.activeElement) ? document.activeElement.closest('.fete') : null;
  const sorte = fete ? (fete.classList.contains('fete--sucres') ? 'sucres' : 'repas') : null;
  // le repli « Comment ça marche » reste ouvert, et le focus sur lui, d'une mise à jour à l'autre
  const repli = $('.repli', body);
  const ouvert = !!repli?.open, surRepli = !!repli?.contains(document.activeElement);
  setHtml(body, bodyHtml(m));
  if (ouvert || surRepli) {
    const r = $('.repli', body);
    r.open = ouvert;
    if (surRepli) $('summary', r).focus();
  }
  if (sorte && !body.contains(document.activeElement)) {
    const bloc = $(`.fete--${sorte}`, body);
    if (bloc) ($('[data-action="bat-geste"]', bloc) || $(`#${sorte}-etat`, bloc))?.focus();
  }
  const foot = $('.qrt-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, footHtml(m));
  if (had) ($('[data-action="qrt-monter"]', foot) || $('[data-action="qrt-quetes"]', foot)).focus();
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation (le clavier reste sur le bouton). */
export function refreshQuartier(c) {
  const dlg = $('#dlg-quartier');
  if (!dlg || !dlg.open || !dlg.dataset.quartier) return;
  const m = quartierModel(c, dlg.dataset.quartier);
  if (m) fill(dlg, m);
}

/** Phrase lue après l'achat : « Champs : niveau 2. 6 Nourriture par récolte du potager. » */
export function monteText(e) {
  return t('quartier.sr.monte', { quartier: t(`quartier.${e.quartier}.name`), n: e.niveau, effet: effetText(e.quartier, e.niveau) });
}

// ───────── Carte de récompense (lot L) ─────────
/**
 * Une montée de niveau (événement quartier-monte) : { quartier, nom, niveau (« Niveau 2 »), picto, avant (la valeur du
 * niveau d'avant), apres, label, sens, sr (la phrase lue) }. Valeurs du cœur, comme la ligne comparative de la fiche.
 */
export function recompenseModel(e) {
  const { reglage, niveaux } = EFFETS_QUARTIERS[e.quartier];
  const avant = e.niveau > 1 ? niveaux[e.niveau - 2] : valeur({}, reglage);
  return {
    quartier: e.quartier, nom: t(`quartier.${e.quartier}.name`), niveau: t('quartier.recompense.niveau', { n: e.niveau }),
    picto: PICTO[reglage], avant: num(avant), apres: num(niveaux[e.niveau - 1]),
    label: t(`quartier.compare.${reglage}`), sens: SENS[reglage] ? t(SENS[reglage]) : '', sr: monteText(e),
  };
}

/**
 * Carte de récompense (#dlg-recompense), une fois le moment joué sur la plaque : le picto du quartier, « Niveau 2 », le
 * nom, « 5 → 6 » en grand, ce que ça compte, la réplique de Fanal quand il en a une (reply, ou null), « Continuer ». Le
 * dessin est muet ; la feuille est nommée par le quartier et décrite par la phrase lue, Fanal compris.
 */
export function openRecompense(e, reply, { open }) {
  const m = recompenseModel(e);
  const dlg = $('#dlg-recompense');
  const val = (v, apres) => `<span class="recompense-val${apres ? ' recompense-val--apres' : ''}">${icon(m.picto)}<b>${esc(v)}</b></span>`;
  dlg.dataset.quartier = m.quartier;
  dlg.innerHTML = `
    <span class="recompense-picto" aria-hidden="true">${icon(m.quartier)}</span>
    <div class="sheet-body recompense-body">
      <p class="recompense-niveau">${esc(m.niveau)}</p>
      <h2 class="recompense-titre" id="recompense-t">${esc(m.nom)}</h2>
      <p class="recompense-compare" aria-hidden="true">${val(m.avant)}${icon('fleche', 'recompense-fleche')}${val(m.apres, true)}</p>
      <p class="recompense-label" aria-hidden="true">${esc(m.label)}${m.sens ? ` · ${esc(m.sens)}` : ''}</p>
      <p class="sr-only" id="recompense-d">${esc(m.sr)}${reply ? ` ${esc(reply.nom)}\u00a0: ${esc(reply.texte)}` : ''}</p>
      ${reply ? `<p class="recompense-fanal"><span class="speech-name">${esc(reply.nom)}</span><span>${esc(reply.texte)}</span></p>` : ''}
      <button class="btn btn--primary btn--block" type="button" data-close>${esc(t('quartier.recompense.continuer'))}</button>
    </div>`;
  open(dlg);
}
