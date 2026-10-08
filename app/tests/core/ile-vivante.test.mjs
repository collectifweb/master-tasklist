// L'île vivante (bible §10, lot E) : chaque habitant logé va à son travail et en revient. Logique pure de
// world/habitants.js (placée ici pour que la commande habituelle la lance). Rien n'est écrit dans la partie : le
// métier et le chemin se déduisent de la vue. Les contrôles de géométrie sont refaits ici, sans passer par le module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { promeneurs, trajet, ORDRE_LIEUX, MAX_PROMENEURS, VITESSE, TRAVAIL, MAISON } from '../../world/habitants.js';
import { EMPLACEMENTS, LANDMARKS, DECOR, PORTES, POSTES, POSTE_PLACE, N } from '../../world/layout.js';
import { artFor } from '../../world/models.js';
import { P } from '../../world/iso.js';
import { deriveView } from '../../world/view.js';
import { createInitialState } from '../../core/index.js';

const ETE = '2026-07-10', HIVER = '2026-12-10';

/** Vue minimale : bâtiments debout (id → occupants pour un chalet). */
function vue(today, bats) {
  return {
    today,
    batiments: Object.entries(bats).map(([id, occupants]) => ({ id, type: id.split('-')[0], bati: true, occupants: id.startsWith('chalet') ? occupants : 0 })),
  };
}
const TOUT = { 'parcelle-1': 0, 'parcelle-2': 0, 'parcelle-3': 0, 'serre-1': 0, 'serre-2': 0, 'atelier-1': 0, 'grenier-1': 0 };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// points du chemin, tous les 0,05 case
function echantillons(c) {
  const out = [];
  for (let q = 1; q < c.length; q++) {
    const n = Math.max(1, Math.ceil(dist(c[q - 1], c[q]) / 0.05));
    for (let z = 0; z <= n; z++) out.push([c[q - 1][0] + ((c[q][0] - c[q - 1][0]) * z) / n, c[q - 1][1] + ((c[q][1] - c[q - 1][1]) * z) / n]);
  }
  return out;
}
const MURS = Object.entries(EMPLACEMENTS).flatMap(([type, l]) => (type === 'parcelle' ? [] : l.filter((s) => !s.lac).map((s) => ({ type, ...s }))));
const dansUnMur = ([u, v]) => MURS.find((s) => u > s.c && u < s.c + s.w && v > s.r && v < s.r + s.h);
// pied d'un repère ou d'un décor (poteau, tronc, rocher) : 0,2 case autour du centre de son emprise
const surUnPied = ([u, v]) => [...LANDMARKS, ...DECOR].find((e) => e.model !== 'cloture' && dist([u, v], [e.c + (e.w || 1) / 2, e.r + (e.h || 1) / 2]) < 0.2);
const surLaCloture = ([u, v]) => u > 0 && u < 4 && v > 7.45 && v < 7.85;
// figurine (16 × 30 px monde, pieds en bas) cachée par le dessin d'un bâtiment posé devant elle
function cacheeParUnBatiment([u, v]) {
  return cacheePar(MURS.map((s) => ({ ...s, model: s.type })), [u, v]);
}
// … ou par n'importe quel dessin debout devant elle : bâtiments, repères (lanternes) et décors (arbres, rochers)
const DESSINS = [...MURS.map((s) => ({ ...s, model: s.type })), ...[...LANDMARKS, ...DECOR].map((e) => ({ ...e, h: e.h || 1, w: e.w || 1 }))];
const cacheeParUnDessin = (pt) => cacheePar(DESSINS, pt);
function cacheePar(liste, [u, v]) {
  const [x, y] = P(u, v);
  return liste.find((s) => {
    if (s.r + s.h + s.c + s.w <= u + v + 1.05) return false;
    const a = artFor(s);
    const [bx, by] = P(s.c, s.r);
    return x + 8 > bx + a.x && x - 8 < bx + a.x + a.w && y > by + a.y && y - 30 < by + a.y + a.h && y < by + a.y + a.h;
  });
}
// rayon dans lequel un habitant prend sa place autour du poste de son lieu (world/habitants.js)
const AUTOUR = 2.2;
const posteDe = (lieu) => (lieu === 'place' ? POSTE_PLACE : POSTES[lieu.split('-')[0]][Number(lieu.split('-')[1]) - 1]);

test('sans habitant logé, personne ne marche', () => {
  assert.deepEqual(promeneurs(vue(ETE, { 'chalet-1': 0, ...TOUT })), []);
  assert.deepEqual(promeneurs(vue(ETE, {})), []);
  assert.deepEqual(promeneurs(null), []);
  assert.deepEqual(promeneurs({}), []);
});

test('un promeneur par habitant logé, dans l\'ordre des chalets, au plus 15', () => {
  const p = promeneurs(vue(ETE, { 'chalet-1': 2, 'chalet-2': 1, ...TOUT }));
  assert.deepEqual(p.map((x) => [x.id, x.chalet]), [['habitant-1', 'chalet-1'], ['habitant-2', 'chalet-1'], ['habitant-3', 'chalet-2']]);
  assert.equal(MAX_PROMENEURS, 15);
  assert.equal(promeneurs(vue(ETE, { 'chalet-1': 5, 'chalet-2': 5, 'chalet-3': 5, ...TOUT })).length, 15);
  assert.equal(promeneurs(vue(ETE, { 'chalet-1': 6, 'chalet-2': 6, 'chalet-3': 6, ...TOUT })).length, 15);
});

test('les lieux bâtis reçoivent un habitant chacun, dans l\'ordre, puis on recommence', () => {
  assert.deepEqual(ORDRE_LIEUX, ['parcelle', 'serre', 'atelier', 'grenier']);
  const p = promeneurs(vue(ETE, { 'chalet-1': 5, 'chalet-2': 3, 'parcelle-1': 0, 'serre-1': 0, 'atelier-1': 0, 'grenier-1': 0 }));
  assert.deepEqual(p.map((x) => x.lieu), ['parcelle-1', 'serre-1', 'atelier-1', 'grenier-1', 'parcelle-1', 'serre-1', 'atelier-1', 'grenier-1']);
  // un bâtiment pas encore bâti n'est le lieu de personne
  const v = vue(ETE, { 'chalet-1': 2, 'serre-1': 0 });
  v.batiments.push({ id: 'atelier-1', type: 'atelier', bati: false, occupants: 0 });
  assert.deepEqual(promeneurs(v).map((x) => x.lieu), ['serre-1', 'serre-1']);
});

test('de novembre à avril, le potager dort : ses jardiniers vont ailleurs', () => {
  const bats = { 'chalet-1': 3, 'parcelle-1': 0, 'parcelle-2': 0, 'serre-1': 0 };
  assert.deepEqual(promeneurs(vue(ETE, bats)).map((x) => x.lieu), ['parcelle-1', 'parcelle-2', 'serre-1']);
  assert.deepEqual(promeneurs(vue(HIVER, bats)).map((x) => x.lieu), ['serre-1', 'serre-1', 'serre-1']);
  assert.deepEqual(promeneurs(vue('2026-11-01', bats)).map((x) => x.lieu)[0], 'serre-1');
  assert.deepEqual(promeneurs(vue('2026-10-31', bats)).map((x) => x.lieu)[0], 'parcelle-1');
  assert.deepEqual(promeneurs(vue('2026-05-01', bats)).map((x) => x.lieu)[0], 'parcelle-1');
});

test('sans lieu de travail bâti, les habitants vont sur la Place', () => {
  const p = promeneurs(vue(ETE, { 'chalet-1': 2 }));
  assert.deepEqual(p.map((x) => x.lieu), ['place', 'place']);
  for (const x of p) assert.ok(dist(x.chemin.at(-1), POSTE_PLACE) <= AUTOUR, x.id);
  // l'hiver, avec le potager seul
  assert.deepEqual(promeneurs(vue(HIVER, { 'chalet-1': 1, 'parcelle-1': 0 })).map((x) => x.lieu), ['place']);
});

test('chaque chemin part de la porte du chalet, finit au poste, et ne traverse rien', () => {
  const chalets = { 'chalet-1': 5, 'chalet-2': 5, 'chalet-3': 5 };
  const vues = [];
  // tous les lieux, un à la fois, depuis chacun des trois chalets, plus la Place
  for (const id of [...Object.keys(TOUT), null]) vues.push(vue(ETE, { ...chalets, ...(id ? { [id]: 0 } : {}) }));
  let vus = 0;
  for (const v of vues) {
    for (const p of promeneurs(v)) {
      const porte = PORTES.chalet[Number(p.chalet.split('-')[1]) - 1];
      assert.deepEqual(p.chemin[0], porte, p.id);
      assert.ok(dist(p.chemin.at(-1), posteDe(p.lieu)) <= AUTOUR, `${p.id} : fini à ${p.chemin.at(-1)}, loin du poste de ${p.lieu}`);
      for (const pt of echantillons(p.chemin)) {
        const quoi = `${p.chalet} → ${p.lieu}, en ${pt.map((x) => x.toFixed(2))}`;
        assert.ok(pt[0] >= 0.2 && pt[1] >= 0.2 && pt[0] <= N - 0.2 && pt[1] <= N - 0.2, `${quoi} : hors de l'île`);
        assert.equal(dansUnMur(pt)?.type, undefined, `${quoi} : dans un bâtiment`);
        assert.equal(surUnPied(pt)?.id, undefined, `${quoi} : sur un pied`);
        assert.ok(!surLaCloture(pt), `${quoi} : à travers la clôture`);
      }
      vus++;
    }
  }
  assert.ok(vus >= 15 * 8, `${vus} chemins vérifiés`);
});

test('portes et postes se voient : aucun bâtiment ne les cache', () => {
  for (const [i, p] of PORTES.chalet.entries()) assert.equal(cacheeParUnBatiment(p)?.type, undefined, `porte du chalet-${i + 1}`);
  for (const [type, l] of Object.entries(POSTES)) {
    assert.equal(l.length, EMPLACEMENTS[type].length, `un poste par emplacement : ${type}`);
    for (const [i, p] of l.entries()) assert.equal(cacheeParUnBatiment(p)?.type, undefined, `poste de ${type}-${i + 1}`);
  }
  assert.equal(cacheeParUnBatiment(POSTE_PLACE)?.type, undefined, 'poste de la Place');
});

test('plusieurs habitants au même lieu : chacun sa place près du poste, visible, sans se recouvrir', () => {
  const plein = { 'chalet-1': 5, 'chalet-2': 5, 'chalet-3': 5 };
  const cas = [
    ['été, tout bâti', vue(ETE, { ...plein, ...TOUT })],
    ['hiver, potager seul : tout le monde sur la Place', vue(HIVER, { ...plein, 'parcelle-1': 0 })],
    ['un seul atelier', vue(ETE, { ...plein, 'atelier-1': 0 })],
  ];
  for (const [nom, v] of cas) {
    const p = promeneurs(v);
    assert.equal(p.length, 15, `${nom} : personne n'est laissé chez lui`);
    const fins = p.map((x) => x.chemin.at(-1));
    // le premier d'un lieu va au poste même quand rien ne le cache
    for (const x of p) {
      const premier = p.find((y) => y.lieu === x.lieu) === x;
      if (premier && !cacheeParUnDessin(posteDe(x.lieu))) assert.deepEqual(x.chemin.at(-1), posteDe(x.lieu), `${nom} : ${x.id}`);
    }
    for (const [i, f] of fins.entries()) {
      assert.equal(cacheeParUnDessin(f)?.id ?? cacheeParUnDessin(f)?.type, undefined, `${nom} : ${p[i].id} caché en ${f}`);
      assert.equal(dansUnMur(f)?.type, undefined, `${nom} : ${p[i].id} dans un bâtiment`);
      assert.equal(surUnPied(f)?.id, undefined, `${nom} : ${p[i].id} sur un pied`);
      // deux figurines d'un même lieu : 12 px de côté ou 26 px de haut à l'écran, au moins
      for (let j = 0; j < i; j++) {
        if (p[j].lieu !== p[i].lieu) continue;
        const [xa, ya] = P(...f), [xb, yb] = P(...fins[j]);
        assert.ok(Math.abs(xa - xb) >= 12 || Math.abs(ya - yb) >= 26, `${nom} : ${p[i].id} recouvre ${p[j].id}`);
      }
    }
  }
});

test('les décalages sont tous différents, et tout se refait à l\'identique', () => {
  const v = vue(ETE, { 'chalet-1': 5, 'chalet-2': 5, 'chalet-3': 5, ...TOUT });
  const p = promeneurs(v);
  const d = p.map((x) => x.decalage);
  assert.equal(new Set(d).size, d.length);
  assert.ok(d.every((x) => x >= 0 && x < 1));
  assert.deepEqual(promeneurs(structuredClone(v)), p);
});

test('un tour : la maison, la sortie, le chemin, le travail, le retour', () => {
  const [p] = promeneurs(vue(ETE, { 'chalet-1': 1, 'atelier-1': 0 }));
  const { duree, images } = trajet(p);
  const long = p.chemin.slice(1).reduce((s, pt, q) => s + dist(p.chemin[q], pt), 0);
  const marche = long / VITESSE;
  assert.ok(Math.abs(duree - (MAISON + TRAVAIL + 2 * marche + 1.2)) < 0.01, `durée ${duree}`);
  const porte = p.chemin[0], poste = p.chemin.at(-1);
  assert.deepEqual([images[0].t, images[0].u, images[0].v, images[0].o], [0, ...porte, 0]);
  assert.deepEqual([images.at(-1).t, images.at(-1).u, images.at(-1).v, images.at(-1).o], [1, ...porte, 0]);
  for (let q = 1; q < images.length; q++) assert.ok(images[q].t >= images[q - 1].t, `images dans l'ordre (${q})`);
  // au poste, visible, pendant TRAVAIL secondes
  const auPoste = images.filter((im) => im.u === poste[0] && im.v === poste[1]);
  assert.equal(auPoste.length, 2);
  assert.ok(auPoste.every((im) => im.o === 1));
  assert.ok(Math.abs((auPoste[1].t - auPoste[0].t) * duree - TRAVAIL) < 0.05);
  // à la maison, invisible pendant MAISON secondes ; partout ailleurs, visible
  assert.ok(Math.abs(images[1].t * duree - MAISON) < 0.05 && images[1].o === 0);
  assert.ok(images.slice(2, -2).every((im) => im.o === 1));
});

test('la vue de l\'île donne les promeneurs : chalets bâtis et habitants logés', () => {
  const g = createInitialState(`${ETE}T14:00:00Z`);
  g.batiments = [{ id: 'chalet-1', type: 'chalet' }, { id: 'chalet-2', type: 'chalet' }, { id: 'serre-1', type: 'serre' }];
  g.habitants = 3;
  const v = deriveView(g, [], { now: `${ETE}T14:00:00Z` });
  const p = promeneurs(v);
  // une partie neuve a déjà sa première parcelle (DEPART, core/batiments.js)
  assert.deepEqual(p.map((x) => [x.chalet, x.lieu]), [['chalet-1', 'parcelle-1'], ['chalet-1', 'serre-1'], ['chalet-2', 'parcelle-1']]);
});
