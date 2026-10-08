// Les visiteurs à commande (bible §7, lot C, plan validé par Alex le 7 octobre 2026 au soir) : une fois le quai rebâti,
// le marchand reste chaque semaine et, à côté, un visiteur à commande accoste du lundi au dimanche, chacun son tour :
// le convoi (il laisse des Matériaux), la famille du Sud (elle s'installe : un habitant), la scientifique (1 permis).
// Une seule livraison par semaine ; ne pas livrer ne fait rien perdre. La taille suit l'allure de la semaine (moitié au
// ralenti, une fois et demie au plein régime, même récompense) et passe au ralenti quand une reprise commence dans la
// semaine (retour d'une absence). Jamais une tâche touchée, jamais plus d'un permis par visiteur.
// Titres fictifs génériques, aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISITEURS, ORDRE_VISITEURS, TAILLES, commandeDeLaSemaine, refusLivrer, livrer, visiteurDeLaSemaine, echanger,
  construire, accueillir, advanceTime, completeQuest, allureDe, PAS_IDS, BATIMENTS, MARCHAND, coutNiveau, rangDuVillage,
  addDays, manque,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

// 14 h UTC = 10 h à Montréal. Semaine du lundi 5 au dimanche 11 octobre 2026 : celle du convoi.
const at = (day, h = 14) => `${day}T${String(h).padStart(2, '0')}:00:00Z`;
const LUNDI = '2026-10-05';
const MARDI = '2026-10-06';
const DIMANCHE = '2026-10-11';
const QUAI = { id: 'quai-1', type: 'quai' };
const CHALETS = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'grenier-1', type: 'grenier' }];

// Village au Hameau, quai rebâti, une place libre (2 chalets de 2 places, 3 habitants), de quoi livrer. Le grenier garde 60
// Nourriture : à 25, l'objectif d'automne (la réserve pleine, ou à moitié au ralenti) ne tombe pas pendant les gestes.
const village = (over = {}) => {
  const w = fresh([task({ id: 'q1' })], at(MARDI));
  w.game.resources = { energy: 200, materials: 200, food: 25 };
  w.game.habitants = 3;
  w.game.premiersPas = Object.fromEntries(PAS_IDS.map((id) => [id, '2026-10-01']));
  w.game.batiments = [QUAI, ...CHALETS];
  Object.assign(w.game, over);
  return w;
};
// Une quête payée ce jour-là (forme du registre, quête fictive), pour régler l'allure.
const paye = (day, id) => ({ key: `reward:${id}:1`, at: at(day), day, type: 'reward', taskId: id, occurrence: 1, pe: 7, energy: 0, materials: 0, quartier: 'place' });
// Partie commencée le lundi 14 septembre : sans quête, l'allure est au ralenti la semaine du 5 octobre ; à six quêtes par
// jour depuis le départ, au plein régime.
const DEPUIS = '2026-09-14';
const auRalenti = (w) => { w.game.startDay = DEPUIS; return w; };
const auPlein = (w) => {
  w.game.startDay = DEPUIS;
  for (let d = DEPUIS; d < LUNDI; d = addDays(d, 1)) for (let k = 0; k < 6; k++) w.ledger.push(paye(d, `p${d}-${k}`));
  return w;
};

test('catalogue : trois visiteurs dans l’ordre du tour, commandes en nombres entiers, au plus un permis chacun, pas le marchand', () => {
  assert.deepEqual(ORDRE_VISITEURS, ['convoi', 'famille', 'scientifique']);
  assert.deepEqual(Object.keys(VISITEURS), ORDRE_VISITEURS);
  assert.deepEqual(TAILLES, { ralenti: 0.5, regulier: 1, plein: 1.5 });
  for (const id of ORDRE_VISITEURS) {
    const v = VISITEURS[id];
    for (const n of Object.values(v.demande)) assert.ok(Number.isInteger(n) && n > 0, `${id} : ${n}`);
    for (const k of Object.keys(v.demande)) assert.ok(['energy', 'materials', 'food'].includes(k), `${id} demande ${k}`);
    assert.equal(Object.keys(v.recoit).length, 1, `${id} laisse une seule chose`);
    assert.ok((v.recoit.permis ?? 0) <= 1, `${id} : au plus un permis`);
  }
  assert.ok(VISITEURS.convoi.recoit.materials > 0);
  assert.equal(VISITEURS.famille.recoit.habitants, 1);
  assert.equal(VISITEURS.scientifique.recoit.permis, 1);
  assert.ok(!ORDRE_VISITEURS.includes(MARCHAND.id));
});

test('sans quai, aucune commande ; le marchand et la commande arrivent ensemble quand le quai est rebâti en milieu de semaine', () => {
  const w = village({ batiments: [...CHALETS] });
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at(MARDI)), null);
  assert.equal(refusLivrer(w.game, w.ledger, {}, at(MARDI)), 'Il faut d’abord rebâtir le quai.');
  assert.throws(() => step(w, livrer, {}, at(MARDI)), { message: 'Il faut d’abord rebâtir le quai.' });
  w.game.habitants = 3;
  const { world: w2 } = step(w, construire, { type: 'quai' }, at('2026-10-08'));
  const c = commandeDeLaSemaine(w2.game, w2.ledger, at('2026-10-08'));
  assert.equal(c.id, 'convoi');
  assert.equal(c.joursRestants, 4); // jeudi : jeudi, vendredi, samedi, dimanche
  assert.ok(visiteurDeLaSemaine(w2.game, at('2026-10-08')), 'le marchand est là aussi');
});

test('chacun son tour, d’après la date : convoi, famille du Sud, scientifique, puis de nouveau le convoi ; la même sur deux appareils', () => {
  const w = village();
  const qui = (day) => commandeDeLaSemaine(w.game, w.ledger, at(day)).id;
  assert.deepEqual(['2026-09-28', LUNDI, '2026-10-12', '2026-10-19', '2026-10-26', '2027-01-04'].map(qui),
    ['scientifique', 'convoi', 'famille', 'scientifique', 'convoi', 'famille']);
  // tout un an : jamais deux semaines de suite le même, et les trois aussi souvent
  const compte = { convoi: 0, famille: 0, scientifique: 0 };
  let avant = null;
  for (let d = '2026-10-05'; d < '2027-10-04'; d = addDays(d, 7)) {
    const id = qui(d);
    assert.notEqual(id, avant, d);
    avant = id;
    compte[id]++;
  }
  assert.ok(Math.max(...Object.values(compte)) - Math.min(...Object.values(compte)) <= 1, JSON.stringify(compte));
  // un autre appareil, une autre partie au quai : le même visiteur, aucun état lu pour le choisir
  const autre = village({ resources: { energy: 0, materials: 0, food: 0 }, habitants: 5 });
  assert.equal(commandeDeLaSemaine(autre.game, [], at('2026-10-14')).id, 'famille');
});

test('la commande de la semaine : du lundi au dimanche, ce qu’il demande et ce qu’il laisse, à la taille « régulier »', () => {
  const w = village();
  const c = commandeDeLaSemaine(w.game, w.ledger, at(MARDI));
  assert.equal(c.semaine, LUNDI);
  assert.equal(c.depart, DIMANCHE);
  assert.equal(c.joursRestants, 6);
  assert.equal(c.taille, 'regulier');
  assert.equal(c.allegee, false);
  assert.deepEqual(c.demande, VISITEURS.convoi.demande);
  assert.deepEqual(c.recoit, VISITEURS.convoi.recoit);
  assert.equal(c.livree, false);
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at(LUNDI)).joursRestants, 7);
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at(DIMANCHE)).joursRestants, 1);
  // la nuit du dimanche au lundi (3 h 30 à Montréal), le convoi est encore là ; à 4 h 30, c'est la famille
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, '2026-10-12T07:30:00Z').id, 'convoi');
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, '2026-10-12T08:30:00Z').id, 'famille');
});

test('livrer le convoi : la commande est payée, les Matériaux arrivent par le registre, une seule clé pour la semaine', () => {
  const w = village();
  const { world: w2, r } = step(w, livrer, {}, at(MARDI));
  const d = VISITEURS.convoi.demande;
  assert.deepEqual(w2.game.resources, {
    energy: 200 - (d.energy || 0), materials: 200 - (d.materials || 0) + VISITEURS.convoi.recoit.materials, food: 25 - (d.food || 0),
  });
  assert.equal(r.entries.length, 1);
  const e = r.entries[0];
  assert.equal(e.key, `commande:${LUNDI}`);
  assert.equal(e.type, 'commande');
  assert.equal(e.visiteur, 'convoi');
  assert.equal(e.taille, 'regulier');
  assert.equal(e.day, MARDI);
  assert.equal(e.materials, VISITEURS.convoi.recoit.materials);
  assert.ok(!e.permis);
  assert.deepEqual(r.ops.map((o) => o.type), ['ledger.append', 'game.set']);
  const ev = r.events.find((x) => x.type === 'commande');
  assert.deepEqual(ev, { type: 'commande', visiteur: 'convoi', taille: 'regulier', donne: d, recoit: VISITEURS.convoi.recoit });
  assert.ok(r.events.some((x) => x.type === 'reward' && x.source === 'commande' && x.materials === VISITEURS.convoi.recoit.materials));
  const c = commandeDeLaSemaine(w2.game, w2.ledger, at(MARDI));
  assert.equal(c.livree, true);
});

test('une seule livraison par semaine : un double toucher, ou un second appareil qui a vu la livraison, est refusé', () => {
  const { world: w2 } = step(village(), livrer, {}, at(MARDI));
  const refus = 'Commande déjà livrée cette semaine.';
  assert.equal(refusLivrer(w2.game, w2.ledger, {}, at('2026-10-09')), refus);
  assert.throws(() => step(w2, livrer, {}, at(MARDI)), { message: refus });
  // le lundi suivant, une nouvelle commande (celle de la famille), de nouveau possible
  assert.equal(refusLivrer(w2.game, w2.ledger, {}, at('2026-10-12')), null);
});

test('ce qui manque se dit dans l’ordre Énergie, Matériaux, Nourriture, en entiers, et rien n’est payé', () => {
  const VENDREDI_SCIENTIFIQUE = '2026-10-23';
  const w = village({ resources: { energy: 0, materials: 3.5, food: 2 } });
  const d = VISITEURS.scientifique.demande;
  const attendu = [d.energy && `${d.energy} Énergie`, d.materials && `${Math.ceil(d.materials - 3.5)} Matériaux`, d.food && `${d.food - 2} Nourriture`]
    .filter(Boolean);
  const phrase = `Il manque ${attendu.length > 2 ? `${attendu.slice(0, -1).join(', ')} et ${attendu.at(-1)}` : attendu.join(' et ')}.`;
  assert.equal(refusLivrer(w.game, w.ledger, {}, at(VENDREDI_SCIENTIFIQUE)), phrase);
  assert.throws(() => step(w, livrer, {}, at(VENDREDI_SCIENTIFIQUE)), { message: phrase });
  // les trois ressources à la fois, dans l'ordre de la barre
  assert.equal(manque({ resources: { energy: 0, materials: 0, food: 0 } }, { energy: 5, materials: 5, food: 5 }), 'Il manque 5 Énergie, 5 Matériaux et 5 Nourriture.');
});

test('la famille du Sud : un habitant de plus sans payer la Nourriture d’accueil, seulement s’il y a une place libre', () => {
  const MERCREDI_FAMILLE = '2026-10-14';
  const w = village();
  const c = commandeDeLaSemaine(w.game, w.ledger, at(MERCREDI_FAMILLE));
  assert.equal(c.id, 'famille');
  const { world: w2, r } = step(w, livrer, {}, at(MERCREDI_FAMILLE));
  assert.equal(w2.game.habitants, 4);
  const d = VISITEURS.famille.demande;
  assert.deepEqual(w2.game.resources, { energy: 200 - (d.energy || 0), materials: 200 - (d.materials || 0), food: 25 - (d.food || 0) });
  assert.equal(r.entries[0].key, 'commande:2026-10-12');
  assert.equal(r.entries[0].visiteur, 'famille');
  assert.ok(r.events.some((x) => x.type === 'famille' && x.habitants === 4 && x.par === 'commande'));
  // plus de place libre : refusé, avec la raison, et rien n'est payé
  const plein = village({ habitants: 4 });
  const raison = 'Aucune place libre dans un chalet\u00a0: la famille ne peut pas s’installer.';
  assert.equal(refusLivrer(plein.game, plein.ledger, {}, at(MERCREDI_FAMILLE)), raison);
  assert.throws(() => step(plein, livrer, {}, at(MERCREDI_FAMILLE)), { message: raison });
  // sans chalet du tout
  const sans = village({ batiments: [QUAI], habitants: 0 });
  assert.equal(refusLivrer(sans.game, sans.ledger, {}, at(MERCREDI_FAMILLE)), 'Il faut d’abord un chalet.');
});

test('la famille qui fait passer un rang donne le permis de ce rang, une seule fois, comme une famille accueillie', () => {
  const MERCREDI_FAMILLE = '2026-10-14';
  const w = village({ habitants: 5, batiments: [QUAI, ...CHALETS, { id: 'chalet-3', type: 'chalet' }] });
  const avant = w.game.permis.dispo;
  const { world: w2, r } = step(w, livrer, {}, at(MERCREDI_FAMILLE));
  assert.equal(rangDuVillage(w2.game.habitants).id, 'village');
  assert.ok(r.entries.some((e) => e.key === 'permis:rang:2'));
  assert.equal(w2.game.permis.dispo, avant + 1);
  assert.ok(r.events.some((e) => e.type === 'rang' && e.id === 'village'));
  // accueillir n'a pas changé : il paie toujours la Nourriture d'accueil
  const a = step(village(), accueillir, {}, at(MARDI));
  assert.ok(a.r.events.some((e) => e.type === 'famille' && e.nourriture > 0 && e.par === undefined));
});

test('la scientifique laisse exactement un permis, par le registre', () => {
  const VENDREDI_SCIENTIFIQUE = '2026-10-23';
  const w = village();
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at(VENDREDI_SCIENTIFIQUE)).id, 'scientifique');
  const avant = w.game.permis.dispo;
  const { world: w2, r } = step(w, livrer, {}, at(VENDREDI_SCIENTIFIQUE));
  assert.equal(w2.game.permis.dispo, avant + 1);
  const e = r.entries.find((x) => x.key === 'commande:2026-10-19');
  assert.equal(e.permis, 1);
  assert.equal(r.entries.filter((x) => x.permis).length, 1);
  assert.ok(r.events.some((x) => x.type === 'permis' && x.source === 'commande' && x.dispo === avant + 1));
  const d = VISITEURS.scientifique.demande;
  assert.deepEqual(w2.game.resources, { energy: 200 - (d.energy || 0), materials: 200 - (d.materials || 0), food: 25 - (d.food || 0) });
});

test('la taille suit l’allure de la semaine : la moitié au ralenti, une fois et demie au plein régime, la même récompense', () => {
  const regulier = commandeDeLaSemaine(village().game, [], at(MARDI));
  const r = auRalenti(village());
  assert.equal(allureDe(r.game, r.ledger, MARDI).niveau, 'ralenti');
  const ralenti = commandeDeLaSemaine(r.game, r.ledger, at(MARDI));
  const p = auPlein(village());
  assert.equal(allureDe(p.game, p.ledger, MARDI).niveau, 'plein');
  const plein = commandeDeLaSemaine(p.game, p.ledger, at(MARDI));
  assert.deepEqual([regulier.taille, ralenti.taille, plein.taille], ['regulier', 'ralenti', 'plein']);
  for (const [k, n] of Object.entries(VISITEURS.convoi.demande)) {
    assert.equal(ralenti.demande[k], Math.ceil(n / 2), k);
    assert.equal(plein.demande[k], Math.ceil(n * 1.5), k);
  }
  assert.deepEqual(ralenti.recoit, regulier.recoit);
  assert.deepEqual(plein.recoit, regulier.recoit);
  assert.equal(ralenti.allegee, false);
  // livrée au ralenti : seule la petite commande est payée, et l'entrée garde sa taille
  const avant = { ...r.game.resources };
  const { world: w2, r: res } = step(r, livrer, {}, at(MARDI));
  for (const [k, n] of Object.entries(ralenti.demande)) assert.equal(w2.game.resources[k], avant[k] - n, k);
  assert.equal(res.entries[0].taille, 'ralenti');
  // les tailles des trois visiteurs, aux trois allures : toujours des entiers positifs
  for (const id of ORDRE_VISITEURS) for (const f of Object.values(TAILLES)) for (const n of Object.values(VISITEURS[id].demande)) assert.ok(Math.ceil(n * f) >= 1);
});

test('au retour d’une absence, la commande de la semaine passe à la taille « au ralenti », toute la semaine, et la suivante reprend sa taille', () => {
  const w = village({ lastSeenDay: '2026-09-30' }); // dernier passage le mercredi d'avant : 7 jours d'absence au mercredi 7
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at('2026-10-07')).taille, 'regulier');
  const { world: w2 } = step(w, advanceTime, {}, at('2026-10-07'));
  assert.equal(w2.game.reprise.du, '2026-10-07');
  const c = commandeDeLaSemaine(w2.game, w2.ledger, at('2026-10-07'));
  assert.deepEqual([c.taille, c.allegee], ['ralenti', true]);
  assert.equal(commandeDeLaSemaine(w2.game, w2.ledger, at(DIMANCHE)).taille, 'ralenti'); // reprise finie, même semaine
  const suivante = commandeDeLaSemaine(w2.game, w2.ledger, at('2026-10-13'));
  assert.deepEqual([suivante.taille, suivante.allegee], ['regulier', false]);
  // une reprise commencée la semaine d'avant n'allège pas celle-ci
  const avant = village({ reprise: { du: '2026-10-03', au: '2026-10-05' } });
  assert.equal(commandeDeLaSemaine(avant.game, avant.ledger, at(MARDI)).allegee, false);
  // au plein régime aussi, le retour ramène au ralenti
  const p = auPlein(village({ reprise: { du: MARDI, au: '2026-10-08' } }));
  assert.equal(commandeDeLaSemaine(p.game, p.ledger, at(MARDI)).taille, 'ralenti');
});

test('ne pas livrer ne fait rien perdre : le passage du temps est le même avec ou sans quai, et rien ne parle de commande', () => {
  const base = village({ lastSeenDay: '2026-10-05' });
  const sans = village({ lastSeenDay: '2026-10-05', batiments: [...CHALETS] });
  let a = base, b = sans;
  for (let d = '2026-10-06'; d <= '2026-10-20'; d = addDays(d, 1)) {
    a = step(a, advanceTime, {}, at(d)).world;
    b = step(b, advanceTime, {}, at(d)).world;
  }
  assert.deepEqual(a.game.resources, b.game.resources);
  assert.deepEqual(a.ledger, b.ledger);
  assert.ok(!a.ledger.some((e) => e.type === 'commande'));
  assert.equal(a.game.habitants, b.game.habitants);
  assert.equal(a.game.permis.dispo, b.game.permis.dispo);
});

test('aucune tâche touchée : livrer n’écrit rien dans les tâches, et une quête payée rapporte la même chose avec ou sans commande', () => {
  const w = village();
  const { world: w2, r } = step(w, livrer, {}, at(MARDI));
  assert.ok(!r.ops.some((o) => o.type.startsWith('task.')));
  assert.deepEqual(w2.tasks, w.tasks);
  const avec = step(w2, completeQuest, { id: 'q1' }, at(MARDI, 16)).r.entries.find((e) => e.type === 'reward');
  const sans = step(w, completeQuest, { id: 'q1' }, at(MARDI, 16)).r.entries.find((e) => e.type === 'reward');
  assert.deepEqual([avec.pe, avec.energy, avec.materials], [sans.pe, sans.energy, sans.materials]);
});

test('un geste hors ligne se rejoue à son heure : la commande de sa semaine, refusé si un autre appareil l’a déjà livrée', () => {
  const VENDREDI = '2026-10-09';
  const w = village();
  // le second appareil a livré vendredi ; le premier, hors ligne, avait livré jeudi : rejoué après coup, refusé
  const { world: w2 } = step(w, livrer, {}, at(VENDREDI));
  assert.throws(() => step(w2, livrer, {}, at('2026-10-08')), { message: 'Commande déjà livrée cette semaine.' });
  // livré vendredi hors ligne, envoyé le mardi suivant : c'est la commande du convoi, pas celle de la famille
  const { world: w3, r } = step(w, livrer, {}, at(VENDREDI));
  assert.equal(r.entries[0].key, `commande:${LUNDI}`);
  assert.equal(commandeDeLaSemaine(w3.game, w3.ledger, at('2026-10-13')).livree, false);
});

test('le marchand ne change pas : mêmes offres, prises à part de la commande, à toutes les allures', () => {
  const r = auRalenti(village());
  const p = auPlein(village());
  for (const w of [village(), r, p]) {
    assert.deepEqual(visiteurDeLaSemaine(w.game, at(MARDI)).offres.map(({ prise, ...o }) => o), MARCHAND.offres);
  }
  let { world: w } = step(village(), livrer, {}, at(MARDI));
  ({ world: w } = step(w, echanger, { offre: 'energie-materiaux' }, at(MARDI)));
  assert.equal(commandeDeLaSemaine(w.game, w.ledger, at(MARDI)).livree, true);
  assert.deepEqual(w.game.visite, { semaine: LUNDI, prises: ['energie-materiaux'] });
  // ni les bâtiments ni les niveaux ne changent de prix
  assert.deepEqual(BATIMENTS.quai.cout, { energy: 4, materials: 25 });
  assert.deepEqual(coutNiveau(1), { permis: 1, energy: 80, materials: 60 });
});
