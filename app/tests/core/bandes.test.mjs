// La bande de terrain du Hameau (bible §4, lot F) : la forêt du fond recule quand le village atteint le Hameau, et
// l'île gagne une bande de terre, vide pour l'instant. Rien n'est écrit dans la partie : la bande se lit dans le
// nombre d'habitants, qui ne baisse jamais. Logique pure du cœur, de la vue et de la carte de l'île.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BANDES, bandesGagnees, rangDuVillage, createInitialState } from '../../core/index.js';
import { deriveView } from '../../world/view.js';
import {
  N, CELLS, DECOR, EMPLACEMENTS, LANDMARKS, ROADS, BANDES_ILE, bandeCells, decorFor, sectorAt,
} from '../../world/layout.js';
import { P } from '../../world/iso.js';
import { promeneurs } from '../../world/habitants.js';

const NOW = new Date('2026-10-20T15:00:00Z');
const ARBRES = new Set(['epinette', 'arbre', 'erable']);
const key = ([r, c]) => `${r},${c}`;

test('bandes : une seule pour l’instant, celle du Hameau', () => {
  assert.deepEqual(BANDES, [{ id: 'hameau', rang: 'hameau' }]);
});

test('bandes : aucune au Campement, celle du Hameau dès le 3e habitant, et rien de plus après', () => {
  for (const n of [0, 1, 2]) assert.deepEqual(bandesGagnees(n), [], `${n} habitants`);
  for (const n of [3, 5, 6, 11, 21, 40, 1e9]) assert.deepEqual(bandesGagnees(n), ['hameau'], `${n} habitants`);
  assert.equal(rangDuVillage(3).id, 'hameau');
});

test('bandes : un nombre d’habitants illisible ou négatif ne gagne rien', () => {
  for (const v of [undefined, null, -3, 'abc', NaN, 2.9]) assert.deepEqual(bandesGagnees(v), [], String(v));
});

test('vue de l’île : les bandes gagnées, lues dans les habitants, sans rien écrire dans la partie', () => {
  const g = createInitialState(NOW);
  assert.deepEqual(deriveView(g, [], { now: NOW }).bandes, []);
  const h = { ...g, habitants: 3 };
  const avant = JSON.stringify(h);
  assert.deepEqual(deriveView(h, [], { now: NOW }).bandes, ['hameau']);
  assert.equal(JSON.stringify(h), avant);
  assert.deepEqual(deriveView({}, [], { now: NOW }).bandes, [], 'partie vide');
});

test('carte : chaque bande du cœur a sa place sur l’île, et aucune autre', () => {
  assert.deepEqual(Object.keys(BANDES_ILE).sort(), BANDES.map((b) => b.id).sort());
});

test('carte : la bande du Hameau est au fond, hors de l’île de départ, au Garage et à la Mairie', () => {
  const cells = bandeCells(['hameau']);
  assert.equal(cells.length, 16); // deux rangées sur huit colonnes
  const depart = new Set(Object.values(CELLS).flat().map(key));
  assert.equal(depart.size, N * N);
  for (const cell of cells) assert.ok(!depart.has(key(cell)) && cell[0] < 0, `case ${key(cell)} déjà sur l’île`);
  // chaque case touche l'île ou une autre case de la bande : un seul tenant
  const tout = new Set([...depart, ...cells.map(key)]);
  for (const [r, c] of cells) assert.ok(tout.has(key([r + 1, c])), `case ${r},${c} détachée`);
  assert.deepEqual([...new Set(cells.map(([r, c]) => sectorAt(r, c)))].sort(), ['garage', 'mairie']);
  assert.deepEqual(bandeCells([]), []);
  assert.deepEqual(bandeCells(['inconnue']), []);
});

test('carte : avec la bande, l’île ne sort pas de son emprise actuelle à l’écran (sa taille ne change pas)', () => {
  const xs = [P(0, 0), P(N, 0), P(N, N), P(0, N)].map((p) => p[0]);
  const ys = [P(0, 0), P(N, 0), P(N, N), P(0, N)].map((p) => p[1]);
  for (const [r, c] of bandeCells(['hameau'])) {
    for (const [x, y] of [P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)]) {
      assert.ok(x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys), `case ${r},${c} : ${x}, ${y}`);
    }
  }
});

test('décor : sans bande, exactement celui d’aujourd’hui', () => {
  assert.deepEqual(decorFor([]), DECOR);
});

test('décor : avec la bande, la lisière a reculé au bord neuf, et rien ne sort de l’île', () => {
  const b = BANDES_ILE.hameau;
  const d = decorFor(['hameau']);
  const dans = (e, r0, r1) => e.r >= r0 && e.r < r1 && e.c >= b.c && e.c < b.c + b.w;
  // plus un arbre sur l'ancienne lisière, au droit de la bande
  assert.deepEqual(d.filter((e) => ARBRES.has(e.model) && dans(e, 0, 1)).map((e) => e.id), []);
  // la nouvelle lisière : des arbres sur la rangée du fond de la bande, sur toute sa longueur
  const lisiere = d.filter((e) => ARBRES.has(e.model) && dans(e, b.r, b.r + 1));
  assert.ok(lisiere.length >= b.w - 2, `${lisiere.length} arbres au bord neuf`);
  assert.ok(Math.min(...lisiere.map((e) => e.c)) <= b.c + 1 && Math.max(...lisiere.map((e) => e.c)) >= b.c + b.w - 2, 'toute la longueur');
  // des souches sur la terre gagnée
  assert.ok(d.some((e) => e.model === 'souche' && dans(e, b.r + 1, 1)), 'souches');
  // le reste du décor ne bouge pas
  const garde = DECOR.filter((e) => !(ARBRES.has(e.model) && dans(e, 0, 1)));
  for (const e of garde) assert.ok(d.some((x) => x.id === e.id && x.r === e.r && x.c === e.c), e.id);
  // tout est sur une case de l'île, identifiants uniques
  const ile = new Set([...Object.values(CELLS).flat(), ...bandeCells(['hameau'])].map(key));
  for (const e of d) assert.ok(ile.has(key([Math.floor(e.r), Math.floor(e.c)])), `${e.id} hors de l’île`);
  assert.equal(new Set(d.map((e) => e.id)).size, d.length);
  // le secteur d'un objet de la bande suit la règle des secteurs
  for (const e of d.filter((x) => x.r < 0)) assert.equal(e.sector, sectorAt(Math.floor(e.r), Math.floor(e.c)), e.id);
});

test('décor : rien de neuf sur un emplacement, un repère ou une route', () => {
  const avant = new Set(DECOR.map((e) => e.id));
  const neufs = decorFor(['hameau']).filter((e) => !avant.has(e.id));
  assert.ok(neufs.length > 0);
  const occupe = [...LANDMARKS, ...Object.values(EMPLACEMENTS).flat()];
  for (const e of neufs) {
    const u = e.c + 0.5, v = e.r + 0.5;
    for (const o of occupe) assert.ok(!(v >= o.r - 0.2 && v < o.r + (o.h || 1) + 0.1 && u >= o.c - 0.2 && u < o.c + (o.w || 1) + 0.1), `${e.id} sur ${o.id || o.r + ',' + o.c}`);
    assert.ok(Math.abs(u - 6) >= 0.6, `${e.id} sur la route du Garage`);
  }
  assert.ok(ROADS.length >= 5);
});

test('habitants : aucun chemin ne passe sur la bande, l’été comme l’hiver (la grille des trajets s’arrête au bord de départ)', () => {
  const occupants = { 'chalet-1': 5, 'chalet-2': 5, 'chalet-3': 5 };
  const lieux = ['parcelle-1', 'parcelle-2', 'parcelle-3', 'serre-1', 'serre-2', 'atelier-1', 'grenier-1'];
  const batiments = [...Object.entries(occupants), ...lieux.map((id) => [id, 0])]
    .map(([id, n]) => ({ id, type: id.split('-')[0], bati: true, occupants: n }));
  for (const today of ['2026-07-10', '2026-12-10']) {
    const p = promeneurs({ today, bandes: ['hameau'], batiments });
    assert.equal(p.length, 15, today);
    // les points du chemin sont ses sommets, reliés en ligne droite : tous devant le bord r = 0, donc tout le chemin
    for (const x of p) for (const [u, v] of x.chemin) assert.ok(v >= 0, `${today} ${x.id} passe en ${u}, ${v}`);
  }
});

// ---- textes : la phrase lue et la réplique de Fanal du Hameau (js/main.js, js/ui/speech.js)
const lire = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const rep = lire('../../content/fr-CA/repliques.json');
const bat = lire('../../content/fr-CA/batiments.json');

test('réplique : le Hameau, qui gagne une bande, a la sienne ; les autres rangs gardent « permis.rang »', async () => {
  globalThis.document ??= { baseURI: 'http://localhost/' }; // content.js lit l'adresse de la page à l'import
  const { situationFor } = await import('../../js/ui/speech.js');
  const rang = (id) => [{ type: 'rang', id, name: 'x', habitants: 3 }, { type: 'permis', source: 'rang', dispo: 1 }];
  assert.equal(situationFor('accueillir', {}, [{ type: 'famille', habitants: 3 }, ...rang('hameau')]), 'permis.rang.bande');
  assert.equal(situationFor('accueillir', {}, [{ type: 'famille', habitants: 6 }, ...rang('village')]), 'permis.rang');
  assert.equal(situationFor('livrer', {}, [{ type: 'commande', visiteur: 'famille' }, ...rang('hameau')]), 'permis.rang.bande');
  assert.equal(situationFor('accueillir', {}, [{ type: 'famille', habitants: 2 }]), 'famille.arrive');
});

test('réplique « permis.rang.bande » : 4 ou 5 variantes de Fanal, 20 mots et 86 caractères au plus, sans chiffre, {rang} seul gabarit', () => {
  const vs = rep.situations['permis.rang.bande'].variantes;
  assert.ok(vs.length >= 4 && vs.length <= 5, String(vs.length));
  for (const v of vs) {
    const s = v.texte.replace('{rang}', 'Hameau');
    assert.ok(v.id.startsWith('permis.rang.bande.') && v.voix === 'fanal', v.id);
    assert.ok(s.split(/\s+/).length <= rep.voix.fanal.motsMax && s.length <= 86, `${v.id} : ${s.length}`);
    assert.ok(!/\d/.test(s) && !/\{(?!rang\})/.test(v.texte) && v.texte.includes('{rang}'), v.id);
    assert.ok(!/village passe au rang/i.test(v.texte), v.id);
  }
  assert.equal(new Set(vs.map((v) => v.id)).size, vs.length);
});

test('phrase lue : « Nouveau rang : Hameau. » suivi de la forêt qui recule', () => {
  assert.equal(bat.sr.rang, 'Nouveau rang : {rang}.');
  assert.equal(bat.sr['rang.bande'], 'La forêt recule : l’île gagne une bande de terrain.');
});

// ───────── Lot B : les emplacements du rang Village sont posés sur la bande du Hameau ─────────
test('lot B : les emplacements posés sur une bande restent dans ses cases, hors de l’île de départ et de la route', () => {
  const surBande = Object.entries(EMPLACEMENTS).flatMap(([type, l]) => l.filter((s) => s.bande).map((s) => ({ type, ...s })));
  assert.deepEqual(surBande.map((s) => s.type).sort(), ['cabane', 'poulailler', 'scierie', 'tour']);
  for (const s of surBande) {
    const b = BANDES_ILE[s.bande];
    assert.ok(b, s.type);
    assert.ok(s.c >= b.c && s.c + s.w <= b.c + b.w && s.r >= b.r && s.r + s.h <= b.r + b.h, `${s.type} hors de sa bande`);
    // l'île de départ n'en voit rien : ni décor ni touffes d'herbe ne bougent sans la bande (isFree garde 0,1 de marge)
    assert.ok(s.r + s.h + 0.1 <= 0, `${s.type} déborde sur la rangée 0`);
    assert.ok(s.c + s.w <= 5.4 || s.c >= 6.6, `${s.type} sur la trouée de la route`);
  }
});

test('lot B : la vue ne montre les emplacements d’une bande qu’une fois la bande gagnée, verrouillés jusqu’au Village', () => {
  const vue = (habitants) => {
    const g = createInitialState(NOW);
    g.habitants = habitants;
    g.resources = { energy: 500, materials: 500, food: 5 };
    g.batiments = [{ id: 'atelier-1', type: 'atelier' }];
    return deriveView(g, [], { now: NOW }).batiments;
  };
  const village = (l) => l.filter((b) => ['tour', 'scierie', 'poulailler', 'cabane'].includes(b.type));
  assert.deepEqual(village(vue(2)), []);
  assert.deepEqual(village(vue(3)).map((b) => [b.id, b.refus]), [
    ['tour-1', 'Village : encore 3 habitants.'], ['scierie-1', 'Village : encore 3 habitants.'],
    ['poulailler-1', 'Village : encore 3 habitants.'], ['cabane-1', 'Village : encore 3 habitants.'],
  ]);
  assert.deepEqual(village(vue(6)).map((b) => [b.id, b.refus]), [['tour-1', null], ['scierie-1', null], ['poulailler-1', null], ['cabane-1', null]]);
  // les autres emplacements ne bougent pas : même liste au Campement qu'avant le lot
  assert.equal(vue(2).length, 3 + 3 + 1 + 2 + 1 + 1 + 1);
});
