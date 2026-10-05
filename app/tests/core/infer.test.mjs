import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex, findAnchors, inferDomain, reflectObject, DOMAINS, quartierOf, normalizeText } from '../../core/index.js';

const dico = JSON.parse(readFileSync(new URL('../../content/fr-CA/ancres.json', import.meta.url), 'utf8'));

test('dictionnaire : une quarantaine d’ancres, plus de 140 mots-clés, 5 domaines regroupés', () => {
  assert.ok(dico.anchors.length >= 38 && dico.anchors.length <= 50, String(dico.anchors.length));
  const kws = dico.anchors.flatMap((a) => a.keywords);
  assert.ok(kws.length >= 140, String(kws.length));
  assert.deepEqual([...new Set(dico.anchors.map((a) => a.domain))].sort(), [...DOMAINS].sort());
});

test('dictionnaire : chaque ancre est reliée au quartier de son domaine, identifiants uniques', () => {
  const ids = new Set();
  for (const a of dico.anchors) {
    assert.equal(a.quartier, quartierOf(a.domain), a.id);
    assert.ok(!ids.has(a.id), 'doublon ' + a.id);
    ids.add(a.id);
    assert.ok(a.label && a.keywords.length >= 2, a.id);
  }
});

test('dictionnaire : un mot-clé n’appartient qu’à une seule ancre, tous sans accent ni majuscule', () => {
  const seen = new Map();
  for (const a of dico.anchors) {
    for (const k of a.keywords) {
      assert.equal(k, normalizeText(k).replace(/ +/g, ' '), 'à normaliser : ' + k);
      assert.ok(!seen.has(k), `« ${k} » est dans ${seen.get(k)} et ${a.id}`);
      seen.set(k, a.id);
    }
  }
});

test('buildIndex met l’index en cache', () => {
  assert.equal(buildIndex(dico), buildIndex(dico));
  assert.ok(buildIndex(dico).map.size > 100);
});

test('inferDomain : « frigo » → Maison, glacière de l’Atelier', () => {
  const r = inferDomain('Dégivrer le FRIGO', dico);
  assert.equal(r.domain, 'Maison');
  assert.equal(r.quartier, 'atelier');
  assert.equal(r.anchor, 'glaciere');
});

test('inferDomain : gouttière, pneus, impôts, lunch (accents, casse, pluriel)', () => {
  assert.equal(inferDomain('Nettoyer la gouttière', dico).domain, 'Terrain');
  assert.equal(inferDomain('Nettoyer les GOUTTIERES', dico).anchor, 'gouttiere');
  assert.equal(inferDomain('Changer les pneus', dico).domain, 'Véhicule');
  assert.equal(inferDomain('Poser les pneus d’hiver', dico).anchor, 'pneus');
  assert.equal(inferDomain('Faire les impôts', dico).domain, 'Administratif');
  assert.equal(inferDomain('IMPOTS 2026', dico).quartier, 'mairie');
  assert.equal(inferDomain('Préparer les lunchs', dico).domain, 'Enfants');
  assert.equal(inferDomain('Préparer les lunchs', dico).quartier, 'ecole');
});

test('inferDomain : expressions de plusieurs mots (« rendez-vous ») et aucun résultat', () => {
  assert.equal(inferDomain('Prendre un rendez-vous', dico).domain, 'Administratif');
  assert.equal(inferDomain('Penser à autre chose', dico), null);
  assert.equal(inferDomain('', dico), null);
});

test('inferDomain : le domaine le plus représenté l’emporte', () => {
  const r = inferDomain('Laver l’auto et changer les pneus et appeler', dico);
  assert.equal(r.domain, 'Véhicule');
});

test('findAnchors renvoie les ancres dans l’ordre du titre ; reflectObject la première', () => {
  const found = findAnchors('Réparer le robinet puis le frigo', dico).map((a) => a.id);
  assert.deepEqual(found, ['robinet', 'glaciere']);
  assert.equal(reflectObject('Réparer le robinet puis le frigo', dico), 'robinet');
  assert.equal(reflectObject('rien', dico), null);
});
