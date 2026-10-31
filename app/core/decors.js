// Les décors à placer soi-même (lot K, étape 2 des Grands travaux ; choix de Claude du 31 octobre 2026, à relire par
// Alex) : ouverts au rang Bourg comme les Grands travaux, posés sur des coins fixes de l'île (leur place est dans
// world/layout.js, COINS_ILE), payés surtout en Matériaux. Aucun effet de jeu : le plaisir d'arranger son village.
// Déplacer et ranger sont gratuits ; ranger met le décor dans la remise, sans remboursement, d'où le reposer est gratuit.
// La remise recevra aussi les décors uniques des escales du phare (lot Y), qui ne s'achètent pas.
// La partie : game.decors = { poses: { [coin]: décor }, remise: [décor…] } ; absent ou illisible, aucun décor. Rien au
// registre : game.set suffit, comme pour monter un quartier.
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel.
import { Ctx } from './quests.js';
import { round1 } from './reward.js';
import { RANGS } from './village.js';
import { logements, manque } from './batiments.js';

/** Rang qui ouvre les décors. */
export const DECORS_RANG = 'bourg';

/**
 * Les décors, dans l'ordre du catalogue. La lanterne demande un peu d'Énergie : elle s'allume le soir. Mesure (t) du 31
 * octobre 2026 (tests/core/simulation.test.mjs) : le joueur à 2 ou 3 quêtes par jour parti le 1er juillet pose 5 décors
 * et garde 243 Énergie et 51 Matériaux au 1er mars (333 et 351 sans eux) ; le rapide parti le 1er juillet couvre les
 * onze coins et garde 2 271 et 3 143 ; aucun niveau perdu, aucun phare retardé.
 */
export const DECORS = {
  massif: { nom: 'le massif de fleurs', cout: { materials: 40 } },
  epinette: { nom: 'l’épinette', cout: { materials: 60 } },
  nichoir: { nom: 'le nichoir', cout: { materials: 60 } },
  bouleau: { nom: 'le bouleau', cout: { materials: 80 } },
  erable: { nom: 'l’érable', cout: { materials: 120 } },
  banc: { nom: 'le banc', cout: { materials: 150 } },
  chaise: { nom: 'la chaise Adirondack', cout: { materials: 150 } },
  cordee: { nom: 'la cordée de bois', cout: { materials: 200 } },
  lanterne: { nom: 'la lanterne', cout: { energy: 60, materials: 200 } },
  // laissés par les plaisanciers des escales du phare (core/escales.js, DECORS_ESCALE), dans cet ordre ; ne s'achètent pas
  canot: { nom: 'le canot renversé', unique: true },
  ancre: { nom: 'la vieille ancre', unique: true },
  cloche: { nom: 'la cloche de brume', unique: true },
  girouette: { nom: 'la girouette', unique: true },
  bouee: { nom: 'la bouée', unique: true },
  filet: { nom: 'le filet de pêche', unique: true },
};
export const DECOR_IDS = Object.keys(DECORS);

/** Les coins à décorer, par quartier (la place de chacun : world/layout.js, COINS_ILE). */
export const COINS = [
  'ecole-1', 'garage-1', 'mairie-1', 'mairie-2', 'mairie-3', 'mairie-4', 'champs-1', 'champs-2', 'champs-3', 'atelier-1', 'atelier-2',
];

/** Le quartier d'un coin, son rang parmi les coins de ce quartier et leur nombre : 'mairie-2' → { quartier: 'mairie', n: 2, total: 4 }. */
export function coinDe(coin) {
  const quartier = coin.slice(0, coin.lastIndexOf('-'));
  const siens = COINS.filter((c) => c.startsWith(`${quartier}-`));
  return { quartier, n: siens.indexOf(coin) + 1, total: siens.length };
}

const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const estCoin = (c) => typeof c === 'string' && COINS.includes(c);

/** Les décors de la partie, lus prudemment : { poses, remise, libres } (les coins sans décor, dans l'ordre de COINS). */
export function etatDecors(game) {
  const d = isObj(game?.decors) ? game.decors : {};
  const poses = {};
  if (isObj(d.poses)) for (const c of COINS) if (own(d.poses, c) && own(DECORS, d.poses[c])) poses[c] = d.poses[c];
  const remise = Array.isArray(d.remise) ? d.remise.filter((id) => own(DECORS, id)) : [];
  return { poses, remise, libres: COINS.filter((c) => !own(poses, c)) };
}

/** Pourquoi les décors sont encore fermés (« Bourg : encore 3 habitants. »), ou null au rang Bourg et après. */
export function refusDecors(game) {
  const besoin = RANGS.find((r) => r.id === DECORS_RANG);
  const h = logements(game).habitants;
  return h < besoin.min ? `${besoin.name} : encore ${besoin.min - h} habitant${besoin.min - h > 1 ? 's' : ''}.` : null;
}

/**
 * Pourquoi on ne peut pas poser ce décor sur ce coin (ou null). params : { decor, coin, remise } ; remise : le décor vient
 * de la remise (gratuit), sinon il s'achète. Sans coin, sur n'importe quel coin libre (la rangée du catalogue, avant de
 * choisir le coin sur la carte). Ordre : décor inconnu, coin inconnu, rang, coin pris (ou tous pris), décor qui ne
 * s'achète pas ou absent de la remise, ce qui manque.
 */
export function refusPoser(game, { decor, coin, remise = false } = {}) {
  if (!own(DECORS, decor)) return 'Décor inconnu.';
  if (coin !== undefined && !estCoin(coin)) return 'Coin inconnu.';
  const rang = refusDecors(game);
  if (rang) return rang;
  const e = etatDecors(game);
  if (coin === undefined ? !e.libres.length : own(e.poses, coin)) return coin === undefined ? 'Tous les coins sont pris.' : 'Ce coin est déjà pris.';
  if (remise) return e.remise.includes(decor) ? null : 'La remise n’a pas ce décor.';
  if (DECORS[decor].unique) return 'Ce décor ne s’achète pas.';
  return manque(game, DECORS[decor].cout);
}

const avec = (game, poses, remise) => ({ ...game, decors: { poses, remise } });

/**
 * Pose un décor sur un coin libre : acheté (son prix part), ou tiré de la remise (gratuit). Événement { type:
 * 'decor-pose', decor, coin, cout (null depuis la remise), remise }. Un geste rejoué est refusé : le coin est pris.
 */
export function poserDecor(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = params?.coin === undefined ? 'Coin inconnu.' : refusPoser(ctx.game, params);
  if (refus) throw new Error(refus);
  const { decor, coin } = params;
  const remise = !!params.remise;
  const e = etatDecors(ctx.game);
  let g = structuredClone(ctx.game);
  let reste = e.remise;
  const cout = remise ? null : DECORS[decor].cout;
  if (remise) {
    reste = [...e.remise];
    reste.splice(reste.indexOf(decor), 1);
  } else {
    g.resources.energy = round1(g.resources.energy - (cout.energy || 0));
    g.resources.materials = round1(g.resources.materials - cout.materials);
  }
  g = avec(g, { ...e.poses, [coin]: decor }, reste);
  ctx.game = g;
  ctx.events.push({ type: 'decor-pose', decor, coin, cout, remise });
  return ctx.result();
}

/** Déplace un décor posé vers un coin libre, gratuitement. params : { de, vers }. Événement { type: 'decor-deplace', decor, de, vers }. */
export function deplacerDecor(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const { de, vers } = params || {};
  const e = etatDecors(ctx.game);
  if (!own(e.poses, de)) throw new Error('Aucun décor sur ce coin.');
  if (!estCoin(vers)) throw new Error('Coin inconnu.');
  if (own(e.poses, vers)) throw new Error('Ce coin est déjà pris.');
  const decor = e.poses[de];
  const poses = { ...e.poses, [vers]: decor };
  delete poses[de];
  ctx.game = avec(ctx.game, poses, e.remise);
  ctx.events.push({ type: 'decor-deplace', decor, de, vers });
  return ctx.result();
}

/** Range un décor posé dans la remise, gratuitement, sans remboursement. params : { coin }. Événement { type: 'decor-range', decor, coin }. */
export function rangerDecor(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const { coin } = params || {};
  const e = etatDecors(ctx.game);
  if (!own(e.poses, coin)) throw new Error('Aucun décor sur ce coin.');
  const decor = e.poses[coin];
  const poses = { ...e.poses };
  delete poses[coin];
  ctx.game = avec(ctx.game, poses, [...e.remise, decor]);
  ctx.events.push({ type: 'decor-range', decor, coin });
  return ctx.result();
}
