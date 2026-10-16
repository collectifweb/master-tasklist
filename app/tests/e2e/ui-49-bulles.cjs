// 49. Les bulles de la carte (lot L6), aux trois largeurs. Une partie fictive : deux parcelles et la serre mûres, une
// parcelle qui pousse, trois chalets avec une place et de quoi accueillir, la réserve à 12 de son plafond.
//   - une bulle au-dessus de chaque culture mûre et du premier chalet qui peut accueillir, aucune sur la parcelle qui
//     pousse ; 44 px au moins, hors de l'ordre de tabulation, un nom lu (« récolter +5 Nourriture ») ;
//   - toute bulle est touchable ou comptée dans une flèche au bord ; toucher une flèche amène la caméra (à 390 px, les
//     parcelles sont hors de vue à gauche) ;
//   - toucher une bulle de récolte récolte d'un coup : la Nourriture vole vers la barre, la partie du serveur et la barre
//     gagnent la récolte, la bulle part, la phrase lue est celle de la fiche ; un double toucher ne récolte qu'une fois ;
//   - la récolte qui ne tiendrait plus dans la réserve dit « ouvrir la fiche » et ouvre la fiche sans rien récolter ;
//   - la bulle du chalet ouvre sa fiche sans rien dépenser ; la carte en liste dit « mûr, à récolter » et « une famille
//     peut venir » ;
//   - en mouvement réduit (second serveur, même partie), la récolte se fait sans vol ;
//   - aucune tâche réelle touchée, aucun défilement horizontal.
// Données fictives seulement.
const L = require('./lib.cjs');

const sp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const TASKS = [
  { id: 'b1', task: 'Ranger le garde-manger', domain: 'Maison', difficulty: 3, length: 2, priority: 7, status: 'todo', created: jour(-6) },
  { id: 'b2', task: 'Tailler la haie', domain: 'Terrain', difficulty: 5, length: 5, priority: 5, status: 'todo', created: jour(-4) },
];

function partie(core) {
  const g = L.quietState(core);
  g.premiersPas = { tache: jour(-9), terminer: jour(-9), semer: jour(-9), famille: jour(-8), chalet: jour(-8) };
  g.habitants = 5;
  const b = (type, n = 1) => ({ id: `${type}-${n}`, type });
  g.batiments = [b('chalet'), b('chalet', 2), b('chalet', 3), b('atelier'), b('serre'), b('quai'), b('parcelle'), b('parcelle', 2), b('parcelle', 3), b('eolienne'), b('grenier')];
  g.parcelles = [{ id: 'parcelle-1', semeLe: jour(-8) }, { id: 'parcelle-2', semeLe: jour(-8) }, { id: 'parcelle-3', semeLe: jour(-3) }, { id: 'serre-1', semeLe: jour(-8) }];
  g.niveaux = { champs: 1, atelier: 0, mairie: 0, ecole: 0, garage: 0, place: 0 };
  g.permis = { dispo: 3, depuis: jour(-2) };
  g.resources = { energy: 300, materials: 300, food: 0 };
  g.resources.food = core.stockage(g) - 12;
  g.lastOpenDay = jour(-1); g.lastSeenDay = jour(-1);
  return g;
}
// les jours de visite (lot J) : les cultures ont poussé
const registre = () => Array.from({ length: 12 }, (_, i) => {
  const d = jour(i - 12);
  return { key: `bonus:ouverture:${d}`, at: `${d}T13:00:00.000Z`, day: d, type: 'bonus', bonus: 'ouverture', pe: 0, energy: 1, materials: 0 };
});

/** Bulles et flèches à l'écran : rectangle, nom lu, et si un toucher en leur milieu les atteint. */
const etat = (page) => page.evaluate(() => {
  const r = (n) => { const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const touche = (n, x, y) => { const h = document.elementFromPoint(x, y); return !!h && n.contains(h); };
  const bulles = [...document.querySelectorAll('.ow-bulle')].map((n) => {
    const b = n.getBoundingClientRect();
    return { de: n.dataset.de, kind: n.dataset.bulle, label: n.getAttribute('aria-label'), tab: n.getAttribute('tabindex'), r: r(n), touchable: touche(n, b.left + b.width / 2, b.top + 24) };
  });
  const bords = [...document.querySelectorAll('.ow-bord')].filter((n) => !n.hidden).map((n) => {
    const b = n.getBoundingClientRect();
    return { cote: n.dataset.cote, label: n.getAttribute('aria-label'), n: Number(n.querySelector('.ow-bord-n').textContent) || 1, r: r(n), touchable: touche(n, b.left + b.width / 2, b.top + b.height / 2) };
  });
  return { bulles, bords, large: document.documentElement.scrollWidth > innerWidth, ouvertes: [...document.querySelectorAll('dialog[open]')].map((d) => d.id) };
});
const nourriture = (srv) => srv.game().resources.food;
const centre = (x) => [x.r[0] + x.r[2] / 2, x.r[1] + 24];
const gainDe = (b) => Number((sp(b.label).match(/récolter \+(\d+) Nourriture/) || [])[1]);

/** Une bulle touchable du genre voulu (filtre), en touchant une flèche au bord si aucune n'est à l'écran. */
async function bulle(page, filtre) {
  for (let i = 0; i < 3; i++) {
    const e = await etat(page);
    const x = e.bulles.find((b) => b.touchable && filtre(b));
    if (x) return x;
    const bord = e.bords.find((b) => b.touchable);
    if (!bord) return null;
    await page.mouse.click(bord.r[0] + bord.r[2] / 2, bord.r[1] + bord.r[3] / 2);
    await page.waitForTimeout(1100);
  }
  return null;
}

L.runScenario('49 · les bulles de la carte : récolte d\'un toucher, réserve pleine, flèche au bord', async ({ R, srv, tag, core, newPage, shot }) => {
  const taches = JSON.stringify(srv.readTasks());
  const { page, context } = await newPage();
  await context.addInitScript(L.VOICES);
  await page.goto(srv.url);
  await L.ready(page);
  await L.closeWelcome(page);
  await page.waitForTimeout(900);

  // ce qui attend un geste
  const e0 = await etat(page);
  const de = (k) => e0.bulles.filter((b) => b.kind === k).map((b) => b.de).sort();
  R.check(`une bulle de récolte sur chaque culture mûre, aucune sur celle qui pousse (${tag})`, JSON.stringify(de('recolte')) === JSON.stringify(['parcelle-1', 'parcelle-2', 'serre-1']), JSON.stringify(de('recolte')));
  R.check(`une bulle de famille sur un chalet (${tag})`, de('famille').length === 1 && /^chalet-/.test(de('famille')[0]), JSON.stringify(e0.bulles.map((b) => [b.de, b.kind])));
  R.check(`bulles de 44 px au moins (${tag})`, e0.bulles.every((b) => b.r[2] >= 44 && b.r[3] >= 44), JSON.stringify(e0.bulles.map((b) => b.r)));
  R.check(`bulles hors de l'ordre de tabulation (${tag})`, e0.bulles.every((b) => b.tab === '-1'), JSON.stringify(e0.bulles.map((b) => b.tab)));
  R.check(`nom lu d'une récolte : « récolter +n Nourriture » (${tag})`, e0.bulles.filter((b) => b.kind === 'recolte').every((b) => gainDe(b) > 0), JSON.stringify(e0.bulles.map((b) => b.label)));
  const cachees = e0.bulles.filter((b) => !b.touchable).length;
  R.check(`toute bulle hors de vue est comptée dans une flèche au bord (${tag})`, e0.bords.reduce((s, b) => s + b.n, 0) === cachees, JSON.stringify({ cachees, bords: e0.bords }));
  R.check(`flèches au bord de 44 px, touchables, nommées (${tag})`, e0.bords.every((b) => b.r[2] >= 44 && b.r[3] >= 44 && b.touchable && /hors de vue/.test(sp(b.label))), JSON.stringify(e0.bords));
  if (tag === 390) R.check('à 390 px, une flèche au bord pour les parcelles hors de vue', e0.bords.length > 0, JSON.stringify(e0.bulles.map((b) => [b.de, b.touchable])));
  R.check(`aucun défilement horizontal (${tag})`, !e0.large);
  await shot(page, '49-bulles');

  // une flèche au bord amène la caméra
  const bord = e0.bords.find((b) => b.touchable);
  if (bord) {
    const avant = new Set(e0.bulles.filter((b) => b.touchable).map((b) => b.de));
    await page.mouse.click(bord.r[0] + bord.r[2] / 2, bord.r[1] + bord.r[3] / 2);
    await page.waitForTimeout(1100);
    const e1 = await etat(page);
    R.check(`toucher la flèche « ${sp(bord.label)} » montre ce qu'elle comptait (${tag})`, e1.bulles.some((b) => b.touchable && !avant.has(b.de)), JSON.stringify(e1.bulles.map((b) => [b.de, b.touchable])));
  }

  // la récolte d'un toucher
  const a = await bulle(page, (b) => b.kind === 'recolte' && gainDe(b) > 0);
  R.check(`une récolte qui tient dans la réserve est touchable (${tag})`, !!a);
  if (a) {
    const n = gainDe(a), f0 = nourriture(srv);
    await L.said(page, true);
    await page.mouse.click(...centre(a));
    await page.waitForTimeout(260);
    R.check(`la Nourriture s'envole vers la barre (${tag})`, await page.evaluate(() => !!document.querySelector('.ow-envol')));
    await page.waitForTimeout(1400);
    const e2 = await etat(page);
    R.check(`récolte faite d'un toucher : +${n} Nourriture dans la partie (${tag})`, nourriture(srv) === f0 + n, `${f0} → ${nourriture(srv)}`);
    R.check(`la barre du haut le montre (${tag})`, await L.resValue(page, 'nourriture') === f0 + n);
    R.check(`la bulle est partie, aucune fiche ouverte (${tag})`, !e2.bulles.some((b) => b.de === a.de) && e2.ouvertes.length === 0, JSON.stringify(e2));
    const dits = (await L.said(page)).map((s) => sp(s.text));
    R.check(`phrase lue : celle de la fiche (${tag})`, dits.some((s) => s.includes(`Récolte : ${n} Nourriture.`)), JSON.stringify(dits));
  }

  // un double toucher ne récolte qu'une fois
  const b2 = await bulle(page, (b) => b.kind === 'recolte' && gainDe(b) > 0);
  R.check(`une deuxième récolte touchable (${tag})`, !!b2);
  if (b2) {
    const n = gainDe(b2), f0 = nourriture(srv);
    await page.mouse.click(...centre(b2));
    await page.waitForTimeout(90);
    await page.mouse.click(...centre(b2));
    await page.waitForTimeout(1800);
    const e3 = await etat(page);
    R.check(`double toucher : une seule récolte, +${n} (${tag})`, nourriture(srv) === f0 + n, `${f0} → ${nourriture(srv)}`);
    R.check(`double toucher : aucune fiche ouverte (${tag})`, e3.ouvertes.length === 0, JSON.stringify(e3.ouvertes));
  }

  // la dernière ne tient plus dans la réserve : la bulle ouvre la fiche
  const c = await bulle(page, (b) => b.kind === 'recolte');
  R.check(`la récolte qui ne tient plus dit « ouvrir la fiche » (${tag})`, !!c && /ouvrir la fiche/.test(sp(c.label)), c ? c.label : 'aucune');
  if (c) {
    const f0 = nourriture(srv);
    await page.mouse.click(...centre(c));
    await page.waitForTimeout(700);
    const fiche = await page.evaluate(() => { const d = document.getElementById('dlg-batiment'); return d.open ? d.dataset.batId : null; });
    R.check(`réserve presque pleine : la fiche de « ${c.de} » s'ouvre (${tag})`, fiche === c.de, String(fiche));
    R.check(`réserve presque pleine : rien n'est récolté (${tag})`, nourriture(srv) === f0, `${f0} → ${nourriture(srv)}`);
    await shot(page, '49-reserve-pleine');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // la bulle du chalet ouvre sa fiche, sans rien dépenser
  const fam = await bulle(page, (b) => b.kind === 'famille');
  R.check(`la bulle du chalet est touchable (${tag})`, !!fam);
  if (fam) {
    const g0 = srv.game();
    await page.mouse.click(...centre(fam));
    await page.waitForTimeout(700);
    const fiche = await page.evaluate(() => { const d = document.getElementById('dlg-batiment'); return d.open ? d.dataset.batId : null; });
    const g1 = srv.game();
    R.check(`la bulle du chalet ouvre sa fiche (${tag})`, fiche === fam.de, String(fiche));
    R.check(`rien n'est dépensé (${tag})`, g1.habitants === g0.habitants && g1.resources.food === g0.resources.food);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // la carte en liste dit la même chose
  await L.openPlan(page);
  await page.waitForTimeout(500);
  const plan = await page.evaluate(() => [...document.querySelectorAll('.ow-plan-bat-etat')].map((n) => n.textContent.trim().toLowerCase()));
  R.check(`carte en liste : « Mûr, à récolter » et « Une famille peut venir » (${tag})`, plan.some((x) => x.includes('mûr, à récolter')) && plan.some((x) => x.includes('une famille peut venir')), JSON.stringify(plan));
  R.check(`aucune tâche réelle touchée (${tag})`, JSON.stringify(srv.readTasks()) === taches);
  await page.close();

  // mouvement réduit : la récolte se fait sans vol (second serveur, même partie)
  const srv2 = await L.startServer({ tasks: TASKS, game: partie(core), ledger: registre() });
  try {
    const { page: p2 } = await newPage({}, { reducedMotion: 'reduce' });
    await p2.goto(srv2.url);
    await L.ready(p2);
    await L.closeWelcome(p2);
    await p2.waitForTimeout(600);
    const r = await bulle(p2, (b) => b.kind === 'recolte' && gainDe(b) > 0);
    R.check(`mouvement réduit : une récolte touchable (${tag})`, !!r);
    if (r) {
      const n = gainDe(r), f0 = nourriture(srv2);
      let vol = false;
      await p2.mouse.click(...centre(r));
      for (let i = 0; i < 8; i++) { vol ||= await p2.evaluate(() => !!document.querySelector('.ow-envol')); await p2.waitForTimeout(60); }
      await p2.waitForTimeout(500);
      R.check(`mouvement réduit : rien ne vole (${tag})`, !vol);
      R.check(`mouvement réduit : +${n} dans la partie et dans la barre (${tag})`, nourriture(srv2) === f0 + n && await L.resValue(p2, 'nourriture') === f0 + n, `${f0} → ${nourriture(srv2)}`);
    }
    await p2.close();
  } finally {
    srv2.stop();
  }
}, { tasks: TASKS, game: partie, ledger: registre });
