import { staticCSS, gradientDefs, timeCSS } from './palette.js';
import { terrainSVG, WORLD, FALL, SPARKLES, D } from './terrain.js';
import { initialEntities, BUILD_SLOT } from './layout.js';
import { Scene, labelOf } from './scene.js';
import { FX, HUD, ICONS } from './fx.js';
import { nuageSVG } from './art.js';
import { rng, f } from './iso.js';

performance.mark('boot');
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  entities: initialEntities(), selected: null,
  res: { energie: 24, materiaux: 18, confiance: 3 },
  reduced: mq.matches || params.get('rm') === '1', inv: 1, hour: 14, auto: true
};
document.documentElement.classList.toggle('rm', state.reduced);

// ---- styles générés : classes de matériaux (statiques) + variables d'heure (dynamiques)
const st = document.createElement('style'); st.textContent = staticCSS(); document.head.appendChild(st);
const tt = document.createElement('style'); document.head.appendChild(tt);
$('#defs').innerHTML = `<defs>${gradientDefs()}
<radialGradient id="halo"><stop offset="0" stop-color="#b8fff2" stop-opacity=".85"/><stop offset=".4" stop-color="#7ee8da" stop-opacity=".28"/><stop offset="1" stop-color="#7ee8da" stop-opacity="0"/></radialGradient>
<radialGradient id="runeHalo"><stop offset="0" stop-color="#9ff7ea" stop-opacity=".7"/><stop offset="1" stop-color="#9ff7ea" stop-opacity="0"/></radialGradient>
<radialGradient id="lampHalo"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".85"/><stop offset=".45" stop-color="#ffc977" stop-opacity=".3"/><stop offset="1" stop-color="#ffc977" stop-opacity="0"/></radialGradient></defs>`;

// ---- décor lointain (fixe) : lisière boréale
(function backdrop() {
  const R = rng(3);
  let stars = '';
  for (let i = 0; i < 46; i++) stars += `<circle cx="${f(R() * 1000)}" cy="${f(R() * 200)}" r="${f(.6 + R() * 1.3)}" class="${i % 5 === 0 ? 'star tw' : 'star'}" style="animation-delay:${f(R() * 4)}s"/>`;
  const firs = (y0, hgt, step, cls, seed) => {
    const r = rng(seed); let d = `M0,300V${y0}`;
    for (let x = 0; x <= 1000; x += step * (.6 + r() * .8)) { const h = hgt * (.55 + r() * .6); d += `L${f(x)},${f(y0 - 4 + r() * 8)}L${f(x + step * .35)},${f(y0 - h)}L${f(x + step * .7)},${f(y0 - 2 + r() * 6)}`; }
    return `<path d="${d}L1000,${y0}V300Z" class="${cls}"/>`;
  };
  $('#backdrop').innerHTML = `<svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <g class="stars">${stars}</g>
  <g class="sun"><circle cx="760" cy="120" r="90" fill="#fff6d8" opacity=".25"/><circle cx="760" cy="120" r="34" fill="#fff6d8"/></g>
  <g class="moon"><circle cx="250" cy="90" r="20" fill="#f4f0dc"/><circle cx="259" cy="83" r="17" class="moon-cut"/></g>
  <path d="M0,300V214C120,190 210,206 330,188S560,170 690,192S900,178 1000,196V300Z" class="far1-t"/>
  ${firs(236, 46, 22, 'far2-t', 9)}${firs(262, 36, 16, 'far3-t', 12)}
  <rect y="292" width="1000" height="8" class="far3-l"/><rect y="296" width="1000" height="1.6" class="waterl-t" opacity=".7"/></svg>`;
  const cl = $('#clouds');
  [[1, 130, '10.5%', 110, -30], [2, 100, '16%', 140, -95], [3, 150, '20.5%', 170, -40]].forEach(([s, w, top, dur, del]) => {
    const c = document.createElement('div'); c.className = 'cloud'; c.style.top = top;
    c.style.animationDuration = dur + 's'; c.style.animationDelay = del + 's';
    c.innerHTML = nuageSVG(s, w); cl.appendChild(c);
  });
})();

// ---- monde
const world = $('#world');
world.insertAdjacentHTML('afterbegin', terrainSVG());
Object.assign(world.querySelector('.terrain').style, { left: WORLD.x + 'px', top: WORLD.y + 'px' });
const layers = { shadows: $('#shadows'), entities: $('#entities'), ring: $('#ring') };
const fall = document.createElement('div');
fall.className = 'fall'; fall.innerHTML = '<i></i>';
Object.assign(fall.style, { left: f(FALL[0] - 7) + 'px', top: f(FALL[1] - 3.5) + 'px', height: D + 'px' });
$('#groundfx').appendChild(fall);
SPARKLES.forEach(([x, y], i) => { const s = document.createElement('i'); s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.animationDelay = (i * .73) + 's'; $('#groundfx').appendChild(s); });

const live = $('#live');
const hud = new HUD($('.hud'), state.res);
const scene = new Scene(layers, state, select);
const fx = new FX({ scene, hud, overlay: $('#overlay'), worldfx: $('#worldfx'), groundfx: $('#groundfx'), shake: $('#shake'), live, state });
scene.hooks.stage = (n, e, from, g) => fx.stageHook(n, e, from, g);
scene.render();
scene.addWalker({ id: 'solene', kind: 'solene', name: 'Solène, agronome', info: 'Descend vers les champs', from: [6.36, .9], to: [6.36, 11.45], speed: .95, pause: 1600, phase: .12 });
scene.addWalker({ id: 'milo', kind: 'milo', name: 'Milo, technicien', info: 'Fait sa tournée du relais', from: [1.6, 5.62], to: [10.4, 5.62], speed: .8, pause: 2200, phase: .55 });
setInterval(() => scene.tickWalkers(), 140);

function select(id) {
  state.selected = state.selected === id ? null : id;
  scene.render(); scene.tickWalkers();
  const e = state.entities.find(x => x.id === state.selected);
  if (e) { const l = e.type === 'villageois' ? { name: e.name, info: e.info } : labelOf(e); live.textContent = `${l.name}. ${l.info || ''}`; }
}

// ---- caméra : déplacement, pincement, molette
const vp = $('#viewport'), cam = $('#camera');
const C = { x: 0, y: 0, s: 1 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function applyCam() {
  cam.style.transform = `translate(${f(C.x)}px, ${f(C.y)}px) scale(${C.s.toFixed(4)})`;
  state.inv = 1 / C.s;
  world.style.setProperty('--inv', state.inv.toFixed(4));
}
function fit() {
  const W = innerWidth, H = innerHeight, desk = W >= 900;
  const hudH = $('.hud').getBoundingClientRect().bottom + 6;
  const panelH = desk ? 24 : H - $('.panel').getBoundingClientRect().top + 6;
  const availH = H - hudH - panelH;
  C.s = clamp(Math.min(W / (desk ? 880 : 610), availH / 540), .42, 1.3);
  C.x = W / 2 - (desk ? 0 : 0) * C.s;
  C.y = hudH + availH * (desk ? .5 : .56) - 205 * C.s;
  applyCam();
}
const ptrs = new Map(); let drag = null, moved = false;
let idleT = 0;
const moving = () => { cam.classList.add('moving'); clearTimeout(idleT); idleT = setTimeout(() => cam.classList.remove('moving'), 250); };
vp.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  moved = false;
  drag = { x: C.x, y: C.y, s: C.s, p: [...ptrs.values()].map(p => [...p]) };
});
addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId) || !drag) return;
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  const P0 = drag.p, P1 = [...ptrs.values()];
  if (P1.length >= 2 && P0.length >= 2) {
    const d0 = Math.hypot(P0[0][0] - P0[1][0], P0[0][1] - P0[1][1]), d1 = Math.hypot(P1[0][0] - P1[1][0], P1[0][1] - P1[1][1]);
    const mx = (P1[0][0] + P1[1][0]) / 2, my = (P1[0][1] + P1[1][1]) / 2, ox = (P0[0][0] + P0[1][0]) / 2, oy = (P0[0][1] + P0[1][1]) / 2;
    const s = clamp(drag.s * d1 / d0, .4, 2.2);
    C.x = mx - (ox - drag.x) * s / drag.s; C.y = my - (oy - drag.y) * s / drag.s; C.s = s; moved = true;
  } else {
    const dx = P1[0][0] - P0[0][0], dy = P1[0][1] - P0[0][1];
    if (!moved && Math.hypot(dx, dy) < 7) return;
    moved = true; vp.classList.add('dragging');
    C.x = drag.x + dx; C.y = drag.y + dy;
  }
  C.x = clamp(C.x, -300 * C.s, innerWidth + 300 * C.s); C.y = clamp(C.y, -380 * C.s, innerHeight);
  moving(); applyCam();
});
const up = e => { ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; vp.classList.remove('dragging'); } else drag = { x: C.x, y: C.y, s: C.s, p: [...ptrs.values()].map(p => [...p]) }; };
addEventListener('pointerup', up); addEventListener('pointercancel', up);
vp.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; } }, true);
vp.addEventListener('click', () => { if (state.selected) select(state.selected); });
vp.addEventListener('wheel', e => {
  e.preventDefault();
  const s = clamp(C.s * Math.exp(-e.deltaY * .0015), .4, 2.2);
  C.x = e.clientX - (e.clientX - C.x) * s / C.s; C.y = e.clientY - (e.clientY - C.y) * s / C.s; C.s = s; moving(); applyCam();
}, { passive: false });
vp.addEventListener('scroll', () => { vp.scrollTop = 0; vp.scrollLeft = 0; });
addEventListener('keydown', e => { if (e.key === 'Escape' && state.selected) select(state.selected); });
addEventListener('resize', fit);

// ---- heure du jour
const hourIn = $('#hour'), hourOut = $('#hour-out');
function setHour(h, fromUser) {
  state.hour = ((h % 24) + 24) % 24;
  tt.textContent = timeCSS(state.hour);
  hourIn.value = state.hour;
  const H = Math.floor(state.hour), M = Math.round((state.hour - H) * 60);
  hourOut.textContent = `${H} h ${String(M).padStart(2, '0')}`;
  if (fromUser) { state.auto = false; $('#b-now').setAttribute('aria-pressed', 'false'); }
}
const nowH = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
let hourRaf = 0;
hourIn.addEventListener('input', () => { cancelAnimationFrame(hourRaf); hourRaf = requestAnimationFrame(() => setHour(Number(hourIn.value), true)); });
$('#b-now').addEventListener('click', () => { state.auto = true; $('#b-now').setAttribute('aria-pressed', 'true'); setHour(nowH()); });
setInterval(() => { if (state.auto) setHour(nowH()); }, 60000);
if (params.has('t')) { state.auto = false; setHour(Number(params.get('t'))); } else setHour(nowH());
$('#b-now').setAttribute('aria-pressed', String(state.auto));

// ---- actions
const bQuest = $('#b-quest'), bBuild = $('#b-build'), bHarvest = $('#b-harvest');
function harvestLabel() {
  const ripe = state.entities.some(e => e.type === 'plot' && e.stage === 3);
  bHarvest.querySelector('span').textContent = ripe ? 'Récolter' : 'Faire pousser';
}
bQuest.addEventListener('click', async () => {
  bQuest.disabled = true;
  const sel = state.entities.find(e => e.id === state.selected && ['serre', 'silo', 'relais', 'entrepot', 'atelier'].includes(e.type));
  await fx.quest(sel ? sel.id : 'relais');
  bQuest.disabled = false;
});
bBuild.addEventListener('click', async () => { bBuild.disabled = true; await fx.build(BUILD_SLOT); bBuild.disabled = false; });
bHarvest.addEventListener('click', async () => { await fx.harvest(); harvestLabel(); setTimeout(harvestLabel, 2700); });
$('#b-rm').addEventListener('click', () => {
  state.reduced = !state.reduced;
  $('#b-rm').setAttribute('aria-pressed', String(state.reduced));
  document.documentElement.classList.toggle('rm', state.reduced);
  for (const w of scene.walkers) { state.reduced ? (w.anim?.pause(), w.flip?.pause()) : (w.anim?.play(), w.flip?.play()); }
});
$('#b-rm').setAttribute('aria-pressed', String(state.reduced));
mq.addEventListener('change', () => { if (mq.matches !== state.reduced) $('#b-rm').click(); });
document.querySelectorAll('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', ICONS[el.dataset.icon]); });

fit();
requestAnimationFrame(() => requestAnimationFrame(() => { performance.mark('scene-ready'); document.documentElement.dataset.ready = '1'; }));
if (params.get('sel')) select(params.get('sel'));
window.__spike = { state, scene, fx, hud, setHour, select, C, applyCam, moving };
