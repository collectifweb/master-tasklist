// Domaines regroupés, secteurs, voix. Le regroupement est une lecture : le domaine d'origine
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

/** Secteurs de l'Orée. `chapter` = chapitre qui l'ouvre. */
export const SECTORS = {
  champs:           { id: 'champs',           name: 'Champs',            domain: 'Terrain',       voices: ['Solène'],            chapter: 1 },
  atelier:          { id: 'atelier',          name: 'Atelier',           domain: 'Maison',        voices: ['Milo'],              chapter: 2 },
  archives:         { id: 'archives',         name: 'Archives',          domain: 'Administratif', voices: ['Naïma', 'ÉCHO-7'],   chapter: 3 },
  'maison-commune': { id: 'maison-commune',   name: 'Maison commune',    domain: 'Enfants',       voices: ['Lou'],               chapter: 4 },
  relais:           { id: 'relais',           name: 'Relais du convoi',  domain: 'Véhicule',      voices: ['Ambroise'],          chapter: 5 },
  place:            { id: 'place',            name: 'Place du Bastion',  domain: null,            voices: ['Fanal'],             chapter: 1 },
};

export const SECTOR_IDS = Object.keys(SECTORS);

const DOMAIN_TO_SECTOR = {
  Terrain: 'champs',
  Maison: 'atelier',
  Administratif: 'archives',
  Enfants: 'maison-commune',
  'Véhicule': 'relais',
};

/** Domaine d'origine → domaine regroupé, ou null (inconnu ou vide). Insensible à la casse et aux accents. */
export function groupedDomain(domain) {
  const key = normalizeText(domain);
  if (!key) return null;
  if (GROUPS[key]) return GROUPS[key];
  return DOMAINS.find((d) => normalizeText(d) === key) ?? null;
}

/** Identifiant du secteur d'un domaine. Vide ou inconnu → 'place' (Place du Bastion). */
export function sectorOf(domain) {
  const g = groupedDomain(domain);
  return g ? DOMAIN_TO_SECTOR[g] : PLACE_ID;
}

export function sectorOfTask(task) {
  return sectorOf(task && task.domain);
}

export function sectorInfo(id) {
  return SECTORS[id] ?? SECTORS[PLACE_ID];
}
