// Fiche d'un quartier (docs/conception-niveaux-quartiers.md, §7) : ce qu'il fait, le niveau suivant, son prix en
// permis, Énergie et Matériaux, puis « Monter au niveau n ». Un achat impossible reste visible, à plat, avec la raison
// écrite par le cœur (refusMonter) et un cadenas. Même gabarit que la fiche d'un bâtiment (batiment.js), avec ses
// propres identifiants : elle s'ouvre aussi par-dessus le catalogue « Construire » ou la Carte en liste.
// Rien n'est calculé ici qui ne vienne de core/quartiers.js ; l'achat passe par data-action="qrt-monter", l'ancien
// filtre de la liste par data-action="qrt-quetes" (main.js).
// La fiche de la Place porte aussi ce que la Nourriture achète (lot N, core/nourriture.js et objectifs.js) : du 1er mars
// au 30 avril, la partie de sucre, au dessin de la commande du quai (Demande / Laisse, « Faire la partie de sucre » en
// bouton secondaire : « Monter au niveau » reste le seul geste principal de la fiche), puis le repas de la semaine, au
// dessin d'une offre du comptoir (le troc, « Servir le repas »). Chacun : le cadenas et la raison du cœur, ou sa ligne
// cochée à la même place. Les gestes passent par data-action="bat-geste", comme ceux d'un bâtiment.
import {
  QUARTIERS, EFFETS_QUARTIERS, niveauDe, niveauMax, valeur, coutNiveau, refusMonter, progressionPermis,
  quartierOfTask, potagerOuvert, compte, gameDay, PLACE_ID, repasDeLaSemaine, refusServirRepas, objectifSaison,
  OBJECTIFS_SAISON, refusFaireLesSucres,
} from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setHtml, setText } from './dom.js';
import { num } from './format.js';
import { ressource, ressourcesText, resHtml } from './batiment.js';

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

const form = (n) => (n <= 0 ? 'zero' : n === 1 ? 'one' : 'other');

/** « Tu as 1 permis. Le prochain : encore 2 jours travaillés. » (progressionPermis du cœur). */
export function permisText(c) {
  const p = progressionPermis(c.game, c.ledger, c.now);
  return `${t(`quartier.permis.${form(p.dispo)}`, { n: p.dispo })} ${t(`quartier.prochain.${form(p.restants)}`, { n: p.restants })}`;
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

/**
 * Modèle de la fiche : { id, nom, ligne, niveau, max, fait, maintenant, suivant: { n, effet } | null, prix, permis,
 * raison, quetes, repas, sucres } (repas et sucres : la Place seulement, voir repasModel et sucresModel).
 */
export function quartierModel(c, quartier) {
  if (!Object.hasOwn(EFFETS_QUARTIERS, quartier)) return null;
  const { game, ledger, tasks, now } = c;
  const niveau = niveauDe(game, quartier);
  const max = niveauMax(quartier);
  const domaine = QUARTIERS[quartier].domain;
  const depart = valeur({}, EFFETS_QUARTIERS[quartier].reglage);
  let maintenant = '';
  if (quartier === 'champs' && !potagerOuvert(gameDay(now))) maintenant = t('quartier.fiche.dort');
  else if (quartier === 'atelier' && !compte(game, 'serre')) maintenant = t('quartier.fiche.sansSerre');
  const n = quetesDe(tasks, quartier);
  return {
    id: quartier,
    nom: t(`quartier.${quartier}.name`),
    ligne: domaine ? t('quartier.fiche.ligne', { domaine, n: niveau }) : t('quartier.fiche.ligne.place', { n: niveau }),
    niveau, max,
    fait: !niveau ? t('quartier.fiche.rien')
      : depart ? t('quartier.fiche.valeur', { effet: effetText(quartier, niveau), depart: num(depart) })
        : t('quartier.fiche.valeur.seule', { effet: effetText(quartier, niveau) }),
    maintenant,
    suivant: niveau < max ? { n: niveau + 1, effet: effetText(quartier, niveau + 1) } : null,
    prix: niveau < max ? prixText(coutNiveau(niveau + 1)) : '',
    permis: permisText(c),
    raison: niveau < max ? refusMonter(game, ledger, { quartier }) : null,
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

// Dernier achat réussi : sa phrase reste en tête de la fiche (coche, sauge) tant qu'elle montre ce niveau ; une
// nouvelle ouverture l’efface. Hors région lue : le lecteur d’écran l’a déjà entendue par l’annonce de la feuille.
let monte = null;

function bodyHtml(m) {
  const line = (dt, html) => `<div class="help-line"><dt>${esc(dt)}</dt><dd>${html}</dd></div>`;
  const ok = monte && monte.quartier === m.id && monte.niveau === m.niveau
    ? `<p class="qrt-monte">${icon('check')}<span>${esc(monte.text)}</span></p>` : '';
  const permis = `<p class="qrt-permis" id="qrt-permis">${esc(m.permis)}</p>`;
  const rows = [line(t('quartier.fiche.fait'), `<p>${esc(m.fait)}</p>`)];
  if (m.maintenant) rows.push(line(t('quartier.fiche.maintenant'), `<p>${esc(m.maintenant)}</p>`));
  if (m.suivant) {
    rows.push(line(t('quartier.fiche.niveau', { n: m.suivant.n }), `<p>${esc(t('quartier.fiche.effet', { effet: m.suivant.effet }))}</p>`));
    const raison = m.raison ? `<p class="bat-raison" id="qrt-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>` : '';
    rows.push(line(t('quartier.fiche.prix'), `<p id="qrt-prix">${esc(t('quartier.fiche.cout', { cout: m.prix }))}</p>${permis}${raison}`));
  } else {
    rows.push(line(t('quartier.fiche.permis'), permis));
  }
  return `${ok}<dl class="help-lines">${rows.join('')}</dl>${m.sucres ? sucresHtml(m.sucres) : ''}${m.repas ? repasHtml(m.repas) : ''}`;
}

function footHtml(m) {
  const quetes = `<button class="btn btn--quiet btn--block" type="button" data-action="qrt-quetes" data-quartier="${esc(m.id)}">${esc(m.quetes)}</button>`;
  if (!m.suivant) return `<p class="qrt-max">${esc(t('quartier.fiche.max', { n: m.niveau }))}</p>${quetes}`;
  const off = !!m.raison;
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="qrt-monter" data-quartier="${esc(m.id)}"
    data-niveau="${m.suivant.n}"${off ? ' aria-disabled="true" aria-describedby="qrt-raison"' : ' aria-describedby="qrt-prix qrt-permis"'}>${icon(off ? 'lock' : 'chevron-up')}<span>${esc(t('quartier.fiche.monter', { n: m.suivant.n }))}</span></button>${quetes}`;
}

/** Ouvre la fiche du quartier (champs, atelier…). open(dlg) : ouverture de la feuille (sheets.js). */
export function openQuartier(c, quartier, { open } = {}) {
  const m = quartierModel(c, quartier);
  if (!m) return false;
  monte = null;
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
  setHtml(body, bodyHtml(m));
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

/** Achat réussi (événement quartier-monte) : la fiche ouverte le montre en tête, avec la phrase lue. */
export function showMonte(c, e) {
  monte = { quartier: e.quartier, niveau: e.niveau, text: monteText(e) };
  refreshQuartier(c);
}

/** Phrase lue après l'achat : « Champs : niveau 2. 6 Nourriture par récolte du potager. » */
export function monteText(e) {
  return t('quartier.sr.monte', { quartier: t(`quartier.${e.quartier}.name`), n: e.niveau, effet: effetText(e.quartier, e.niveau) });
}
