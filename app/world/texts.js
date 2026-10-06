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
  'monde.ctl.group': 'Commandes de la carte',
  'monde.ctl.construire': 'Construire',
  'monde.ctl.construire.permis.one': 'Construire, 1 permis à placer',
  'monde.ctl.construire.permis.other': 'Construire, {n} permis à placer',
  'monde.ctl.quetes': 'Quêtes',
  'monde.ctl.vue': 'Vue',
  'monde.ctl.plan': 'Carte en liste',
  'monde.niveau': 'Niveau {n}',
  'monde.niveau.court': 'niv. {n}',
  'monde.quetes.one': '{n} quête {domaine} à faire',
  'monde.quetes.other': '{n} quêtes {domaine} à faire',
  'monde.quetes.place.one': '{n} autre quête à faire',
  'monde.quetes.place.other': '{n} autres quêtes à faire',
  'monde.plaque.label': '{quartier} : niveau {n}.',
  'monde.veille': 'Tout est enregistré. Les lanternes s’allument une à une.',
  'monde.reflet': '{objet} reluit {au_secteur}.',
  'monde.select.object': '{objet}, {au_secteur}.',

  'monde.obj.lanterne': 'Lanterne', 'monde.obj.cloture': 'Clôture', 'monde.obj.caisse': 'Caisse d’échéance',
  'monde.obj.convoi': 'Pièces de rechange', 'monde.obj.atelier': 'Atelier', 'monde.obj.etabli': 'Établi',
  'monde.obj.erable': 'Érable', 'monde.obj.glaciere': 'Glacière',
  'monde.obj.fanal': 'Fanal, vieux robot de déneigement',
  'monde.crate.days': 'dans {n} jours', 'monde.crate.today': 'aujourd’hui', 'monde.crate.passed': 'elle attend au bord du chemin',

  // carte en liste
  'monde.plan.title': 'Carte en liste',
  'monde.plan.intro': 'La même carte, en liste : chaque quartier avec son niveau et ses quêtes à faire, puis les bâtiments.',
  'monde.plan.crates.one': '1 caisse au bord du chemin (échéance dans 7 jours ou moins).',
  'monde.plan.crates.other': '{n} caisses au bord du chemin (échéances dans 7 jours ou moins).',
  'monde.plan.show': 'Voir sur la carte',
  'monde.plan.show.label': 'Voir {secteur} sur la carte',
  'monde.plan.open': 'Ouvrir la fiche',
  'monde.plan.open.label': 'Ouvrir la fiche {du_secteur}',
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

/** Nom d'un bâtiment de la carte selon son état : « Chalet », « Chalet vide », « Emplacement de l’éolienne ». */
export function batimentNom(t, b) {
  return t(`bat.${b.type}.${b.bati ? 'nom' : 'vide'}`);
}

/**
 * Où en est un bâtiment (vue de view.js), en quelques mots : « à rebâtir », « verrouillé : Hameau : encore 2
 * habitants. », « mûr dans 3 jours travaillés », « 1 habitant sur 2 »… Le même texte sur la carte et dans la liste.
 * Un chalet compte ses places dans b.places (École), 2 au départ.
 */
export function batimentEtat(t, b) {
  if (!b.bati) return b.refus ? t('bat.etat.verrou', { raison: b.refus }) : t('bat.etat.libre', { geste: t(`bat.${b.type}.geste`).toLowerCase() });
  if (b.etat === 'mure') return t('bat.etat.mure');
  if (b.etat === 'seme' || b.etat === 'pousse') return t(`bat.etat.pousse.${b.reste === 1 ? 'one' : 'other'}`, { n: b.reste });
  if (b.type === 'parcelle' || b.type === 'serre') return t('bat.etat.rien');
  if (b.type === 'chalet') return t(`bat.etat.chalet.${b.occupants === 0 ? 'zero' : b.occupants === 1 ? 'one' : 'other'}`, { n: b.occupants, max: b.places ?? 2 });
  return t('bat.etat.debout');
}

/** « 7 quêtes Terrain à faire », « 0 quête Maison à faire », « 3 autres quêtes à faire » (Place du village, sans domaine). */
export function quetesText(t, n, domaine) {
  const form = n < 2 ? 'one' : 'other';
  return domaine ? t(`monde.quetes.${form}`, { n, domaine }) : t(`monde.quetes.place.${form}`, { n });
}
export const fmt = (n) => {
  const v = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
};
