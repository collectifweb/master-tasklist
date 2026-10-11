// La vraie météo (lot Q, plan validé par Alex le 11 octobre 2026 ; bible, décision 46). La ville du joueur dans les
// réglages ; le serveur lit la prévision d'Open-Meteo une fois par jour et l'envoie avec la partie. Au passage du temps,
// un jour où la prévision donne au moins 3 cm de neige, de demain jusqu'au dernier jour d'annonce, devient une tempête,
// notée dans la partie : elle ne bouge plus, même si la prévision change. Toute l'année, hors trêve, à 7 jours au moins
// de toute autre tempête. Prévision absente, vieille ou d'une autre ville : le tirage d'après la date propose les jours.
// Sans ville, rien ne change. Ville et prévision fictives, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  METEO, reglerVille, villeDe, TEMPETE, tempetesDeLHiver, estJourDeTempete, debutAnnonce, alerteTempete, preparation,
  refusPreparer, preparer, advanceTime, calendrierImprevus, PAS_IDS, addDays, isTruce,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 9 ou 10 h à Montréal : toujours le jour de jeu indiqué.
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const VILLE = Object.freeze({ nom: 'Village-Test', region: 'Région fictive', pays: 'Pays fictif', lat: 46.5, lon: -73.5 });
const EOLIENNE = { id: 'eolienne-1', type: 'eolienne' };
const TOUR = { id: 'tour-1', type: 'tour' };
const CHALETS = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }];
// Le tirage de l'hiver 2026-2027 commence par le 25 novembre, puis le 7 et le 17 décembre.
const TIRAGE = tempetesDeLHiver('2026-12-01');

// Prévision de 16 jours à partir de `day`, sans neige sauf `neiges` ({ jour: cm }), lue le jour même par défaut.
function prevision(day, neiges = {}, { lat = VILLE.lat, lon = VILLE.lon, lue = at(day, 12) } = {}) {
  const jours = {};
  for (let k = 0; k < 16; k++) jours[addDays(day, k)] = 0;
  return { lat, lon, lue, jours: { ...jours, ...neiges } };
}
// Un jour travaillé : une quête payée ce jour-là (forme du registre, quête fictive).
const paye = (day, id = 'x') => ({ key: `reward:${id}-${day}:1`, at: at(day), day, type: 'reward', taskId: `${id}-${day}`, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });

// Village sorti des premiers pas, vu la veille de `day`, avec la ville réglée (sauf `ville: null`). Les imprévus de la
// semaine sont déjà tirés (clés seules) : seules les tempêtes jouent.
function village(day, { ville = VILLE, ...over } = {}, ledger = []) {
  const w = fresh([task({ id: 'q-terrain', domain: 'Terrain' })], at(day));
  w.game.resources = { energy: 50, materials: 50, food: 10 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-01-01']));
  w.game.batiments = [...CHALETS];
  w.game.lastSeenDay = addDays(day, -1);
  w.game.lastOpenDay = addDays(day, -1);
  if (ville) w.game.reglages = { ville: { ...ville } };
  Object.assign(w.game, over);
  w.ledger = [...ledger, ...calendrierImprevus(day).creneaux.map((c) => ({ key: `imprevu:${c.jour}` }))];
  return w;
}
const avance = (w, day, meteo) => step(w, advanceTime, meteo === undefined ? {} : { meteo }, at(day));
const notees = (game) => game.tempetes?.notees ?? [];

test('catalogue : 3 cm de neige prévue font une tempête ; une prévision sert 2 jours', () => {
  assert.equal(METEO.seuil, 3);
  assert.equal(METEO.vieille, 2);
});

test('sans ville : la prévision ne change rien, le calendrier reste le tirage', () => {
  const day = '2026-11-10';
  const w = village(day, { ville: null });
  const { world, r } = avance(w, day, prevision(day, { [addDays(day, 3)]: 20 }));
  assert.deepEqual(notees(world.game), []);
  assert.equal(world.game.tempetes, undefined, 'rien d’écrit dans la partie');
  assert.deepEqual(tempetesDeLHiver(day, world.game), TIRAGE);
  assert.equal(r.events.filter((e) => e.type === 'tempete').length, 0);
});

test('avec une ville : 3 cm prévus dans 3 jours font une tempête notée dans la partie, annoncée comme aujourd’hui ; le tirage ne joue plus', () => {
  const day = '2026-11-10';
  const J = addDays(day, 3);
  const { world } = avance(village(day), day, prevision(day, { [J]: 3 }));
  assert.deepEqual(notees(world.game), [{ jour: J, source: 'meteo', ville: VILLE.nom }]);
  assert.deepEqual(tempetesDeLHiver(day, world.game), [J], 'les jours du tirage (25 novembre…) ne sont plus des tempêtes');
  assert.equal(debutAnnonce(J, TEMPETE.annonce, world.game), day);
  const a = alerteTempete(world.tasks, world.game, world.ledger, at(day));
  assert.equal(a.jour, J);
  assert.equal(a.joursRestants, 3);
  assert.equal(a.debut, day);
  assert.equal(a.source, 'meteo');
  assert.equal(estJourDeTempete(J, world.game), true);
  assert.equal(estJourDeTempete(TIRAGE[0], world.game), false);
});

test('seuil : 2,9 cm ne font rien, 3 cm font une tempête', () => {
  const day = '2026-11-10';
  const J = addDays(day, 3);
  assert.deepEqual(notees(avance(village(day), day, prevision(day, { [J]: 2.9 })).world.game), []);
  assert.equal(notees(avance(village(day), day, prevision(day, { [J]: 3 })).world.game).length, 1);
});

test('fenêtre : de demain au dernier jour d’annonce (3 jours, 6 avec la tour de guet) ; jamais le jour même', () => {
  const day = '2026-11-10';
  // sans tour : une neige dans 4 jours attend le lendemain, puis se note à l'heure (sans début repoussé)
  let w = avance(village(day), day, prevision(day, { [addDays(day, 4)]: 10 })).world;
  assert.deepEqual(notees(w.game), []);
  w = avance(w, addDays(day, 1), prevision(addDays(day, 1), { [addDays(day, 4)]: 10 })).world;
  assert.deepEqual(notees(w.game), [{ jour: addDays(day, 4), source: 'meteo', ville: VILLE.nom }]);
  // avec la tour : 6 jours, pas 7
  const tour = { batiments: [...CHALETS, TOUR] };
  assert.deepEqual(notees(avance(village(day, tour), day, prevision(day, { [addDays(day, 6)]: 5 })).world.game), [{ jour: addDays(day, 6), source: 'meteo', ville: VILLE.nom }]);
  assert.deepEqual(notees(avance(village(day, tour), day, prevision(day, { [addDays(day, 7)]: 5 })).world.game), []);
  // le jour même : rien
  assert.deepEqual(notees(avance(village(day), day, prevision(day, { [day]: 30 })).world.game), []);
  // le premier jour de neige permis : un seul, le second est trop près
  assert.deepEqual(notees(avance(village(day, tour), day, prevision(day, { [addDays(day, 2)]: 4, [addDays(day, 5)]: 40 })).world.game), [{ jour: addDays(day, 2), source: 'meteo', ville: VILLE.nom, des: day }], 'notée 2 jours d’avance sur 6 : annoncée depuis aujourd’hui');
});

test('neige vue seulement la veille : annonce d’un jour, et la veille tous les crans manquants s’achètent', () => {
  const day = '2026-11-10';
  const J = addDays(day, 1);
  let w = avance(village(day), day, prevision(day, { [J]: 8 })).world;
  assert.deepEqual(notees(w.game), [{ jour: J, source: 'meteo', ville: VILLE.nom, des: day }], 'annoncée depuis aujourd’hui');
  assert.equal(debutAnnonce(J, TEMPETE.annonce, w.game), day);
  const a = alerteTempete(w.tasks, w.game, w.ledger, at(day));
  assert.equal(a.joursRestants, 1);
  assert.equal(a.debut, day);
  for (let n = 1; n <= TEMPETE.crans; n++) {
    assert.equal(refusPreparer(w.tasks, w.game, w.ledger, { jour: J, n }, at(day)), null, `cran ${n}`);
    w = step(w, preparer, { jour: J, n }, at(day)).world;
  }
  assert.equal(preparation(w.game, w.ledger, J, day).crans, TEMPETE.crans);
  const { r } = avance(w, J, prevision(J));
  assert.equal(r.entries.find((e) => e.key === `tempete:${J}`)?.resultat, 'tenue');
});

test('un jour travaillé avant la neige vue la veille ne remplit pas la barre : l’annonce part du jour où elle est notée', () => {
  const day = '2026-11-10';
  const J = addDays(day, 1);
  const w = avance(village(day, {}, [paye(addDays(day, -1))]), day, prevision(day, { [J]: 8 })).world;
  assert.equal(preparation(w.game, w.ledger, J, day).travailles, 0);
});

test('une tempête notée tient : la prévision change, la neige disparaît ou se déplace, elle reste ; aucune autre à moins de 7 jours, avant comme après', () => {
  const day = '2026-11-10';
  const J = addDays(day, 6);
  const tour = { batiments: [...CHALETS, TOUR] };
  let w = avance(village(day, tour), day, prevision(day, { [J]: 12 })).world;
  // le lendemain, plus de neige le jour J, mais 3 jours plus tôt et 3 jours plus tard
  const d1 = addDays(day, 1);
  w = avance(w, d1, prevision(d1, { [addDays(J, -3)]: 15, [addDays(J, 3)]: 15 })).world;
  assert.deepEqual(notees(w.game).map((t) => t.jour), [J]);
  assert.deepEqual(tempetesDeLHiver(d1, w.game), [J]);
  // une neige 7 jours après J se note quand elle entre dans l'annonce
  const d2 = addDays(J, 1);
  w = avance(w, d2, prevision(d2, { [addDays(J, 7)]: 5 })).world;
  assert.deepEqual(notees(w.game).map((t) => t.jour), [J, addDays(J, 7)]);
});

test('trêve des Fêtes : ni tempête pendant elle, ni annonce qui y commence', () => {
  // 22 décembre : dans la trêve
  assert.deepEqual(notees(avance(village('2026-12-19'), '2026-12-19', prevision('2026-12-19', { '2026-12-22': 20 })).world.game), []);
  // 6 janvier : son annonce de 3 jours commencerait le 3, dans la trêve
  assert.deepEqual(notees(avance(village('2027-01-05'), '2027-01-05', prevision('2027-01-05', { '2027-01-06': 20 })).world.game), []);
  // 8 janvier : l'annonce commence le 5, après la trêve
  assert.deepEqual(notees(avance(village('2027-01-05'), '2027-01-05', prevision('2027-01-05', { '2027-01-08': 20 })).world.game), [{ jour: '2027-01-08', source: 'meteo', ville: VILLE.nom }]);
});

test('toute l’année avec une ville : une neige d’octobre ou d’avril fait une tempête, annoncée et réglée comme en hiver', () => {
  const oct = '2026-10-20';
  const w = avance(village(oct), oct, prevision(oct, { '2026-10-23': 6 })).world;
  assert.deepEqual(notees(w.game), [{ jour: '2026-10-23', source: 'meteo', ville: VILLE.nom }]);
  assert.equal(alerteTempete(w.tasks, w.game, w.ledger, at(oct)).jour, '2026-10-23');
  const avr = '2027-04-20';
  assert.deepEqual(notees(avance(village(avr), avr, prevision(avr, { '2027-04-23': 4 })).world.game), [{ jour: '2027-04-23', source: 'meteo', ville: VILLE.nom }]);
});

test('prévision vieille de plus de 2 jours, d’une autre ville ou absente : le tirage propose ses jours, notés de la même façon', () => {
  const D = TIRAGE[0];
  const day = addDays(D, -3);
  const tirage = [{ jour: D, source: 'tirage' }];
  assert.deepEqual(notees(avance(village(day), day, prevision(day, {}, { lue: at(addDays(day, -3), 12) })).world.game), tirage, 'lue il y a 3 jours');
  assert.deepEqual(notees(avance(village(day), day, prevision(day, {}, { lat: VILLE.lat + 1 })).world.game), tirage, 'autre ville');
  assert.deepEqual(notees(avance(village(day), day, undefined).world.game), tirage, 'aucune prévision');
  assert.deepEqual(notees(avance(village(day), day, { lat: 'x' }).world.game), tirage, 'prévision illisible');
  // fraîche (lue il y a 2 jours au plus) et sans neige ce jour-là : pas de tempête
  assert.deepEqual(notees(avance(village(day), day, prevision(day, {}, { lue: at(addDays(day, -2), 12) })).world.game), []);
  assert.deepEqual(notees(avance(village(day), day, prevision(day)).world.game), []);
});

test('régler la ville : coordonnées arrondies au centième, la même sur tous les appareils (la partie) ; refus d’une ville illisible ; rien si elle ne change pas', () => {
  const day = '2026-11-10';
  const w = village(day, { ville: null });
  const { world, r } = step(w, reglerVille, { ville: { nom: '  Village-Test ', region: 'Région fictive', pays: 'Pays fictif', lat: 46.123456, lon: -73.98765 } }, at(day));
  assert.deepEqual(world.game.reglages.ville, { nom: 'Village-Test', region: 'Région fictive', pays: 'Pays fictif', lat: 46.12, lon: -73.99 });
  assert.deepEqual(villeDe(world.game), world.game.reglages.ville);
  assert.ok(r.ops.length > 0);
  assert.deepEqual(r.entries, [], 'rien au registre');
  assert.equal(step(world, reglerVille, { ville: { ...world.game.reglages.ville } }, at(day)).r.ops.length, 0, 'la même ville : rien à envoyer');
  for (const ville of [{ ...VILLE, nom: '' }, { ...VILLE, lat: 91 }, { ...VILLE, lon: -181 }, { ...VILLE, lat: Number.NaN }, { ...VILLE, nom: 'x'.repeat(101) }, 'Village-Test', 42]) {
    assert.throws(() => step(w, reglerVille, { ville }, at(day)), /ville/i, JSON.stringify(ville));
  }
  // une ville illisible dans la partie compte comme aucune ville
  assert.equal(villeDe({ reglages: { ville: { nom: 'X', lat: 'a', lon: 2 } } }), null);
  assert.equal(villeDe({}), null);
});

test('régler la ville pendant une annonce tirée : la tempête annoncée reste, avec son début et ses jours travaillés ; les tempêtes passées de l’hiver aussi', () => {
  const D = TIRAGE[0];
  const day = addDays(D, -2);
  const w = village(day, { ville: null }, [paye(addDays(D, -3))]);
  const avant = alerteTempete(w.tasks, w.game, w.ledger, at(day));
  assert.equal(avant.jour, D);
  const apres = step(w, reglerVille, { ville: VILLE }, at(day)).world;
  assert.deepEqual(notees(apres.game), [{ jour: D, source: 'tirage' }]);
  const a = alerteTempete(apres.tasks, apres.game, apres.ledger, at(day));
  assert.equal(a.jour, D);
  assert.equal(a.debut, avant.debut);
  assert.equal(a.travailles, 1);
  // la prévision, sans neige ce jour-là, ne la retire pas
  assert.deepEqual(notees(avance(apres, day, prevision(day)).world.game).map((t) => t.jour), [D]);
  // réglée le 9 décembre : le 25 novembre et le 7 décembre sont gardés, le 17 décembre (pas encore annoncé) ne l'est pas
  const dec = '2026-12-09';
  const g = step(village(dec, { ville: null }), reglerVille, { ville: VILLE }, at(dec)).world;
  assert.deepEqual(tempetesDeLHiver(dec, g.game), [TIRAGE[0], TIRAGE[1]]);
  // une neige 5 jours après le 7 décembre est trop près ; 7 jours après, elle compte
  assert.deepEqual(notees(avance(g, '2026-12-10', prevision('2026-12-10', { '2026-12-12': 9 })).world.game).length, 2);
  assert.deepEqual(notees(avance(g, '2026-12-11', prevision('2026-12-11', { '2026-12-14': 9 })).world.game).at(-1), { jour: '2026-12-14', source: 'meteo', ville: VILLE.nom });
});

test('retirer la ville : les tempêtes notées restent ; le tirage reprend, sans faire revenir une tempête d’avant le retrait', () => {
  const W = '2026-11-30';
  const w = village('2026-11-27', { tempetes: { notees: [{ jour: W, source: 'meteo' }] } });
  const { world } = step(w, reglerVille, { ville: null }, at('2026-11-27'));
  assert.equal(villeDe(world.game), null);
  const cal = tempetesDeLHiver('2026-11-27', world.game);
  assert.ok(!cal.includes(TIRAGE[0]), 'le 25 novembre, tiré pendant que la ville était réglée, ne revient pas');
  assert.ok(cal.includes(W));
  assert.deepEqual(cal, [W, ...TIRAGE.slice(1)], 'ensuite le tirage, à 7 jours au moins de la tempête notée');
  // la tempête du 25 novembre n'est jamais réglée
  const r = avance(world, '2026-11-28', undefined).r;
  assert.equal(r.entries.some((e) => e.key === `tempete:${TIRAGE[0]}`), false);
});

test('une tempête notée se règle comme aujourd’hui : tenue (barre pleine), ou un bâtiment enseveli si l’annonce a été vue', () => {
  const day = '2026-11-10';
  const J = addDays(day, 3);
  const debut = village(day, { batiments: [...CHALETS, EOLIENNE] }, [paye(day), paye(addDays(day, 1)), paye(addDays(day, 2))]);
  let w = avance(debut, day, prevision(day, { [J]: 10 })).world;
  const tenue = avance(w, J, prevision(J)).r;
  const e = tenue.entries.find((x) => x.key === `tempete:${J}`);
  assert.equal(e.resultat, 'tenue');
  assert.equal(e.materials, TEMPETE.tenue.materials);
  // sans quête pendant l'annonce, vue la veille : l'éolienne est ensevelie
  w = avance(village(day, { batiments: [...CHALETS, EOLIENNE] }), day, prevision(day, { [J]: 10 })).world;
  w = avance(w, addDays(J, -1), prevision(addDays(J, -1))).world;
  const neige = avance(w, J, prevision(J)).r.entries.find((x) => x.key === `tempete:${J}`);
  assert.equal(neige.resultat, 'neige');
  assert.equal(neige.cible, 'eolienne-1');
});

test('un mauvais imprévu ne frappe pas le jour d’une tempête notée d’après la météo : le créneau devient un bon', () => {
  // le premier créneau mauvais de l'hiver, hors trêve et hors des jours du tirage
  const creneaux = Array.from({ length: 20 }, (_, k) => calendrierImprevus(addDays('2026-11-30', 7 * k)).creneaux).flat();
  const jour = creneaux.find((c) => c.nature === 'mauvais' && !isTruce(c.jour) && !TIRAGE.includes(c.jour))?.jour;
  assert.ok(jour);
  // la tempête est tenue (barre pleine) : rien n'est enseveli, l'éolienne reste une cible
  const imprevus = (notees) => {
    const w = village(jour, { batiments: [...CHALETS, EOLIENNE], prepa: { jour, achetes: TEMPETE.crans }, ...(notees ? { tempetes: { notees } } : {}) });
    w.ledger = w.ledger.filter((e) => e.key !== `imprevu:${jour}`);
    const { r } = avance(w, jour, prevision(jour));
    if (notees) assert.equal(r.events.find((e) => e.type === 'tempete')?.resultat, 'tenue');
    return r.events.filter((e) => e.type === 'imprevu').map((e) => e.nature);
  };
  assert.deepEqual(imprevus(null), ['mauvais']); // témoin : sans tempête ce jour-là, il frappe
  assert.deepEqual(imprevus([{ jour, source: 'meteo', des: addDays(jour, -1) }]), ['bon']);
});

test('deux appareils, file hors ligne : une tempête déjà notée n’est jamais doublée, et le passage du temps rejoué ne réécrit rien', () => {
  const day = '2026-11-10';
  const J = addDays(day, 3);
  const a = avance(village(day), day, prevision(day, { [J]: 10 })).world;
  // l'autre appareil a une prévision un peu différente (neige la veille de J) : rien de plus
  const b = avance(a, day, prevision(day, { [addDays(J, -1)]: 10, [J]: 2 }));
  assert.deepEqual(notees(b.world.game), notees(a.game));
  assert.equal(b.r.ops.length, 0, 'rejoué avec le même instant : rien à envoyer');
});

test('élagage : la partie garde les tempêtes notées de cet hiver et du précédent', () => {
  const day = '2026-11-10';
  const vieilles = [{ jour: '2024-12-01', source: 'meteo' }, { jour: '2025-12-01', source: 'meteo' }];
  const w = avance(village(day, { tempetes: { notees: vieilles } }), day, prevision(day, { [addDays(day, 3)]: 5 })).world;
  assert.deepEqual(notees(w.game).map((t) => t.jour), ['2025-12-01', addDays(day, 3)]);
});

test('partie abîmée : des tempêtes notées illisibles sont ignorées, sans erreur', () => {
  const day = '2026-11-10';
  for (const tempetes of ['x', [], { notees: 'x' }, { notees: [1, null, { jour: 'demain' }, { jour: '2026-11-13', source: 'meteo' }] }]) {
    const w = village(day, { tempetes });
    assert.doesNotThrow(() => avance(w, day, prevision(day)), JSON.stringify(tempetes));
    const cal = tempetesDeLHiver(day, w.game);
    assert.ok(Array.isArray(cal) && cal.every((j) => /^\d{4}-\d{2}-\d{2}$/.test(j)), JSON.stringify(cal));
  }
});

test('sans ville et sans tempête notée : calendrier, annonce et jour de tempête identiques au tirage', () => {
  const g = village('2026-11-10', { ville: null }).game;
  for (const day of ['2026-11-22', '2026-12-05', '2027-01-07', '2027-03-20']) {
    assert.deepEqual(tempetesDeLHiver(day, g), tempetesDeLHiver(day));
    for (const j of TIRAGE) {
      assert.equal(estJourDeTempete(j, g), true);
      assert.equal(debutAnnonce(j, TEMPETE.annonce, g), debutAnnonce(j, TEMPETE.annonce));
    }
  }
});

test('changer ou retirer la ville : la tempête notée garde le nom de la ville de sa prévision', () => {
  const day = '2026-11-10';
  const J = addDays(day, 3);
  const w = avance(village(day), day, prevision(day, { [J]: 5 })).world;
  const b = step(w, reglerVille, { ville: { nom: 'Autre-Village', lat: 47.25, lon: -71.25 } }, at(day)).world;
  assert.equal(villeDe(b.game).nom, 'Autre-Village');
  const a = alerteTempete(b.tasks, b.game, b.ledger, at(day));
  assert.equal(a.jour, J);
  assert.equal(a.source, 'meteo');
  assert.equal(a.ville, 'Village-Test', 'la neige était prévue à l’ancienne ville');
  const sans = step(b, reglerVille, { ville: null }, at(day)).world;
  assert.equal(alerteTempete(sans.tasks, sans.game, sans.ledger, at(day)).ville, 'Village-Test', 'ville retirée : la tempête et son nom restent');
  // une tempête du tirage n'a pas de ville
  const D = TIRAGE[0];
  const t = village(addDays(D, -2), { ville: null });
  assert.equal(alerteTempete(t.tasks, t.game, t.ledger, at(addDays(D, -2))).ville, null);
});

test('le 1er juillet ne sépare pas deux tempêtes de la ville : écart de 7 jours, et la tempête de juin se règle en juillet', () => {
  const juin = { jour: '2027-06-28', source: 'meteo', ville: VILLE.nom };
  // neige prévue le 1er juillet, 3 jours après la tempête du 28 juin : trop près
  const w = avance(village('2027-06-29', { tempetes: { notees: [juin] } }), '2027-06-29', prevision('2027-06-29', { '2027-07-01': 10 })).world;
  assert.deepEqual(notees(w.game), [juin]);
  assert.deepEqual(tempetesDeLHiver('2027-07-01', w.game), ['2027-06-28']);
  // une tempête du 30 juin, joueur revenu le vendredi 2 juillet (même semaine) : elle est réglée
  const v = village('2027-07-02', { tempetes: { notees: [{ jour: '2027-06-30', source: 'meteo', ville: VILLE.nom }] }, lastSeenDay: '2027-06-29', lastOpenDay: '2027-06-29' });
  const r = avance(v, '2027-07-02', prevision('2027-07-02')).r;
  assert.ok(r.entries.some((e) => e.key === 'tempete:2027-06-30'), JSON.stringify(r.entries.map((e) => e.key)));
});

test('retirer la ville avec la tour de guet : le tirage reprend avec les tempêtes dont l’annonce de 6 jours commence au plus tôt ce jour-là', () => {
  const D = TIRAGE[1]; // le 7 décembre ; avant lui, le 25 novembre, noté pendant que la ville était réglée
  const R = addDays(D, -4);
  const avant = [{ jour: TIRAGE[0], source: 'tirage' }];
  const tour = step(village(R, { batiments: [...CHALETS, TOUR], tempetes: { notees: avant } }), reglerVille, { ville: null }, at(R)).world;
  assert.equal(alerteTempete(tour.tasks, tour.game, tour.ledger, at(R)), null, 'pas de tempête du tirage qui paraît en cours d’annonce');
  const cal = tempetesDeLHiver(R, tour.game);
  assert.ok(!cal.includes(D), JSON.stringify(cal));
  assert.ok(cal.includes(TIRAGE[2]), JSON.stringify(cal));
  assert.equal(alerteTempete(tour.tasks, tour.game, tour.ledger, at(addDays(TIRAGE[2], -6))).debut, addDays(TIRAGE[2], -6));
  // sans tour : la tempête du 7 décembre reste, annoncée 3 jours d'avance, après le retrait
  const sans = step(village(R, { tempetes: { notees: avant } }), reglerVille, { ville: null }, at(R)).world;
  assert.equal(alerteTempete(sans.tasks, sans.game, sans.ledger, at(R)), null);
  assert.equal(alerteTempete(sans.tasks, sans.game, sans.ledger, at(addDays(D, -3))).debut, addDays(D, -3));
});
