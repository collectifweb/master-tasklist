// Simulation d'équilibrage (lot 4) : un joueur simulé ouvre l'app chaque jour, termine 2 ou 3 quêtes ordinaires, puis
// fait ce qu'un joueur appliqué ferait (récolter, accueillir, bâtir, semer). Elle prouve :
//  (a) qu'à rythme régulier on atteint le Hameau en 21 jours environ ;
//  (b) qu'un village qui démarre le 25 octobre, avec le seul campement, n'est jamais bloqué l'hiver : la petite serre
//      nourrit, et une famille arrive avant le printemps, même à une quête par jour ;
//  (c) qu'aucun stock ne devient négatif.
// Quêtes fictives génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openApp, completeQuest, construire, semer, recolter, accueillir, refusConstruire, refusSemer, refusRecolter,
  refusAccueillir, batimentsDuVillage, logements, stockage, BATIMENTS, ACCUEIL_NOURRITURE, STOCKAGE, addDays, rangDuVillage,
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
 * Renvoie le journal : { hameau (jour d'arrivée, ou null), familles: [jours], recoltes: [jours], plein (jour où tous les
 * logements possibles sont habités, ou null), monde }.
 */
function simuler(debut, jours, rythme, { jusquAuHameau = false } = {}) {
  let w = fresh(quetes(jours * 3 + 10), heure(debut, 12));
  const log = { hameau: null, familles: [], recoltes: [], plein: null, monde: null };
  const logementsMax = BATIMENTS.chalet.max * BATIMENTS.chalet.loge;
  let n = 0;
  const geste = (fn, params, now) => {
    w = step(w, fn, params, now).world;
    const { energy, materials, food } = w.game.resources;
    assert.ok(energy >= 0 && materials >= 0 && food >= 0 && w.game.habitants >= 0, `stock négatif le ${now} : ${JSON.stringify(w.game.resources)}`);
    assert.ok(food <= stockage(w.game), `Nourriture au-dessus du stockage le ${now}`);
  };
  for (let i = 0; i < jours; i++) {
    const day = addDays(debut, i);
    geste(openApp, {}, heure(day, 12));
    for (let k = 0; k < rythme(i); k++) geste(completeQuest, { id: `s${n++}` }, heure(day, 14 + k));
    // le soir : le joueur fait tout ce qui est possible, dans un ordre raisonnable
    const soir = heure(day, 22);
    for (let guard = 0; guard < 20; guard++) {
      const cultures = batimentsDuVillage(w.game).filter((b) => BATIMENTS[b.type].culture).map((b) => b.id);
      const mure = cultures.find((id) => !refusRecolter(w.game, w.ledger, id, soir));
      if (mure) { geste(recolter, { id: mure }, soir); log.recoltes.push(day); continue; }
      if (!refusAccueillir(w.game)) {
        geste(accueillir, {}, soir);
        log.familles.push(day);
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
