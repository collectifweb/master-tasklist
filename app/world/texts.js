// Textes du monde. Les clés partagées viennent de content/fr-CA/interface.json (passé par l'hôte dans
// options.texts) ; celles qui manquent retombent sur les valeurs ci-dessous. Les clés « monde.* » sont
// propres au monde : elles pourront rejoindre content/fr-CA/ quand ce dossier les accueillera.

const DEFAULTS = {
  // repris de interface.json (secours seulement)
  'sector.place.name': 'Place du Bastion', 'sector.place.the': 'la Place du Bastion', 'sector.place.of': 'de la Place du Bastion', 'sector.place.in': 'sur la Place du Bastion',
  'sector.champs.name': 'Champs', 'sector.champs.the': 'les Champs', 'sector.champs.of': 'des Champs', 'sector.champs.in': 'aux Champs',
  'sector.atelier.name': 'Atelier', 'sector.atelier.the': 'l’Atelier', 'sector.atelier.of': 'de l’Atelier', 'sector.atelier.in': 'à l’Atelier',
  'sector.archives.name': 'Archives', 'sector.archives.the': 'les Archives', 'sector.archives.of': 'des Archives', 'sector.archives.in': 'aux Archives',
  'sector.maison-commune.name': 'Maison commune', 'sector.maison-commune.the': 'la Maison commune', 'sector.maison-commune.of': 'de la Maison commune', 'sector.maison-commune.in': 'à la Maison commune',
  'sector.relais.name': 'Relais du convoi', 'sector.relais.the': 'le Relais du convoi', 'sector.relais.of': 'du Relais du convoi', 'sector.relais.in': 'au Relais du convoi',
  'sector.closed': 'Sous la cendre',
  'sector.closed.lueur': 'Sous la cendre {du_secteur} : {n} Lueur en réserve.',
  'sector.level.repair': 'Réparation',
  'sector.level.thrive': 'Prospérité',
  'sector.level.autonomous': 'Autonomie',
  'sector.level.next': 'Prochain palier : {palier}, à {n} Lueur.',
  'sr.sector.level': 'Palier {palier} atteint {au_secteur}.',
  'sr.lisiere': 'La lisière s’allume. Confiance : {n}.',
  'gain.lueur': '+{n} Lueur vers {secteur}',
  'gain.fil_libre': '+{n} Lueur au Fil libre',
  'gain.overflow': 'La réserve est pleine, alors le surplus part au Fil libre.',
  'resource.fil_libre': 'Fil libre',
  'visit.end.title': 'L’Orée veille',
  'a11y.skip_animation': 'Passer l’animation',

  // propres au monde
  'monde.region': 'Carte de l’Orée',
  'monde.region.hint': 'Glisse pour te déplacer. Les flèches passent d’un élément à l’autre.',
  'monde.zoom.group': 'Cadrage de la carte',
  'monde.zoom.in': 'Rapprocher',
  'monde.zoom.out': 'Éloigner',
  'monde.zoom.fit': 'Toute l’île',
  'monde.stage.0': 'À rallumer',
  'monde.mist': 'Dans la brume',
  'monde.mist.hint': 'Un secteur dort encore dans la brume. Il s’ouvrira plus tard dans la saison.',
  'monde.plaque.lueur': '{n}/{cible} Lueur',
  'monde.plaque.full': '{n} Lueur',
  'monde.plaque.reserve': '{n} Lueur en réserve',
  'monde.plaque.label': '{secteur}. {etat}. {detail}',
  'monde.tiles': '{n} cases sur 12 rallumées',
  'monde.tile.lit': 'Une case {du_secteur} se rallume : {n} sur 12.',
  'monde.germ': 'Une pousse lève {au_secteur}.',
  'monde.reserve.gain': 'La Lueur descend sous la cendre {du_secteur} : {n} en réserve.',
  'monde.perce': 'La Lueur en réserve perce la cendre : {secteur} s’ouvre avec {n} Lueur.',
  'monde.ouvre': '{secteur} s’ouvre.',
  'monde.lisiere': 'La lisière s’allume.',
  'monde.veille': 'L’Orée veille. Les lanternes s’allument une à une.',
  'monde.reflet': '{objet} reluit {au_secteur}.',
  'monde.build': '{objet} construit {au_secteur}.',
  'monde.fil.direct': '{n} Lueur du Fil libre envoyée vers {secteur}.',
  'monde.surplus': 'Le surplus rejoint le Fil libre.',
  'monde.select.object': '{objet}, {au_secteur}.',
  'monde.select.sector': '{secteur} sélectionné.',

  'monde.obj.bastion': 'Bastion', 'monde.obj.tour': 'Tour de signal', 'monde.obj.tour.abimee': 'Tour de signal à réparer',
  'monde.obj.relais': 'Relais', 'monde.obj.lanterne': 'Lanterne', 'monde.obj.cloture': 'Clôture', 'monde.obj.caisse': 'Caisse d’échéance',
  'monde.obj.parcelle': 'Parcelle', 'monde.obj.tunnel': 'Tunnel de culture', 'monde.obj.atelier': 'Atelier', 'monde.obj.etabli': 'Établi',
  'monde.obj.erable': 'Érable', 'monde.obj.glaciere': 'Glacière', 'monde.obj.registres': 'Salle des registres', 'monde.obj.maison': 'Maison commune',
  'monde.obj.fanal': 'Fanal, l’automate-lanterne', 'monde.obj.solene': 'Solène', 'monde.obj.milo': 'Milo',
  'monde.crop.courge': 'courge', 'monde.crop.patate': 'patate', 'monde.crop.ble': 'blé',
  'monde.crop.state.0': 'semée', 'monde.crop.state.mid': 'pousse {s} sur {n}', 'monde.crop.state.ripe': 'mûre',
  'monde.crate.days': 'dans {n} jours', 'monde.crate.today': 'aujourd’hui', 'monde.crate.passed': 'elle attend au bord du chemin',

  // plan accessible
  'monde.plan.title': 'Plan de l’Orée',
  'monde.plan.intro': 'La même carte, en liste. Chaque secteur, son palier, sa Lueur et ce qui y est construit.',
  'monde.plan.lisiere.on': 'Lisière : allumée aujourd’hui.',
  'monde.plan.lisiere.off': 'Lisière : elle attend la première quête du jour.',
  'monde.plan.fil': 'Fil libre : {n} Lueur à diriger.',
  'monde.plan.crates.one': '1 caisse au bord du chemin (échéance dans 7 jours ou moins).',
  'monde.plan.crates.other': '{n} caisses au bord du chemin (échéances dans 7 jours ou moins).',
  'monde.plan.built': 'Construit : {liste}.',
  'monde.plan.plots': 'Parcelles : {liste}.',
  'monde.plan.opens': 'S’ouvre au chapitre {n}.',
  'monde.plan.show': 'Voir sur la carte',
  'monde.plan.show.label': 'Voir {secteur} sur la carte',
  'monde.plan.stage': '{etat} · {detail}.',
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

const LEVEL_KEYS = ['monde.stage.0', 'sector.level.repair', 'sector.level.thrive', 'sector.level.autonomous'];
export const levelKey = (stage) => LEVEL_KEYS[Math.max(0, Math.min(3, stage))];
export const fmt = (n) => {
  const v = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
};
