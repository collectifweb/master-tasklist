// Textes du monde. Les clés viennent de content/fr-CA/interface.json (passé par l'hôte dans options.texts) ;
// celles qui manquent retombent sur les valeurs ci-dessous (démo, tests).

const DEFAULTS = {
  // repris de interface.json (secours seulement)
  'quartier.place.name': 'Place du village', 'quartier.place.the': 'la Place du village', 'quartier.place.of': 'de la Place du village', 'quartier.place.in': 'sur la Place du village',
  'quartier.champs.name': 'Champs', 'quartier.champs.the': 'les Champs', 'quartier.champs.of': 'des Champs', 'quartier.champs.in': 'aux Champs',
  'quartier.atelier.name': 'Atelier', 'quartier.atelier.the': 'l’Atelier', 'quartier.atelier.of': 'de l’Atelier', 'quartier.atelier.in': 'à l’Atelier',
  'quartier.mairie.name': 'Mairie', 'quartier.mairie.the': 'la Mairie', 'quartier.mairie.of': 'de la Mairie', 'quartier.mairie.in': 'à la Mairie',
  'quartier.ecole.name': 'École', 'quartier.ecole.the': 'l’École', 'quartier.ecole.of': 'de l’École', 'quartier.ecole.in': 'à l’École',
  'quartier.garage.name': 'Garage', 'quartier.garage.the': 'le Garage', 'quartier.garage.of': 'du Garage', 'quartier.garage.in': 'au Garage',
  'quartier.place.domain': 'Autres quêtes', 'quartier.champs.domain': 'Terrain', 'quartier.atelier.domain': 'Maison',
  'quartier.mairie.domain': 'Administratif', 'quartier.ecole.domain': 'Enfants', 'quartier.garage.domain': 'Véhicule',
  'a11y.skip_animation': 'Passer l’animation',

  // propres au monde
  'monde.region': 'Carte de l’Orée',
  'monde.region.hint': 'Glisse pour te déplacer. Les flèches passent d’un élément à l’autre.',
  'monde.zoom.group': 'Cadrage de la carte',
  'monde.zoom.in': 'Rapprocher',
  'monde.zoom.out': 'Éloigner',
  'monde.zoom.fit': 'Toute l’île',
  'monde.niveau': 'Niveau {n}',
  'monde.taches.one': '{n} tâche {domaine}',
  'monde.taches.other': '{n} tâches {domaine}',
  'monde.taches.place.one': '{n} autre tâche',
  'monde.taches.place.other': '{n} autres tâches',
  'monde.plaque.label': '{quartier} : niveau {n}, encore {taches} pour le niveau {suivant}.',
  'monde.progres': '{Quartier} : encore {taches} pour le niveau {suivant}.',
  'monde.veille': 'Tout est enregistré. Les lanternes s’allument une à une.',
  'monde.reflet': '{objet} reluit {au_secteur}.',
  'monde.select.object': '{objet}, {au_secteur}.',

  'monde.obj.bastion': 'Grande halle', 'monde.obj.tour': 'Tour de guet', 'monde.obj.tour.abimee': 'Vieille tour de guet',
  'monde.obj.lanterne': 'Lanterne', 'monde.obj.cloture': 'Clôture', 'monde.obj.caisse': 'Caisse d’échéance',
  'monde.obj.convoi': 'Pièces de rechange', 'monde.obj.atelier': 'Atelier', 'monde.obj.etabli': 'Établi',
  'monde.obj.erable': 'Érable', 'monde.obj.glaciere': 'Glacière', 'monde.obj.registres': 'Mairie', 'monde.obj.maison': 'École',
  'monde.obj.fanal': 'Fanal, vieux robot de déneigement', 'monde.obj.fanal.travail': 'Fanal, au travail avec toi',
  'monde.crate.days': 'dans {n} jours', 'monde.crate.today': 'aujourd’hui', 'monde.crate.passed': 'elle attend au bord du chemin',

  // carte en liste
  'monde.plan.title': 'Carte en liste',
  'monde.plan.intro': 'La même carte, en liste : chaque quartier, son niveau et ce qui manque pour le suivant.',
  'monde.plan.crates.one': '1 caisse au bord du chemin (échéance dans 7 jours ou moins).',
  'monde.plan.crates.other': '{n} caisses au bord du chemin (échéances dans 7 jours ou moins).',
  'monde.plan.show': 'Voir sur la carte',
  'monde.plan.show.label': 'Voir {secteur} sur la carte',
  'monde.plan.quests': 'Ses quêtes',
  'monde.plan.quests.label': 'Voir les quêtes {du_secteur}',
};

function flatten(obj, prefix = '', out = {}) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

/** t(clé, valeurs) avec remplacement de {nom}. Accepte un objet plat (interface.json) ou imbriqué. */
export function makeTexts(...sources) {
  const table = { ...DEFAULTS };
  for (const s of sources) Object.assign(table, flatten(s));
  const t = (key, params = {}) => {
    const raw = table[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? String(params[name]) : m));
  };
  t.has = (key) => key in table;
  return t;
}

/** « 7 tâches Terrain », « 1 tâche Maison », « 3 autres tâches » (Place du village, sans domaine). */
export function tachesText(t, n, domaine) {
  const form = n === 1 ? 'one' : 'other';
  return domaine ? t(`monde.taches.${form}`, { n, domaine }) : t(`monde.taches.place.${form}`, { n });
}
export const fmt = (n) => {
  const v = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
};
