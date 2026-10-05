// Simulation d'équilibrage (lot 4) : un joueur simulé ouvre l'app chaque jour, termine 2 ou 3 quêtes ordinaires, puis
// fait ce qu'un joueur appliqué ferait (récolter, accueillir, bâtir, semer). Elle prouve :
//  (a) qu'à rythme régulier on atteint le Hameau en 21 jours environ ;
//  (b) qu'un village qui démarre le 25 octobre, avec le seul campement, n'est jamais bloqué l'hiver : la petite serre
//      nourrit, et une famille arrive avant le printemps, même à une quête par jour ;
//  (c) qu'aucun stock ne devient négatif ;
//  (d) (lot 5) qu'un joueur qui suit le bandeau d'objectifs atteint les cinq premiers pas sans impasse, et que la
//      première famille arrive vers le 6e jour, au départ du 25 octobre comme du 15 décembre.
// Quêtes fictives génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openApp, completeQuest, construire, semer, recolter, accueillir, refusConstruire, refusSemer, refusRecolter,
  refusAccueillir, batimentsDuVillage, logements, stockage, BATIMENTS, ACCUEIL_NOURRITURE, STOCKAGE, addDays, rangDuVillage,
  prochainGeste, PAS_IDS,
} from '../../core/index.js';
import { fresh, step } from './helpers.mjs';

const DOMAINS = ['Maison', 'Terrain', 'Enfants', 'Véhicule', 'Administratif'];
// quêtes ordinaires : courtes à moyennes, priorité moyenne (≈ 3 Énergie et 5 Matériaux chacune)
const quetes = (n) => Array.from({ length: n }, (_, k) => ({
  id: `s${k}`, task: `Quête ordinaire ${k}`, domain: DOMAINS[k % 5],
  difficulty: 3 + (k % 3), length: 2 + (k % 3), priority: 4 + (k % 3), status: 'todo', created: '2026-01-01', deadline: null,
}));
const heure = (day, h, m = 0) => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;

/**
 * Joue `jours` jours à partir de `debut`. rythme(i) = quêtes terminées le i-e jour. Après chaque geste, vérifie (c).
 * bandeau : tant que les premiers pas durent, le joueur fait le geste que le bandeau propose (prochainGeste) dès qu'il
 * le peut, et rien d'autre ; au pas « famille », il fait tout ce qui aide à nourrir. Sinon, il fait tout ce qui est
 * possible, dans l'ordre ci-dessous.
 * Renvoie le journal : { hameau (jour d'arrivée, ou null), familles: [jours], recoltes: [jours], plein (jour où tous les
 * logements possibles sont habités, ou null), pas: { id: n° du jour atteint }, premiereFamille (n° du jour), monde }.
 */
function simuler(debut, jours, rythme, { jusquAuHameau = false, bandeau = false } = {}) {
  let w = fresh(quetes(jours * 3 + 10), heure(debut, 12));
  const log = { hameau: null, familles: [], recoltes: [], plein: null, pas: {}, premiereFamille: null, monde: null };
  const logementsMax = BATIMENTS.chalet.max * BATIMENTS.chalet.loge;
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
        if (w.game.habitants >= logementsMax) log.plein = day;
        continue;
      }
      if (!logements(w.game).libres && !refusConstruire(w.game, 'chalet')) { geste(construire, { type: 'chalet' }, soir); continue; }
      const libre = cultures.find((id) => !refusSemer(w.game, w.ledger, id, soir));
      if (libre) { geste(semer, { id: libre }, soir); continue; }
      const bat = ['parcelle', 'atelier', 'serre'].find((t) => !refusConstruire(w.game, t));
      if (bat) { geste(construire, { type: bat }, soir); continue; }
      break;
    }
    if (jusquAuHameau && log.hameau) break;
  }
  log.monde = w;
  return log;
}

const regulier = (i) => (i % 2 ? 3 : 2); // 2 ou 3 quêtes par jour, 2,5 en moyenne

test('(a) à rythme régulier, le Hameau arrive en 21 jours environ, en été comme à l’automne', () => {
  for (const debut of ['2026-06-01', '2026-08-15', '2026-10-06']) {
    const { hameau } = simuler(debut, 40, regulier, { jusquAuHameau: true });
    assert.ok(hameau >= 17 && hameau <= 25, `départ ${debut} : Hameau au jour ${hameau}`);
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
  assert.equal(log.monde.game.habitants, BATIMENTS.chalet.max * BATIMENTS.chalet.loge);
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
