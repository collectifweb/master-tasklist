// Pacing sim: income per profile vs chapter needs (Comptoir de l'Orée)
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (arr) => { const r = rnd() * arr.reduce((s, x) => s + x[1], 0); let a = 0; for (const x of arr) { a += x[1]; if (r <= a) return x[0]; } return arr[0][0]; };
const DOM = [['Planches', 40], ['Terreau', 24], ['Sceaux', 22], ['Ferrures', 7], ['Fil', 7]];
const LEN = [[1, 15], [2, 25], [3, 22], [4, 12], [5, 10], [6, 6], [7, 5], [8, 3], [9, 2]];
const quest = () => { const l = pick(LEN); const p = 3 + Math.floor(rnd() * 7); const d = Math.min(10, Math.max(1, l + Math.floor(rnd() * 4) - 1)); return { l, p, d, dom: pick(DOM) }; };
const E = q => Math.round((1 + q.l) * (0.8 + 0.04 * q.p)) + (q.d >= 7 ? 2 : 0);
const M = q => (q.l <= 3 ? 1 : q.l <= 6 ? 2 : 3) + (q.d >= 7 ? 1 : 0);
const profiles = { leger: [1, 2], moyen: [3, 5], intense: [6, 8] };
for (const [name, [wd, we]] of Object.entries(profiles)) {
  seed = 11; let tot = { E: 0, Ecap: 0, conf: 0, P7: 0, M: { Planches: 0, Terreau: 0, Sceaux: 0, Ferrures: 0, Fil: 0 } };
  const log = [];
  for (let day = 1; day <= 21; day++) {
    const n = (day % 7 === 6 || day % 7 === 0) ? we : wd; let dayE = 0;
    for (let i = 0; i < n; i++) { const q = quest(); dayE += E(q); tot.M[q.dom] += M(q); if (q.p >= 7 || q.l >= 7) tot.P7++; }
    const bonus = Math.min(6, 1 + 2 + Math.min(3, Math.ceil(n / 2)));
    const capped = Math.min(dayE, 30); tot.E += dayE + bonus; tot.Ecap += capped + bonus; if (n > 0) tot.conf++;
    if ([4, 7, 14, 21].includes(day)) log.push(`J${day}: E=${tot.E} (dispo/jour moy ${(tot.Ecap / day).toFixed(1)}) Conf=${tot.conf} P7=${tot.P7} M=${JSON.stringify(tot.M)}`);
  }
  console.log('==', name); log.forEach(l => console.log(l));
}
