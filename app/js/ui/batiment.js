// Fiche d'un bâtiment (bible §5 ; lot L, « l'état d'abord ») : sous le nom, une ligne d'ambiance ; puis l'état dessiné
// (les crans d'une culture, les places du village, le gain du jour d'un producteur), le prix en pastilles, et le seul geste
// possible ici (bâtir, semer, récolter, accueillir une famille), chiffré sur son bouton (« Semer · 2 », « Récolter · +5 »).
// La règle passe dans le repli « Comment ça marche » (« Comment ça pousse » pour une culture). Le dessin est caché au
// lecteur d'écran : la phrase d'état (#bat-now) le dit. Un geste impossible reste visible, à plat, avec un cadenas ; sa
// raison écrite par le cœur (« Hameau : encore 2 habitants. ») reste à l'écran, sauf quand elle ne dit que ce qui manque :
// les pastilles en pointillés le montrent déjà, elle n'est plus que lue.
// Rien n'est calculé ici qui ne vienne de core/batiments.js ; les valeurs que les niveaux de quartier changent (récolte
// selon le lieu, jours de pousse, places par chalet, prix d'une famille, stockage) sont lues au cœur, jamais des
// constantes de départ. Le geste passe par data-action="bat-geste".
// Quand le marchand est au quai (core/visiteurs.js), la fiche du quai devient son étal (lot G, piste B) : la réserve en
// tête, puis les quatre offres de la semaine en tuiles 2 × 2 (des boutons radio : ce que tu donnes, une flèche, ce que tu
// reçois, et l'état, cadenas et ce qui manque ou « Fait cette semaine ») et le rachat du jour (lot T) en tuile large.
// Choisir une tuile ne dépense rien : la barre du pied montre l'offre choisie et « Échanger » (data-geste="echanger"), ou
// le bouton verrouillé et la raison du cœur, ou « Fait cette semaine ». Deux gestes pour échanger. Au-dessus de l'étal,
// la commande du visiteur de la semaine (lot C) : « Livrer » (data-geste="livrer", épinglé au lundi de la commande vue),
// ou verrouillé avec la raison sur le bouton, ou « Commande livrée ».
// Un mauvais imprévu (core/imprevus.js, lot I) se lit dans « Maintenant » : ce qui s'est passé, ce que ça change, puis
// « Réparer » (« Chasser l'ours », « Couvrir la culture ») et son prix, en bouton secondaire (data-geste="reparer"), ou le
// cadenas et la raison du cœur, et les deux autres voies : une quête du bon domaine, ou attendre qu'il se règle seul.
// Réglé aujourd'hui, il laisse à sa place une ligne cochée jusqu'au soir. La neige d'une tempête (core/hiver.js, lot H)
// est un dégât du même genre : « Déneiger », une quête Terrain, ou la neige qui fond.
// Au rang Village (lot B), « Maintenant » dit ce qu'un producteur a donné aujourd'hui, ou pourquoi rien encore (la cabane
// à sucre hors saison, la réserve pleine) ; celui de la tour de guet, la tempête annoncée.
// Le visiteur à commande (lot C) a son bloc au-dessus de l'étal : qui il est, ce qu'il demande (pastilles à jauge, « 3/8 »
// ou une coche), ce qu'il laisse, la taille de la commande quand elle n'est pas « régulière », puis « Livrer ». Les jours
// qui restent ne s'y redisent pas quand le marchand est là (l'état du quai les dit) ; les règles de l'étal, du rachat du
// jour et de la commande sont dans le repli.
import {
  BATIMENTS, CHAUFFAGE, GRENIER_STOCKAGE, EOLIENNE_ENERGIE, aBati, etatCulture, coutSemis,
  refusConstruire, refusSemer, refusRecolter, refusAccueillir, logements, stockage, gameDay, eolienneDuJour,
  recolteDe, prixFamille, placesParChalet, valeur, visiteurDeLaSemaine, refusEchanger, IMPREVUS, DEGATS, degatDe, refusReparer,
  saisonDe, degatsALaRecolte, commandeDeLaSemaine, refusLivrer, PRODUCTION, netDuJour, produitCeJour, TOUR_ANNONCE,
  TEMPETE, alerteTempete, SIROP, compte, productionsDuJour, manque, manqueDetail,
} from '../../core/index.js';
import { t } from '../content.js';
import { $, esc, icon, setHtml } from './dom.js';
import { num, numPossede, numManque, numGain, entierGain, shortDate } from './format.js';

const typeOf = (id) => String(id ?? '').replace(/-\d+$/, '');
// le {n} de « Ce que ça fait », lu au cœur : ce que l'éolienne et les producteurs du Village donnent par jour travaillé,
// les jours d'annonce de la tour de guet, la place du grenier
const N_FAIT = {
  eolienne: EOLIENNE_ENERGIE, grenier: GRENIER_STOCKAGE, tour: TOUR_ANNONCE,
  scierie: PRODUCTION.scierie.materials, poulailler: PRODUCTION.poulailler.food, cabane: PRODUCTION.cabane.food,
};

/** « Ce que ça fait » d'un type de bâtiment, avec les valeurs du cœur (aussi la phrase lue d'une ligne du catalogue). */
export function faitText(game, type) {
  return t(`bat.${type}.fait`, {
    loge: placesParChalet(game), recolte: recolteDe(game, BATIMENTS[type].culture), jours: valeur(game, 'joursPousse'),
    chauffage: CHAUFFAGE, n: N_FAIT[type], base: TEMPETE.annonce, sirop: num(SIROP.energie),
  });
}

/** « 15 Matériaux », « 4 Énergie et 20 Matériaux » (les mêmes mots et le même ordre que le HUD et les prix des quartiers). */
export function coutText(cout) {
  const parts = [];
  if (cout.energy) parts.push(`${numManque(cout.energy)} ${t('resource.energy')}`);
  if (cout.materials) parts.push(`${numManque(cout.materials)} ${t(Math.ceil(cout.materials) < 2 ? 'resource.materials.one' : 'resource.materials.other')}`);
  return parts.join(' et ');
}

// « 30 Énergie », « 15 Matériaux », « 10 Nourriture » : une ressource d'un côté d'une offre du marchand
const RES = { energy: 'energie', materials: 'materiaux', food: 'nourriture' };
export function ressource(obj) {
  const [k, n] = Object.entries(obj)[0];
  const nom = k === 'materials' ? t(n < 2 ? 'resource.materials.one' : 'resource.materials.other') : t(k === 'energy' ? 'resource.energy' : 'resource.food');
  return { res: RES[k], n, nom, texte: `${n} ${nom}` };
}

/** « 12 Nourriture », « 15 Matériaux et 6 Nourriture » : une demande de visiteur, dans l'ordre de la barre du haut. */
export function ressourcesText(obj) {
  const parts = ['energy', 'materials', 'food'].filter((k) => obj[k] > 0).map((k) => ressource({ [k]: obj[k] }).texte);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts.join('');
}

// ───────── Pastilles (lot L), partagées avec la fiche de quartier ─────────
const RES_PRIX = { permis: 'permis', energy: 'energie', materials: 'materiaux', food: 'nourriture' };

/** Pastilles d'un prix : [{ res, n, manque }], dans l'ordre de la barre (permis, Énergie, Matériaux, Nourriture) ; manque à 0 s'il y en a assez. */
export function pastillesDe(game, cout) {
  const d = manqueDetail(game, cout);
  return Object.keys(RES_PRIX).filter((k) => cout[k]).map((k) => ({ res: RES_PRIX[k], n: cout[k], manque: d[k] }));
}

/** Une pastille de prix : picto et nombre ; en pointillés, avec « il manque N » dessous, quand il en manque. */
export const pastilleHtml = (p) => `<span class="pastille-prix"><span class="pastille" data-res="${p.res}"${p.manque ? ' data-manque' : ''}>${icon(p.res)}<b>${esc(numManque(p.n))}</b></span>${
  p.manque ? `<span class="pastille-manque">${esc(t('quartier.prix.manque', { n: num(p.manque) }))}</span>` : ''}</span>`;

/** « Prix » et ses pastilles, muets (la phrase lue du bouton dit le prix). */
export const prixRangHtml = (pastilles) => `<div class="qrt-prix" aria-hidden="true"><p class="qrt-prix-t">${esc(t('quartier.fiche.prix'))}</p><div class="qrt-pastilles">${pastilles.map(pastilleHtml).join('')}</div></div>`;

// Un gain : « +5 » et le picto, en pastille ronde ; cochée quand il est déjà donné aujourd'hui
const gainHtml = (res, n, fait = false) => `<span class="pastille pastille--gain" data-res="${res}"${fait ? ' data-fait' : ''}>${fait ? icon('check', 'pastille-coche') : ''}<b>+${esc(n)}</b>${icon(res)}</span>`;

const DEGAT_ICON = { panne: 'cle', ours: 'patte', gel: 'flocon', neige: 'pelle' };
const domaine = (type) => t(`quartier.${DEGATS[type].quartier}.domain`);

/**
 * Dégât d'un mauvais imprévu sur ce bâtiment : en cours { id, type, titre, effet, geste, cout, label, raison, quete, seul,
 * voie (picto du quartier de la quête qui le règle) }, réglé aujourd'hui { id, type, titre, fini }, ou null.
 */
function degatModel(game, id, now) {
  const type = typeOf(id);
  const d = degatDe(game, id, now);
  if (d) {
    const def = DEGATS[d.type];
    const geste = t(`bat.degat.${d.type}.geste`);
    const cout = coutText(def.reparer);
    const neige = d.type === 'neige'; // la neige dit ce qu'elle change selon le bâtiment, et qu'elle fond
    return {
      id: d.id, type: d.type, fini: null,
      titre: t(`bat.degat.${d.type}.titre`),
      effet: t(neige ? `bat.degat.neige.effet.${type}` : `bat.degat.${d.type}.effet`, { n: IMPREVUS.mauvais.ours.mange }),
      geste, cout, label: t('bat.degat.geste.label', { geste, cout }),
      raison: refusReparer(game, { id: d.id }, now),
      quete: t('bat.degat.quete', { domaine: domaine(d.type) }), voie: def.quartier,
      seul: t(`bat.degat.${neige ? 'neige.' : ''}seul.${d.joursRestants === 1 ? 'one' : 'other'}`, { n: d.joursRestants }),
    };
  }
  const today = gameDay(now);
  const f = (Array.isArray(game.degats) ? game.degats : []).find((x) => x && x.cible === id && x.fin === today && Object.hasOwn(DEGATS, x.type));
  if (!f) return null;
  const fini = f.par === 'quete' ? t('bat.degat.fait.quete', { domaine: domaine(f.type) })
    : f.par === 'recolte' ? t('bat.degat.ours.recolte') : t(`bat.degat.${f.type}.fait`);
  return { id: f.id, type: f.type, titre: t(`bat.degat.${f.type}.titre`), fini };
}

/**
 * Modèle de la fiche : { id, type, bati, nom, quoi, fait, regle: [phrase] | null, repli, maintenant, muet, etat: { kind… },
 * prix: [pastille] | null, raison, manque, geste: { action, params, label, aria?, attente? } | null,
 * comptoir: [{ id, donne, recoit, prise, raison, court, garde }] | null, duJour: { même forme } | null, commande,
 * reserve: [{ res, n, nom }] | null, degat } (comptoir et duJour : le quai debout, quand le marchand y est ; court : l'état
 * écrit sur la tuile de l'étal ; garde : ce que le rachat du jour laisse au village ; reserve : l'Énergie, les Matériaux
 * et la Nourriture en main, avec l'étal ou la commande ; commande : voir commandeModel ; degat : voir degatModel).
 * maintenant : la phrase d'état, lue seulement quand muet (l'état dessiné la montre), affichée sinon. manque : la raison ne
 * dit que ce qui manque pour payer (les pastilles en pointillés la montrent ; elle n'est plus que lue).
 */
export function batimentModel(c, id) {
  const type = typeOf(id);
  if (!Object.hasOwn(BATIMENTS, type)) return null;
  const def = BATIMENTS[type];
  const { game, ledger, now } = c;
  const bati = aBati(game, id);
  const pousse = valeur(game, 'joursPousse');
  const m = {
    id, type, bati,
    nom: t(`bat.${type}.${bati ? 'nom' : 'vide'}`),
    quoi: t(`bat.${type}.${bati ? 'quoi' : 'quoiVide'}`),
    fait: faitText(game, type),
    regle: null, repli: 'bat.fiche.repli', maintenant: '', muet: false, etat: { kind: 'phrase' }, prix: null,
    raison: null, manque: false, geste: null, comptoir: null, duJour: null, commande: null, reserve: null, degat: bati ? degatModel(game, id, now) : null,
  };
  if (bati && type !== 'atelier') m.regle = [m.fait]; // l'atelier réparé n'a plus de règle : « Une fois réparé… » est passé
  let cout = null; // ce que le geste coûte : une raison qui ne dit que ce qui en manque se lit dans les pastilles
  if (!bati) {
    // à bâtir : ce que ça fera, puis le prix
    cout = def.cout;
    m.maintenant = t('bat.fiche.cout', { cout: coutText(cout) });
    m.muet = true;
    m.etat = { kind: 'apercu', texte: m.fait };
    m.prix = pastillesDe(game, cout);
    m.raison = refusConstruire(game, type, id);
    m.geste = { action: 'construire', params: { type, id }, label: t(`bat.${type}.geste`) };
  } else if (def.culture) {
    const st = etatCulture(game, ledger, id, now);
    const gain = numGain(recolteDe(game, def.culture));
    m.regle = [t(`bat.${type}.regle`, { jours: pousse, chauffage: CHAUFFAGE })];
    m.repli = 'bat.fiche.repli.culture';
    m.muet = true;
    if (!st.semee) {
      const cs = coutSemis(id, gameDay(now));
      cout = { energy: cs.energy };
      m.maintenant = cs.chauffage
        ? t('bat.fiche.semer.chauffage', { semis: numManque(cs.energy - cs.chauffage), chauffage: numManque(cs.chauffage) })
        : t('bat.fiche.semer.cout', { cout: coutText(cout) });
      m.etat = { kind: 'semis', semis: pastillesDe(game, cout)[0], jours: pousse, gain, chauffage: cs.chauffage ? numManque(cs.chauffage) : null };
      m.raison = refusSemer(game, ledger, id, now);
      m.geste = { action: 'semer', params: { id }, label: t('bat.fiche.semer.geste', { n: numManque(cs.energy) }), aria: t('bat.fiche.semer.label', { cout: coutText(cout) }) };
    } else if (!st.mure) {
      const n = st.reste === 1 ? 'one' : 'other';
      m.maintenant = t(`bat.fiche.pousse.${n}`, { n: st.reste, date: shortDate(st.semeLe) });
      m.etat = { kind: 'pousse', titre: t(`bat.fiche.dans.${n}`, { n: st.reste }), fait: Math.max(0, Math.min(pousse, st.jours)), total: pousse, gain };
      m.geste = { action: 'recolter', params: { id }, label: t(`bat.fiche.recolter.dans.${n}`, { n: st.reste }), attente: true };
    } else {
      // la réserve pleine ne bloque plus la récolte : la fiche dit d'avance ce qui serait perdu (l'hiver, la serre compte
      // quand même pour son objectif)
      const n = recolteDe(game, def.culture);
      const tient = n - degatsALaRecolte(game, id, n, now).mange; // un ours en visite prend sa part avant le stockage
      const place = stockage(game) - game.resources.food;
      const serreHiver = def.culture === 'serre' && saisonDe(gameDay(now)).id === 'hiver';
      const plein = { stock: numPossede(game.resources.food), max: numPossede(stockage(game)), objectif: t('bandeau.saison.serre.titre') };
      m.maintenant = entierGain(place) <= 0
        ? t(`bat.fiche.mure.plein${serreHiver ? '.hiver' : ''}`, { n: numGain(n), ...plein })
        : place < tient ? t('bat.fiche.mure.place', { n: numGain(n), place: numGain(place) }) : t('bat.fiche.mure', { n: numGain(n) });
      m.etat = {
        kind: 'mure', total: pousse,
        note: entierGain(place) <= 0 ? t(`bat.fiche.mur.plein${serreHiver ? '.hiver' : ''}`, plein)
          : place < tient ? t('bat.fiche.mur.place', { place: numGain(place) }) : null,
      };
      m.raison = refusRecolter(game, ledger, id, now);
      m.geste = { action: 'recolter', params: { id }, label: t('bat.fiche.recolter.geste', { n: numGain(n) }), aria: t('bat.fiche.recolter.label', { n: numGain(n) }) };
    }
  } else if (type === 'chalet') {
    // les places du village entier : une famille s'installe où il y a de la place, pas dans ce chalet-ci
    const l = logements(game);
    const prix = prixFamille(game);
    cout = { food: prix };
    m.maintenant = t(`bat.fiche.places.sr.${l.habitants <= 1 ? 'one' : 'other'}`, { n: l.habitants, places: l.places, prix: num(prix) });
    m.muet = true;
    m.etat = { kind: 'places', ...l, phrase: t(`bat.fiche.places.libres.${l.libres === 0 ? 'zero' : l.libres === 1 ? 'one' : 'other'}`, { n: l.libres }) };
    m.prix = pastillesDe(game, cout);
    m.raison = refusAccueillir(game);
    m.geste = { action: 'accueillir', params: {}, label: t('bat.fiche.accueillir') };
  } else if (type === 'eolienne') {
    const d = degatDe(game, id, now);
    const donne = eolienneDuJour(ledger, gameDay(now)) > 0;
    m.maintenant = d ? t(`bat.eolienne.maintenant.${d.type}`)
      : donne ? t('bat.eolienne.maintenant.fait', { n: EOLIENNE_ENERGIE }) : t('bat.eolienne.maintenant');
    m.muet = true;
    m.etat = { kind: 'production', res: 'energie', n: num(EOLIENNE_ENERGIE), fait: !d && donne, note: null }; // le dégât se dit au-dessus
  } else if (type === 'quai') {
    const v = visiteurDeLaSemaine(game, now);
    if (v) {
      m.maintenant = t(`bat.quai.maintenant.${v.joursRestants === 1 ? 'one' : 'other'}`, { n: v.joursRestants });
      // court : l'état écrit sur la tuile ; pour le rachat du jour, ce qui manque, Matériaux gardés au village compris (sa
      // raison complète se lit dans la barre de l'étal)
      const offre = (o) => {
        const raison = o.prise ? null : refusEchanger(game, { offre: o.id }, now);
        const court = raison && o.garde ? manque(game, { materials: o.donne.materials + o.garde.materials }) || raison : raison;
        return { id: o.id, donne: ressource(o.donne), recoit: ressource(o.recoit), prise: o.prise, raison, court, garde: o.garde ? o.garde.materials : null };
      };
      m.comptoir = v.offres.map(offre);
      m.duJour = offre(v.duJour);
      m.regle.push(t('bat.comptoir.intro'), t('bat.comptoir.jour.intro'));
    }
    m.commande = commandeModel(game, ledger, now);
    // la réserve en tête de l'étal et de la commande, à toutes les largeurs : la feuille couvre la barre du haut à 390 px,
    // et ailleurs une partie selon la hauteur de l'écran (DESIGN.md, « Réserve de l'étal »)
    if (m.comptoir || m.commande) m.reserve = ['energy', 'materials', 'food'].map((k) => ({ res: RES[k], n: numPossede(game.resources[k]), nom: ressource({ [k]: 2 }).nom }));
    if (m.commande) {
      m.commande.sansJours = !!v; // « encore N jours » une seule fois : l'état du quai le dit déjà
      m.regle.push(t('bat.commande.regle'));
    }
  } else if (type === 'grenier') {
    m.maintenant = t('bat.grenier.maintenant', { stock: numPossede(game.resources.food), max: numPossede(stockage(game)) });
    m.muet = true;
    m.etat = { kind: 'stock', stock: numPossede(game.resources.food), max: numPossede(stockage(game)) };
  } else if (type === 'tour') {
    const a = alerteTempete(c.tasks || [], game, ledger, now);
    m.maintenant = !a ? t('bat.tour.maintenant')
      : t(`bat.tour.maintenant.${a.joursRestants === 0 ? 'zero' : a.joursRestants === 1 ? 'one' : 'other'}`, { n: a.joursRestants });
  } else if (Object.hasOwn(PRODUCTION, type)) {
    // ce qui est déjà donné aujourd'hui (la cabane : avec le sirop vendu au marchand, lot N), la cabane hors saison, la
    // réserve pleine (rien n'entre ; la cabane, avec le quai, vendra le sirop), ou la promesse du jour
    const day = gameDay(now);
    const net = netDuJour(ledger, day, type);
    const donne = PRODUCTION[type].materials ? net.materials : net.food;
    const sirop = type === 'cabane' ? net.energy : 0;
    const plein = { stock: numPossede(game.resources.food), max: numPossede(stockage(game)) };
    const dort = !produitCeJour(type, day);
    const reservePleine = !!PRODUCTION[type].food && game.resources.food >= stockage(game);
    m.maintenant = sirop > 0 ? t(`bat.cabane.maintenant.fait.sirop${donne > 0 ? '' : '.seul'}`, { n: numGain(donne), e: numGain(sirop) })
      : donne > 0 ? t(`bat.${type}.maintenant.fait`, { n: numGain(donne) })
        : dort ? t(`bat.${type}.maintenant.dort`)
          : reservePleine
            ? (type === 'cabane' ? t(`bat.cabane.maintenant.plein.${compte(game, 'quai') ? 'sirop' : 'sansQuai'}`, plein) : t('bat.fiche.production.plein', plein))
            : t(`bat.${type}.maintenant`);
    // le gain du jour en pastille ; la phrase ne reste à l'écran que pour ce que la pastille ne dit pas (le sirop vendu, la
    // cabane qui dort, la réserve pleine)
    m.muet = true;
    m.etat = {
      kind: 'production', res: PRODUCTION[type].materials ? 'materiaux' : 'nourriture', n: num(PRODUCTION[type].materials || PRODUCTION[type].food),
      fait: donne > 0, note: sirop > 0 || (donne <= 0 && (dort || reservePleine)) ? m.maintenant : null,
    };
  } else {
    m.maintenant = t(`bat.${type}.maintenant`);
  }
  m.manque = !!m.raison && !!cout && m.raison === manque(game, cout);
  return m;
}

/**
 * Le visiteur à commande de la semaine dans la fiche du quai, ou null : { id, nom, qui, jours, demande: [ressource],
 * recoit: { res, n, nom, note }, taille (phrase, ou null à l'allure régulière), livree, semaine, raison, label }.
 */
function commandeModel(game, ledger, now) {
  const c = commandeDeLaSemaine(game, ledger, now);
  if (!c) return null;
  const [res, n] = Object.entries(c.recoit)[0];
  const recoit = res === 'materials' ? { ...ressource({ materials: n }), note: null }
    : { res, n, nom: t(`bat.commande.recoit.${res}`), note: res === 'habitants' ? t('bat.commande.recoit.habitants.note') : null };
  return {
    id: c.id, nom: t(`bat.commande.${c.id}.nom`), qui: t(`bat.commande.${c.id}.qui`),
    jours: t(`bat.commande.jours.${c.joursRestants === 1 ? 'one' : 'other'}`, { n: c.joursRestants }),
    // ce qu'il demande, et ce que la réserve en a : la jauge et « 3/8 » sur la pastille, une coche quand il y en a assez
    demande: ['energy', 'materials', 'food'].filter((k) => c.demande[k] > 0).map((k) => ({
      ...ressource({ [k]: c.demande[k] }), a: numPossede(game.resources[k]), assez: game.resources[k] >= c.demande[k],
      pct: Math.max(0, Math.min(100, Math.round((100 * game.resources[k]) / c.demande[k]))),
    })),
    recoit, livree: c.livree, semaine: c.semaine,
    taille: c.allegee ? t('bat.commande.taille.allegee') : c.taille === 'regulier' ? null : t(`bat.commande.taille.${c.taille}`),
    raison: c.livree ? null : refusLivrer(game, ledger, {}, now),
    label: t('bat.commande.geste.label', { demande: ressourcesText(c.demande), au: t(`bat.commande.${c.id}.au`) }),
  };
}

const GESTE_ICON = { construire: 'chantier', semer: 'champs', recolter: 'nourriture', accueillir: 'habitants' };

export const resHtml = (r) => `<span class="offre-res" data-res="${r.res}">${icon(r.res)}<b>${r.n}</b> ${esc(r.nom)}</span>`;

// La réserve, en tête de l'étal et de la commande : une pastille par ressource échangée, le mot lu seulement.
const reserveHtml = (r) => `<div class="etal-reserve" role="group" aria-label="${esc(t('bat.comptoir.reserve'))}">${r.map((x) =>
  `<span class="pastille" data-res="${x.res}">${icon(x.res)}<b>${esc(x.n)}</b><span class="sr-only"> ${esc(x.nom)}</span></span>`).join('')}</div>`;

// Une ressource d'une tuile de l'étal : picto et nombre, le reçu précédé de « + » (le mot est dans la phrase lue).
const etalRes = (r, plus = false) => `<span class="etal-res" data-res="${r.res}">${icon(r.res)}<b>${plus ? '+' : ''}${esc(num(r.n))}</b></span>`;

// Une tuile de l'étal (lot G, piste B) : un bouton radio dans une carte. Le troc en gros (ce que tu donnes, une flèche vers
// le bas, ce que tu reçois), puis son état : rien quand l'échange est possible, le cadenas et ce qui manque, ou la coche
// et « Fait cette semaine ». La choisir ne dépense rien : l'échange se fait par « Échanger », dans la barre du bas.
// Le rachat du jour (lot T) est une tuile large, son nom et ce que le marchand laisse au village à côté du troc.
function offreHtml(o, choix, quand = t('bat.comptoir.fait.quand')) {
  const etat = o.prise ? 'fait' : o.raison ? 'verrou' : 'libre';
  const jour = o.garde != null;
  const lu = `${o.donne.texte} ${t('bat.comptoir.contre')} ${o.recoit.texte}`;
  const ligne = o.prise ? `<span class="offre-fait">${icon('check')}<span>${esc(t('bat.comptoir.fait'))} ${esc(quand)}</span></span>`
    : o.raison ? `<span class="offre-raison" id="offre-${o.id}-raison">${icon('lock')}<span>${esc(o.court)}</span></span>` : '';
  const troc = `<span class="offre-troc" aria-hidden="true">${etalRes(o.donne)}${icon('fleche', 'etal-fleche')}${etalRes(o.recoit, true)}</span>`;
  const texte = jour
    ? `<span class="etal-jour"><span class="etal-jour-t">${esc(t('bat.comptoir.jour.titre'))}</span><span class="etal-jour-garde">${esc(t('bat.comptoir.jour.garde', { n: o.garde }))}</span>${ligne}</span>`
    : ligne;
  return `<label class="offre etal-offre${jour ? ' etal-offre--jour' : ''}" data-offre="${o.id}" data-etat="${etat}">
    <input type="radio" name="etal-offre" value="${o.id}"${o.id === choix ? ' checked' : ''}>
    <span class="etal-carte">${troc}<span class="sr-only">${esc(jour ? `${t('bat.comptoir.jour.titre')} : ${lu}` : lu)}. </span>${texte}<span class="etal-tick" aria-hidden="true">${icon('check')}</span></span></label>`;
}

function comptoirHtml(offres, duJour, choix) {
  return `<section class="comptoir etal" aria-labelledby="comptoir-t">
    <div class="etal-tete"><h3 class="comptoir-titre" id="comptoir-t">${icon('barque')}<span>${esc(t('bat.comptoir.titre'))}</span></h3><p class="etal-sous">${esc(t('bat.comptoir.sous'))}</p></div>
    <fieldset class="etal-offres"><legend class="sr-only">${esc(t('bat.comptoir.choisir'))}</legend>
      <div class="etal-grille">${offres.map((o) => offreHtml(o, choix)).join('')}</div>
      ${offreHtml(duJour, choix, t('bat.comptoir.jour.fait.quand'))}</fieldset></section>`;
}

// La barre de l'étal, au pied de la fiche : l'offre choisie en pastilles (donné → reçu), puis « Échanger » (secondaire :
// « Livrer » reste la seule action principale de la fiche), ou le bouton verrouillé et la raison complète du cœur
// dessous, ou « Fait cette semaine » (cible du focus après l'échange).
function etalBarreHtml(o, jour) {
  const etat = o.prise ? 'fait' : o.raison ? 'verrou' : 'libre';
  const pastille = (r, plus = false) => `<span class="pastille" data-res="${r.res}">${icon(r.res)}<b>${plus ? '+' : ''}${esc(num(r.n))}</b></span>`;
  const action = o.prise
    ? `<p class="etal-fait" id="etal-etat" tabindex="-1">${icon('check')}<span>${esc(t('bat.comptoir.fait'))} <small>${esc(t(jour ? 'bat.comptoir.jour.fait.quand' : 'bat.comptoir.fait.quand'))}</small></span></p>`
    : `<button class="btn etal-go" type="button" data-action="bat-geste" data-geste="echanger"
      data-params="${esc(JSON.stringify({ offre: o.id }))}" aria-label="${esc(t('bat.comptoir.geste.label', { donne: o.donne.texte, recoit: o.recoit.texte }))}"${o.raison ? ' aria-disabled="true" aria-describedby="etal-raison"' : ''}>${icon(o.raison ? 'lock' : 'echange')}<span>${esc(t('bat.comptoir.geste'))}</span></button>`;
  return `<div class="etal-barre" data-offre="${o.id}" data-etat="${etat}">
    <p class="etal-choix" aria-hidden="true">${pastille(o.donne)}${icon('fleche', 'etal-choix-fleche')}${pastille(o.recoit, true)}</p>
    ${action}${o.raison ? `<p class="etal-raison" id="etal-raison">${icon('lock')}<span>${esc(o.raison)}</span></p>` : ''}</div>`;
}

// Une ressource de la commande : picto et nombre demandé sur le lavis de la ressource ; ce que la réserve en a (« 3/8 »)
// ou une coche quand il y en a assez, et une jauge dessous (muette : le compte écrit la dit). Ce qu'il laisse : « +1 ».
function commandeResHtml(r) {
  const etat = r.assez ? icon('check', 'commande-ok') : `<small class="commande-a">${esc(r.a)}/${esc(r.n)}</small>`;
  return `<span class="commande-res" data-res="${r.res}"${r.assez ? ' data-assez' : ''}><span class="commande-res-v">${icon(r.res)}<b>${esc(r.n)}</b><span class="sr-only"> ${esc(r.nom)}${
    r.assez ? '' : ` (${esc(t('bat.commande.enReserve', { n: r.a }))})`}</span>${etat}</span><span class="commande-jauge" aria-hidden="true"><span style="width:${r.pct}%"></span></span></span>`;
}

// Le visiteur à commande, au-dessus de l'étal : son nom (et ses jours, sans le marchand), qui il est ; puis ce qu'il demande
// en pastilles à jauge, « + » entre deux, une flèche et ce qu'il laisse ; la taille quand elle n'est pas régulière ; puis
// « Livrer » (principal), ou verrouillé avec la raison du cœur sur le bouton même ; livrée, une ligne cochée à la même place.
function commandeHtml(c) {
  const etat = c.livree ? 'fait' : c.raison ? 'verrou' : 'libre';
  const action = c.livree
    ? `<p class="commande-fait" id="commande-etat" tabindex="-1">${icon('check')}<span>${esc(t('bat.commande.fait'))} <small>${esc(t(`bat.commande.${c.id}.fait`))}</small></span></p>`
    : `<button class="btn btn--block ${c.raison ? '' : 'btn--primary '}commande-go" type="button" data-action="bat-geste" data-geste="livrer" data-params="${esc(JSON.stringify({ semaine: c.semaine }))}"
      aria-label="${esc(c.label)}"${c.raison ? ' aria-disabled="true" aria-describedby="commande-raison"' : ''}>${icon(c.raison ? 'lock' : 'fleche')}<span>${esc(t('bat.commande.geste'))}</span>${
        c.raison ? `<span class="commande-raison" id="commande-raison">${esc(c.raison)}</span>` : ''}</button>`;
  const recoit = `<span class="commande-res commande-res--laisse" data-res="${c.recoit.res}"><span class="commande-res-v">${icon(c.recoit.res)}<b>+${esc(c.recoit.n)}</b><span class="sr-only"> ${esc(c.recoit.nom)}</span></span></span>`;
  return `<section class="commande" data-visiteur="${c.id}" data-etat="${etat}" aria-labelledby="commande-t">
    <h3 class="commande-titre" id="commande-t">${icon('note')}<span>${esc(c.nom)}</span>${c.sansJours ? '' : `<small class="commande-jours">${esc(c.jours)}</small>`}</h3>
    <p class="commande-qui">${esc(c.qui)}</p>
    <div class="commande-echange">
      <p class="commande-demande"><span class="sr-only">${esc(t('bat.commande.demande'))} : </span>${c.demande.map((r, i) => (i ? `<span class="commande-et" aria-hidden="true">+</span><span class="sr-only"> ${esc(t('bat.commande.et'))} </span>` : '') + commandeResHtml(r)).join('')}</p>
      ${icon('fleche', 'commande-fleche')}
      <p class="commande-laisse"><span class="sr-only">${esc(t('bat.commande.laisse'))} : </span>${recoit}</p>
    </div>
    ${c.recoit.note ? `<p class="commande-note">${esc(c.recoit.note)}</p>` : ''}${c.taille ? `<p class="commande-taille">${esc(c.taille)}</p>` : ''}
    ${action}</section>`;
}

// Le dégât dans « Maintenant » : titre et picto braise, ce que ça change, le geste et son prix (ou le cadenas et la raison),
// les deux autres voies. Réglé : une ligne cochée, à la même place (un second toucher n'y trouve rien à refaire).
function degatHtml(d) {
  if (d.fini) return `<div class="degat" data-degat="${d.type}" data-etat="fait"><p class="degat-fait" id="degat-etat" tabindex="-1">${icon('check')}<span>${esc(d.fini)}</span></p></div>`;
  return `<div class="degat" data-degat="${d.type}" data-etat="${d.raison ? 'verrou' : 'libre'}">
    <p class="degat-titre">${icon(DEGAT_ICON[d.type])}<span>${esc(d.titre)}</span></p>
    <p class="degat-effet">${esc(d.effet)}</p>
    <button class="btn btn--small degat-go" type="button" data-action="bat-geste" data-geste="reparer"
      data-params="${esc(JSON.stringify({ id: d.id }))}" aria-label="${esc(d.label)}"${d.raison ? ' aria-disabled="true" aria-describedby="degat-raison"' : ''}>${icon(d.raison ? 'lock' : DEGAT_ICON[d.type])}<span>${esc(d.geste)}</span><span class="degat-prix">${esc(d.cout)}</span></button>
    ${d.raison ? `<p class="degat-raison" id="degat-raison">${icon('lock')}<span>${esc(d.raison)}</span></p>` : ''}
    <ul class="degat-voies" role="list"><li>${icon(d.voie)}<span>${esc(d.quete)}</span></li><li>${icon('clock')}<span>${esc(d.seul)}</span></li></ul></div>`;
}

// L'état, dessiné et caché au lecteur d'écran (la phrase #bat-now, lue, dit la même chose) ; sans dessin, la phrase
// elle-même, à l'écran.
function etatHtml(m) {
  const e = m.etat;
  const crans = (plein, total, cls = '') => `<span class="crans${cls}">${Array.from({ length: total }, (_, i) => `<span${i < plein ? ' data-plein' : ''}></span>`).join('')}</span>`;
  const sur = (n, max) => `<p class="bat-etat-v"><b>${esc(n)}</b> ${esc(t('bat.fiche.surMax', { max }))}</p>`;
  const tete = (titre, droite = '') => `<div class="bat-etat-tete">${titre}${droite}</div>`;
  const note = (p) => (p ? `<p class="bat-etat-note">${esc(p)}</p>` : '');
  const muet = (html) => `<div class="bat-etat" data-etat="${e.kind}" aria-hidden="true">${html}</div>`;
  switch (e.kind) {
    case 'apercu':
      return `<div class="bat-etat" data-etat="apercu"><p class="bat-etat-texte">${esc(e.texte)}</p></div>`;
    case 'semis': {
      const pas = (haut, legende) => `<div class="bat-cycle-pas">${haut}<span class="bat-cycle-l">${esc(legende)}</span></div>`;
      return muet(`<p class="bat-etat-t" data-ton="doux">${esc(t('bat.fiche.rien'))}</p>
        <div class="bat-cycle">${pas(pastilleHtml(e.semis), t('bat.fiche.cycle.seme'))}${icon('fleche', 'bat-cycle-fleche')}${
          pas(crans(e.jours, e.jours, ' crans--mini'), t(`bat.fiche.cycle.jours.${e.jours === 1 ? 'one' : 'other'}`, { n: e.jours }))}${icon('fleche', 'bat-cycle-fleche')}${
          pas(gainHtml('nourriture', e.gain), t('bat.fiche.cycle.recolte'))}</div>
        ${note(e.chauffage ? t('bat.fiche.cycle.chauffage', { n: e.chauffage }) : null)}`);
    }
    case 'pousse':
      return muet(`${tete(`<p class="bat-etat-t">${esc(e.titre)}</p>`, sur(e.fait, e.total))}${crans(e.fait, e.total)}
        <div class="bat-etat-gain"><span>${esc(t('bat.fiche.aLaRecolte'))}</span>${gainHtml('nourriture', e.gain)}</div>`);
    case 'mure':
      return muet(`${tete(`<p class="bat-etat-t">${icon('check')}<span>${esc(t('bat.fiche.mur'))}</span></p>`, sur(e.total, e.total))}${crans(e.total, e.total)}${note(e.note)}`);
    case 'places': {
      const n = Math.max(e.places, e.habitants);
      const places = Array.from({ length: n }, (_, i) => `<span class="bat-place"${i < e.habitants ? ' data-plein' : ''}>${icon('habitants')}</span>`).join('');
      return muet(`${tete(`<p class="bat-etat-label">${esc(t('bat.fiche.places'))}</p>`, sur(e.habitants, e.places))}<div class="bat-places">${places}</div>${note(e.phrase)}`);
    }
    case 'stock':
      return muet(tete(`<p class="bat-etat-label">${esc(t('bat.fiche.reserve'))}</p>`, sur(e.stock, e.max)));
    case 'production':
      return muet(`<div class="bat-etat-gain"><span>${esc(t(e.fait ? 'bat.fiche.donne' : 'bat.fiche.parJour'))}</span>${gainHtml(e.res, e.n, e.fait)}</div>${note(e.note)}`);
    default:
      return `<div class="bat-etat" data-etat="phrase"><p class="bat-etat-texte" id="bat-now">${esc(m.maintenant)}</p></div>`;
  }
}

function bodyHtml(m, choix) {
  const now = m.muet ? `<p class="sr-only" id="bat-now">${esc(m.maintenant)}</p>` : '';
  const raison = !m.raison ? '' : m.manque ? `<p class="sr-only" id="bat-raison">${esc(m.raison)}</p>`
    : `<p class="bat-raison" id="bat-raison">${icon('lock')}<span>${esc(m.raison)}</span></p>`;
  const repli = m.regle ? `<details class="repli"><summary>${esc(t(m.repli))}${icon('chevron-down')}</summary>${m.regle.map((p) => `<p>${esc(p)}</p>`).join('')}</details>` : '';
  return `${m.degat ? degatHtml(m.degat) : ''}${now}${etatHtml(m)}${m.prix ? prixRangHtml(m.prix) : ''}${raison}${m.reserve ? reserveHtml(m.reserve) : ''}${
    m.commande ? commandeHtml(m.commande) : ''}${m.comptoir ? comptoirHtml(m.comptoir, m.duJour, choix) : ''}${repli}`;
}

function footHtml(m) {
  const g = m.geste;
  if (!g) return '';
  const off = !!m.raison || !!g.attente;
  const desc = m.raison ? 'bat-raison' : g.attente ? 'bat-now' : '';
  return `<button class="btn ${off ? '' : 'btn--primary '}btn--block" type="button" data-action="bat-geste" data-geste="${esc(g.action)}"
    data-params="${esc(JSON.stringify(g.params))}"${g.aria ? ` aria-label="${esc(g.aria)}"` : ''}${off ? ' aria-disabled="true"' : ''}${desc ? ` aria-describedby="${desc}"` : ''}>${icon(off ? 'lock' : GESTE_ICON[g.action])}<span>${esc(g.label)}</span></button>`;
}

/**
 * Ouvre la fiche du bâtiment `id` (chalet-1, parcelle-2…). `thumb(id)` (facultatif) renvoie le dessin de la carte en
 * SVG, pour que la fiche montre le même objet ; sans monde, la fiche s'ouvre sans dessin.
 */
export function openBatiment(c, id, { thumb, open } = {}) {
  const m = batimentModel(c, id);
  if (!m) return false;
  const dlg = $('#dlg-batiment');
  dlg.dataset.batId = id;
  delete dlg.dataset.choix; // l'étal choisit à l'ouverture la première offre qu'on peut prendre
  dlg._thumb = thumb || null;
  dlg.innerHTML = `
    <header class="sheet-head"><div class="qrt-head"><span class="bat-thumb" aria-hidden="true"></span>
      <div class="qrt-head-text"><h2 class="sheet-title bat-title" id="bat-t"><span class="bat-nom"></span></h2><p class="qrt-ligne bat-ambiance"></p></div></div>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('bat.fiche.fermer'))}">${icon('x')}</button></header>
    <div class="sheet-body bat-body"></div>
    <footer class="sheet-foot bat-foot"></footer>`;
  fill(dlg, m);
  open(dlg);
  return true;
}

function fill(dlg, m) {
  $('.bat-nom', dlg).textContent = m.nom;
  $('.bat-ambiance', dlg).textContent = m.quoi;
  dlg.dataset.bati = String(m.bati);
  const art = dlg._thumb ? dlg._thumb(m.id) : '';
  const th = $('.bat-thumb', dlg);
  setHtml(th, art || '');
  th.hidden = !art;
  // la tuile de l'étal qui avait le focus le garde d'une mise à jour à l'autre ; un dégât réglé ou une commande livrée
  // change de bouton : le focus reste à sa place (bouton, ou la ligne cochée qui le remplace)
  const body = $('.bat-body', dlg);
  const offre = body.contains(document.activeElement) && document.activeElement.name === 'etal-offre' ? document.activeElement.value : null;
  const degat = body.contains(document.activeElement) && !!document.activeElement.closest('.degat');
  const commande = body.contains(document.activeElement) && !!document.activeElement.closest('.commande');
  // le repli reste ouvert, et le focus sur lui, d'une mise à jour à l'autre
  const repli = $('.repli', body);
  const ouvert = !!repli?.open, surRepli = !!repli?.contains(document.activeElement);
  const choix = choixEtal(dlg, m);
  setHtml(body, bodyHtml(m, choix?.id));
  const r = $('.repli', body);
  if (r && (ouvert || surRepli)) {
    r.open = ouvert;
    if (surRepli) $('summary', r).focus();
  }
  if (offre && !body.contains(document.activeElement)) $(`input[name="etal-offre"][value="${offre}"]`, body)?.focus();
  if (degat && !body.contains(document.activeElement)) ($('.degat-go', body) || $('.degat-fait', body))?.focus();
  if (commande && !body.contains(document.activeElement)) ($('.commande-go', body) || $('.commande-fait', body))?.focus();
  fillFoot(dlg, m, choix);
}

// L'offre choisie de l'étal : celle d'avant (même prise entre-temps), sinon la première qu'on peut prendre, sinon la première.
function choixEtal(dlg, m) {
  if (!m.comptoir) return null;
  const toutes = [...m.comptoir, m.duJour];
  const o = toutes.find((x) => x.id === dlg.dataset.choix) || toutes.find((x) => !x.prise && !x.raison) || toutes[0];
  dlg.dataset.choix = o.id;
  return o;
}

// Le pied : le geste de la fiche, ou la barre de l'étal. Après un échange, le focus passe sur « Fait cette semaine ».
function fillFoot(dlg, m, choix) {
  const foot = $('.bat-foot', dlg);
  const had = foot.contains(document.activeElement);
  setHtml(foot, choix ? etalBarreHtml(choix, choix === m.duJour) : footHtml(m));
  foot.hidden = !m.geste && !choix;
  if (had) ($('.etal-fait', foot) || $('[data-action="bat-geste"]', foot) || $('[data-close]', dlg)).focus();
}

/** L'étal : une autre offre choisie (bouton radio). Seule la barre du pied change ; le focus reste sur la tuile. */
export function choisirOffre(c, id) {
  const dlg = $('#dlg-batiment');
  if (!dlg || !dlg.open || !dlg.dataset.batId) return;
  dlg.dataset.choix = id;
  const m = batimentModel(c, dlg.dataset.batId);
  if (m) fillFoot(dlg, m, choixEtal(dlg, m));
}

/** Remet la fiche ouverte à jour après un geste ou une synchronisation. */
export function refreshBatiment(c) {
  const dlg = $('#dlg-batiment');
  if (!dlg || !dlg.open || !dlg.dataset.batId) return;
  const m = batimentModel(c, dlg.dataset.batId);
  if (m) fill(dlg, m);
}

// ───────── P.-S. de la lettre du matin (lot J) ─────────
const enListe = new Intl.ListFormat('fr-CA', { type: 'conjunction' });

/** Ce que les producteurs ont donné ce jour-là, en une phrase de Fanal, ou null si rien de montrable (gains arrondis à 0). */
export function psProduction(ledger, day) {
  const morceaux = [];
  for (const p of productionsDuJour(ledger, day)) {
    const gains = p.type === 'eolienne' ? [['', p.energy]] : p.type === 'cabane' ? [['', p.food], ['.sirop', p.energy]] : [['', p.materials || p.food]];
    for (const [suite, n] of gains) if (entierGain(n) > 0) morceaux.push(t(`bat.${p.type}.ps${suite}`, { n: numGain(n) }));
  }
  return morceaux.length ? t('letter.ps', { liste: enListe.format(morceaux) }) : null;
}
