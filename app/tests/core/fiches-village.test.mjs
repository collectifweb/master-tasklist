// Fiches des bâtiments du rang Village (lot B) : « Ce que ça fait » lit ses valeurs au cœur ; « Maintenant » dit ce qu'un
// producteur a donné aujourd'hui, la cabane à sucre hors saison, la réserve pleine ; celui de la tour, la tempête annoncée.
// Depuis le lot J, la visite du jour fait produire ; le P.-S. de la lettre du matin dit ce qu'elle a donné.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRODUCTION, TOUR_ANNONCE, TEMPETE, completeQuest, stockage, tempetesDeLHiver, addDays, daysBetween, isTruce, PAS_IDS, SIROP,
  openApp, advanceTime, construire, EOLIENNE_ENERGIE,
} from '../../core/index.js';
import { fresh, step, task, avantLeChalet } from './helpers.mjs';

// Les modules d'interface lisent `document.baseURI` à l'import et leurs textes dans content/ (comme loadContent).
globalThis.document = { baseURI: 'file:///app/' };
const { content, t } = await import('../../js/content.js');
const lire = (f) => JSON.parse(readFileSync(new URL(`../../content/fr-CA/${f}`, import.meta.url), 'utf8'));
content.ui = lire('interface.json');
for (const [groupe, textes] of Object.entries(lire('batiments.json'))) for (const [k, v] of Object.entries(textes)) content.ui[`bat.${groupe}.${k}`] = v;
const { batimentModel, psProduction } = await import('../../js/ui/batiment.js');
const { batimentEtat } = await import('../../world/texts.js');
const { batimentsView } = await import('../../world/view.js');

const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const nb = (s) => s.replace(/ /g, ' ');
const VILLAGE = ['tour', 'scierie', 'poulailler', 'cabane'];
const monde = (types, day = '2026-10-06') => {
  const w = fresh(Array.from({ length: 3 }, (_, k) => task({ id: `q${k}`, created: '2026-10-01' })), at(day));
  avantLeChalet(w.game);
  w.game.habitants = 6;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-01-01']));
  w.game.resources = { energy: 10, materials: 10, food: 5 };
  w.game.batiments = [{ id: 'atelier-1', type: 'atelier' }, ...types.map((type) => ({ id: `${type}-1`, type }))];
  return w;
};
// ce que fait l'interface à l'ouverture (openApp, puis le passage du temps), et après une quête terminée
const visite = (w, day, h = 14) => step(step(w, openApp, {}, at(day, h)).world, advanceTime, {}, at(day, h)).world;
const quete = (w, id, now) => step(step(w, completeQuest, { id }, now).world, advanceTime, {}, now).world;
const fiche = (w, id, day) => {
  const m = batimentModel({ tasks: w.tasks, game: w.game, ledger: w.ledger, now: new Date(at(day, 16)) }, id);
  return { ...m, fait: nb(m.fait), maintenant: nb(m.maintenant), quoi: nb(m.quoi) };
};

test('textes : les quatre fiches ont toutes leurs lignes, bâties ou non ; aucune clé ne reste brute', () => {
  const D = '2026-10-06';
  for (const id of VILLAGE) {
    for (const w of [monde([]), monde(VILLAGE)]) {
      const m = fiche(w, `${id}-1`, D);
      for (const k of ['nom', 'quoi', 'fait', 'maintenant']) assert.ok(m[k] && !m[k].startsWith('bat.') && !m[k].includes('{'), `${id} ${k} : ${m[k]}`);
    }
  }
  assert.equal(fiche(monde([]), 'cabane-1', D).nom, 'Emplacement de la cabane à sucre');
  assert.equal(fiche(monde([]), 'tour-1', D).maintenant, 'Coûte 4 Énergie et 30 Matériaux.');
});

test('ce que ça fait : les valeurs viennent du cœur', () => {
  const w = monde(VILLAGE);
  assert.equal(fiche(w, 'tour-1', '2026-10-06').fait, `L’hiver, les tempêtes de neige s’annoncent jusqu’à ${TOUR_ANNONCE} jours d’avance au lieu de ${TEMPETE.annonce} : plus de temps pour rentrer le bois.`);
  assert.match(fiche(w, 'scierie-1', '2026-10-06').fait, new RegExp(`^${PRODUCTION.scierie.materials} Matériaux de plus`));
  assert.match(fiche(w, 'poulailler-1', '2026-10-06').fait, new RegExp(`^${PRODUCTION.poulailler.food} Nourriture de plus`));
  assert.match(fiche(w, 'cabane-1', '2026-10-06').fait, new RegExp(`du 1er mars au 30 avril, ${PRODUCTION.cabane.food} Nourriture`));
});

test('maintenant, producteurs : avant le premier passage du jour, la promesse ; la visite donne, sans quête', () => {
  const D = '2026-10-06';
  let w = monde(['scierie', 'poulailler']);
  assert.equal(fiche(w, 'scierie-1', D).maintenant, 'Elle sciera à ton prochain passage au village.');
  w = visite(w, D);
  assert.equal(w.ledger.filter((e) => e.type === 'reward').length, 0, 'aucune quête');
  assert.equal(fiche(w, 'scierie-1', D).maintenant, `Elle a scié aujourd’hui : ${PRODUCTION.scierie.materials} Matériaux de plus.`);
  assert.equal(fiche(w, 'poulailler-1', D).maintenant, `Les œufs du jour sont ramassés : ${PRODUCTION.poulailler.food} Nourriture de plus.`);
});

test('maintenant, bâti pendant la visite : il donne sa part du jour tout de suite', () => {
  const D = '2026-10-06';
  let w = visite(monde(['poulailler']), D);
  w.game.resources = { energy: 50, materials: 100, food: 5 };
  w = step(w, construire, { type: 'scierie' }, at(D, 15)).world;
  assert.equal(fiche(w, 'scierie-1', D).maintenant, `Elle a scié aujourd’hui : ${PRODUCTION.scierie.materials} Matériaux de plus.`);
});

test('maintenant, réserve pleine à la visite puis vidée : les œufs du jour attendent le prochain passage au village', () => {
  const D = '2026-10-06';
  const w0 = monde(['poulailler']);
  const max = stockage(w0.game);
  w0.game.resources.food = max;
  let w = visite(w0, D);
  assert.equal(fiche(w, 'poulailler-1', D).maintenant, `La réserve est pleine (${max} sur ${max}) : rien n’entre aujourd’hui tant qu’elle le reste.`);
  w.game.resources.food = max - 5; // une famille accueillie entre-temps
  assert.equal(fiche(w, 'poulailler-1', D).maintenant, 'Les œufs du jour seront ramassés à ton prochain passage au village.');
  w = quete(w, 'q0', at(D, 16));
  assert.equal(fiche(w, 'poulailler-1', D).maintenant, `Les œufs du jour sont ramassés : ${PRODUCTION.poulailler.food} Nourriture de plus.`);
});

test('maintenant, réserve pleine : rien n’entre ; la scierie, elle, n’est pas concernée', () => {
  const D = '2026-10-06';
  const w = monde(['scierie', 'poulailler']);
  w.game.resources.food = stockage(w.game);
  const max = stockage(w.game);
  assert.equal(fiche(w, 'poulailler-1', D).maintenant, `La réserve est pleine (${max} sur ${max}) : rien n’entre aujourd’hui tant qu’elle le reste.`);
  assert.equal(fiche(w, 'scierie-1', D).maintenant, 'Elle sciera à ton prochain passage au village.');
});

test('maintenant, cabane à sucre : elle dort hors saison, même réserve pleine ; au temps des sucres, elle promet puis donne', () => {
  const w = monde(['cabane'], '2027-02-20');
  assert.equal(fiche(w, 'cabane-1', '2027-02-20').maintenant, 'Elle dort jusqu’au temps des sucres, le 1er mars.');
  w.game.resources.food = stockage(w.game);
  assert.equal(fiche(w, 'cabane-1', '2027-02-20').maintenant, 'Elle dort jusqu’au temps des sucres, le 1er mars.');
  const m = monde(['cabane'], '2027-03-16');
  assert.equal(fiche(m, 'cabane-1', '2027-03-16').maintenant, 'C’est le temps des sucres : elle bouillira à ton prochain passage au village.');
  const apres = visite(m, '2027-03-16');
  assert.equal(fiche(apres, 'cabane-1', '2027-03-16').maintenant, `Elle a bouilli aujourd’hui : ${PRODUCTION.cabane.food} Nourriture de plus.`);
  // sur la carte et dans la liste
  const etat = (w2, day) => nb(batimentEtat(t, batimentsView(w2.game, w2.ledger, new Date(at(day))).find((b) => b.type === 'cabane')));
  assert.equal(etat(w, '2027-02-20'), 'dort jusqu’en mars');
  assert.equal(etat(m, '2027-03-16'), 'temps des sucres');
});

test('maintenant, cabane à sucre et sirop (lot N) : réserve pleine, le sirop part au marchand s’il y a le quai', () => {
  const D = '2027-03-16';
  const avec = monde(['cabane', 'quai'], D);
  const max = stockage(avec.game);
  avec.game.resources.food = max;
  assert.equal(fiche(avec, 'cabane-1', D).maintenant, `La réserve est pleine (${max} sur ${max}) : à ton prochain passage au village, le sirop partira au marchand.`);
  const sans = monde(['cabane'], D);
  sans.game.resources.food = max;
  assert.equal(fiche(sans, 'cabane-1', D).maintenant, `La réserve est pleine (${max} sur ${max}) : rien n’entre aujourd’hui. Avec le quai rebâti, le marchand achèterait le sirop.`);
  const tout = visite(avec, D);
  assert.equal(fiche(tout, 'cabane-1', D).maintenant, `Elle a bouilli aujourd’hui : la réserve était pleine, tout le sirop est vendu au marchand pour ${PRODUCTION.cabane.food * SIROP.energie} Énergie.`);
  const part = monde(['cabane', 'quai'], D);
  part.game.resources.food = max - 1;
  const reste = visite(part, D);
  assert.equal(fiche(reste, 'cabane-1', D).maintenant, `Elle a bouilli aujourd’hui : 1 Nourriture de plus, et le sirop qui ne rentrait pas est vendu au marchand pour ${Math.round((PRODUCTION.cabane.food - 1) * SIROP.energie)} Énergie.`); // l'écran montre des entiers
});

test('P.-S. de la lettre du matin (lot J) : ce que la visite a fait produire, en une phrase ; rien sans producteur', () => {
  const D = '2026-10-06';
  const ps = (w, day = D) => { const s = psProduction(w.ledger, day); return s && nb(s); };
  assert.equal(ps(visite(monde([]), D)), null);
  assert.equal(ps(monde(['eolienne', 'scierie'])), null, 'avant la visite');
  assert.equal(ps(visite(monde(['eolienne']), D)), `P.-S. Le village a déjà fait sa part aujourd’hui : ${EOLIENNE_ENERGIE} Énergie de l’éolienne.`);
  assert.equal(ps(visite(monde(['eolienne', 'scierie', 'poulailler']), D)), `P.-S. Le village a déjà fait sa part aujourd’hui : ${EOLIENNE_ENERGIE} Énergie de l’éolienne, `
    + `${PRODUCTION.scierie.materials} Matériaux de la scierie et ${PRODUCTION.poulailler.food} Nourriture du poulailler.`);
  // au temps des sucres, réserve pleine et quai : tout le sirop part au marchand
  const S = '2027-03-16';
  const w = monde(['cabane', 'quai'], S);
  w.game.resources.food = stockage(w.game);
  assert.equal(ps(visite(w, S), S), `P.-S. Le village a déjà fait sa part aujourd’hui : ${PRODUCTION.cabane.food * SIROP.energie} Énergie du sirop vendu au marchand.`);
});

test('maintenant, tour de guet : la tempête annoncée, 6 jours d’avance ; rien en vue sinon', () => {
  const A = TOUR_ANNONCE;
  let j = null;
  for (let y = 2026; y <= 2100 && !j; y++) {
    const s = tempetesDeLHiver(`${y}-12-01`);
    j = s.find((x, i) => (!i || daysBetween(s[i - 1], x) >= A + 2) && ![...Array(A + 2).keys()].some((k) => isTruce(addDays(x, -k)))) || null;
  }
  const lire = (k) => fiche(monde(['tour'], addDays(j, -k)), 'tour-1', addDays(j, -k)).maintenant;
  assert.equal(lire(A + 1), 'Elle guette le lac : aucune tempête de neige en vue.');
  assert.equal(lire(A), `Tempête de neige annoncée dans ${A} jours.`);
  assert.equal(lire(1), 'Tempête de neige annoncée pour demain.');
  assert.equal(lire(0), 'La tempête de neige, c’est aujourd’hui.');
});
