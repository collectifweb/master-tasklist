// Réserve pleine (décision d'Alex du 7 octobre 2026 au soir) : une culture mûre se récolte même quand la réserve de Nourriture
// est pleine ; ce qui ne tient pas est perdu, la place se libère. L'hiver, la récolte de serre compte quand même pour
// « Garder la serre allumée » : avant, un village plein à la réserve pleine ne pouvait plus l'atteindre (simulation (k)).
// La fiche prévient avant le geste. Aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recolter, refusRecolter, stockage, recoltesHiver, recolteDe, addDays } from '../../core/index.js';
import { fresh, step, avantLeChalet } from './helpers.mjs';

// Les modules d'interface lisent `document.baseURI` à l'import et leurs textes dans content/ (comme loadContent).
globalThis.document = { baseURI: 'file:///app/' };
const { content } = await import('../../js/content.js');
const lire = (f) => JSON.parse(readFileSync(new URL(`../../content/fr-CA/${f}`, import.meta.url), 'utf8'));
content.ui = lire('interface.json');
for (const [groupe, textes] of Object.entries(lire('batiments.json'))) for (const [k, v] of Object.entries(textes)) content.ui[`bat.${groupe}.${k}`] = v;
const { batimentModel } = await import('../../js/ui/batiment.js');

const at = (day, h = 15) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const nb = (s) => s.replace(/ /g, ' ');
const paye = (day, k) => ({ key: `reward:t-${day}-${k}:1`, type: 'reward', taskId: `t-${day}-${k}`, occurrence: 1, day, at: at(day), pe: 7, energy: 3, materials: 5 });

// Village plein l'hiver : serre mûre, réserve pleine, deux quêtes payées par jour (allure « régulier »).
function hiver(day, food) {
  const w = fresh([], at(day));
  avantLeChalet(w.game);
  w.game.premiersPas.chalet = '2026-10-05';
  w.game.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'atelier-1', type: 'atelier' }, { id: 'serre-1', type: 'serre' }];
  w.game.habitants = 3;
  w.game.resources = { energy: 40, materials: 40, food: food ?? stockage(w.game) };
  const semeLe = addDays(day, -10);
  w.game.parcelles = [{ id: 'serre-1', semeLe }];
  w.ledger = Array.from({ length: 40 }, (_, k) => addDays(day, k - 39)).flatMap((d) => [paye(d, 'a'), paye(d, 'b')]);
  return w;
}

test('l’hiver, réserve pleine : la serre se récolte, rien n’entre, et la récolte compte pour l’objectif d’hiver', () => {
  const w = hiver('2027-01-12');
  assert.equal(refusRecolter(w.game, w.ledger, 'serre-1', at('2027-01-12')), null);
  const { world, r } = step(w, recolter, { id: 'serre-1' }, at('2027-01-12'));
  assert.equal(world.game.resources.food, stockage(w.game));
  assert.equal(r.events[0].nourriture, 0);
  assert.equal(recoltesHiver(world.game, 'hiver-2026'), 1);
});

test('la fiche prévient avant le geste : place pour tout, pour une part, ou réserve pleine (l’hiver, la serre compte quand même)', () => {
  const day = '2027-01-12';
  const fiche = (food) => { const w = hiver(day, food); return batimentModel({ game: w.game, ledger: w.ledger, now: at(day) }, 'serre-1'); };
  const max = stockage(hiver(day).game);
  const n = recolteDe(hiver(day).game, 'serre');
  const vide = fiche(0);
  assert.equal(nb(vide.maintenant), `C’est mûr : ${n} Nourriture à récolter.`);
  assert.equal(vide.raison, null);
  const part = fiche(max - 2);
  assert.equal(nb(part.maintenant), `C’est mûr : ${n} Nourriture. La réserve n’a de place que pour 2 : le reste serait perdu.`);
  assert.equal(part.raison, null);
  const plein = fiche(max);
  assert.equal(nb(plein.maintenant), `C’est mûr : ${n} Nourriture, mais la réserve est pleine (${max} sur ${max}) : tout serait perdu. La récolte compte quand même pour « Garder la serre allumée ».`);
  assert.equal(plein.raison, null);
  assert.equal(plein.geste.action, 'recolter');
  // hors de l'hiver, la même serre pleine : la place se libère pour semer
  const automne = (() => { const w = hiver('2026-10-20'); return batimentModel({ game: w.game, ledger: w.ledger, now: at('2026-10-20') }, 'serre-1'); })();
  assert.equal(nb(automne.maintenant), `C’est mûr : ${n} Nourriture, mais la réserve est pleine (${max} sur ${max}) : tout serait perdu. Récolter libère la place pour semer.`);
});
