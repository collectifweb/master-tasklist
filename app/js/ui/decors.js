// Onglet « Décors » du catalogue « Construire » (lot K). En tête, une phrase (se pose sur un coin libre, se déplace et se
// range gratuitement ; rien sur ce qu'il rapporte, comme le phare : décision 52) et les coins libres de l'île. Puis une rangée par décor à acheter, au gabarit des bâtiments : le dessin, le nom, le prix en pastilles
// (en pointillés, avec « il manque N », quand il en manque) ; verrouillée avant le Bourg ou quand tous les coins sont pris,
// avec le cadenas et la raison écrite par le cœur (refusPoser, sans coin). Toute la rangée est le bouton : il ouvre le mode
// de pose sur la carte (data-action="dec-acheter", main.js), où l'on touche le coin ; l'achat se fait à ce moment-là.
// Dessous, « Sur l'île » : chaque décor posé, où il est, « Déplacer » (le mode de pose) et « Ranger » (dans la remise, sans
// remboursement) ; puis « Dans la remise » : un décor rangé, ou reçu aux escales du phare (lot Y), et « Poser ». Ces deux
// listes ne sont refaites que quand elles changent, et le focus y retrouve son bouton.
import { DECORS, DECOR_IDS, COINS, etatDecors, refusPoser, refusDecors, manque, coinDe } from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, setText, setAttr, setHtml } from './dom.js';
import { coutText, pastillesDe, pastilleHtml } from './batiment.js';
import { capitalize } from './format.js';

/** « à la Mairie, coin 2 », « à l’École » : où est un coin (le même texte que les repères de la carte, world/texts.js). */
export function coinNom(coin) {
  const { quartier, n, total } = coinDe(coin);
  return t(`monde.coin.${total > 1 ? 'other' : 'one'}`, { au_secteur: t(`quartier.${quartier}.in`), n });
}

const ACHATS = DECOR_IDS.filter((id) => !DECORS[id].unique);

const achatRow = (thumb) => (id) => `<li class="cat-dec" data-decor="${id}">
        <button class="cat-btn cat-dec-go" type="button" data-action="dec-acheter" data-decor="${id}"
          aria-label="${esc(t('decors.catalogue.poser.label', { nom: t(`decors.${id}.nom`) }))}" aria-describedby="cat-d-${id}-etat cat-d-${id}-cout">
          <span class="cat-thumb" aria-hidden="true">${thumb ? thumb(id) : ''}</span>
          <span class="cat-text">
            <span class="cat-nom">${esc(t(`decors.${id}.nom`))}</span>
            <span class="cat-etat" id="cat-d-${id}-etat" hidden></span>
          </span>
          <span class="cat-prix" aria-hidden="true"></span>
          <span class="sr-only" id="cat-d-${id}-cout"></span>
        </button>
      </li>`;

/** Le panneau de l'onglet, construit une fois avec le catalogue. thumb(decor, coin?) : dessin SVG d'un décor (facultatif). */
export function decorsPanel(thumb) {
  return `<section class="cat-panel" role="tabpanel" id="cat-decs" aria-labelledby="cat-decs-t" hidden>
        <p class="cat-dec-intro">${esc(t('decors.catalogue.intro'))}</p>
        <p class="cat-dec-coins" id="cat-dec-coins"></p>
        <ul class="cat-list" role="list">${ACHATS.map(achatRow(thumb)).join('')}</ul>
        <h3 class="cat-dec-h" id="cat-dec-ile-h" hidden>${esc(t('decors.catalogue.ile'))}</h3>
        <ul class="cat-list cat-dec-ile" role="list" aria-labelledby="cat-dec-ile-h" hidden></ul>
        <h3 class="cat-dec-h" id="cat-dec-remise-h" hidden>${esc(t('decors.catalogue.remise'))}</h3>
        <ul class="cat-list cat-dec-remise" role="list" aria-labelledby="cat-dec-remise-h" hidden></ul>
      </section>`;
}

// un geste impossible faute de coin libre : à plat (désactivé lisible), la phrase des coins en tête le dit
const geste = (action, cle, label, texte, off, extra = '') => `<button class="btn btn--secondary btn--small cat-dec-btn" type="button"
            data-action="${action}" data-cle="${esc(cle)}" ${extra} aria-label="${esc(label)}"${off ? ' aria-disabled="true" aria-describedby="cat-dec-coins"' : ''}>${esc(texte)}</button>`;

const poseRow = (thumb, plein) => ({ coin, decor }) => {
  const le = t(`decors.${decor}.le`), ou = coinNom(coin);
  return `<li class="cat-dec-ligne" data-coin="${coin}">
          <span class="cat-thumb" aria-hidden="true">${thumb ? thumb(decor, coin) : ''}</span>
          <span class="cat-text"><span class="cat-nom">${esc(t(`decors.${decor}.nom`))}</span><span class="cat-dec-ou">${esc(capitalize(ou))}</span></span>
          <span class="cat-dec-gestes">
            ${geste('dec-deplacer', coin, t('decors.catalogue.deplacer.label', { le, coin: ou }), t('decors.catalogue.deplacer'), plein, `data-coin="${coin}" data-decor="${decor}"`)}
            ${geste('dec-ranger', coin, t('decors.catalogue.ranger.label', { le, coin: ou }), t('decors.catalogue.ranger'), false, `data-coin="${coin}" data-decor="${decor}"`)}
          </span>
        </li>`;
};

const remiseRow = (thumb, plein) => ({ id, n }) => `<li class="cat-dec-ligne" data-decor="${id}">
          <span class="cat-thumb" aria-hidden="true">${thumb ? thumb(id) : ''}</span>
          <span class="cat-text"><span class="cat-nom">${esc(t(`decors.${id}.nom`))}</span>${n > 1 ? `<span class="cat-dec-ou">${esc(tn('decors.catalogue.remise.n', n))}</span>` : ''}</span>
          <span class="cat-dec-gestes">
            ${geste('dec-reposer', id, t('decors.catalogue.reposer.label', { le: t(`decors.${id}.le`) }), t('decors.catalogue.reposer'), plein, `data-decor="${id}"`)}
          </span>
        </li>`;

// Une liste refaite seulement quand elle change ; le focus qui y était retrouve le même geste sur le même décor
function liste(dlg, ul, h, rows, key) {
  ul.hidden = h.hidden = !rows.length;
  if (ul.dataset.key === key) return;
  const f = ul.contains(document.activeElement) ? document.activeElement : null;
  const garde = f?.dataset.action ? `[data-action="${f.dataset.action}"][data-cle="${f.dataset.cle}"]` : null;
  ul.innerHTML = rows.join('');
  ul.dataset.key = key;
  if (garde) ($(garde, ul) || $('.cat-tab[aria-selected="true"]', dlg))?.focus();
}

/** Remplit l'onglet. etat(el, raison, lue) : le cadenas et la raison d'une rangée (catalogue.js). */
export function fillDecors(dlg, c, { thumb, etat }) {
  const e = etatDecors(c.game);
  const rang = refusDecors(c.game);
  const plein = !e.libres.length;
  const coins = $('#cat-dec-coins', dlg);
  coins.hidden = !!rang;
  setText(coins, plein ? t('decors.catalogue.coins.zero') : tn('decors.catalogue.coins', e.libres.length, { total: COINS.length }));
  for (const id of ACHATS) {
    const li = $(`.cat-dec[data-decor="${id}"]`, dlg);
    const cout = DECORS[id].cout;
    const raison = refusPoser(c.game, { decor: id });
    const parManque = !!raison && raison === manque(c.game, cout);
    li.dataset.etat = !raison ? 'libre' : parManque ? 'manque' : 'verrou';
    etat($('.cat-etat', li), raison, parManque);
    setHtml($('.cat-prix', li), !raison || parManque ? pastillesDe(c.game, cout).map(pastilleHtml).join('') : '');
    setText($(`#cat-d-${id}-cout`, li), t('bat.fiche.cout', { cout: coutText(cout) }));
    setAttr($('.cat-dec-go', li), 'aria-disabled', raison ? 'true' : null);
  }
  const poses = COINS.filter((coin) => e.poses[coin]).map((coin) => ({ coin, decor: e.poses[coin] }));
  liste(dlg, $('.cat-dec-ile', dlg), $('#cat-dec-ile-h', dlg), poses.map(poseRow(thumb, plein)),
    `${plein}|${poses.map((p) => `${p.coin}:${p.decor}`).join(' ')}`);
  const remise = DECOR_IDS.map((id) => ({ id, n: e.remise.filter((x) => x === id).length })).filter((x) => x.n);
  liste(dlg, $('.cat-dec-remise', dlg), $('#cat-dec-remise-h', dlg), remise.map(remiseRow(thumb, plein)),
    `${plein}|${remise.map((x) => `${x.id}:${x.n}`).join(' ')}`);
}
