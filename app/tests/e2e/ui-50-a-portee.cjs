// 50. Rien de touchable caché derrière un autre objet (lot G), aux trois largeurs. Un village fictif complet : chalets,
// parcelles et serres semées, atelier, quai, éolienne, grenier et les quatre bâtiments du rang Village.
//   - chaque bâtiment à l'écran est le premier touché sur au moins la moitié de sa zone de toucher (14 × 14 points de sa
//     boîte, comptés s'ils sont dans la zone et dans l'écran). À son ancienne place (r 0,5 c 10,6), le mât de l'éolienne
//     prenait les trois quarts de celle de la cabane à sucre (26 % lui restaient) ;
//   - aucun défilement horizontal.
// Données fictives seulement.
const L = require('./lib.cjs');

const SEUIL = 50;
const TYPES = ['chalet', 'chalet', 'chalet', 'parcelle', 'parcelle', 'parcelle', 'atelier', 'serre', 'serre', 'quai', 'eolienne', 'grenier', 'tour', 'scierie', 'poulailler', 'cabane'];

function partie(core) {
  const g = L.quietState(core);
  const auj = core.gameDay(new Date());
  g.habitants = 6;
  g.premiersPas = Object.fromEntries(core.PAS_IDS.map((id) => [id, core.addDays(auj, -30)]));
  g.resources = { energy: 60, materials: 80, food: 10 };
  const n = {};
  g.batiments = TYPES.map((t) => ({ id: `${t}-${(n[t] = (n[t] || 0) + 1)}`, type: t }));
  g.parcelles = ['parcelle-1', 'parcelle-2', 'parcelle-3', 'serre-1', 'serre-2'].map((id) => ({ id, semeLe: auj }));
  return g;
}

/** Pour chaque bâtiment : points de sa zone de toucher dans l'écran, part où un toucher l'atteint, et qui prend le reste
 *  (le premier, dans la pile au point, des zones de toucher et de l'interface posée sur l'île). */
const parts = (page, ids) => page.evaluate((ids) => {
  const out = {};
  for (const id of ids) {
    const hit = document.querySelector(`.ow-ent[data-id="${id}"] .ow-hit`);
    if (!hit) continue;
    const r = hit.getBoundingClientRect();
    let pts = 0, siens = 0;
    const autres = {};
    for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) {
      const x = r.left + (r.width * (i + 0.5)) / 14, y = r.top + (r.height * (j + 0.5)) / 14;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const pile = document.elementsFromPoint(x, y);
      if (!pile.includes(hit)) continue;
      pts++;
      const top = pile.find((n) => n.classList?.contains('ow-hit') || n.closest?.('.ow-plaque, .ow-bulle, .ow-zbtn, .ow-bord, .hud, #panel, .bandeau'));
      if (top === hit) { siens++; continue; }
      const qui = top?.closest('.ow-ent')?.dataset.id || top?.closest('.ow-plaque')?.dataset.sector || '?';
      autres[qui] = (autres[qui] || 0) + 1;
    }
    if (pts) out[id] = { part: Math.round((100 * siens) / pts), pts, autres };
  }
  return out;
}, ids);

L.runScenario('50 · rien de touchable caché derrière un autre objet', async ({ R, srv, tag, core, newPage, shot }) => {
  const ids = partie(core).batiments.map((b) => b.id);
  const { page } = await newPage();
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page, 1200);
  await page.waitForTimeout(900);
  const res = await parts(page, ids);
  const vus = Object.entries(res).filter(([, v]) => v.pts >= 20);
  R.check(`au moins dix bâtiments à l'écran (${tag})`, vus.length >= 10, vus.map(([id]) => id).join(' '));
  const caches = vus.filter(([, v]) => v.part < SEUIL);
  R.check(`chaque bâtiment à l'écran se touche sur au moins ${SEUIL} % de sa zone (${tag})`, caches.length === 0, JSON.stringify(Object.fromEntries(caches)));
  R.check(`aucun défilement horizontal (${tag})`, !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
  await shot(page, '50-a-portee');
}, { game: partie });
