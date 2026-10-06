// Typographie des textes affichés au joueur (lot 5), règle OQLF de content/README.md : l'insécable U+00A0 avant « : »,
// après « « » et avant « » » ; aucune espace avant « ; ? ! ». Ce test balaie toutes les chaînes écrites dans app/core/ (les raisons
// du cœur : refus, erreurs) et dans app/js/ (phrases lues ou affichées), sans toucher au code lui-même (opérateurs
// ternaires, commentaires, expressions régulières, sélecteurs). Il relance aussi les refus du cœur sur des états variés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  refusConstruire, refusSemer, refusRecolter, refusAccueillir, BATIMENT_IDS, createInitialState, completeQuest,
  remballerQuest, createQuest,
} from '../../core/index.js';
import { fresh, step, task } from './helpers.mjs';

const APP = fileURLToPath(new URL('../../', import.meta.url));
const files = (dir) => readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory()
  ? files(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : []));

/**
 * Chaînes d'un fichier JavaScript : contenu des '…', "…" et des parties fixes des `…` (hors ${…}), avec leur ligne.
 * Commentaires et expressions régulières sont sautés. Lecteur volontairement petit : il suit la syntaxe du dépôt.
 */
function strings(src) {
  const out = [];
  let i = 0, line = 1, prev = ''; // prev : dernier caractère significatif hors chaîne (décide si « / » ouvre une regex)
  const tplDepth = []; // pile des ${ ouverts dans des gabarits
  const readQuoted = (q) => {
    let s = '', start = line;
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') { s += src.slice(i, i + 2); i += 2; continue; }
      if (src[i] === '\n') line++;
      s += src[i++];
    }
    i++;
    out.push({ s, line: start });
  };
  const readTemplate = () => { // depuis un ` ou une } qui ferme un ${
    let s = '', start = line;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { s += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { i++; out.push({ s, line: start }); return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; out.push({ s, line: start }); tplDepth.push(0); return; }
      if (c === '\n') line++;
      s += c; i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); line += (src.slice(i, j).match(/\n/g) || []).length; i = j + 2; continue; }
    if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|in|of)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) {
      i++; // expression régulière : jusqu'au / fermant hors classe
      let cls = false;
      while (i < src.length) {
        const d = src[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break;
        i++;
      }
      i++; while (/[a-z]/.test(src[i] || '')) i++;
      prev = ')';
      continue;
    }
    if (c === '\'' || c === '"') { readQuoted(c); prev = ')'; continue; }
    if (c === '`') { i++; readTemplate(); prev = ')'; continue; }
    if (tplDepth.length) {
      if (c === '{') tplDepth[tplDepth.length - 1]++;
      if (c === '}') {
        if (tplDepth[tplDepth.length - 1] === 0) { tplDepth.pop(); i++; readTemplate(); prev = ')'; continue; }
        tplDepth[tplDepth.length - 1]--;
      }
    }
    prev = c; i++;
  }
  return out;
}

// une espace ordinaire devant « : » ou « » », après « « », ou une espace quelconque devant « ; ? ! »
const FAUTE = / [:»]|« |[ \u00a0][;?!]/;

test('typographie OQLF dans les textes de app/core/ et app/js/', () => {
  const fautes = [];
  for (const f of [...files('core'), ...files('js')]) {
    for (const { s, line } of strings(readFileSync(join(APP, f), 'utf8'))) {
      if (!FAUTE.test(s)) continue;
      // un gabarit HTML peut contenir du texte : on ne regarde que ses morceaux hors balises
      const texte = /<\/?[a-z]/i.test(s) ? s.replace(/<[^>]*>/g, '\u0000') : s;
      if (FAUTE.test(texte)) fautes.push(`${f}:${line} ${JSON.stringify(s.slice(0, 90))}`);
    }
  }
  assert.deepEqual(fautes, []);
});

test('le lecteur de chaînes voit bien les textes (contrôle du contrôle)', () => {
  const s = strings("const a = x ? 'b' : `c ${y ? 'd : e' : f} g : h`; // 'commentaire : non'\nconst r = /[’'`]/g; const z = 'Il manque 3 : x';");
  const textes = s.map((x) => x.s);
  assert.ok(textes.includes('d : e'));
  assert.ok(textes.includes(' g : h'));
  assert.ok(textes.includes('Il manque 3 : x'));
  assert.ok(!textes.some((x) => x.includes('commentaire')));
});

test('les raisons du cœur, relancées sur des états variés : insécable devant les deux-points', () => {
  const raisons = new Set();
  const NOW = '2026-12-10T14:00:00Z';
  for (const res of [{ energy: 0, materials: 0, food: 0 }, { energy: 500, materials: 500, food: 500 }]) {
    for (const habitants of [0, 3]) {
      const g = { ...createInitialState(NOW), resources: res, habitants };
      for (const type of BATIMENT_IDS) raisons.add(refusConstruire(g, type));
      for (const id of ['parcelle-1', 'serre-1', 'x-1']) { raisons.add(refusSemer(g, [], id, NOW)); raisons.add(refusRecolter(g, [], id, NOW)); }
      raisons.add(refusAccueillir(g));
      g.batiments = [{ id: 'chalet-1', type: 'chalet' }];
      g.habitants = 2;
      raisons.add(refusAccueillir(g));
    }
  }
  // erreurs lancées par les opérations sur les quêtes
  const w = fresh([task({ id: 'a', readonly: true }), task({ id: 'b', status: 'done' })], NOW);
  for (const [fn, p] of [[completeQuest, { id: 'a' }], [completeQuest, { id: 'b' }], [remballerQuest, { id: 'b' }], [createQuest, { task: ' ' }]]) {
    try { step(w, fn, p, NOW); } catch (e) { raisons.add(e.message); }
  }
  const textes = [...raisons].filter(Boolean);
  assert.ok(textes.some((x) => x.includes(':')), 'au moins une raison avec deux-points');
  assert.deepEqual(textes.filter((x) => FAUTE.test(x)), []);
});

test('typographie OQLF dans les textes de app/content/fr-CA/', () => {
  const fautes = [];
  const walk = (v, ou) => {
    if (typeof v === 'string') { if (FAUTE.test(v.replace(/<[^>]*>/g, '\u0000'))) fautes.push(`${ou} ${JSON.stringify(v.slice(0, 90))}`); }
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${ou}.${k}`);
  };
  const dir = join(APP, 'content', 'fr-CA');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) walk(JSON.parse(readFileSync(join(dir, f), 'utf8')), f);
  assert.deepEqual(fautes, []);
});
