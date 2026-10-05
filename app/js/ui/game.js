// Agir dans l'Orée : feuille d'actions d'une parcelle, d'un repère (Tour, établi), d'une construction ou d'un secteur,
// avec les coûts, et la liste du Plan accessible qui ouvre la même feuille. Rien n'est décidé ici : chaque bouton
// vérifie son geste en appelant le cœur « à blanc » (sans rien enregistrer) ; un refus devient une raison écrite.
// Les boutons portent data-act (nom de l'action du magasin) et data-params (JSON) : main.js les exécute.
import {
  BUILDABLES, SEED_COST, CROP_STAGES, PANTRY_MAX, RESERVE_MAX, SOUFFLER, VEIL_LIFT_ENERGY, MAX_PLOTS, SECTORS,
  SECTOR_THRESHOLDS, build, sow, harvest, shareHarvest, storeReserve, souffler, liftVeil, directFilLibre, isBuilt,
} from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon } from './dom.js';
import { glyph } from './glyphs.js';
import { num, capitalize } from './format.js';
import { openSheet } from './sheets.js';
import { hasAction } from '../store.js';

const CROPS = ['courge', 'patate', 'ble'];
const SECTOR_ORDER = ['place', 'champs', 'atelier', 'archives', 'maison-commune', 'relais'];
const SECTOR_ICON = { place: 'bastion', champs: 'champs', atelier: 'atelier', archives: 'archives', 'maison-commune': 'maison-commune', relais: 'relais' };
const DECORS = Object.keys(BUILDABLES).filter((id) => BUILDABLES[id].decor);
const LANDMARK_SECTOR = { bastion: 'place', relais: 'place', tour: 'place', atelier: 'atelier', etabli: 'atelier', glaciere: 'atelier' };

// ───────── Coûts ─────────
/** Coût lisible en texte : « 20 Matériaux et 6 Énergie » (gabarit {cout} des objectifs). */
export function costText(cost) {
  const parts = [];
  if (cost && cost.materials) parts.push(tn('cost.materials', cost.materials, { n: num(cost.materials) }));
  if (cost && cost.energy) parts.push(t('cost.energy', { n: num(cost.energy) }));
  return parts.join(` ${t('cost.and')} `);
}
const resChip = (res, n) => {
  const [ic, name] = res === 'materials' ? ['materiaux', t('resource.materials.other')] : ['energie', t('resource.energy')];
  return `<span class="cost" data-res="${ic}">${esc(num(n))}${icon(ic)}<span class="sr-only"> ${esc(name)}</span></span>`;
};
/** Coût en pastilles (picto doublé d'un nom lu par les lecteurs d'écran). */
export function costHtml(cost) {
  const parts = [];
  if (cost.materials) parts.push(resChip('materials', cost.materials));
  if (cost.energy) parts.push(resChip('energy', cost.energy));
  return parts.join(`<span class="cost-and">${esc(t('cost.plus'))}</span>`);
}
/** Ce qui manque pour payer, ou null. */
function shortfall(game, cost) {
  const m = Math.max(0, Math.round(((cost.materials || 0) - game.resources.materials) * 10) / 10);
  const e = Math.max(0, Math.round(((cost.energy || 0) - game.resources.energy) * 10) / 10);
  if (!m && !e) return null;
  const parts = [];
  if (m) parts.push(resChip('materials', m));
  if (e) parts.push(resChip('energy', e));
  return `${esc(t('act.missing'))} ${parts.join(` ${esc(t('cost.and'))} `)}`;
}

/** Essai à blanc d'une action du cœur : null si elle passe, sinon le message d'erreur (déjà écrit pour le joueur). */
function dryRun(fn, c, params) {
  try { fn(c.tasks, c.game, c.ledger, { ...params, gameRevision: 'essai' }, c.now); return null; } catch (e) { return e.message; }
}

// ───────── Boutons ─────────
let uid = 0;
/**
 * Un geste : bouton (data-act) avec son coût ; refusé, il reste lisible, se dit désactivé (aria-disabled) et donne
 * sa raison juste dessous (aria-describedby).
 */
function actRow({ act, params = {}, label, cost = null, refusal = null, lack = null, hint = '', kind = 'secondary', ico = '' }) {
  const id = `act-r${++uid}`;
  const off = !!(refusal || lack);
  const reason = lack || (refusal ? esc(refusal) : '');
  const attrs = off ? ` aria-disabled="true" aria-describedby="${id}"` : hint ? ` aria-describedby="${id}"` : '';
  const costPart = cost && (cost.materials || cost.energy) ? `<span class="act-cost">${costHtml(cost)}</span>` : '';
  return `<div class="act-row">
    <button class="btn btn--${off ? 'secondary' : kind} act-btn" type="button" data-act="${esc(act)}" data-params="${esc(JSON.stringify(params))}"${attrs}>
      ${off ? icon('lock') : ico}<span class="act-label">${esc(label)}</span>${costPart}
    </button>
    ${off ? `<p class="btn-reason" id="${id}">${icon('why')}<span>${reason}</span></p>` : hint ? `<p class="act-hint" id="${id}">${esc(hint)}</p>` : ''}
  </div>`;
}

/** Ligne de bouton pour une action du cœur : coût, essai à blanc, manque. c : { tasks, game, ledger, now }. */
export function actionRow(c, fn, act, params, opts) {
  const refusal = dryRun(fn, c, params);
  const lack = refusal && opts.cost ? shortfall(c.game, opts.cost) : null;
  return actRow({ act, params, refusal: lack ? null : refusal, lack, ...opts });
}

const section = (title, body, cls = '') => body ? `<section class="act-section${cls ? ' ' + cls : ''}">${title ? `<h3 class="act-section-title">${esc(title)}</h3>` : ''}${body}</section>` : '';
const veilOf = (game, sector) => (game.avis && game.avis.veils || []).find((v) => v.sector === sector) || null;
const sectorOpen = (game, id) => !!(game.sectors[id] && game.sectors[id].open);

// ───────── Parcelles et garde-manger ─────────
function cropName(crop, n = 1) { return tn(`crop.${crop}`, n, { n }); }

function plotState(p) {
  if (!p.crop) return t('act.plot.empty');
  const need = CROP_STAGES[p.crop] || 1;
  const stage = p.stage || 0;
  return `${capitalize(t(`monde.crop.${p.crop}`))} · ${stage >= need ? t('act.plot.ripe') : t('act.plot.growing', { s: num(stage), n: need })}`;
}
const STAGE_KEYS = ['monde.stage.0', 'sector.level.repair', 'sector.level.thrive', 'sector.level.autonomous'];
const stageText = (st) => t(STAGE_KEYS[Math.max(0, Math.min(3, st || 0))]);

function gardenBlock(c) {
  const g = c.game.garden;
  if (!g) return '';
  const total = CROPS.reduce((s, k) => s + (g.pantry[k] || 0), 0);
  // avant la première récolte : rien à montrer, la feuille reste courte ; ensuite le bloc reste en place, même vide
  const ever = CROPS.some((k) => (g.harvested || {})[k] > 0);
  if (!total && !g.reserve && !ever) return '';
  const list = CROPS.map((k) => `<li><span class="act-count">${num(g.pantry[k] || 0)}</span> ${esc(cropName(k, g.pantry[k] || 0))}</li>`).join('');
  let rows = actionRow(c, storeReserve, 'storeReserve', { n: 1 }, {
    label: t('act.reserve'), ico: glyph('bocal'), hint: t('act.reserve.hint', { n: num(g.reserve || 0), max: RESERVE_MAX }),
  });
  if (hasAction('shareHarvest')) {
    for (const k of CROPS) {
      if (!(g.pantry[k] > 0)) continue;
      rows += actionRow(c, shareHarvest, 'shareHarvest', { crop: k, n: 1 }, { label: t(`act.share.${k}`), ico: glyph('partage'), kind: 'quiet' });
    }
  }
  return section(t('act.pantry.title', { n: num(total), max: PANTRY_MAX }), `<ul class="act-pantry">${list}</ul>${rows}`);
}

function plotBody(c, plot) {
  const veil = veilOf(c.game, 'champs');
  const need = plot.crop ? CROP_STAGES[plot.crop] || 1 : 0;
  let rows = '';
  if (!plot.crop) {
    rows = CROPS.map((k, i) => actionRow(c, sow, 'sow', { crop: k, plotId: plot.id }, {
      label: t(`act.sow.${k}`), cost: { energy: SEED_COST[k], materials: 0 }, ico: icon('champs'),
      hint: t('act.sow.hint', { n: CROP_STAGES[k] }), kind: i === 0 ? 'primary' : 'secondary',
    })).join('');
  } else if ((plot.stage || 0) >= need) {
    rows = actionRow(c, harvest, 'harvest', { plotId: plot.id }, { label: t('act.harvest'), ico: glyph('panier'), kind: 'primary' });
  } else {
    const left = Math.ceil(need - (plot.stage || 0));
    rows = actRow({ act: 'harvest', params: { plotId: plot.id }, label: t('act.harvest'), refusal: tn('act.harvest.wait', left, { n: left }) });
  }
  const note = `<p class="act-text">${esc(plot.crop ? t('act.plot.grows') : t('act.plot.choose'))}</p>${veil ? `<p class="act-text act-text--frost">${glyph('voile')}<span>${esc(t('act.plot.veil'))}</span></p>` : ''}`;
  return note + section('', rows) + gardenBlock(c);
}

// ───────── Repères (Tour, établi) et constructions posées ─────────
function landmarkBody(c, id) {
  const def = BUILDABLES[id];
  const done = (c.game.placements || []).some((p) => p.id === id);
  if (done) return `<p class="act-text act-text--done">${icon('check')}<span>${esc(t(`act.${id}.done`))}</span></p>`;
  if (!sectorOpen(c.game, def.sector)) return `<p class="act-text">${esc(t(`act.${id}.text`))}</p><p class="act-text">${icon('lock')}<span>${esc(t('act.sector.closed.short'))}</span></p>`;
  return `<p class="act-text">${esc(t(`act.${id}.text`))}</p>` + section('', actionRow(c, build, 'build', { id }, {
    label: t(`act.build.${id}`), cost: def.cost, ico: icon('chantier'), kind: 'primary',
  }));
}

function placementBody(c, pl) {
  const key = `act.model.${pl.model}`;
  const text = t(key) === key ? t('act.model.decor') : t(key);
  return `<p class="act-text act-text--done">${icon('check')}<span>${esc(text)}</span></p>`;
}

// ───────── Secteur ─────────
function buildRows(c, sector) {
  const g = c.game;
  let rows = '';
  for (const [id, def] of Object.entries(BUILDABLES)) {
    if (def.decor || def.sector !== sector) continue;
    const count = def.landmark ? (g.placements || []).filter((p) => p.id === id).length
      : id === 'parcelle' ? (g.plots || []).length : (g.placements || []).filter((p) => p.model === def.model).length;
    if (def.max === 1 && count >= 1) continue; // déjà là : rien à proposer
    const hint = id === 'parcelle' ? t('act.parcelle.hint', { n: count, max: MAX_PLOTS }) : t(`act.${id}.hint`) === `act.${id}.hint` ? '' : t(`act.${id}.hint`);
    rows += actionRow(c, build, 'build', { id }, { label: t(`act.build.${id}`), cost: def.cost, ico: icon('chantier'), hint });
  }
  if (!isBuilt(g, 'etabli')) {
    rows += `<p class="act-text">${icon('lock')}<span>${esc(t('act.decor.locked'))}</span></p>`;
  } else {
    for (const id of DECORS) {
      const def = BUILDABLES[id];
      rows += actionRow(c, build, 'build', { id, sector }, { label: t(`act.build.${id}`), cost: def.cost, ico: icon('lueur'), kind: 'quiet' });
    }
  }
  return rows;
}

function sectorBody(c, sector) {
  const g = c.game;
  const open = sectorOpen(g, sector);
  const lueur = Math.round((g.lueur && g.lueur[sector]) || 0);
  let html = '';
  if (open) {
    const st = g.sectors[sector].stage || 0;
    const next = SECTOR_THRESHOLDS.find((x) => x.stage === st + 1);
    html += `<p class="act-text">${esc(stageText(st))} · ${esc(next ? t('act.sector.lueur', { n: num(lueur), cible: next.lueur }) : t('act.sector.lueur.full', { n: num(lueur) }))}</p>`;
  } else {
    const ch = SECTORS[sector] ? SECTORS[sector].chapter : null;
    html += `<p class="act-text">${icon('lock')}<span>${esc(t('act.sector.closed', { n: ch || '?', lueur: num(lueur) }))}</span></p>`;
  }
  const veil = veilOf(g, sector);
  if (veil) {
    html += section(tn('act.veil.title', veil.cells, { n: veil.cells }), actionRow(c, liftVeil, 'liftVeil', { sector }, {
      label: t('act.veil.lift'), cost: { energy: VEIL_LIFT_ENERGY, materials: 0 }, ico: glyph('voile'), kind: 'primary',
      hint: t('act.veil.hint', { date: dateText(veil.until) }),
    }), 'act-section--frost');
  }
  if (open) html += section(t('act.build.title'), buildRows(c, sector));
  if (sector === 'champs' && open) html += gardenBlock(c);
  // Fil libre : le diriger ici, ou souffler sur la cendre pour en faire
  const fil = Math.floor((g.filLibre || 0) * 100) / 100;
  const filRow = fil > 0
    ? actionRow(c, (tk, gm, lg, p, n) => directFilLibre(gm, p.sector, p.amount), 'directFil', { sector, amount: fil }, {
      label: t('act.fil.direct', { n: num(fil) }), ico: icon('lueur'), hint: t(open ? 'act.fil.hint' : 'act.fil.hint.closed'),
    })
    : actRow({ act: 'directFil', params: { sector }, label: t('act.fil.direct.none'), refusal: t('act.fil.empty') });
  html += section(t('act.fil.title', { n: num(fil) }), filRow + actionRow(c, souffler, 'souffler', {}, {
    label: t('act.souffler'), cost: { energy: SOUFFLER.energy, materials: 0 }, ico: glyph('souffle'), kind: 'quiet',
    hint: t('act.souffler.hint', { n: SOUFFLER.filLibre }),
  }));
  html += `<p class="act-links"><button class="btn btn--quiet btn--small" type="button" data-act="filter" data-params="${esc(JSON.stringify({ sector }))}">${icon('search')}${esc(t('act.sector.quests', { du_secteur: t(`sector.${sector}.of`) }))}</button></p>`;
  return html;
}

const fDate = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
function dateText(day) { return fDate.format(new Date(day + 'T12:00:00Z')); }

// ───────── Cible touchée → feuille ─────────
/**
 * Normalise ce que le monde (ou le plan) désigne : { type: 'plot' | 'landmark' | 'placement' | 'sector', id, sector }.
 * Accepte aussi l'ancien { type: 'object', id, model, sector }. Renvoie null si rien n'est actionnable (personnage, caisse).
 */
export function resolveTarget(info, game) {
  if (!info || !info.id) return null;
  const plots = game.plots || [];
  const placements = game.placements || [];
  const id = String(info.id);
  if (info.type === 'sector') return { type: 'sector', id };
  if (info.type === 'plot' || plots.some((p) => p.id === id)) return plots.some((p) => p.id === id) ? { type: 'plot', id } : null;
  if (BUILDABLES[id] && BUILDABLES[id].landmark) return { type: 'landmark', id };
  const pl = placements.find((p) => p.id === id);
  if (pl) return { type: 'placement', id };
  if (info.type === 'landmark' || info.type === 'object' || info.type === 'placement') {
    if (info.taskId || info.model === 'caisse') return null; // caisse d'échéance : la fiche de quête s'en occupe
    if (['fanal', 'solene', 'milo', 'char'].includes(info.model)) return null;
    const sector = info.sector || LANDMARK_SECTOR[id];
    return sector && SECTORS[sector] ? { type: 'sector', id: sector } : null;
  }
  return null;
}

/** Titre et corps de la feuille pour une cible résolue. */
function sheetContent(c, target) {
  const g = c.game;
  if (target.type === 'plot') {
    const plot = (g.plots || []).find((p) => p.id === target.id);
    if (!plot) return null;
    return { title: t('act.plot.title', { n: (Number.isInteger(plot.slot) ? plot.slot : 0) + 1 }), sub: plotState(plot), sector: 'champs', body: plotBody(c, plot) };
  }
  if (target.type === 'landmark') {
    const def = BUILDABLES[target.id];
    return { title: t(`monde.obj.${target.id}`), sub: t(`sector.${def.sector}.name`), sector: def.sector, body: landmarkBody(c, target.id) };
  }
  if (target.type === 'placement') {
    const pl = (g.placements || []).find((p) => p.id === target.id);
    if (!pl) return null;
    return { title: t(`monde.obj.${pl.model}`), sub: t(`sector.${pl.sector}.name`), sector: pl.sector, body: placementBody(c, pl) };
  }
  if (target.type === 'sector' && SECTORS[target.id]) {
    return { title: t(`sector.${target.id}.name`), sub: t(`sector.${target.id}.domain`), sector: target.id, body: sectorBody(c, target.id) };
  }
  return null;
}

/** Ouvre (ou met à jour) la feuille d'actions. Renvoie false si la cible n'existe pas. */
export function openActions(c, target, { refresh = false } = {}) {
  const dlg = $('#dlg-act');
  const s = sheetContent(c, target);
  if (!s) return false;
  dlg.dataset.target = JSON.stringify(target);
  const sectorLink = target.type !== 'sector'
    ? `<button class="btn btn--quiet btn--small" type="button" data-act="open-target" data-params="${esc(JSON.stringify({ type: 'sector', id: s.sector }))}">${icon(SECTOR_ICON[s.sector] || 'bastion')}${esc(t('act.sector.open', { secteur: t(`sector.${s.sector}.name`) }))}</button>`
    : '';
  dlg.innerHTML = `
    <header class="sheet-head">
      <h2 class="sheet-title" id="act-t" tabindex="-1">${esc(s.title)}<small class="act-sub">${esc(s.sub)}</small></h2>
      <button class="btn btn--quiet btn--icon" type="button" data-close aria-label="${esc(t('act.close'))}">${icon('x')}</button>
    </header>
    <div class="sheet-body act-body">${s.body}${sectorLink ? `<p class="act-links">${sectorLink}</p>` : ''}</div>`;
  if (!refresh) {
    openSheet(dlg);
    const first = dlg.querySelector('.act-btn:not([aria-disabled="true"])');
    (first || $('#act-t', dlg)).focus();
  }
  return true;
}

/** Met à jour la feuille ouverte (état changé ailleurs) sans voler le focus. */
export function refreshActions(c) {
  const dlg = $('#dlg-act');
  if (!dlg.open || !dlg.dataset.target) return;
  const had = document.activeElement && dlg.contains(document.activeElement) ? document.activeElement.dataset.params + '|' + document.activeElement.dataset.act : null;
  if (!openActions(c, JSON.parse(dlg.dataset.target), { refresh: true })) return;
  if (had) {
    const back = [...dlg.querySelectorAll('[data-act]')].find((b) => `${b.dataset.params}|${b.dataset.act}` === had);
    (back || $('#act-t', dlg)).focus();
  }
}

// ───────── Plan accessible : les mêmes gestes, en liste ─────────
/** Rendu de la section « Agir dans l'Orée » du Plan accessible (un bouton par cible, qui ouvre la même feuille). */
export function planActionsHtml(c) {
  const g = c.game;
  const items = [];
  const item = (target, name, state, iconName) => items.push(`<li class="plan-act">
      <span class="plan-act-text">${icon(iconName)}<span><span class="plan-act-name">${esc(name)}</span><span class="plan-act-state">${esc(state)}</span></span></span>
      <button class="btn btn--secondary btn--small" type="button" data-act="open-target" data-params="${esc(JSON.stringify(target))}" aria-label="${esc(t('plan.act.label', { nom: name }))}">${esc(t('plan.act.button'))}</button>
    </li>`);
  if (sectorOpen(g, 'champs')) {
    for (const p of g.plots || []) item({ type: 'plot', id: p.id }, t('act.plot.title', { n: (Number.isInteger(p.slot) ? p.slot : 0) + 1 }), plotState(p), 'champs');
  }
  for (const id of ['tour', 'etabli']) {
    const def = BUILDABLES[id];
    if (!sectorOpen(g, def.sector)) continue;
    const done = (g.placements || []).some((p) => p.id === id);
    item({ type: 'landmark', id }, t(`monde.obj.${id}`), done ? t(`act.${id}.state.done`) : t(`act.${id}.state.todo`), def.sector === 'place' ? 'bastion' : def.sector);
  }
  for (const sid of SECTOR_ORDER) {
    if (!g.sectors[sid]) continue;
    const st = g.sectors[sid].open ? stageText(g.sectors[sid].stage) : t('sector.closed');
    item({ type: 'sector', id: sid }, t(`sector.${sid}.name`), st, SECTOR_ICON[sid]);
  }
  return `<h2 class="act-section-title" id="plan-acts-t">${esc(t('plan.act.title'))}</h2><ul class="plan-acts" aria-labelledby="plan-acts-t">${items.join('')}</ul>`;
}
