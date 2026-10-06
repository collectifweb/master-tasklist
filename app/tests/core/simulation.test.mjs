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
// (g) (lot R2) le rythme mesuré sur l'essai d'Alex (24 jours : 17 à une quête, 4 à deux, 3 sans ; toutes à priorité 5,
//     longueur 2, difficulté 3, soit 7 points), avec les prix inversés (n × 100 Énergie, n × 75 Matériaux) et la semaine
//     tenue (SEMAINE_TENUE.materials, quartiers.js, réglée ici). Le joueur joue comme en (f). La cible « premier niveau
//     vers le jour 21 » ne tient pas : voir le dernier test, marqué « todo » avec ses chiffres.
// Quêtes fictives génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openApp, completeQuest, construire, semer, recolter, accueillir, refusConstruire, refusSemer, refusRecolter,
  refusAccueillir, batimentsDuVillage, logements, stockage, BATIMENTS, ACCUEIL_NOURRITURE, STOCKAGE, addDays, rangDuVillage,
  prochainGeste, PAS_IDS, cappedPe, monterQuartier, refusMonter, niveauDe, placesParChalet, QUARTIER_IDS,
  SEMAINE_TENUE, coutNiveau, createInitialState,
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
 * niveaux: [n° du jour de chaque niveau acheté], monde }.
 */
function simuler(debut, jours, rythme, { jusquAuHameau = false, bandeau = false, profil = quetes, niveaux = true } = {}) {
  let w = fresh(profil(jours * 3 + 10), heure(debut, 12));
  const log = { hameau: null, familles: [], recoltes: [], plein: null, pas: {}, premiereFamille: null, niveaux: [], monde: null };
  let n = 0;
  let i = 0;
  const geste = (fn, params, now) => {
    const s = step(w, fn, params, now);
    w = s.world;
    for (const e of s.r.events) if (e.type === 'premier-pas') log.pas[e.id] = i + 1;
    const { energy, materials, food } = w.game.resources;
    assert.ok(energy >= 0 && materials >= 0 && food >= 0 && w.game.habitants >= 0, `stock négatif le ${now} : ${JSON.stringify(w.game.resources)}`);
    assert.ok(food <= stockage(w.game), `Nourriture au-dessus du stockage le ${now}`);
  };
  for (i = 0; i < jours; i++) {
    const day = addDays(debut, i);
    geste(openApp, {}, heure(day, 12));
    for (let k = 0; k < rythme(i); k++) geste(completeQuest, { id: `s${n++}` }, heure(day, 14 + k));
    // le soir : le joueur fait tout ce qui est possible, dans un ordre raisonnable
    const soir = heure(day, 22);
    for (let guard = 0; guard < 20; guard++) {
      const cultures = batimentsDuVillage(w.game).filter((b) => BATIMENTS[b.type].culture).map((b) => b.id);
      const mure = cultures.find((id) => !refusRecolter(w.game, w.ledger, id, soir));
      if (mure) { geste(recolter, { id: mure }, soir); log.recoltes.push(day); continue; }
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
      const bat = ['parcelle', 'atelier', 'serre'].find((t) => !refusConstruire(w.game, t));
      if (bat) { geste(construire, { type: bat }, soir); continue; }
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
    assert.deepEqual(Object.keys(log.pas), PAS_IDS, `${debut} : premiers pas ${JSON.stringify(log.pas)}`);
    // dans l'ordre : chaque pas le même jour que le précédent ou après
    for (let k = 1; k < PAS_IDS.length; k++) assert.ok(log.pas[PAS_IDS[k]] >= log.pas[PAS_IDS[k - 1]], `${debut} : ${JSON.stringify(log.pas)}`);
    // un coup de pouce, pas un cadeau : ni le premier soir, ni plus tard que le 7e jour
    assert.ok(log.premiereFamille >= 5 && log.premiereFamille <= 7, `${debut} : première famille au jour ${log.premiereFamille}`);
    assert.equal(log.pas.famille, log.premiereFamille);
  }
  // à une quête par jour aussi, le bandeau ne mène jamais à une impasse
  for (const debut of ['2026-10-25', '2026-12-15']) {
    const log = simuler(debut, 30, () => 1, { bandeau: true });
    assert.deepEqual(Object.keys(log.pas), PAS_IDS, `${debut}, une quête par jour : ${JSON.stringify(log.pas)}`);
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

// 24 jours : 17 à une quête, 4 à deux, 3 sans, répartis à intervalles à peu près égaux (le 3 octobre est un jour sans quête).
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
  const log = simuler('2026-10-23', 24, rythmeEssai, { profil: parDefaut });
  const gains = log.monde.ledger.filter((e) => e.type === 'reward');
  assert.equal(gains.length, 25);
  assert.equal(new Set(gains.map((e) => e.day)).size, 21);
  assert.ok(gains.every((e) => e.pe === 7), JSON.stringify(gains.map((e) => e.pe)));
});

test('(g) au rythme de l’essai : un niveau est acheté dans les 16 semaines, presque toutes les semaines sont tenues', (t) => {
  const f = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  for (const debut of ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']) {
    const log = simuler(debut, 16 * 7, rythmeEssai, { profil: parDefaut });
    const r = log.monde.game.resources;
    const tenues = log.monde.ledger.filter((e) => e.type === 'semaine').length;
    t.diagnostic(`(g) ${debut} : niveaux aux jours ${log.niveaux.join(', ')}, permis en main ${log.monde.game.permis.dispo}, `
      + `${f(r.energy)} Énergie et ${f(r.materials)} Matériaux, ${tenues} semaines tenues sur 16`);
    assert.ok(log.niveaux.length >= 1 && log.niveaux[0] <= 60, `${debut} : premier niveau au jour ${log.niveaux[0]} (garde-fou, pas la cible)`);
    assert.ok(tenues >= 14, `${debut} : ${tenues} semaines tenues sur 16`);
  }
});

test('(g) au-delà du montant réglé de la semaine tenue, un bonus plus gros ne change aucun jour d’achat', () => {
  // 12 est le plus petit entier qui donne, aux quatre départs de (g) et aux deux de (f), les mêmes jours d'achat qu'un bonus de
  // 30 (mesuré le 6 octobre : 11 retarde d'un jour le premier niveau du départ du 25 octobre). Au-delà, l'Énergie, pas les
  // Matériaux, décide du jour des niveaux.
  const sauve = SEMAINE_TENUE.materials;
  const jours = (debut, profil, rythme) => simuler(debut, 16 * 7, rythme, { profil }).niveaux;
  try {
    for (const debut of ['2026-10-23', '2026-10-25', '2026-08-15', '2026-06-01']) {
      const regle = jours(debut, parDefaut, rythmeEssai);
      SEMAINE_TENUE.materials = 30;
      assert.deepEqual(jours(debut, parDefaut, rythmeEssai), regle, `${debut} : (g) change avec un bonus de 30`);
      SEMAINE_TENUE.materials = sauve;
    }
    for (const debut of ['2026-10-25', '2026-06-01']) {
      const regle = jours(debut, quetes, regulier);
      SEMAINE_TENUE.materials = 30;
      assert.deepEqual(jours(debut, quetes, regulier), regle, `${debut} : (f) change avec un bonus de 30`);
      SEMAINE_TENUE.materials = sauve;
    }
  } finally { SEMAINE_TENUE.materials = sauve; }
});

// CIBLE NON TENUE, signalée et non élargie : le premier niveau « vers le jour 21 (18 à 24) » au rythme de l'essai.
// Mesuré avec les prix d'Alex (100 Énergie, 75 Matériaux) et 12 Matériaux de semaine tenue : jour 42 (départ du 23 octobre),
// 50 (25 octobre), 54 (15 août), 56 (1er juin) ; sans bonus : 42, 42, 55, 56. Cause : l'Énergie. Une quête de 7 points rend
// 2,1 Énergie ; à ce rythme, 25 quêtes en 24 jours et 1 Énergie d'ouverture par jour font moins que les 100 Énergie du
// premier niveau, même sans rien semer ni bâtir. Le test garde la cible : il passera quand l'économie le permettra.
test('(g) cible : premier niveau entre les jours 18 et 24 au rythme de l’essai', { todo: 'cible non tenue : l’Énergie (voir le commentaire)' }, (t) => {
  const log = simuler('2026-10-23', 16 * 7, rythmeEssai, { profil: parDefaut });
  t.diagnostic(`premier niveau au jour ${log.niveaux[0]}`);
  assert.ok(log.niveaux[0] >= 18 && log.niveaux[0] <= 24, `premier niveau au jour ${log.niveaux[0]}`);
});

test('(g) preuve de la cause : en 24 jours, ce joueur gagne moins d’Énergie que le prix du niveau 1, même s’il n’en dépensait aucune', () => {
  const log = simuler('2026-10-23', 24, rythmeEssai, { profil: parDefaut });
  const gagnee = log.monde.ledger.reduce((s, e) => s + (e.energy || 0), 0) + createInitialState('2026-10-23T12:00:00Z').resources.energy;
  assert.ok(gagnee < coutNiveau(1).energy, `${gagnee} Énergie gagnée, stock de départ compris, pour ${coutNiveau(1).energy} au niveau 1`);
});
