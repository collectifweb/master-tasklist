// Seule horloge de l'interface pour la date du jeu : l'instant réel, plus le décalage de la partie
// (game.horloge.decalage, en jours) quand le serveur a dit être la version d'essai (`sandbox: true`). Partout ailleurs,
// le décalage est ignoré. Les minuteries et délais (annonces, blocage, relances) restent en temps réel.
const JOUR_MS = 86400000;
let source = () => null;

/** Le magasin y branche son état : () → { sandbox, game } ou null. */
export function brancherHorloge(fn) { source = fn; }

/** Décalage en jours (entier ≥ 0) ; 0 hors de la version d'essai. `etat` : { sandbox, game }, celui du magasin par défaut. */
export function decalage(etat = source()) {
  if (!etat || etat.sandbox !== true) return 0;
  const n = Math.floor(Number(etat.game?.horloge?.decalage));
  return n > 0 ? n : 0;
}

/** Vrai si le serveur a dit être la version d'essai (bouton « Jour suivant »). */
export const enEssai = () => source()?.sandbox === true;

/** Instant du jeu. Sans argument, d'après l'état du magasin (utilisable tel quel comme option `now` du monde). */
export function maintenant(etat) {
  return new Date(Date.now() + decalage(etat ?? source()) * JOUR_MS);
}
