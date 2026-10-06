// 18. Écrans d'accueil (bible §2) : trois écrans courts au premier lancement, passables à tout moment (« Passer »,
// Échap), montrés une seule fois et notés dans la partie. Le bandeau d'objectifs est éteint avant, le 3e écran
// l'allume ; « Commencer » rend le focus au bandeau. Pendant cette visite, rien d'autre ne s'ouvre (pas de mur
// d'écrans). Mouvement réduit : rien ne glisse. Mercredi fixe : pas de bilan du dimanche.
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib.cjs');
const WEDNESDAY = new Date('2026-10-07T14:00:00Z'); // 10 h à Montréal
const T = JSON.parse(fs.readFileSync(path.join(L.REPO, 'app', 'content', 'fr-CA', 'interface.json'), 'utf8'));
const TEXTES = [1, 2, 3].map((n) => T[`accueil.${n}`]);

const norm = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const ecran = (page) => page.evaluate(() => {
  const d = document.getElementById('dlg-accueil');
  const tx = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const btns = [...d.querySelectorAll('.accueil-foot button')];
  const desc = document.getElementById(d.getAttribute('aria-describedby') || '-');
  return {
    open: d.open && !d.classList.contains('is-closing'), n: d.dataset.ecran, titre: tx(d.querySelector('#accueil-t')),
    etape: tx(d.querySelector('.accueil-etape')), texte: tx(d.querySelector('.accueil-texte')), desc: tx(desc),
    boutons: btns.map(tx), cibles: btns.map(box),
    focus: d.contains(document.activeElement) ? tx(document.activeElement) : null,
    lit: document.getElementById('bandeau').dataset.lit,
    deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
const fresh = async (newPage, srv, ctxOpts) => {
  const { page } = await newPage(null, ctxOpts);
  await page.clock.install({ time: WEDNESDAY });
  await page.goto(srv.url);
  await L.ready(page);
  await L.waitFor(async () => (await ecran(page)).open, 6000);
  await page.waitForTimeout(300);
  return page;
};

L.runScenario('18. écrans d’accueil : trois écrans, passables, une seule fois, le 3e allume le bandeau', async ({ R, srv, newPage, shot }) => {
  // ───── les trois écrans, puis « Commencer »
  const page = await fresh(newPage, srv);
  let e = await ecran(page);
  R.check('premier lancement : l’accueil s’ouvre, écran 1 sur 3', e.open && e.titre === 'Bienvenue à l’Orée' && norm(e.etape) === 'Écran 1 sur 3' && norm(e.texte) === norm(TEXTES[0]), JSON.stringify(e));
  R.check('écran 1 : « Suivant » a le focus, « Passer » est là', e.focus === 'Suivant' && e.boutons.join('|') === 'Passer|Suivant', JSON.stringify(e));
  R.check('le texte de l’écran décrit la feuille (lu avec elle)', norm(e.desc) === norm(TEXTES[0]), e.desc);
  R.check('boutons de 44 px au moins', e.cibles.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(e.cibles));
  R.check('avant la fin de l’accueil, le bandeau est posé mais éteint', e.lit === 'false', e.lit);
  R.check('aucun défilement horizontal', !e.deborde);
  await shot(page, '18-accueil-1');
  await page.click('#dlg-accueil [data-action="accueil-suivant"]');
  e = await ecran(page);
  R.check('écran 2 sur 3 : son texte, le focus reste sur « Suivant »', e.n === '2' && norm(e.etape) === 'Écran 2 sur 3' && norm(e.texte) === norm(TEXTES[1]) && e.focus === 'Suivant', JSON.stringify(e));
  await page.click('#dlg-accueil [data-action="accueil-suivant"]');
  e = await ecran(page);
  R.check('écran 3 sur 3 : l’objectif, un seul bouton « Commencer » qui a le focus', e.n === '3' && norm(e.texte) === norm(TEXTES[2]) && e.boutons.join('|') === 'Commencer' && e.focus === 'Commencer', JSON.stringify(e));
  R.check('le 3e écran allume le bandeau (accueil encore ouvert)', e.lit === 'true' && e.open, JSON.stringify(e));
  await shot(page, '18-accueil-3');
  const words = TEXTES.join(' ').split(/\s+/).length;
  R.check(`trois écrans courts : ${words} mots en tout (moins d’une minute de lecture)`, words <= 60, String(words));
  await page.click('#dlg-accueil .accueil-foot [data-close]');
  R.check('« Commencer » ferme l’accueil et le note dans la partie', await L.waitFor(() => srv.game()?.accueil === '2026-10-07', 4000) && !(await ecran(page)).open, JSON.stringify(srv.game()?.accueil));
  R.check('le focus passe à « Aujourd’hui » du bandeau', await L.waitFor(() => page.evaluate(() => !!document.activeElement?.matches('.bandeau-today')), 2000), await page.evaluate(() => document.activeElement?.className));
  await page.waitForTimeout(1500);
  R.check('pendant cette visite, aucune autre feuille ne suit', await page.evaluate(() => !document.querySelector('dialog[open]')));
  await page.reload();
  await L.ready(page);
  await page.waitForTimeout(1500);
  R.check('rechargement : plus d’accueil, bandeau allumé', !(await ecran(page)).open && (await ecran(page)).lit === 'true');

  // ───── « Passer » dès le 1er écran
  const srv2 = await L.startServer();
  try {
    const p2 = await fresh(newPage, srv2);
    await p2.click('#dlg-accueil .accueil-foot [data-close]');
    R.check('« Passer » ferme l’accueil, noté comme vu, bandeau allumé', await L.waitFor(async () => !!srv2.game()?.accueil && !(await ecran(p2)).open && (await ecran(p2)).lit === 'true', 4000));
  } finally {
    srv2.stop();
  }

  // ───── Échap à l'écran 2, en mouvement réduit
  const srv3 = await L.startServer();
  try {
    const p3 = await fresh(newPage, srv3, { reducedMotion: 'reduce' });
    await p3.click('#dlg-accueil [data-action="accueil-suivant"]');
    await p3.waitForTimeout(60);
    const still = await p3.evaluate(() => {
      const m = getComputedStyle(document.documentElement).getPropertyValue('--motion').trim();
      const tr = getComputedStyle(document.querySelector('#dlg-accueil .accueil-gains')).transform;
      return { m, tr };
    });
    R.check('mouvement réduit : rien ne glisse à l’écran 2', still.m === '0' && (still.tr === 'none' || still.tr === 'matrix(1, 0, 0, 1, 0, 0)'), JSON.stringify(still));
    await p3.keyboard.press('Escape');
    R.check('Échap ferme l’accueil à tout moment, noté comme vu', await L.waitFor(async () => !!srv3.game()?.accueil && !(await ecran(p3)).open, 4000));
  } finally {
    srv3.stop();
  }
}, { fresh: true });
