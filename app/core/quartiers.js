// Niveaux de quartier et permis (docs/conception-niveaux-quartiers.md, lot R). Un quartier ne monte plus tout seul :
// le joueur y place des permis, plus des travaux payés en Énergie et en Matériaux. Chaque niveau change un seul
// réglage du jeu, déjà présent dans batiments.js (récolte, jours de pousse, places, prix d'une famille, stockage).
// Le permis vient des jours travaillés (un tous les 4), de chaque nouveau rang et de l'objectif de saison ; il est
// inscrit au registre sous une clé unique (permis:{jour}, permis:rang:{palier}, saison:{clé}) et appliqué à l'état au
// moment de l'inscription (applyEntry), jamais recompté depuis tout le registre. Remballer ne le reprend jamais.
// La « semaine tenue » (5 jours travaillés dans la semaine du lundi au dimanche) paie des Matériaux de la même façon,
// sous la clé semaine:{lundi} : aucun compteur de jours de suite, la semaine se relit au registre.
// Monter un quartier n'écrit rien au registre ni dans les tâches : game.set suffit.
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel, aucune constante de haut niveau n'en dépend.
import { Ctx } from './quests.js';
import { gameDay, weekStart, addDays } from './time.js';
import { round1 } from './reward.js';
import { hasKey, semaineKey } from './ledger.js';
import { BATIMENTS, CULTURE, ACCUEIL_NOURRITURE, joursTravailles, manque } from './batiments.js';
import { etatPremiersPas, suivreObjectifs } from './objectifs.js';

/** Jours travaillés pour un permis. */
export const JOURS_PAR_PERMIS = 4;
/** Échelle des travaux : niveau n = n permis + n × ECHELLE × (4 Énergie + 3 Matériaux), soit n × 100 et n × 75 à 25. */
export const ECHELLE = 25;
/**
 * Semaine tenue : à partir du 5e jour travaillé d'une semaine (lundi au dimanche), un bonus en Matériaux, une seule fois
 * par semaine. 12 est une valeur de départ à valider, pas un réglage mesuré : c'est le plus petit entier à partir duquel
 * un bonus plus gros ne change plus aucun jour d'achat de niveau dans la simulation (tests/core/simulation.test.mjs). Ce
 * critère ne dit pas que le bonus aide : la simulation ne lui fait avancer aucun premier niveau, et en retarde un. Des
 * Matériaux, jamais de compteur.
 */
export const SEMAINE_TENUE = { jours: 5, materials: 12 };

/**
 * Effets des niveaux : le réglage touché, puis sa valeur aux niveaux 1, 2, 3… (le nombre de valeurs est le niveau le
 * plus haut du quartier). Le Garage s'arrête au niveau 2 pour l'instant (la tournée d'hiver du niveau 3 est reportée).
 */
export const EFFETS_QUARTIERS = {
  champs: { reglage: 'recoltePotager', niveaux: [5, 6, 7] }, // Nourriture par récolte du potager
  atelier: { reglage: 'recolteSerre', niveaux: [5, 6, 7] }, // Nourriture par récolte de la petite serre
  mairie: { reglage: 'prixFamille', niveaux: [15, 12, 9] }, // Nourriture pour accueillir une famille
  ecole: { reglage: 'placesParChalet', niveaux: [3, 4, 5] }, // places par chalet
  garage: { reglage: 'joursPousse', niveaux: [4, 3] }, // jours travaillés avant qu'une culture soit mûre
  place: { reglage: 'stockagePlace', niveaux: [20, 40, 60] }, // Nourriture gardée en plus
};

// Valeur de chaque réglage au niveau 0 (lue à l'appel : batiments.js est dans le cycle d'import).
const DEPART = {
  recoltePotager: () => CULTURE.recolte,
  recolteSerre: () => CULTURE.recolte,
  prixFamille: () => ACCUEIL_NOURRITURE,
  placesParChalet: () => BATIMENTS.chalet.loge,
  joursPousse: () => CULTURE.jours,
  stockagePlace: () => 0,
};

const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const count = (v) => Math.max(0, Math.floor(Number(v) || 0));

/** Niveau le plus haut qu'on peut acheter dans ce quartier (0 pour un quartier inconnu). */
export const niveauMax = (quartier) => (own(EFFETS_QUARTIERS, quartier) ? EFFETS_QUARTIERS[quartier].niveaux.length : 0);

/** Niveau acheté d'un quartier (0 au départ ; jamais au-delà du plus haut). */
export function niveauDe(game, quartier) {
  return Math.min(niveauMax(quartier), count(game?.niveaux?.[quartier]));
}

/** Valeur d'un réglage selon le niveau du quartier qui le porte (celle du départ au niveau 0). */
export function valeur(game, reglage) {
  const q = Object.keys(EFFETS_QUARTIERS).find((id) => EFFETS_QUARTIERS[id].reglage === reglage);
  if (!q) throw new Error('Réglage inconnu : ' + reglage);
  const n = niveauDe(game, q);
  return n ? EFFETS_QUARTIERS[q].niveaux[n - 1] : DEPART[reglage]();
}

/** Places par chalet (École). */
export const placesParChalet = (game) => valeur(game, 'placesParChalet');

/** Prix du niveau n : { permis, energy, materials }. */
export function coutNiveau(n) {
  return { permis: n, energy: n * ECHELLE * 4, materials: n * ECHELLE * 3 };
}

/** Permis de la partie : { dispo, depuis } (depuis abîmé : tout le registre compte, une fois). */
function permisDe(game) {
  const p = game?.permis ?? {};
  return { dispo: count(p.dispo), depuis: typeof p.depuis === 'string' ? p.depuis : '' };
}

/**
 * Pourquoi on ne peut pas monter ce quartier au niveau visé (ou null). params : { quartier, niveau } ; sans niveau, le
 * suivant. Ordre : quartier inconnu, premiers pas, niveau le plus haut, déjà fait, niveau d'avant, ce qui manque.
 */
export function refusMonter(game, ledger, { quartier, niveau } = {}) {
  if (!own(EFFETS_QUARTIERS, quartier)) return 'Quartier inconnu.';
  if (etatPremiersPas([], game, ledger).courant) return 'Après tes premiers pas.';
  const actuel = niveauDe(game, quartier);
  const vise = niveau === undefined || niveau === null ? actuel + 1 : Number(niveau);
  const max = niveauMax(quartier);
  if (vise > max) return `Niveau ${max} : le plus haut pour l’instant.`;
  if (!(vise > actuel)) return 'Déjà fait.';
  if (vise > actuel + 1) return `Il faut d’abord le niveau ${actuel + 1}.`;
  return manque(game, coutNiveau(vise));
}

/**
 * Monte un quartier d'un niveau. params : { quartier, niveau } (le niveau visé : un double toucher ou un geste rejoué
 * est refusé, « Déjà fait. »). Retire les permis et paie les travaux. Événement { type: 'quartier-monte', quartier,
 * niveau, cout }. Rien au registre ni dans les tâches.
 */
export function monterQuartier(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const refus = refusMonter(ctx.game, ctx.ledger, params);
  if (refus) throw new Error(refus);
  const quartier = params.quartier;
  const niveau = niveauDe(ctx.game, quartier) + 1;
  const cout = coutNiveau(niveau);
  const g = structuredClone(ctx.game);
  g.resources.energy = round1(g.resources.energy - cout.energy);
  g.resources.materials = round1(g.resources.materials - cout.materials);
  g.permis = { ...g.permis, dispo: permisDe(g).dispo - cout.permis };
  g.niveaux = { ...g.niveaux, [quartier]: niveau };
  ctx.game = g;
  ctx.events.push({ type: 'quartier-monte', quartier, niveau, cout });
  suivreObjectifs(ctx);
  return ctx.result();
}

// Inscrit un permis au registre (applyEntry l'ajoute à game.permis.dispo) et pousse son événement : ctx.append n'en
// émet aucun pour une entrée sans points ni ressources.
function inscrirePermis(ctx, key, source) {
  ctx.append({ key, at: ctx.iso, day: ctx.day, type: 'permis', pe: 0, energy: 0, materials: 0, permis: 1 }, 'permis');
  ctx.events.push({ type: 'permis', source, dispo: permisDe(ctx.game).dispo });
}

/**
 * Permis des jours travaillés, appelé par quests.js après une quête payée (juste après l'éolienne) : au 4e jour
 * travaillé après game.permis.depuis, inscrit permis:{jour} et repart de ce jour. Au plus un par jour (clé unique).
 * Événement { type: 'permis', source: 'jours', dispo }.
 */
export function suivrePermis(ctx) {
  const p = permisDe(ctx.game);
  if (joursTravailles(ctx.ledger, p.depuis, ctx.day) < JOURS_PAR_PERMIS) return;
  const key = `permis:${ctx.day}`;
  if (hasKey(ctx.ledger, key)) return;
  inscrirePermis(ctx, key, 'jours');
  ctx.game = { ...ctx.game, permis: { ...ctx.game.permis, depuis: ctx.day } };
}

/**
 * Semaine tenue, appelée par quests.js juste après suivrePermis (donc après une quête payée seulement) : quand la
 * semaine du jour (lundi au dimanche, en jours de jeu) compte au moins SEMAINE_TENUE.jours jours travaillés (la même
 * définition que les permis : une quête payée, non remballée) et que semaine:{lundi} n'est pas au registre, inscrit
 * cette entrée, payée en Matériaux. Événement { type: 'semaine-tenue', semaine, jours, materials }.
 * Choix, les mêmes que pour le permis des jours :
 *  - Remballer ne reprend jamais le bonus (aucune écriture inverse ne le porte) et la clé reste au registre : refaire la
 *    quête le même jour, ou un 6e et un 7e jour, ne le paie pas une seconde fois ;
 *  - rejouer, ou un second appareil resté sur la partie d'avant : la clé est déjà au registre, rien n'est écrit ; si les
 *    deux appareils l'écrivent chacun de leur côté, le serveur refuse la deuxième (clé en double) et l'appareil se resynchronise.
 * Aucun état n'est tenu dans la partie (pas de compteur) : tout se relit au registre.
 */
export function suivreSemaine(ctx) {
  const lundi = weekStart(ctx.day);
  const jours = joursTravailles(ctx.ledger, addDays(lundi, -1), ctx.day);
  if (jours < SEMAINE_TENUE.jours) return;
  const key = semaineKey(lundi);
  if (hasKey(ctx.ledger, key)) return;
  const materials = SEMAINE_TENUE.materials;
  ctx.append({ key, at: ctx.iso, day: ctx.day, type: 'semaine', semaine: lundi, pe: 0, energy: 0, materials }, 'semaine');
  ctx.events.push({ type: 'semaine-tenue', semaine: lundi, jours, materials });
}

/** Permis d'un nouveau rang (accueillir, batiments.js) : permis:rang:{palier}, une seule fois par palier. */
export function permisDeRang(ctx, palier) {
  const key = `permis:rang:${palier}`;
  if (!hasKey(ctx.ledger, key)) inscrirePermis(ctx, key, 'rang');
}

/** Événement du permis de l'objectif de saison (objectifs.js inscrit l'entrée saison:{clé}, qui le porte). */
export function annoncerPermisDeSaison(ctx) {
  ctx.events.push({ type: 'permis', source: 'saison', dispo: permisDe(ctx.game).dispo });
}

/**
 * Où en est le prochain permis : { dispo (permis en main), depuis, jours (travaillés depuis le dernier), restants
 * (jours travaillés qui manquent pour le prochain) }. Lecture pure.
 */
export function progressionPermis(game, ledger, now) {
  const p = permisDe(game);
  const jours = joursTravailles(ledger, p.depuis, gameDay(now));
  return { dispo: p.dispo, depuis: p.depuis, jours, restants: Math.max(0, JOURS_PAR_PERMIS - jours) };
}
