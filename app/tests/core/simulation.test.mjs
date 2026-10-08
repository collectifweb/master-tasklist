// Simulation d'équilibrage (lot 4) : un joueur simulé ouvre l'app chaque jour, termine 2 ou 3 quêtes ordinaires, puis
// fait ce qu'un joueur appliqué ferait (récolter, accueillir, bâtir, semer). Elle prouve :
//  (a) qu'à rythme régulier on atteint le Hameau en 21 jours environ ;
//  (b) qu'un village qui démarre le 25 octobre, avec le seul campement, n'est jamais bloqué l'hiver : la petite serre
//      nourrit, et une famille arrive avant le printemps, même à une quête par jour ;
//  (c) qu'aucun stock ne devient négatif ;
//  (d) (lot 5) qu'un joueur qui suit le bandeau d'objectifs atteint les cinq premiers pas sans impasse, et que la
//      première famille arrive vers le 6e jour, au départ du 25 octobre comme du 15 décembre.
// (e) (lot R) mesure, sans cible, un joueur qui ne fait que des quêtes longues et difficiles (L et D de 6 à 9) : le
//     plafond quotidien des points d'effort et ce que « l'effort paie » change au rythme du village.
// (f) (lot R) les permis et les niveaux de quartier (docs/conception-niveaux-quartiers.md §11) : une fois ses premiers
//     pas et ses bâtiments faits, le joueur simulé achète le niveau le moins cher qu'il peut payer. Un permis tous les
//     4 jours travaillés, le premier niveau vers la 2e semaine, pas les 17 niveaux avant la semaine 16, et des Matériaux
//     nettement plus bas qu'une partie sans niveaux. ECHELLE (quartiers.js) se règle ici. (a) se mesure sans niveaux ;
//     (a′) mesure la même chose avec niveaux, cible élargie à 15-25 (voir plus bas).
// (g) (lot R2) un joueur simulé qui reprend les comptes de l'essai d'Alex (24 jours : 17 à une quête, 4 à deux, 3 sans, dans
//     un ordre inventé ;
//     toutes à priorité 5, longueur 2, difficulté 3, soit 7 points), avec les prix des niveaux à 80 Énergie et 60 Matériaux
//     (ECHELLE 20) et la semaine tenue (SEMAINE_TENUE.materials, quartiers.js). Ses habitudes sont des hypothèses tirées des types de
//     gains de l'essai (tasks/todo.md, « 87 hors quêtes (ouverture, ajout, bon fil, éolienne, objectif de saison) », sans
//     dire quand ni combien de fois) : chaque quête est ajoutée le jour même par l'ajout complet (bonus d'ajout), le bonus d'ouverture est pris
//     chaque jour, l'éolienne, le grenier et le quai sont bâtis dès que le Hameau et les ressources le permettent, la serre est
//     semée l'hiver. Une seule serre : la seconde est venue au lot R2a, après l'essai (avec elle, le premier niveau des départs
//     d'été arrive aux jours 45 et 48 au lieu de 42 et 42, mesuré le 6 octobre ; ceux d'octobre ne changent pas).
//     Il part de zéro. Comparé à périmètre égal (les premiers pas, 5 Énergie et 10 Matériaux, ne sont pas dans le détail de
//     l'essai), il gagne en 24 jours 104,5 Énergie et 97,5 Matériaux sans la semaine tenue (133,5 avec ; l'essai n'en avait pas),
//     contre 154,2 et 122 mesurés sur l'essai : les Matériaux sont à 25 % près (-20,1 %), l'Énergie non (-32,2 %, test marqué
//     « todo » : l'essai a posé l'éolienne pendant ces 24 jours, voir plus bas).
// (h) (lot V) le marchand du quai (core/visiteurs.js) : le joueur « avisé » n'échange que ce qui est en trop par rapport
//     au prix d'un niveau (80 Énergie pour 60 Matériaux), achète la Nourriture qui complète une famille et vend celle qui
//     ne tient plus dans la réserve ; le joueur qui échange « toujours » prend Énergie → Matériaux chaque semaine. Le joueur
//     (f) bâtit alors aussi le quai. Le marchand ne doit ni retarder le Hameau, ni faire acheter plus de deux niveaux de
//     plus en 16 semaines.
// (i) (lot I) les imprévus (core/imprevus.js) : le joueur passe le temps à chaque ouverture (advanceTime), ce qui tire les
//     imprévus ; il paie les réparations dès qu'il le peut ('paie'), ou attend qu'elles se fassent seules ou par une quête du
//     bon domaine ('attend'). Pire cas : il attend et aucune de ses quêtes n'est du bon domaine ('attend' et profil tout en
//     Enfants). Cible : sur 16 semaines, le premier niveau ne bouge que de quelques jours, dans un sens ou dans l'autre.
// (j) (lot H) l'hiver (core/hiver.js) : tempêtes annoncées, barre de préparation, neige sur l'éolienne ou la serre, objectif
//     « Garder la serre allumée ». Le joueur se prépare ('prepare' : la veille, il achète les crans qui manquent et paie
//     le déneigement) ou compte sur ses seules quêtes ('quetes' : il attend que la neige fonde ou qu'une quête Terrain
//     déneige) ; 'sans' : les tempêtes sont déjà réglées au registre, seuls les imprévus jouent. Cible : sur l'hiver, le
//     premier niveau de quartier ne bouge que de quelques jours, qu'on se prépare ou non.
// (k) (lot A) l'allure du village (core/allure.js) : cinq joueurs, d'une quête tous les quatre jours à six par jour, joués du
//     1er juillet (avec le marchand) ou du 7 octobre (sans) jusqu'à la fin de l'hiver, avec l'allure et sans elle (forcée à
//     « régulier »). Cibles : les deux lents passent au ralenti, le rapide au plein régime, l'essai et (f) restent réguliers
//     et leur partie ne change en rien ; jamais plus d'imprévus que l'allure de la semaine n'en permet ; l'objectif de saison
//     réduit n'arrive jamais plus tard, et celui d'hiver est atteint au ralenti. OBJECTIFS_SAISON (objectifs.js) se règle ici.
// Quêtes fictives génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openApp, completeQuest, construire, semer, recolter, accueillir, refusConstruire, refusSemer, refusRecolter,
  refusAccueillir, batimentsDuVillage, logements, stockage, BATIMENTS, ACCUEIL_NOURRITURE, STOCKAGE, addDays, rangDuVillage,
  prochainGeste, PAS_IDS, cappedPe, monterQuartier, refusMonter, niveauDe, placesParChalet, QUARTIER_IDS,
  SEMAINE_TENUE, createQuest, MARCHAND, echanger, refusEchanger, prixFamille,
  advanceTime, reparer, refusReparer, degatsActifs, joursGeles, IMPREVUS,
  tempetesDeLHiver, alerteTempete, refusPreparer, preparer, recoltesHiver, TEMPETE, DEGATS, OBJECTIFS_SAISON,
  allureDe, ALLURE, daysBetween, weekStart,
} from '../../core/index.js';
import { fresh, step } from './helpers.mjs';

const DOMAINS = ['Maison', 'Terrain', 'Enfants', 'Véhicule', 'Administratif'];
// quêtes ordinaires : courtes à moyennes, priorité moyenne (≈ 3 Énergie et 5 Matériaux chacune)
const quetes = (n) => Array.from({ length: n }, (_, k) => ({
  id: `s${k}`, task: `Quête ordinaire ${k}`, domain: DOMAINS[k % 5],
  difficulty: 3 + (k % 3), length: 2 + (k % 3), priority: 4 + (k % 3), status: 'todo', created: '2026-01-01', deadline: null,
}));
// quêtes longues et difficiles, déterministes : (L6 D7), (L7 D8), (L8 D9), (L9 D6), priorité moyenne
const longues = (n) => Array.from({ length: n }, (_, k) => ({
  id: `s${k}`, task: `Quête longue ${k}`, domain: DOMAINS[k % 5],
  difficulty: 6 + ((k + 1) % 4), length: 6 + (k % 4), priority: 4 + (k % 3), status: 'todo', created: '2026-01-01', deadline: null,
}));
const heure = (day, h, m = 0) => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;

/**
 * Joue `jours` jours à partir de `debut`. rythme(i) = quêtes terminées le i-e jour. Après chaque geste, vérifie (c).
 * profil(n) : les n quêtes du monde (quêtes ordinaires par défaut).
 * bandeau : tant que les premiers pas durent, le joueur fait le geste que le bandeau propose (prochainGeste) dès qu'il
 * le peut, et rien d'autre ; au pas « famille », il fait tout ce qui aide à nourrir. Sinon, il fait tout ce qui est
 * possible, dans l'ordre ci-dessous ; en dernier, il monte le quartier le moins cher qu'il peut payer (niveau le plus
 * bas, puis l'ordre des quartiers), sauf avec `niveaux: false`.
 * Renvoie le journal : { hameau (jour d'arrivée, ou null), familles: [jours], recoltes: [jours], plein (premier jour où tous
 * les logements possibles sont habités, ou null), pas: { id: n° du jour atteint }, premiereFamille (n° du jour),
 * niveaux: [n° du jour de chaque niveau acheté], objectifs: { clé de saison: jour atteint }, monde }.
 */
function simuler(debut, jours, rythme, { jusquAuHameau = false, bandeau = false, profil = quetes, niveaux = true, habitudes = false, marchand = false, imprevus = null, hiver = null } = {}) {
  // habitudes (profil g) : le joueur ajoute chaque quête le jour même, par le chemin d'ajout complet de l'interface (le
  // bonus d'ajout est compté par le cœur), et bâtit aussi l'éolienne, le grenier et le quai dès que le Hameau le permet.
  // marchand (h) : 'avise' ou 'toujours' (voir l'en-tête), ou 'sans' (le quai est bâti, mais le joueur n'échange pas) ;
  // avec l'une des trois, le joueur bâtit aussi le quai.
  const liste = profil(jours * 3 + 10);
  let w = fresh(habitudes ? [] : liste, heure(debut, 12));
  const log = { hameau: null, familles: [], recoltes: [], plein: null, pas: {}, premiereFamille: null, niveaux: [], echanges: {}, objectifs: {}, monde: null };
  // (i) imprévus : tirés par type, gains des bons, dégâts réglés (paiement, quête), prix payés, Énergie que l'éolienne en
  // panne n'a pas donnée, Nourriture mangée par l'ours, jours de pousse perdus au gel
  const imp = log.imp = { bon: {}, mauvais: {}, gains: { energy: 0, materials: 0, food: 0 }, par: { paiement: 0, quete: 0 }, paye: { energy: 0, materials: 0 }, eolienne: 0, ours: 0, gel: 0 };
  // (j) hiver : issues des tempêtes, raisons du passage sans dégât, bâtiments ensevelis, crans achetés et leur prix,
  // récompenses des tempêtes tenues, Énergie que l'éolienne ensevelie n'a pas donnée, jours de pousse perdus sous la neige,
  // déneigements payés et par quête, jour de l'objectif d'hiver
  const hiv = log.hiver = { issues: {}, raisons: {}, cibles: {}, crans: 0, coutCrans: 0, recompense: 0, eolienne: 0, serre: 0, deneige: { paiement: 0, quete: 0, energie: 0 }, objectif: null };
  if (hiver === 'sans') w.ledger = tempetesDeLHiver(debut).map((j) => ({ key: `tempete:${j}` }));
  let n = 0;
  let i = 0;
  const geste = (fn, params, now) => {
    const s = step(w, fn, params, now);
    w = s.world;
    for (const e of s.r.events) {
      if (e.type === 'objectif-saison') log.objectifs[e.cle] = addDays(debut, i); // (k) jour de chaque objectif de saison atteint
      if (e.type === 'premier-pas') log.pas[e.id] = i + 1;
      else if (e.type === 'imprevu') {
        imp[e.nature][e.imprevu] = (imp[e.nature][e.imprevu] || 0) + 1;
        if (e.nature === 'bon') for (const k of ['energy', 'materials', 'food']) imp.gains[k] += e[k] || 0;
      } else if (e.type === 'reparation' && e.imprevu === 'neige') {
        hiv.deneige[e.par]++;
        hiv.deneige.energie += e.cout?.energy || 0;
      } else if (e.type === 'reparation') {
        imp.par[e.par]++;
        for (const k of ['energy', 'materials']) imp.paye[k] += e.cout?.[k] || 0;
      } else if (e.type === 'eolienne-arretee' && degatsActifs(w.game, now).some((d) => d.type === 'neige' && d.cible.startsWith('eolienne'))) hiv.eolienne += e.energy;
      else if (e.type === 'eolienne-arretee') imp.eolienne += e.energy;
      else if (e.type === 'tempete') {
        hiv.issues[e.resultat] = (hiv.issues[e.resultat] || 0) + 1;
        if (e.raison) hiv.raisons[e.raison] = (hiv.raisons[e.raison] || 0) + 1;
        if (e.cible) hiv.cibles[e.cible.replace(/-\d+$/, '')] = (hiv.cibles[e.cible.replace(/-\d+$/, '')] || 0) + 1;
        hiv.recompense += e.materials || 0;
      } else if (e.type === 'preparation') {
        hiv.crans++;
        hiv.coutCrans += e.cout.materials || 0;
      } else if (e.type === 'objectif-saison' && e.objectif === OBJECTIFS_SAISON.hiver.id) hiv.objectif = i + 1;
      else if (e.type === 'recolte' && e.ours) imp.ours += e.ours;
    }
    const { energy, materials, food } = w.game.resources;
    assert.ok(energy >= 0 && materials >= 0 && food >= 0 && w.game.habitants >= 0, `stock négatif le ${now} : ${JSON.stringify(w.game.resources)}`);
    assert.ok(food <= stockage(w.game), `Nourriture au-dessus du stockage le ${now}`);
  };
  for (i = 0; i < jours; i++) {
    const day = addDays(debut, i);
    geste(openApp, {}, heure(day, 12));
    if (imprevus) {
      geste(advanceTime, {}, heure(day, 12));
      // 'paie' : il règle chaque dégât dès qu'il le voit, s'il en a les moyens
      if (imprevus === 'paie') for (const d of degatsActifs(w.game, heure(day, 12))) if (!refusReparer(w.game, { id: d.id }, heure(day, 12))) geste(reparer, { id: d.id }, heure(day, 12));
    }
    for (let k = 0; k < rythme(i); k++) {
      if (habitudes) {
        const { id, task, domain, difficulty, length, priority } = liste[n];
        geste(createQuest, { id, task, domain, difficulty, length, priority, complete: true }, heure(day, 13 + 2 * k));
      }
      geste(completeQuest, { id: `s${n++}` }, heure(day, habitudes ? 14 + 2 * k : 14 + k));
    }
    // le soir : le joueur fait tout ce qui est possible, dans un ordre raisonnable
    const soir = heure(day, 22);
    // (j) 'prepare' : la veille de la tempête, il rentre le bois qui manque (avant toute autre dépense) et, le jour venu, il
    // a déjà payé le déneigement avec les autres réparations ('paie')
    if (hiver === 'prepare') {
      const a = alerteTempete(w.tasks, w.game, w.ledger, soir);
      if (a && a.joursRestants === 1) {
        for (let k = a.achetes + 1; k <= a.achetes + a.max - a.crans; k++) {
          if (refusPreparer(w.tasks, w.game, w.ledger, { jour: a.jour, n: k }, soir)) break;
          geste(preparer, { jour: a.jour, n: k }, soir);
        }
      }
    }
    for (let guard = 0; guard < 20; guard++) {
      const cultures = batimentsDuVillage(w.game).filter((b) => BATIMENTS[b.type].culture).map((b) => b.id);
      const mure = cultures.find((id) => !refusRecolter(w.game, w.ledger, id, soir));
      if (mure) {
        const semeLe = w.game.parcelles.find((p) => p.id === mure)?.semeLe;
        if (imprevus && semeLe) {
          const perdus = joursGeles(w.game, w.ledger, mure, semeLe, day);
          if (mure.startsWith('serre')) hiv.serre += perdus; else imp.gel += perdus; // la neige ne touche que la serre, le gel que le potager
        }
        geste(recolter, { id: mure }, soir); log.recoltes.push(day); continue;
      }
      const g = bandeau ? prochainGeste(w.tasks, w.game, w.ledger, soir) : null;
      if (g && g.pas !== 'famille') {
        if (g.raison) break; // il attend d'avoir de quoi faire le geste proposé
        if (g.geste === 'construire') { geste(construire, { type: g.cible.replace(/-\d+$/, ''), id: g.cible }, soir); continue; }
        if (g.geste === 'semer') { geste(semer, { id: g.cible }, soir); continue; }
        break; // ajouter ou terminer une quête : c'est la journée qui s'en charge
      }
      if (!refusAccueillir(w.game)) {
        geste(accueillir, {}, soir);
        log.familles.push(day);
        log.premiereFamille ??= i + 1;
        if (!log.hameau && rangDuVillage(w.game.habitants).id === 'hameau') log.hameau = i + 1;
        if (w.game.habitants >= BATIMENTS.chalet.max * placesParChalet(w.game)) log.plein ??= day; // la 1re fois : l'École rouvre des places ensuite
        continue;
      }
      if (!logements(w.game).libres && !refusConstruire(w.game, 'chalet')) { geste(construire, { type: 'chalet' }, soir); continue; }
      const libre = cultures.find((id) => !refusSemer(w.game, w.ledger, id, soir));
      if (libre) { geste(semer, { id: libre }, soir); continue; }
      // habitudes : une seule serre, comme l'essai (la seconde serre est venue après lui, au lot R2a)
      const bat = (habitudes ? ['parcelle', 'atelier', 'serre', 'eolienne', 'grenier', 'quai'] : marchand ? ['parcelle', 'atelier', 'serre', 'quai'] : ['parcelle', 'atelier', 'serre'])
        .find((t) => !(habitudes && t === 'serre' && batimentsDuVillage(w.game).some((b) => b.type === 'serre')) && !refusConstruire(w.game, t));
      if (bat) { geste(construire, { type: bat }, soir); continue; }
      const offre = marchand && marchand !== 'sans' && offreDuMarchand(w.game, soir, marchand);
      if (offre) { geste(echanger, { offre }, soir); log.echanges[offre] = (log.echanges[offre] || 0) + 1; continue; }
      const q = niveaux && moinsCher(w.game, w.ledger);
      if (q) { geste(monterQuartier, { quartier: q, niveau: niveauDe(w.game, q) + 1 }, soir); log.niveaux.push(i + 1); continue; }
      break;
    }
    if (jusquAuHameau && log.hameau) break;
  }
  log.monde = w;
  return log;
}

// Quartier que le joueur simulé monte : le niveau le moins cher qu'il peut payer (le plus bas), dans l'ordre des quartiers.
function moinsCher(game, ledger) {
  const possibles = QUARTIER_IDS.filter((q) => !refusMonter(game, ledger, { quartier: q }));
  return possibles.sort((a, b) => niveauDe(game, a) - niveauDe(game, b))[0] ?? null;
}

// Offre du marchand que prend le joueur simulé (h), ou null.
function offreDuMarchand(game, now, politique) {
  const ok = (id) => !refusEchanger(game, { offre: id }, now);
  if (politique === 'toujours') return ok('energie-materiaux') ? 'energie-materiaux' : null;
  const o = Object.fromEntries(MARCHAND.offres.map((x) => [x.id, x]));
  const { energy: e, materials: m, food: n } = game.resources;
  if (3 * e > 4 * m + 3 * o['energie-materiaux'].donne.energy && ok('energie-materiaux')) return 'energie-materiaux';
  if (4 * m > 3 * e + 4 * o['materiaux-energie'].donne.materials && ok('materiaux-energie')) return 'materiaux-energie';
  const famille = prixFamille(game);
  if (logements(game).libres && n < famille && n + o['energie-nourriture'].recoit.food >= famille && ok('energie-nourriture')) return 'energie-nourriture';
  if (n >= stockage(game) - 2 && ok('nourriture-energie')) return 'nourriture-energie';
  return null;
}

const regulier = (i) => (i % 2 ? 3 : 2); // 2 ou 3 quêtes par jour, 2,5 en moyenne

test('(a) à rythme régulier, le Hameau arrive en 21 jours environ, en été comme à l’automne', () => {
  for (const debut of ['2026-06-01', '2026-08-15', '2026-10-06']) {
    const { hameau } = simuler(debut, 40, regulier, { jusquAuHameau: true, niveaux: false }); // avec les niveaux : (a′)
    assert.ok(hameau >= 17 && hameau <= 25, `départ ${debut} : Hameau au jour ${hameau}`);
  }
});

// (a′) (lot R) avec les niveaux : le Hameau passe du jour 18 au jour 16 aux trois départs dès qu'un niveau de Champs
//      est acheté avant lui (une récolte de 5 au lieu de 4 avance la 3e famille de 2 jours), quelle que soit ECHELLE de
//      10 à 40. Accepté (arbitrage 10 du lot R) : c'est l'effet voulu d'un niveau. Cible avec niveaux : 15 à 25.
test('(a′) avec les niveaux de quartier, le Hameau arrive entre les jours 15 et 25', () => {
  for (const debut of ['2026-06-01', '2026-08-15', '2026-10-06']) {
    const { hameau } = simuler(debut, 40, regulier, { jusquAuHameau: true });
    assert.ok(hameau >= 15 && hameau <= 25, `départ ${debut} : Hameau au jour ${hameau} avec les niveaux`);
  }
});

test('(b) départ le 25 octobre, campement seul : jamais bloqué l’hiver, la serre nourrit et une famille arrive', () => {
  // une famille tient toujours dans le stockage de départ : sinon, sans grenier, personne ne pourrait jamais arriver
  assert.ok(ACCUEIL_NOURRITURE <= STOCKAGE);
  for (const [nom, rythme] of [['2 à 3 quêtes par jour', regulier], ['une quête par jour', () => 1], ['une quête tous les deux jours', (i) => (i % 2 ? 0 : 1)]]) {
    const log = simuler('2026-10-25', 188, rythme); // jusqu'au 30 avril
    // jamais bloqué : tant qu'un logement reste à remplir, il y a une récolte au moins toutes les trois semaines
    const fin = log.plein && log.plein < '2027-04-30' ? log.plein : '2027-04-30';
    const hiver = ['2026-11-01', ...log.recoltes.filter((d) => d >= '2026-11-01' && d <= fin), fin];
    for (let k = 1; k < hiver.length; k++) {
      const ecart = (new Date(hiver[k]) - new Date(hiver[k - 1])) / 864e5;
      assert.ok(ecart <= 21, `${nom} : aucune récolte entre le ${hiver[k - 1]} et le ${hiver[k]}`);
    }
    assert.ok(log.familles.some((d) => d >= '2026-11-01' && d <= '2027-03-31'), `${nom} : aucune famille accueillie de novembre à mars (${log.familles})`);
  }
});

test('(c) une année entière à trois quêtes par jour : aucun stock négatif, jamais plus de Nourriture que le stockage', () => {
  // les vérifications sont faites après chaque geste, dans simuler()
  const log = simuler('2026-10-06', 365, () => 3);
  assert.equal(log.monde.game.habitants, BATIMENTS.chalet.max * placesParChalet(log.monde.game)); // l'École ajoute des places
});

test('(d) en suivant le bandeau : les cinq premiers pas sans impasse, la première famille vers le 6e jour', () => {
  for (const debut of ['2026-10-25', '2026-12-15']) {
    const log = simuler(debut, 30, regulier, { bandeau: true });
    // les cinq atteints ; un pas se coche dès qu'il est vrai, même avant son tour (7 octobre 2026) : l'ordre n'est plus vérifié
    assert.deepEqual(Object.keys(log.pas).sort(), [...PAS_IDS].sort(), `${debut} : premiers pas ${JSON.stringify(log.pas)}`);
    // un coup de pouce, pas un cadeau : ni le premier soir, ni plus tard que le 7e jour
    assert.ok(log.premiereFamille >= 5 && log.premiereFamille <= 7, `${debut} : première famille au jour ${log.premiereFamille}`);
    assert.equal(log.pas.famille, log.premiereFamille);
  }
  // à une quête par jour aussi, le bandeau ne mène jamais à une impasse
  for (const debut of ['2026-10-25', '2026-12-15']) {
    const log = simuler(debut, 30, () => 1, { bandeau: true });
    assert.deepEqual(Object.keys(log.pas).sort(), [...PAS_IDS].sort(), `${debut}, une quête par jour : ${JSON.stringify(log.pas)}`);
    assert.ok(log.premiereFamille <= 12, `${debut}, une quête par jour : première famille au jour ${log.premiereFamille}`);
  }
});

// PE des quêtes par jour travaillé, et part comptée après le plafond quotidien (45 PE à plein, 90 à moitié).
function pesParJour(ledger) {
  const parJour = new Map();
  for (const e of ledger) if (e.type === 'reward') parJour.set(e.day, (parJour.get(e.day) || 0) + e.pe);
  const pes = [...parJour.values()];
  const total = pes.reduce((s, x) => s + x, 0);
  const comptes = pes.reduce((s, x) => s + cappedPe(0, x), 0);
  return { moyenne: total / pes.length, max: Math.max(...pes), au45: pes.filter((x) => x > 45).length, au90: pes.filter((x) => x > 90).length, part: comptes / total };
}

test('(e) mesure sans cible : quêtes ordinaires contre quêtes longues et difficiles, sur 16 semaines', (t) => {
  const f = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  for (const [nomProfil, profil] of [['ordinaires', quetes], ['longues', longues]]) {
    for (const debut of ['2026-06-01', '2026-10-25']) {
      for (const [nomRythme, rythme] of [['2 à 3 par jour', regulier], ['1 par jour', () => 1]]) {
        const log = simuler(debut, 112, rythme, { profil, niveaux: false }); // les gains seuls, sans achat de niveaux
        const pe = pesParJour(log.monde.ledger);
        const { energy, materials } = log.monde.game.resources;
        t.diagnostic(`${nomProfil}, ${debut}, ${nomRythme} : 1re famille j${log.premiereFamille}, Hameau j${log.hameau}, `
          + `plein ${log.plein ?? '—'} ; PE par jour ${f(pe.moyenne)} (max ${pe.max}), jours au-delà de 45 : ${pe.au45}, de 90 : ${pe.au90}, `
          + `part comptée ${Math.round(pe.part * 100)} % ; semaine 16 : ${f(energy)} Énergie, ${f(materials)} Matériaux`);
      }
    }
  }
});

test('(f) permis et niveaux : un permis tous les 4 jours travaillés, le premier niveau vers la 2e semaine, pas tout avant la semaine 16', (t) => {
  const SEMAINES = 16;
  const f = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
  const permisDesJours = (ledger) => ledger.filter((e) => /^permis:\d/.test(e.key)).length;
  const permisTous = (ledger) => ledger.filter((e) => e.type === 'permis' || e.permis > 0).length;
  // rythme des permis : environ 1,5 à 1,75 par semaine à 6 ou 7 jours travaillés, environ 0,9 à un jour sur deux
  const sixSurSept = (i) => (i % 7 === 6 ? 0 : regulier(i));
  for (const [nom, rythme, min, max] of [['7 jours sur 7', regulier, 1.4, 1.8], ['6 jours sur 7', sixSurSept, 1.4, 1.8], ['un jour sur deux', (i) => (i % 2 ? 0 : 1), 0.8, 1]]) {
    const log = simuler('2026-10-25', SEMAINES * 7, rythme);
    const parSemaine = permisDesJours(log.monde.ledger) / SEMAINES;
    t.diagnostic(`permis, ${nom} : ${f(parSemaine)} par semaine des jours travaillés, ${f(permisTous(log.monde.ledger) / SEMAINES)} toutes sources`);
    assert.ok(parSemaine >= min && parSemaine <= max, `${nom} : ${parSemaine} permis par semaine`);
  }
  for (const debut of ['2026-06-01', '2026-10-25']) {
    // premier niveau entre les jours 7 et 14 au rythme régulier, avant le jour 30 à une quête par jour
    const reg = simuler(debut, SEMAINES * 7, regulier);
    const lent = simuler(debut, SEMAINES * 7, () => 1);
    const sans = simuler(debut, SEMAINES * 7, regulier, { niveaux: false });
    const m = reg.monde.game.resources.materials;
    const mSans = sans.monde.game.resources.materials;
    t.diagnostic(`${debut}, régulier : 1er niveau j${reg.niveaux[0]}, ${reg.niveaux.length} niveaux en ${SEMAINES} semaines `
      + `(${QUARTIER_IDS.map((q) => `${q} ${niveauDe(reg.monde.game, q)}`).join(', ')}), permis en main ${reg.monde.game.permis.dispo} ; `
      + `semaine ${SEMAINES} : ${f(reg.monde.game.resources.energy)} Énergie et ${f(m)} Matériaux, contre ${f(sans.monde.game.resources.energy)} et ${f(mSans)} sans niveaux ; `
      + `Hameau j${reg.hameau}, plein ${reg.plein ?? '—'} (sans niveaux : ${sans.plein ?? '—'})`);
    t.diagnostic(`${debut}, une quête par jour : 1er niveau j${lent.niveaux[0]}, ${lent.niveaux.length} niveaux en ${SEMAINES} semaines, `
      + `semaine ${SEMAINES} : ${f(lent.monde.game.resources.energy)} Énergie et ${f(lent.monde.game.resources.materials)} Matériaux`);
    assert.ok(reg.niveaux[0] >= 7 && reg.niveaux[0] <= 14, `${debut} : premier niveau au jour ${reg.niveaux[0]}`);
    assert.ok(lent.niveaux[0] < 30, `${debut}, une quête par jour : premier niveau au jour ${lent.niveaux[0]}`);
    assert.ok(reg.niveaux.length < 17, `${debut} : ${reg.niveaux.length} niveaux avant la semaine ${SEMAINES}`);
    assert.ok(m <= 0.75 * mSans, `${debut} : ${m} Matériaux contre ${mSans} sans niveaux`);
  }
  // mesure sans cible : quêtes longues et difficiles
  const long = simuler('2026-10-25', SEMAINES * 7, regulier, { profil: longues });
  t.diagnostic(`longues, 2026-10-25, régulier : 1er niveau j${long.niveaux[0]}, ${long.niveaux.length} niveaux en ${SEMAINES} semaines, `
    + `semaine ${SEMAINES} : ${f(long.monde.game.resources.energy)} Énergie et ${f(long.monde.game.resources.materials)} Matériaux`);
});

// ───────── (g) le rythme mesuré sur l'essai ─────────

// 24 jours : 17 à une quête, 4 à deux, 3 sans (mêmes comptes que l'essai ; l'ordre des jours est inventé, répartis à
// intervalles à peu près égaux).
const MOTIF_ESSAI = [1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1, 0, 1, 1, 2, 1, 1, 2, 1, 0, 1];
const rythmeEssai = (i) => MOTIF_ESSAI[i % MOTIF_ESSAI.length];
// quêtes par défaut du formulaire : priorité 5, longueur 2, difficulté 3 (7 points d'effort). Créées « dans le futur » : la
// liste de départ est faite d'avance, et l'ancienneté (+2 points par 14 jours) les ferait passer à 10 points ; Alex, lui,
// termine ses quêtes peu après les avoir ajoutées.
const parDefaut = (n) => Array.from({ length: n }, (_, k) => ({
  id: `s${k}`, task: `Quête par défaut ${k}`, domain: DOMAINS[k % 5],
  difficulty: 3, length: 2, priority: 5, status: 'todo', created: '2099-12-31', deadline: null,
}));

test('(g) le motif de l’essai : par période de 24 jours, 17 jours à une quête, 4 à deux, 3 sans ; 7 points par quête', () => {
  const compte = (n) => MOTIF_ESSAI.filter((x) => x === n).length;
  assert.deepEqual([MOTIF_ESSAI.length, compte(1), compte(2), compte(0)], [24, 17, 4, 3]);
  const log = simuler('2026-10-23', 24, rythmeEssai, { profil: parDefaut, habitudes: true });
  const gains = log.monde.ledger.filter((e) => e.type === 'reward');
  assert.equal(gains.length, 25);
  assert.equal(new Set(gains.map((e) => e.day)).size, 21);
  assert.ok(gains.every((e) => e.pe === 7), JSON.stringify(gains.map((e) => e.pe)));
});

test('(g) au motif de l’essai : un niveau est acheté dans les 16 semaines, au moins 14 semaines sur 16 sont tenues', (t) => {
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  for (const debut of ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']) {
    const log = simuler(debut, 16 * 7, rythmeEssai, { profil: parDefaut, habitudes: true });
    const r = log.monde.game.resources;
    const tenues = log.monde.ledger.filter((e) => e.type === 'semaine').length;
    t.diagnostic(`(g) ${debut} : niveaux aux jours ${log.niveaux.join(', ')}, permis en main ${log.monde.game.permis.dispo}, `
      + `${f(r.energy)} Énergie et ${f(r.materials)} Matériaux, ${tenues} semaines tenues sur 16`);
    assert.ok(log.niveaux.length >= 1 && log.niveaux[0] <= 60, `${debut} : premier niveau au jour ${log.niveaux[0]} (garde-fou, pas la cible)`);
    assert.ok(tenues >= 14, `${debut} : ${tenues} semaines tenues sur 16`);
  }
});

test('(g) la semaine tenue (12 Matériaux) n’éloigne aucun premier niveau : jamais plus tard que sans bonus, aux quatre départs de (g) et aux deux de (f)', () => {
  // Mesuré le 6 octobre, premier niveau sans bonus, avec 12 puis avec 30 : (g) départs du 23 octobre, 25 octobre, 15 août,
  // 1er juin : jours 30, 30, 58, 61 sans bonus ; 22, 22, 42, 42 avec 12 ; 22, 22, 28, 27 avec 30. (f) départs du 25 octobre et du
  // 1er juin : jour 8 dans les trois cas. Ce joueur bâtit tout dès que possible : les Matériaux de la semaine tenue paient le
  // Hameau, puis le niveau. Le montant reste à décider. Aux départs d'été, aucun montant n'atteint le jour 24 : le premier niveau
  // plafonne au jour 27 à partir de 40 Matériaux (mesuré le 6 octobre : 12 → 42, 20 → 36 et 34, 30 → 28 et 27, 40 à 120 → 27).
  // La cible d'été dépend de l'ordre des bâtiments du Hameau, pas du bonus (voir le test « todo » des départs d'été, plus bas).
  const sauve = SEMAINE_TENUE.materials;
  const jours = (debut, profil, rythme) => simuler(debut, 16 * 7, rythme, { profil, habitudes: profil === parDefaut }).niveaux[0];
  try {
    for (const [profil, rythme, departs, nom] of [[parDefaut, rythmeEssai, ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01'], '(g)'], [quetes, regulier, ['2026-10-25', '2026-06-01'], '(f)']]) {
      for (const debut of departs) {
        SEMAINE_TENUE.materials = 0;
        const sans = jours(debut, profil, rythme);
        SEMAINE_TENUE.materials = sauve;
        const avec = jours(debut, profil, rythme);
        assert.ok(avec <= sans, `${nom} ${debut} : premier niveau au jour ${avec} avec la semaine tenue, ${sans} sans`);
      }
    }
  } finally { SEMAINE_TENUE.materials = sauve; }
});

// Gains du registre en 24 jours (Énergie, Matériaux), avec ou sans le bonus de semaine tenue (l'essai n'en avait pas).
function gains24(debut) {
  const l = simuler(debut, 24, rythmeEssai, { profil: parDefaut, habitudes: true }).monde.ledger;
  const somme = (k, filtre = () => true) => Math.round(l.filter(filtre).reduce((s, e) => s + (e[k] || 0), 0) * 10) / 10;
  // les premiers pas (type « pas ») ne sont pas dans le détail de l'essai : hors du compte, comparé à périmètre égal
  const horsPas = (e) => e.type !== 'pas';
  return {
    energy: somme('energy', horsPas), materials: somme('materials', horsPas),
    materialsSansSemaine: somme('materials', (e) => horsPas(e) && e.type !== 'semaine'),
    pas: { energy: somme('energy', (e) => e.type === 'pas'), materials: somme('materials', (e) => e.type === 'pas') },
  };
}
const ESSAI = { energy: 154.2, materials: 122 }; // gagné en 24 jours sur l'essai (tasks/todo.md, « Retours d'essai d'Alex — 6 octobre 2026, matin »)
const pct = (x, ref) => `${x > ref ? '+' : ''}${String(Math.round((x / ref - 1) * 1000) / 10).replace('.', ',')} %`;

test('(g) proximité de l’essai : en 24 jours, les Matériaux gagnés sont à 25 % près des 122 mesurés (avec et sans la semaine tenue)', (t) => {
  for (const debut of ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']) {
    const g = gains24(debut);
    t.diagnostic(`(g) ${debut}, 24 jours : ${g.energy} Énergie (${pct(g.energy, ESSAI.energy)}), ${g.materials} Matériaux (${pct(g.materials, ESSAI.materials)}), `
      + `${g.materialsSansSemaine} sans la semaine tenue (${pct(g.materialsSansSemaine, ESSAI.materials)})`);
  }
  const g = gains24('2026-10-23');
  for (const m of [g.materials, g.materialsSansSemaine]) {
    assert.ok(m >= ESSAI.materials * 0.75 && m <= ESSAI.materials * 1.25, `${m} Matériaux gagnés en 24 jours, contre ${ESSAI.materials} mesurés sur l’essai`);
  }
});

// L'Énergie de (g) reste sous la borne : 104,5 en 24 jours (départ du 23 octobre, premiers pas exclus) contre 154,2, soit
// -32,2 % (borne : 115,65). Le registre de (g) compte 24 ouvertures (24), 25 ajouts (25), 25 quêtes de 7 points (52,5) et
// l'objectif de saison (3), plus 5 premiers pas (5) qui ne sont pas comptés ici. Il manque l'éolienne : l'essai l'a posée pendant
// ces 24 jours (85 Matériaux dépensés pour le quai, l'éolienne et le grenier, lu dans tasks/todo.md), donc, par déduction, il
// avait atteint le Hameau (3 habitants) avant la fin des 24 jours, alors que ce joueur, parti de zéro, n'a que 2 habitants au
// jour 24 (3 aux départs d'été, atteints au jour 24 : trop tard pour que l'éolienne produise). La partie d'essai avait aussi quatre
// quêtes qui ne sont pas aux valeurs par défaut. Départ de zéro contre partie déjà avancée : ce n'est pas réglable par une
// habitude du joueur ; ne pas élargir la borne.
test('(g) proximité de l’essai : en 24 jours, l’Énergie gagnée est à 25 % près des 154,2 mesurées', { todo: 'Énergie à -32,2 % : l’essai a posé l’éolienne pendant ces 24 jours (déduction : Hameau atteint avant la fin), pas ce joueur parti de zéro (voir le commentaire)' }, () => {
  const { energy } = gains24('2026-10-23');
  assert.ok(energy >= ESSAI.energy * 0.75 && energy <= ESSAI.energy * 1.25, `${energy} Énergie gagnée en 24 jours (${pct(energy, ESSAI.energy)}), contre ${ESSAI.energy} mesurées sur l’essai`);
});

// CIBLE (ECHELLE 20, 80 Énergie et 60 Matériaux) : le premier niveau est acheté vers le jour 21 (tasks/todo.md, « Lot R2 »),
// soit entre les jours 18 et 24, en partant de zéro. Elle tient aux deux départs d'octobre (jour 22) ; aux deux départs d'été
// elle ne tient pas (voir le test suivant).
test('(g) cible : premier niveau vers le jour 21 (entre les jours 18 et 24), aux départs du 23 et du 25 octobre', (t) => {
  for (const debut of ['2026-10-23', '2026-10-25']) {
    const log = simuler(debut, 16 * 7, rythmeEssai, { profil: parDefaut, habitudes: true });
    t.diagnostic(`(g) ${debut} : premier niveau au jour ${log.niveaux[0]}`);
    assert.ok(log.niveaux[0] >= 18 && log.niveaux[0] <= 24, `${debut} : premier niveau au jour ${log.niveaux[0]}`);
  }
});

// Aux départs du 15 août et du 1er juin, premier niveau aux jours 42 et 42 (mesuré le 6 octobre, sans seconde serre). Après 28
// jours, il reste 94 et 91 Énergie (de quoi payer 80) mais seulement 17 et 7 Matériaux (il en faut 60), et le village compte
// déjà l'éolienne, le quai et le grenier : les bâtiments du Hameau passent avant le niveau. Avec une semaine tenue à 30
// Matériaux, le premier niveau tombe aux jours 28 et 27 (sans bonus : 58 et 61). Cible non élargie.
test('(g) cible : premier niveau vers le jour 21 (entre les jours 18 et 24), aux départs du 15 août et du 1er juin', { todo: 'jours 42 et 42 : les bâtiments du Hameau passent avant le niveau (voir le commentaire)' }, (t) => {
  for (const debut of ['2026-08-15', '2026-06-01']) {
    const log = simuler(debut, 16 * 7, rythmeEssai, { profil: parDefaut, habitudes: true });
    t.diagnostic(`(g) ${debut} : premier niveau au jour ${log.niveaux[0]}`);
    assert.ok(log.niveaux[0] >= 18 && log.niveaux[0] <= 24, `${debut} : premier niveau au jour ${log.niveaux[0]}`);
  }
});

// ───────── (h) le marchand du quai ─────────

test('(h) le marchand : ni Hameau retardé, ni plus de deux niveaux de plus en 16 semaines ; échanger sans compter ne paie pas', (t) => {
  // Mesuré le 6 octobre (offres 30 É → 15 M, 20 É → 10 N, 15 M → 15 É, 10 N → 10 É), joueur avisé contre joueur sans marchand :
  // (g) 23 et 25 octobre : 6 niveaux dans les deux cas, village plein le 29 décembre et le 1er janvier au lieu d'après la
  // 16e semaine ; (g) 15 août et 1er juin : 6 niveaux, plein 6 jours plus tôt ; (f) 25 octobre et 1er juin : 11 et 12 niveaux
  // au lieu de 10 et 11. Le joueur qui prend Énergie → Matériaux chaque semaine n'achète que 2 niveaux en (g) : l'Énergie
  // manque ensuite pour les niveaux.
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  for (const [nom, rythme, profil, habitudes, departs] of [
    ['(g)', rythmeEssai, parDefaut, true, ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']],
    ['(f)', regulier, quetes, false, ['2026-10-25', '2026-06-01']],
  ]) {
    for (const debut of departs) {
      const sans = simuler(debut, 16 * 7, rythme, { profil, habitudes, marchand: 'sans' });
      const avise = simuler(debut, 16 * 7, rythme, { profil, habitudes, marchand: 'avise' });
      const toujours = simuler(debut, 16 * 7, rythme, { profil, habitudes, marchand: 'toujours' });
      const r = avise.monde.game.resources;
      t.diagnostic(`${nom} ${debut} : niveaux ${sans.niveaux.length} sans, ${avise.niveaux.length} avisé, ${toujours.niveaux.length} toujours ; `
        + `1er niveau j${sans.niveaux[0]} / j${avise.niveaux[0]} ; plein ${sans.plein ?? '—'} / ${avise.plein ?? '—'} ; `
        + `échanges ${JSON.stringify(avise.echanges)} ; fin ${f(r.energy)} Énergie, ${f(r.materials)} Matériaux`);
      assert.equal(avise.hameau, sans.hameau, `${nom} ${debut} : Hameau au jour ${avise.hameau} contre ${sans.hameau}`);
      assert.ok(avise.niveaux.length >= sans.niveaux.length && avise.niveaux.length <= sans.niveaux.length + 2,
        `${nom} ${debut} : ${avise.niveaux.length} niveaux avec le marchand, ${sans.niveaux.length} sans`);
      assert.ok(Object.keys(avise.echanges).length > 0, `${nom} ${debut} : le marchand n'a servi à rien`);
      assert.ok(toujours.niveaux.length <= avise.niveaux.length, `${nom} ${debut} : échanger sans compter rapporte plus qu'échanger avec soin`);
    }
  }
});

// ───────── (i) les imprévus ─────────

// Même profil, toutes les quêtes en Enfants : aucune ne règle un dégât (pire cas de 'attend'). Le domaine ne compte pas pour les niveaux.
const enfants = (profil) => (n) => profil(n).map((q) => ({ ...q, domain: 'Enfants' }));

test('(i) les imprévus : le premier niveau ne bouge que de quelques jours sur 16 semaines, qu’on paie ou qu’on attende', (t) => {
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  const resume = (l) => `bons ${JSON.stringify(l.imp.bon)}, mauvais ${JSON.stringify(l.imp.mauvais)}, gains ${f(l.imp.gains.energy)} É ${f(l.imp.gains.materials)} M ${f(l.imp.gains.food)} N, `
    + `réglés ${l.imp.par.paiement} payés et ${l.imp.par.quete} par quête, payé ${f(l.imp.paye.energy)} É ${f(l.imp.paye.materials)} M, `
    + `perdu ${f(l.imp.eolienne)} É d'éolienne, ${f(l.imp.ours)} N à l'ours, ${l.imp.gel} j de pousse au gel`;
  for (const [nom, rythme, profil, habitudes, departs] of [
    ['(g)', rythmeEssai, parDefaut, true, ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']],
    ['(f)', regulier, quetes, false, ['2026-10-25', '2026-06-01']],
  ]) {
    for (const debut of departs) {
      const sans = simuler(debut, 16 * 7, rythme, { profil, habitudes });
      const paie = simuler(debut, 16 * 7, rythme, { profil, habitudes, imprevus: 'paie' });
      const attend = simuler(debut, 16 * 7, rythme, { profil, habitudes, imprevus: 'attend' });
      const pire = simuler(debut, 16 * 7, rythme, { profil: enfants(profil), habitudes, imprevus: 'attend' });
      t.diagnostic(`${nom} ${debut} : 1er niveau j${sans.niveaux[0]} sans, j${paie.niveaux[0]} paie, j${attend.niveaux[0]} attend, j${pire.niveaux[0]} pire ; `
        + `niveaux ${sans.niveaux.length} / ${paie.niveaux.length} / ${attend.niveaux.length} / ${pire.niveaux.length} ; Hameau j${sans.hameau} / j${paie.hameau} / j${attend.hameau} / j${pire.hameau}`);
      t.diagnostic(`  paie : ${resume(paie)}`);
      t.diagnostic(`  attend : ${resume(attend)}`);
      t.diagnostic(`  pire : ${resume(pire)}`);
      for (const [qui, l] of [['paie', paie], ['attend', attend], ['pire', pire]]) {
        assert.ok(Math.abs(l.niveaux[0] - sans.niveaux[0]) <= 4, `${nom} ${debut}, ${qui} : premier niveau au jour ${l.niveaux[0]} contre ${sans.niveaux[0]} sans imprévus`);
        assert.ok(Math.abs(l.niveaux.length - sans.niveaux.length) <= 1, `${nom} ${debut}, ${qui} : ${l.niveaux.length} niveaux contre ${sans.niveaux.length}`);
      }
      // une panne laissée à elle-même coûte un peu plus que sa réparation : l'Énergie perdue, contre des Matériaux comptés au prix
      // où le marchand les rachète (1 Énergie pièce) ; mesuré quand aucune quête ne la règle
      if (pire.imp.mauvais.panne) {
        const parPanne = pire.imp.eolienne / pire.imp.mauvais.panne;
        t.diagnostic(`  panne laissée à elle-même : ${f(parPanne)} Énergie perdue en moyenne, contre ${IMPREVUS.mauvais.panne.reparer.materials} Matériaux pour la réparer`);
        assert.ok(parPanne > IMPREVUS.mauvais.panne.reparer.materials, `${nom} ${debut} : ${parPanne} Énergie perdue par panne`);
      }
    }
  }
});

// (j) Rythme lent : une quête un jour sur deux.
const lent = (i) => (i % 2 ? 0 : 1);

test('(j) l’hiver : tempêtes, barre et neige ne déplacent le premier niveau que de quelques jours, qu’on se prépare ou non ; l’objectif d’hiver est atteint, mais pas avant Noël', (t) => {
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  const resume = (l) => { const h = l.hiver; return `tempêtes ${JSON.stringify(h.issues)} (sans dégât : ${JSON.stringify(h.raisons)}), ensevelis ${JSON.stringify(h.cibles)}, `
    + `${h.crans} crans achetés (${h.coutCrans} M), récompenses ${h.recompense} M, déneigés ${h.deneige.paiement} payés (${h.deneige.energie} É) et ${h.deneige.quete} par quête, `
    + `perdu ${f(h.eolienne)} É d'éolienne et ${h.serre} j de pousse en serre ; objectif d'hiver ${h.objectif ? `j${h.objectif}` : 'non'} (${recoltesHiver(l.monde.game, 'hiver-2026')} récoltes de serre)`; };
  const jours = 25 * 7; // jusqu'au printemps : tout l'hiver 2026-2027
  for (const [nom, rythme, profil, habitudes, departs] of [
    ['(g)', rythmeEssai, parDefaut, true, ['2026-10-07', '2026-11-15']],
    ['(f)', regulier, quetes, false, ['2026-10-07', '2026-11-15']],
    ['(lent)', lent, quetes, false, ['2026-10-07']],
  ]) {
    for (const debut of departs) {
      const sans = simuler(debut, jours, rythme, { profil, habitudes, imprevus: 'attend', hiver: 'sans' });
      const quetesSeules = simuler(debut, jours, rythme, { profil, habitudes, imprevus: 'attend', hiver: 'quetes' });
      const prepare = simuler(debut, jours, rythme, { profil, habitudes, imprevus: 'paie', hiver: 'prepare' });
      const pire = simuler(debut, jours, rythme, { profil: enfants(profil), habitudes, imprevus: 'attend', hiver: 'quetes' });
      t.diagnostic(`${nom} ${debut} : 1er niveau j${sans.niveaux[0]} sans tempête, j${quetesSeules.niveaux[0]} quêtes seules, j${prepare.niveaux[0]} se prépare, j${pire.niveaux[0]} pire ; `
        + `niveaux ${sans.niveaux.length} / ${quetesSeules.niveaux.length} / ${prepare.niveaux.length} / ${pire.niveaux.length} ; Hameau j${sans.hameau} / j${quetesSeules.hameau} / j${prepare.hameau} / j${pire.hameau}`);
      t.diagnostic(`  quêtes seules : ${resume(quetesSeules)}`);
      t.diagnostic(`  se prépare : ${resume(prepare)}`);
      t.diagnostic(`  pire : ${resume(pire)}`);
      t.diagnostic(`  sans tempête : objectif d'hiver ${sans.hiver.objectif ? `j${sans.hiver.objectif}` : 'non'} (${recoltesHiver(sans.monde.game, 'hiver-2026')} récoltes de serre)`);
      // date de la k-e récolte de l'hiver (décembre à février : le potager dort, ce sont celles de la serre)
      const kieme = (l) => { const r = l.recoltes.filter((d) => d >= '2026-12-01' && d <= '2027-02-28'); return [4, 6, 8, 10, 12, 14].map((k) => `${k}e ${r[k - 1]?.slice(5) ?? 'jamais'}`).join(', '); };
      t.diagnostic(`  récoltes d'hiver, quêtes seules : ${kieme(quetesSeules)} ; pire : ${kieme(pire)}`);
      for (const [qui, l] of [['quêtes seules', quetesSeules], ['se prépare', prepare], ['pire', pire]]) {
        if (sans.niveaux[0] === undefined) assert.ok(l.niveaux.length <= 1, `${nom} ${debut}, ${qui}`);
        else assert.ok(Math.abs(l.niveaux[0] - sans.niveaux[0]) <= 4, `${nom} ${debut}, ${qui} : premier niveau au jour ${l.niveaux[0]} contre ${sans.niveaux[0]} sans tempête`);
        assert.ok(Math.abs(l.niveaux.length - sans.niveaux.length) <= 1, `${nom} ${debut}, ${qui} : ${l.niveaux.length} niveaux contre ${sans.niveaux.length}`);
        // « Garder la serre allumée » : atteint dans l'hiver, sans tomber dès décembre
        const jour = l.hiver.objectif && addDays(debut, l.hiver.objectif - 1);
        assert.ok(jour && jour >= '2026-12-25' && jour <= '2027-02-28', `${nom} ${debut}, ${qui} : objectif d'hiver le ${jour}`);
      }
    }
  }
});

// (k) Rythmes de l'allure : six quêtes par jour, plus que le plein régime n'en demande (70 en 14 jours) ; une quête tous les
// quatre jours, le joueur le plus lent pour qui l'objectif d'hiver réduit est réglé.
const rapide = () => 6;
const tresLent = (i) => (i % 4 ? 0 : 1);

test('(k) l’allure : le joueur lent passe au ralenti, le rapide au plein régime, les autres restent réguliers ; premier niveau inchangé, objectif d’hiver réduit atteint', (t) => {
  const lettre = { ralenti: 'r', regulier: 'g', plein: 'P' };
  // allure de chaque semaine jouée, lue après coup sur le registre final : r au ralenti, g régulier, P plein régime
  const semaines = (debut) => { const w = []; for (let d = debut; d < '2027-03-01'; d = addDays(d, 7)) w.push(d); return w; };
  const allures = (l, debut) => semaines(debut).map((d) => lettre[allureDe(l.monde.game, l.monde.ledger, d).niveau]).join('');
  const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const objectifs = (l) => `automne ${l.objectifs['automne-2026']?.slice(5) ?? 'non'}, hiver ${l.objectifs['hiver-2026']?.slice(5) ?? 'non'} (${recoltesHiver(l.monde.game, 'hiver-2026')} récoltes de serre)`;
  const resume = (l) => `imprévus ${total(l.imp.bon)} bons et ${total(l.imp.mauvais)} mauvais ; objectifs ${objectifs(l)} ; 1er niveau j${l.niveaux[0]}, ${l.niveaux.length} niveaux ; Hameau j${l.hameau}`;
  // la même partie, l'allure forcée à « régulier » (seuils hors d'atteinte)
  const sansAllure = (f) => { const avant = { ...ALLURE }; ALLURE.ralenti = -1; ALLURE.plein = Infinity; try { return f(); } finally { Object.assign(ALLURE, avant); } };
  // date de la k-e récolte de l'hiver (décembre à février : celles de la serre)
  const kieme = (l) => { const r = l.recoltes.filter((d) => d >= '2026-12-01' && d <= '2027-02-28'); return [4, 6, 8, 10].map((k) => `${k}e ${r[k - 1]?.slice(5) ?? 'jamais'}`).join(', '); };
  const plafond = { ralenti: [1, 0], regulier: [2, 1], plein: [4, 2] }; // imprévus par semaine, dont mauvais
  for (const [nom, rythme, profil, habitudes, motif] of [
    ['(très lent) 1 quête tous les 4 jours', tresLent, quetes, false, /^g{3}r+$/],
    ['(lent) 1 quête un jour sur deux', lent, quetes, false, /^g{3}r+$/],
    ['(g) rythme de l’essai', rythmeEssai, parDefaut, true, /^g+$/],
    ['(f) 2 ou 3 par jour', regulier, quetes, false, /^g+$/],
    ['(rapide) 6 par jour', rapide, (n) => quetes(n * 3), false, /^g{3}P+$/],
  ]) {
    // départ d'été : le joueur vend au marchand la Nourriture qui ne tient plus dans sa réserve pleine (sans quoi la serre ne
    // se récolte plus l'hiver, mesuré le 7 octobre 2026 : 0 à 7 récoltes) ; départ d'aujourd'hui : sans marchand
    for (const [debut, marchand] of [['2026-07-01', 'avise'], ['2026-10-07', false]]) {
      const jours = daysBetween(debut, '2027-03-01'); // jusqu'à la fin de l'hiver
      const options = { profil, habitudes, imprevus: 'attend', hiver: 'quetes', marchand };
      const avec = simuler(debut, jours, rythme, options);
      const sans = sansAllure(() => simuler(debut, jours, rythme, options));
      const suite = allures(avec, debut);
      t.diagnostic(`${nom}, départ ${debut} : ${suite}`);
      t.diagnostic(`  avec l'allure : ${resume(avec)}`);
      t.diagnostic(`  sans (tout régulier) : ${resume(sans)}`);
      t.diagnostic(`  récoltes d'hiver, avec : ${kieme(avec)} ; sans : ${kieme(sans)}`);
      const qui = `${nom}, départ ${debut}`;
      assert.match(suite, motif, qui);
      // imprévus tirés chaque semaine, d'après le registre : jamais plus que l'allure de la semaine n'en permet
      const parSemaine = new Map();
      for (const e of avec.monde.ledger.filter((x) => x.type === 'imprevu')) {
        const w = weekStart(e.key.slice('imprevu:'.length));
        const c = parSemaine.get(w) || [0, 0];
        parSemaine.set(w, [c[0] + 1, c[1] + (Object.hasOwn(IMPREVUS.mauvais, e.imprevu) ? 1 : 0)]);
      }
      for (const [w, [n, mauvais]] of parSemaine) {
        const [max, maxMauvais] = plafond[allureDe(avec.monde.game, avec.monde.ledger, w).niveau];
        assert.ok(n <= max && mauvais <= maxMauvais, `${qui}, semaine du ${w} : ${n} imprévus dont ${mauvais} mauvais`);
      }
      // une partie qui reste régulière est exactement celle d'avant l'allure
      const trace = (l) => ({ imp: l.imp, objectifs: l.objectifs, niveaux: l.niveaux, hameau: l.hameau, familles: l.familles, recoltes: l.recoltes });
      if (!suite.includes('r') && !suite.includes('P')) assert.deepEqual(trace(avec), trace(sans), qui);
      // le premier niveau ne bouge que de quelques jours (mesuré : pas du tout), le nombre de niveaux d'un au plus ; au
      // ralenti, voir le test suivant
      if (!suite.includes('r')) {
        if (sans.niveaux[0] !== undefined) assert.ok(Math.abs(avec.niveaux[0] - sans.niveaux[0]) <= 4, `${qui} : premier niveau au jour ${avec.niveaux[0]} contre ${sans.niveaux[0]}`);
        assert.ok(Math.abs(avec.niveaux.length - sans.niveaux.length) <= 1, `${qui} : ${avec.niveaux.length} niveaux contre ${sans.niveaux.length}`);
      }
      // au ralenti, l'objectif réduit n'arrive jamais plus tard, et celui d'hiver est atteint avant la fin de l'hiver
      for (const cle of ['automne-2026', 'hiver-2026']) if (avec.objectifs[cle] && sans.objectifs[cle]) assert.ok(avec.objectifs[cle] <= sans.objectifs[cle], `${qui}, ${cle}`);
      if (suite.endsWith('r')) assert.ok(avec.objectifs['hiver-2026'], `${qui} : objectif d'hiver réduit pas atteint`);
    }
  }
});

// Au ralenti, un seul imprévu par semaine : le joueur lent perd aussi le second créneau, presque toujours bon pour lui (un
// mauvais sans rien à toucher devient bon). Mesuré le 7 octobre 2026 : le joueur très lent parti le 1er juillet a son premier
// niveau au jour 85 au lieu de 57 ; parti le 7 octobre, au jour 53 au lieu de 49. Garder les deux créneaux, tous deux bons,
// le ramène aux jours 57 et 49. Décision d'Alex attendue (tasks/todo.md, lot A).
test('(k) au ralenti, le premier niveau ne recule que de quelques jours', { todo: 'jour 85 contre 57 pour le joueur très lent parti le 1er juillet : décision d’Alex attendue' }, () => {
  const sansAllure = (f) => { const avant = { ...ALLURE }; ALLURE.ralenti = -1; ALLURE.plein = Infinity; try { return f(); } finally { Object.assign(ALLURE, avant); } };
  for (const rythme of [tresLent, lent]) {
    for (const [debut, marchand] of [['2026-07-01', 'avise'], ['2026-10-07', false]]) {
      const options = { profil: quetes, imprevus: 'attend', hiver: 'quetes', marchand };
      const jours = daysBetween(debut, '2027-03-01');
      const avec = simuler(debut, jours, rythme, options);
      const sans = sansAllure(() => simuler(debut, jours, rythme, options));
      assert.ok(Math.abs(avec.niveaux[0] - sans.niveaux[0]) <= 4, `départ ${debut} : premier niveau au jour ${avec.niveaux[0]} contre ${sans.niveaux[0]}`);
      assert.ok(Math.abs(avec.niveaux.length - sans.niveaux.length) <= 1, `départ ${debut} : ${avec.niveaux.length} niveaux contre ${sans.niveaux.length}`);
    }
  }
});
