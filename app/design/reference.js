// Page de référence : interactions de démonstration seulement (aucun appel réseau, aucune donnée réelle).
// Montre à l'équipe qui branchera la logique quels attributs et classes basculer.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = () =>
  document.documentElement.dataset.motion === 'reduce' ||
  (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

const app = $('#app');
const live = $('#live');

/* ── Panneau : replié (peek) ↔ ouvert ─────────────────────────────── */
function setPanel(open) {
  app.dataset.panel = open ? 'open' : 'peek';
  const toggle = $('[data-action="toggle-panel"]');
  toggle.setAttribute('aria-expanded', String(open));
  $('.panel-toggle-label', toggle).textContent = open ? 'Replier' : 'Tout voir';
  if (!open) $('#panel-scroll').scrollTop = 0;
}

/* ── Annonce de gain : voie réservée + région aria-live ───────────── */
function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // relance l'animation
  el.classList.add(cls);
}

const res = {
  energie: { value: 30, label: 'Énergie' },
  materiaux: { value: 78, label: 'Matériaux' },
};

function gain(name, delta) {
  const r = res[name];
  r.value += delta;
  const btn = $(`.hud .res[data-res="${name}"]`);
  const valueEl = $('.res-value', btn);
  valueEl.firstChild.nodeValue = String(r.value);
  btn.setAttribute('aria-label', `${r.label} : ${r.value}`);
  const d = $('.res-delta', btn);
  d.textContent = `+${delta}`;
  restart(d, 'is-shown');
  restart(btn, 'is-hit');
}

function announce(title) {
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  restart($('#announce'), 'is-shown');
  // les chiffres changent à « l'impact », juste après l'apparition de l'annonce
  setTimeout(() => {
    gain('energie', 3);
    gain('materiaux', 5);
  }, reduced() ? 0 : 320);
  live.textContent = '';
  setTimeout(() => {
    live.textContent = `Quête terminée : ${title}. Gains : +3 Énergie, +5 Matériaux.`;
  }, 60);
}

/* ── Feuilles : spécimen posé dans la page ↔ vraie fenêtre modale ── */
function openSheet(id) {
  const d = document.getElementById(id);
  if (!d) return;
  d.close();
  d.classList.remove('sheet--inline');
  d.dataset.modal = 'true';
  d.showModal();
}
function closeSheet(d) {
  if (d.dataset.modal !== 'true') return;
  d.classList.add('is-closing');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    d.classList.remove('is-closing');
    d.close();
  };
  d.addEventListener('animationend', (e) => e.target === d && finish(), { once: true });
  setTimeout(finish, 400);
}
for (const d of $$('dialog.sheet')) {
  d.addEventListener('close', () => {
    // l'événement arrive après coup : ignorer celui du close() fait juste avant showModal()
    if (d.open || d.dataset.modal !== 'true') return;
    delete d.dataset.modal;
    d.classList.add('sheet--inline');
    d.setAttribute('open', ''); // retour dans le catalogue, sans voler le focus
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(d);
  });
  d.addEventListener('click', (e) => {
    if (e.target === d) closeSheet(d); // toucher le fond
  });
}

/* ── Pas à pas 1–10 ───────────────────────────────────────────────── */
const DUREES = ['5 min', '15 min', '30 min', '45 min', '1 h', '2 h', '3 h', '4 h', '4 h', '4 h'];
function hint(kind, v) {
  if (kind === 'l') return `≈ ${DUREES[v - 1]}`;
  if (kind === 'p') return v >= 8 ? 'Prioritaire' : v >= 4 ? 'Moyenne' : 'Basse';
  return v >= 7 ? 'Exigeant' : v >= 4 ? 'Moyen' : 'Facile';
}
function syncStepper(group) {
  const out = $('output', group);
  const v = Number(out.value || out.textContent);
  $('[data-step="-1"]', group).disabled = v <= 1;
  $('[data-step="1"]', group).disabled = v >= 10;
  const kind = group.getAttribute('aria-labelledby').slice(-1);
  const h = $('.stepper-hint', group.closest('.stepper-row'));
  if (h) h.textContent = hint(kind, v);
}
$$('.stepper').forEach(syncStepper);

/* ── Délégation des clics ─────────────────────────────────────────── */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-open]');
  if (!t) return;

  if (t.dataset.open) return openSheet(t.dataset.open);
  if (t.hasAttribute('data-close')) return closeSheet(t.closest('dialog'));

  if (t.matches('.alt-row')) {
    const open = t.getAttribute('aria-expanded') !== 'true';
    t.setAttribute('aria-expanded', String(open));
    t.closest('.alt').classList.toggle('is-open', open);
    return;
  }
  if (t.matches('.chip[aria-pressed]')) {
    t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
    return;
  }
  if (t.dataset.step) {
    const group = t.closest('.stepper');
    const out = $('output', group);
    out.value = String(Math.min(10, Math.max(1, Number(out.value || out.textContent) + Number(t.dataset.step))));
    syncStepper(group);
    return;
  }

  const action = t.dataset.action;
  const inShell = Boolean(t.closest('#app'));
  switch (action) {
    case 'toggle-panel':
      setPanel(app.dataset.panel !== 'open');
      break;
    case 'replay-announce':
      announce('Réparer une poignée');
      break;
    case 'complete':
      if (inShell) {
        const title = t.closest('.fil-quest, .quest, .alt')?.querySelector('.fil-title, .quest-title, .alt-title')?.textContent;
        announce(title || 'Quête');
      }
      break;
    case 'why':
      if (inShell) openSheet('dlg-why');
      break;
    case 'add':
      openSheet('dlg-add');
      break;
    case 'open':
      if (inShell) openSheet('dlg-fiche');
      break;
    case 'search-clear': {
      const input = $('.search-input', t.closest('.search'));
      input.value = '';
      t.hidden = true;
      input.focus();
      break;
    }
  }
});

document.addEventListener('input', (e) => {
  if (!e.target.matches('.search-input')) return;
  const clear = $('.search-clear', e.target.closest('.search'));
  if (clear) clear.hidden = e.target.value === '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.dataset.panel === 'open' && !document.querySelector('dialog[data-modal]')) {
    setPanel(false);
    $('[data-action="toggle-panel"]').focus();
  }
});

/* ── Nuancier : contrastes calculés à partir des jetons ───────────── */
function rgb(value) {
  const v = value.trim();
  if (v.startsWith('#')) {
    const h = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join('') : v.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  return m ? m[1].split(/[\s,/]+/).slice(0, 3).map(Number) : [0, 0, 0];
}
function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const css = getComputedStyle(document.documentElement);
for (const sw of $$('.swatch[data-fg][data-bg]')) {
  const fg = css.getPropertyValue(sw.dataset.fg);
  const bg = css.getPropertyValue(sw.dataset.bg);
  const chip = $('.swatch-chip', sw);
  chip.style.color = fg;
  chip.style.background = bg;
  const ratio = contrast(rgb(fg), rgb(bg));
  $('.ratio', sw).textContent = `${ratio.toFixed(1).replace('.', ',')}:1`;
  sw.dataset.ratio = ratio.toFixed(2);
}
