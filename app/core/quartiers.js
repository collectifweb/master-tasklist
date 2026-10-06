// Niveaux de quartier et permis (docs/conception-niveaux-quartiers.md, lot R). Un quartier ne monte plus tout seul :
// le joueur y place des permis, plus des travaux payés en Énergie et en Matériaux. Chaque niveau change un seul
// réglage du jeu, déjà présent dans batiments.js (récolte, jours de pousse, places, prix d'une famille, stockage).
// Le permis vient des jours travaillés (un tous les 4), de chaque nouveau rang et de l'objectif de saison ; il est
// inscrit au registre sous une clé unique (permis:{jour}, permis:rang:{palier}, saison:{clé}) et appliqué à l'état au
// moment de l'inscription (applyEntry), jamais recompté depuis tout le registre. Remballer ne le reprend jamais.
// Monter un quartier n'écrit rien au registre ni dans les tâches : game.set suffit.
// Cycle d'import avec quests.js et batiments.js : tout est lu à l'appel, aucune constante de haut niveau n'en dépend.
import { Ctx } from './quests.js';
import { gameDay } from './time.js';
import { round1 } from './reward.js';
import { hasKey } from './ledger.js';
import { BATIMENTS, CULTURE, ACCUEIL_NOURRITURE, joursTravailles, manque } from './batiments.js';
import { etatPremiersPas, suivreObjectifs } from './objectifs.js';

/** Jours travaillés pour un permis. */
export const JOURS_PAR_PERMIS = 4;
/** Échelle des travaux : niveau n = n permis + n × ECHELLE × (3 Énergie + 4 Matériaux). Réglée par la simulation. */
export const ECHELLE = 25;

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
  return { permis: n, energy: n * ECHELLE * 3, materials: n * ECHELLE * 4 };
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
