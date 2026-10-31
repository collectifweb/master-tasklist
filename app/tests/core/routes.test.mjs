// Le dessin des routes (lot D) : aucune ne finit dans le vide (au quai, sur la lisière ou au garde-fou), aucun décor ni
// aucune touffe n'est posé dessus, et elles se dessinent d'un seul trait, sans raccord visible. Logique pure de la carte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, DECOR, BANDES_ILE, EMPLACEMENTS, routes, surRoute, decorFor, groundDetails } from '../../world/layout.js';
import { terrainSVG } from '../../world/terrain.js';

const ARBRES = new Set(['epinette', 'arbre', 'erable']);
const CAS = [[], ['hameau']];
// un trait de route (bord ou chaussée), reconnu à son épaisseur : le pavage de la Mairie a la même couleur que le bord
const ROUTE = /class="k-path(e)?-t" stroke-width="0?\.(9|72)"/;
const surTerre = (u, v, bandes) => (u >= 0 && u <= N && v >= 0 && v <= N)
  || bandes.some((id) => { const b = BANDES_ILE[id]; return u >= b.c && u <= b.c + b.w && v >= b.r && v <= b.r + b.h; });
// les bouts de route : là où une route s'arrête (pas le raccord d'une route qui continue sur une bande), et son sens
function bouts(bandes) {
  const r = routes(bandes);
  const segs = [...r.ile.filter((x) => !x.suite).map((x) => x.seg), ...Object.values(r.bandes).flat()];
  return segs.map(([[u0, v0], [u1, v1]]) => {
    const l = Math.hypot(u1 - u0, v1 - v0);
    return { bout: [u1, v1], sens: [(u1 - u0) / l, (v1 - v0) / l] };
  });
}

test('routes : chacune finit sur quelque chose, le quai, la lisière ou le garde-fou, avec ou sans bande', () => {
  const quai = EMPLACEMENTS.quai[0];
  for (const bandes of CAS) {
    const decor = decorFor(bandes);
    const l = bouts(bandes);
    assert.equal(l.length, 4, `${bandes} : quatre bouts`);
    for (const { bout: [u, v], sens: [du, dv] } of l) {
      const nom = `${bandes} : bout ${u}, ${v}`;
      const auQuai = v >= N - 0.1 && u >= quai.c && u <= quai.c + quai.w;
      // la lisière : la route s'arrête avant le bord, et les arbres se referment au-delà de son bout, de part et d'autre
      // de son axe (d'un seul côté, on verrait le lac par le trou)
      const [pu, pv] = [u + du * 0.6, v + dv * 0.6];
      const pres = decor.filter((e) => ARBRES.has(e.model) && Math.hypot(e.c + 0.5 - pu, e.r + 0.5 - pv) <= 0.8);
      const cote = (e) => Math.sign((e.c + 0.5 - pu) * dv - (e.r + 0.5 - pv) * du);
      const lisiere = surTerre(u + du * 0.75, v + dv * 0.75, bandes) && pres.some((e) => cote(e) > 0) && pres.some((e) => cote(e) < 0);
      // le garde-fou : une clôture en travers, ses lisses au bout de la route, sur toute sa largeur
      const gardeFou = du !== 0 && decor.some((e) => e.model === 'cloture' && e.travers
        && Math.abs(e.c + 0.53 - (u + du * 0.43)) <= 0.1 && e.r <= v - 0.45 && e.r + 1 >= v + 0.45);
      assert.equal([auQuai, lisiere, gardeFou].filter(Boolean).length, 1, nom);
    }
  }
});

test('routes : hormis celle du quai et le garde-fou, aucune n’atteint le bord de la terre', () => {
  for (const bandes of CAS) {
    for (const { bout: [u, v], sens: [du, dv] } of bouts(bandes)) {
      if (v >= N - 0.1 || du > 0) continue; // le quai ; le garde-fou (route de droite)
      assert.ok(surTerre(u + du * 0.75, v + dv * 0.75, bandes), `${bandes} : bout ${u}, ${v} trop près du bord`);
    }
  }
});

test('routes : une route qui continue sur une bande la traverse jusqu’à la lisière replantée, raccordée au bord de l’île', () => {
  const sans = routes([]), avec = routes(['hameau']);
  assert.deepEqual(sans.bandes, {});
  assert.ok(sans.ile.every((x) => !x.suite));
  const b = BANDES_ILE.hameau;
  const suite = avec.ile.filter((x) => x.suite);
  assert.equal(suite.length, 1);
  assert.deepEqual(suite[0].seg[1], [6, b.r + b.h], 'jusqu’au bord de l’île');
  assert.equal(avec.bandes.hameau.length, 1);
  const [[u0, v0], [u1, v1]] = avec.bandes.hameau[0];
  assert.deepEqual([u0, v0], [6, b.r + b.h], 'part du bord');
  assert.ok(v1 > b.r && v1 < b.r + 1, 'finit dans la rangée de la lisière');
  assert.ok(u1 >= b.c && u1 <= b.c + b.w);
});

test('routes : aucun arbre, buisson, rocher ni souche dessus, avec ou sans bande ; le garde-fou seul les touche', () => {
  for (const bandes of CAS) {
    for (const e of decorFor(bandes)) {
      if (e.model === 'cloture') continue;
      assert.ok(!surRoute(e.c + 0.5, e.r + 0.5, 0.6, bandes), `${bandes} : ${e.id} sur une route`);
    }
  }
  assert.ok(DECOR.some((e) => e.model === 'cloture' && e.travers && surRoute(e.c + 0.5, e.r + 0.5, 0.45)), 'le garde-fou, en travers du bout');
});

test('routes : aucune touffe d’herbe ni fleur dessus, avec ou sans bande', () => {
  for (const bandes of CAS) {
    for (const d of groundDetails(9, bandes)) assert.ok(!surRoute(d.u, d.v, 0.55, bandes), `${bandes} : touffe en ${d.u}, ${d.v}`);
  }
});

test('routes : dessinées d’un seul trait, tous les bords puis toute la chaussée, par-dessus le sol des quartiers', () => {
  for (const bandes of CAS) {
    const svg = terrainSVG(bandes);
    const i = svg.indexOf('<g class="ow-routes">');
    assert.ok(i > 0, 'une couche des routes');
    // aucune route dans le sol d'un quartier, qui la couperait au raccord suivant
    for (const m of svg.matchAll(/<g class="ow-ground" data-sector="[a-z]+">/g)) {
      const fin = svg.indexOf('<g class="ow-ground"', m.index + 1);
      const sol = svg.slice(m.index, fin > 0 && fin < i ? fin : i);
      assert.ok(!ROUTE.test(sol), `${bandes} : route dans ${m[0]}`);
    }
    // la couche : rien après les routes de l'île dans ce groupe ; bords d'abord, chaussée ensuite
    const couche = svg.slice(i, svg.indexOf('</g></g>', i));
    const n = routes(bandes).ile.length;
    assert.equal((couche.match(/k-pathe-t/g) || []).length, n);
    assert.equal((couche.match(/k-path-t/g) || []).length, n);
    assert.ok(couche.lastIndexOf('k-pathe-t') < couche.indexOf('k-path-t'), `${bandes} : un bord après la chaussée`);
    // le raccord d'une route qui continue sur une bande est carré
    assert.equal((couche.match(/stroke-linecap="butt"/g) || []).length, 2 * routes(bandes).ile.filter((x) => x.suite).length);
  }
});

test('routes : le bout qui traverse une bande est dessiné avec elle, et monte avec elle', () => {
  const svg = terrainSVG(['hameau']);
  const i = svg.indexOf('data-bande="hameau"');
  assert.ok(i > 0);
  const bande = svg.slice(i, svg.indexOf('<g class="ow-ground" data-sector', i));
  assert.equal((bande.match(/k-path-t/g) || []).length, 1);
  assert.ok(bande.indexOf('k-pathe-t') < bande.indexOf('k-path-t'));
  assert.ok(!terrainSVG([]).includes('data-bande'));
});
