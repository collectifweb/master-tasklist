// Petits outils DOM. Les rendus ne remplacent jamais une liste entière : ils touchent seulement ce qui change.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const SPRITE = 'design/icons.svg';
// Tant que le sprite n'est pas posé dans la page, les pictos pointent vers le fichier ; ensuite vers la page elle-même
// (un picto créé hors ligne, comme celui de l'indicateur « Hors ligne », ne dépend alors plus du réseau).
const sprite = { base: SPRITE };
export const icon = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="${sprite.base}#i-${name}"/></svg>`;

export async function inlineSprite() {
  try {
    const res = await fetch(SPRITE);
    if (!res.ok) return;
    const holder = document.createElement('div');
    holder.hidden = true;
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = await res.text();
    document.body.prepend(holder);
    sprite.base = '';
    for (const u of document.querySelectorAll(`use[href^="${SPRITE}#"]`)) u.setAttribute('href', u.getAttribute('href').slice(SPRITE.length));
  } catch { /* les pictos restent liés au fichier */ }
}

export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
export function setAttr(el, name, value) {
  if (!el) return;
  if (value === null || value === undefined || value === false) { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
  const v = value === true ? '' : String(value);
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}
export function setHtml(el, html) {
  if (el && el._html !== html) { el.innerHTML = html; el._html = html; }
}

export const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' ||
  (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Relance une animation CSS. */
export function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Met à jour les enfants de `parent` par identifiant (data-task-id) : crée les nouveaux, met à jour les
 * existants sur place, déplace seulement ceux qui ne sont pas à leur rang, retire les disparus.
 */
export function reconcile(parent, items, keyOf, make, patch, attr = 'taskId') {
  const existing = new Map();
  for (const ch of parent.children) existing.set(ch.dataset[attr], ch);
  const seen = new Set();
  items.forEach((item, i) => {
    const id = keyOf(item);
    let el = existing.get(id);
    if (!el) el = make(item);
    patch(el, item);
    if (parent.children[i] !== el) parent.insertBefore(el, parent.children[i] || null);
    seen.add(id);
  });
  for (const [id, el] of existing) if (!seen.has(id)) el.remove();
}
