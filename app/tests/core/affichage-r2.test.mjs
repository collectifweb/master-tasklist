// Lot R2, affichage : répliques de Fanal (permis, rang, semaine tenue) et teinte du compteur Permis.
// Lit les fichiers de texte et la feuille des jetons de couleur ; aucune donnée réelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEMAINE_TENUE } from '../../core/index.js';

const lire = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const rep = JSON.parse(lire('../../content/fr-CA/repliques.json'));
const mots = (s) => s.replace(/\{\w+\}/g, 'x').split(/\s+/).filter(Boolean).length;

test('répliques : « permis gagné » et « nouveau rang » ont 4 ou 5 variantes, « semaine tenue » 3 ou 4', () => {
  const n = (s) => rep.situations[s].variantes.length;
  assert.ok(n('permis.gagne') >= 4 && n('permis.gagne') <= 5, `permis.gagne : ${n('permis.gagne')}`);
  assert.ok(n('permis.rang') >= 4 && n('permis.rang') <= 5, `permis.rang : ${n('permis.rang')}`);
  assert.ok(n('semaine.tenue') >= 3 && n('semaine.tenue') <= 4, `semaine.tenue : ${n('semaine.tenue')}`);
});

test('répliques : identifiants uniques et préfixés par la situation, voix de Fanal, 20 mots au plus', () => {
  const vus = new Set();
  for (const s of ['permis.gagne', 'permis.rang', 'semaine.tenue']) {
    for (const v of rep.situations[s].variantes) {
      assert.ok(v.id.startsWith(`${s}.`) && !vus.has(v.id), v.id);
      vus.add(v.id);
      assert.equal(v.voix, 'fanal');
      assert.ok(mots(v.texte) <= rep.voix.fanal.motsMax, `${v.id} : ${mots(v.texte)} mots`);
    }
  }
});

test('répliques : « {rang} » seulement là où le rang existe ; aucun chiffre ni mot « série » dans la semaine tenue', () => {
  for (const s of ['permis.gagne', 'semaine.tenue']) for (const v of rep.situations[s].variantes) assert.ok(!/\{/.test(v.texte), v.id);
  // aucune variante ne dépend d'un autre gabarit que {rang} (sinon pickReply l'écarterait pour de bon)
  for (const v of rep.situations['permis.rang'].variantes) assert.ok(!/\{(?!rang\})/.test(v.texte), v.id);
  for (const v of rep.situations['semaine.tenue'].variantes) {
    assert.ok(!/\d|série|de suite|consécutif|jours? sur/i.test(v.texte), `${v.id} : ${v.texte}`);
    assert.ok(!new RegExp(String(SEMAINE_TENUE.materials)).test(v.texte), v.id); // la mécanique va dans les puces, pas dans la bouche de Fanal
  }
});

// luminance relative WCAG
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('compteur Permis : une teinte à lui (ni le givre des Avis ni une autre ressource), contraste AA sur son lavis et sur le papier', () => {
  const css = lire('../../css/tokens.css');
  const jeton = (nom) => (css.match(new RegExp(`${nom}:\\s*(#[0-9a-fA-F]{6})`)) || [])[1];
  const lien = (nom) => (css.match(new RegExp(`${nom}:\\s*var\\((--[\\w-]+)\\)`)) || [])[1];
  assert.equal(lien('--res-permis'), '--c-airelle-ink');
  assert.equal(lien('--res-permis-wash'), '--c-airelle-wash');
  const ink = jeton('--c-airelle-ink'), wash = jeton('--c-airelle-wash');
  assert.ok(ink && wash);
  // réservé : personne d'autre ne l'emploie
  for (const reserve of ['--c-airelle-ink', '--c-airelle-wash']) {
    const emplois = css.split('\n').filter((l) => l.includes(`var(${reserve})`));
    assert.equal(emplois.length, 1, `${reserve} : ${emplois.join(' | ')}`);
    assert.ok(emplois[0].includes('--res-permis'), emplois[0]);
  }
  // distinct des autres familles de couleur
  const autres = ['--c-frost-ink', '--c-frost-wash', '--c-glass-deep', '--c-soil-deep', '--c-sage-deep', '--c-lantern-ink', '--c-ash-ink', '--c-ember-ink', '--c-ember-wash'].map(jeton);
  assert.ok(!autres.includes(ink) && !autres.includes(wash));
  assert.ok(contraste(ink, wash) >= 4.5, `encre sur lavis : ${contraste(ink, wash).toFixed(2)}`);
  assert.ok(contraste(ink, jeton('--c-paper')) >= 4.5, `encre sur papier : ${contraste(ink, jeton('--c-paper')).toFixed(2)}`);
});

// ───── tirage des répliques : une situation hebdomadaire ne redit pas la même variante deux semaines de suite
test('pickReply : « semaine tenue » ne répète jamais la variante de la semaine d’avant (52 vendredis)', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  globalThis.document = { baseURI: 'http://localhost/app/' };
  const { content, pickReply } = await import('../../js/content.js');
  content.repliques = rep;
  let precedente = null;
  const debut = Date.UTC(2026, 9, 9, 14); // vendredi 9 octobre 2026
  for (let i = 0; i < 52; i++) {
    const r = pickReply('semaine.tenue', { now: new Date(debut + i * 7 * 86400000), quartier: 'place', length: 0, vars: {} }, { gate: false });
    assert.ok(r, `vendredi ${i}`);
    assert.notEqual(r.id, precedente, `vendredi ${i} : ${r.id} deux fois de suite`);
    precedente = r.id;
  }
});

test('répliques : « permis.rang » ne dit pas « le village passe au rang de » (le rang porte déjà le mot Village)', () => {
  for (const v of rep.situations['permis.rang'].variantes) assert.ok(!/village passe au rang/i.test(v.texte), v.id);
});
