// Domaines regroupés et quartiers du village (bible §4). Le regroupement est une lecture : le domaine d'origine
// n'est jamais réécrit dans la tâche.

export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, ' ')
    .toLowerCase()
    .trim();
}

/** Domaines regroupés (ceux que l'interface propose). */
export const DOMAINS = ['Terrain', 'Maison', 'Administratif', 'Enfants', 'Véhicule'];

const GROUPS = {
  jardin: 'Terrain',
  ferme: 'Terrain',
  professionnel: 'Administratif',
};

export const PLACE_ID = 'place';

/** Quartiers du village : un par domaine regroupé, la Place du village pour tout autre domaine ou sans domaine. */
export const QUARTIERS = {
  champs: { id: 'champs', name: 'Champs', domain: 'Terrain' },
  atelier: { id: 'atelier', name: 'Atelier', domain: 'Maison' },
  mairie: { id: 'mairie', name: 'Mairie', domain: 'Administratif' },
  ecole: { id: 'ecole', name: 'École', domain: 'Enfants' },
  garage: { id: 'garage', name: 'Garage', domain: 'Véhicule' },
  place: { id: 'place', name: 'Place du village', domain: null },
};

export const QUARTIER_IDS = Object.keys(QUARTIERS);

const DOMAIN_TO_QUARTIER = {
  Terrain: 'champs',
  Maison: 'atelier',
  Administratif: 'mairie',
  Enfants: 'ecole',
  'Véhicule': 'garage',
};

/** Secteurs de la v1 → quartiers. Le registre et ancres.json gardent les anciens identifiants : on les traduit à la lecture. */
const SECTOR_TO_QUARTIER = {
  champs: 'champs',
  atelier: 'atelier',
  archives: 'mairie',
  'maison-commune': 'ecole',
  relais: 'garage',
  place: 'place',
};

/** Domaine d'origine → domaine regroupé, ou null (inconnu ou vide). Insensible à la casse et aux accents. */
export function groupedDomain(domain) {
  const key = normalizeText(domain);
  if (!key) return null;
  if (Object.hasOwn(GROUPS, key)) return GROUPS[key];
  return DOMAINS.find((d) => normalizeText(d) === key) ?? null;
}

/** Quartier d'un domaine. Vide ou inconnu → 'place' (Place du village). */
export function quartierOf(domain) {
  const g = groupedDomain(domain);
  return g ? DOMAIN_TO_QUARTIER[g] : PLACE_ID;
}

export function quartierOfTask(task) {
  return quartierOf(task && task.domain);
}

export function quartierInfo(id) {
  return Object.hasOwn(QUARTIERS, id) ? QUARTIERS[id] : QUARTIERS[PLACE_ID];
}

/** Quartier d'un ancien secteur (v1), ou null si l'identifiant n'en est pas un. */
export function quartierOfSector(sectorId) {
  return Object.hasOwn(SECTOR_TO_QUARTIER, sectorId) ? SECTOR_TO_QUARTIER[sectorId] : null;
}
