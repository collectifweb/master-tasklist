import { SOURCE_TASKS } from '../../../sketches/006-oree-vivante/js/data.js';
const fP = p => 0.8 + 0.04 * p;
const E = t => Math.round((1 + t.length) * fP(t.priority)) + (t.difficulty >= 7 ? 2 : 0);
const M = t => (t.length <= 3 ? 1 : t.length <= 6 ? 2 : 3) + (t.difficulty >= 7 ? 1 : 0);
const indice = t => Math.round(45 * t.priority / 10 + 25 * (11 - t.length) / 10 + 15 * (11 - t.difficulty) / 10);
const rows = SOURCE_TASKS.map(t => ({ p: t.priority, l: t.length, d: t.difficulty, E: E(t), M: M(t), I: indice(t) }));
rows.sort((a, b) => b.I - a.I);
console.log('P L D | Indice | E | M');
for (const r of rows) console.log(r.p, r.l, r.d, '|', r.I, '|', r.E, '|', r.M);
const avg = k => (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(2);
console.log('avg E', avg('E'), 'avg M', avg('M'));
// corr indice vs E
const n = rows.length, mi = avg('I') * 1, me = avg('E') * 1;
let c = 0, vi = 0, ve = 0; for (const r of rows) { c += (r.I - mi) * (r.E - me); vi += (r.I - mi) ** 2; ve += (r.E - me) ** 2; }
console.log('corr Indice/E', (c / Math.sqrt(vi * ve)).toFixed(2));
// Inflation test: same task L3 -> L6
const base = { priority: 6, length: 3, difficulty: 3 }, inf = { ...base, length: 6 };
console.log('inflate L3->L6: E', E(base), '->', E(inf), ' Indice', indice(base), '->', indice(inf));
// Daily scenarios
const day = (list) => list.reduce((a, t) => ({ E: a.E + E(t), M: a.M + M(t) }), { E: 0, M: 0 });
const weekday = [{ priority: 8, length: 1, difficulty: 2 }, { priority: 6, length: 3, difficulty: 3 }, { priority: 5, length: 4, difficulty: 4 }];
const saturday = [{ priority: 7, length: 2, difficulty: 2 }, { priority: 6, length: 3, difficulty: 3 }, { priority: 7, length: 8, difficulty: 7 }, { priority: 5, length: 2, difficulty: 2 }, { priority: 4, length: 3, difficulty: 3 }];
console.log('weekday', day(weekday), 'saturday', day(saturday));
