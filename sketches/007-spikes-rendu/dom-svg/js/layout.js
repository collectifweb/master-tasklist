// Scène de référence 12×12 (r = rangée, c = colonne). Identique pour les trois spikes.
export const N = 12;
export const PLOTS = [
  { id: 'p1', r: 6, c: 1, crop: 'ble', stage: 3 },
  { id: 'p2', r: 6, c: 4, crop: 'ble', stage: 2 },
  { id: 'p3', r: 9, c: 1, crop: 'chou', stage: 1 },
  { id: 'p4', r: 9, c: 4, crop: 'chou', stage: 3 }
];
export const BUILD_SLOT = { r: 8, c: 8 };
export const POND = { u: 10.05, v: 10.0, rx: .82, ry: .78 };

const name = (n, info) => ({ name: n, info, interactive: true });

export function initialEntities() {
  const E = [
    { id: 'muret-a', type: 'muret', r: 0, c: 1, h: 1, w: 5, depth: 25, len: 5, end: true, ...name('Muret du Bastion', 'Intact · la lisière tient') },
    { id: 'muret-b', type: 'muret', r: 0, c: 7, h: 1, w: 4, depth: 25, len: 4, start: true, ...name('Muret du Bastion', 'Porte nord · runes allumées') },
    { id: 'serre', type: 'serre', r: 2, c: 2, h: 2, w: 2, ...name('Serre solaire', 'Tomates · prêtes dans 2 h') },
    { id: 'silo', type: 'silo', r: 1, c: 4, h: 1, w: 1, ...name('Silo à grains', 'Rempli à 68 %') },
    { id: 'relais', type: 'relais', r: 3, c: 7, h: 1, w: 1, ...name('Tour-relais', 'Change tes gestes réels en élan') },
    { id: 'entrepot', type: 'entrepot', r: 2, c: 9, h: 2, w: 2, ...name('Entrepôt', 'Matériaux en réserve') },
    { id: 'pont', type: 'pont', r: 11, c: 6, h: 1, w: 1 },
    { id: 'botte', type: 'botte', r: 7, c: 10, h: 1, w: 1 },
    { id: 'epouv', type: 'epouvantail', r: 8, c: 3, h: 1, w: 1 },
    { id: 'lan1', type: 'lanterne', r: 4, c: 5, h: 1, w: 1 },
    { id: 'lan2', type: 'lanterne', r: 6, c: 7, h: 1, w: 1 },
    { id: 'lan3', type: 'lanterne', r: 10, c: 7, h: 1, w: 1 }
  ];
  for (const p of PLOTS) E.push({ ...p, type: 'plot', h: 2, w: 2, ...name(p.crop === 'ble' ? 'Parcelle de blé' : 'Parcelle de choux', '') });
  // couronne : arbres sur les bords arrière, haie et buissons devant
  const crownL = [['arbre', 'leaf', 1.15], ['sapin'], ['arbre', 'gold'], ['sapin'], ['arbre', 'amber'], ['sapin'], ['arbre', 'leaf'], ['sapin'], ['arbre', 'gold'], ['sapin'], ['buisson', 'leafb']];
  crownL.forEach(([t, m, s], r) => E.push({ id: `cl${r}`, type: t, m, s, r, c: 0, h: 1, w: 1, seed: 100 + r }));
  E.push({ id: 'cr0', type: 'arbre', m: 'gold', s: 1.05, r: 0, c: 11, h: 1, w: 1, seed: 140 });
  E.push({ id: 'h1', type: 'haie', n: 3, r: 1, c: 11, h: 3, w: 1, seed: 150 });
  E.push({ id: 'cr4', type: 'arbre', m: 'amber', s: .85, r: 4, c: 11, h: 1, w: 1, seed: 141 });
  E.push({ id: 'h2', type: 'haie', n: 3, r: 5, c: 11, h: 3, w: 1, seed: 151 });
  E.push({ id: 'cr8', type: 'buisson', m: 'leaf', r: 8, c: 11, h: 1, w: 1, seed: 142 });
  E.push({ id: 'h3', type: 'haie', n: 2, r: 9, c: 11, h: 2, w: 1, seed: 152 });
  E.push({ id: 'cr11', type: 'buisson', m: 'leafb', r: 11, c: 11, h: 1, w: 1, seed: 143 });
  E.push({ id: 'b1', type: 'buisson', m: 'leafb', r: 1, c: 1, h: 1, w: 1, seed: 160 });
  E.push({ id: 'b2', type: 'buisson', m: 'gold', r: 4, c: 1, h: 1, w: 1, seed: 161 });
  E.push({ id: 'b3', type: 'buisson', m: 'leaf', r: 1, c: 10, h: 1, w: 1, seed: 162 });
  return E;
}

// Cases réservées (pas d'herbes hautes ni de fleurs dessus)
export function occupied(u, v) {
  const c = Math.floor(u), r = Math.floor(v);
  if (Math.abs(u - 6.5) < .55 || Math.abs(v - 5.5) < .55 && u > 1 && u < 11) return true; // chemin
  if (r >= 11) return true;
  for (const p of PLOTS) if (r >= p.r && r < p.r + 2 && c >= p.c && c < p.c + 2) return true;
  const fp = [[2, 2, 2, 2], [1, 4, 1, 1], [3, 7, 1, 1], [2, 9, 2, 2], [0, 0, 1, 12], [8, 8, 1, 1]];
  for (const [rr, cc, h, w] of fp) if (r >= rr && r < rr + h && c >= cc && c < cc + w) return true;
  if (Math.hypot((u - 10.05) / .95, (v - 10) / .9) < 1) return true;
  return false;
}
