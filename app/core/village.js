// Les deux progressions du village (bible §4) : le rang selon les Habitants, et l'ancien niveau de chaque quartier selon
// ses tâches terminées. Lectures pures : « Hameau : encore 2 habitants. ». Le niveau au nombre de tâches ne s'affiche
// plus (les quartiers montent par permis, quartiers.js) : il ne sert qu'à la conversion des anciennes parties (state.js).

/** Rangs nommés, avec le premier nombre d'habitants de chacun. Au-delà de la Ville : « Ville +n » tous les 15 habitants. */
export const RANGS = [
  { id: 'campement', name: 'Campement', min: 0 },
  { id: 'hameau', name: 'Hameau', min: 3 },
  { id: 'village', name: 'Village', min: 6 },
  { id: 'bourg', name: 'Bourg', min: 11 },
  { id: 'ville', name: 'Ville', min: 21 },
];
export const VILLE_PALIER = 15;

/** Tâches à atteindre pour les niveaux 1 à 5 d'un quartier (niveau 0 au départ). Au-delà : un niveau tous les 50. */
export const NIVEAUX_QUARTIER = [5, 15, 30, 60, 100];
export const QUARTIER_PALIER = 50;

// Nombre entier ≥ 0 ; une valeur illisible compte pour 0.
const count = (v) => Math.max(0, Math.floor(Number(v) || 0));

// Rang du palier p (0 = Campement) : { palier, id, name, min, plus } ; plus = n de « Ville +n ».
function rangAt(p) {
  if (p < RANGS.length) return { palier: p, ...RANGS[p], plus: 0 };
  const ville = RANGS[RANGS.length - 1];
  const plus = p - RANGS.length + 1;
  return { palier: p, id: ville.id, name: `${ville.name} +${plus}`, min: ville.min + VILLE_PALIER * plus, plus };
}

/** Rang du village : { palier, id, name, min, plus, suivant: { …même forme, encore } } (encore = habitants qui manquent). */
export function rangDuVillage(habitants) {
  const n = count(habitants);
  const ville = RANGS.length - 1;
  const p = n >= RANGS[ville].min
    ? ville + Math.floor((n - RANGS[ville].min) / VILLE_PALIER)
    : RANGS.findLastIndex((r) => n >= r.min);
  const next = rangAt(p + 1);
  return { ...rangAt(p), suivant: { ...next, encore: next.min - n } };
}

/**
 * Bandes de terrain gagnées sur la forêt (bible §4, lot F), dans l'ordre : chacune vient avec un rang. Les habitants ne
 * baissent jamais, donc une bande gagnée ne repart pas ; rien n'est écrit dans la partie. Leur place sur l'île :
 * world/layout.js (BANDES_ILE).
 */
export const BANDES = [{ id: 'hameau', rang: 'hameau' }];

/** Identifiants des bandes gagnées avec ce nombre d'habitants. */
export function bandesGagnees(habitants) {
  const p = rangDuVillage(habitants).palier;
  return BANDES.filter((b) => RANGS.findIndex((r) => r.id === b.rang) <= p).map((b) => b.id);
}

// Tâches à atteindre pour le niveau v (v ≥ 1).
const seuilDe = (v) => v <= NIVEAUX_QUARTIER.length
  ? NIVEAUX_QUARTIER[v - 1]
  : NIVEAUX_QUARTIER[NIVEAUX_QUARTIER.length - 1] + QUARTIER_PALIER * (v - NIVEAUX_QUARTIER.length);

/** Niveau d'un quartier, sans fin : { niveau, taches, suivant: { niveau, seuil, encore } }. */
export function niveauQuartier(taches) {
  const n = count(taches);
  const dernier = NIVEAUX_QUARTIER[NIVEAUX_QUARTIER.length - 1];
  const niveau = n >= dernier
    ? NIVEAUX_QUARTIER.length + Math.floor((n - dernier) / QUARTIER_PALIER)
    : NIVEAUX_QUARTIER.filter((s) => n >= s).length;
  const seuil = seuilDe(niveau + 1);
  return { niveau, taches: n, suivant: { niveau: niveau + 1, seuil, encore: seuil - n } };
}
