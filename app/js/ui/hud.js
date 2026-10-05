// Barre de ressources : Énergie, Matériaux (avec plafond), Confiance, Lueur. Le chiffre change « à l'impact ».
import { t } from '../content.js';
import { $, restart, setAttr } from './dom.js';
import { num } from './format.js';

const LABEL = { energie: 'resource.energy', materiaux: 'resource.materials.other', confiance: 'resource.confidence', lueur: 'resource.lueur' };

export function resourcesOf(game) {
  const lueur = Object.values(game.lueur || {}).reduce((a, b) => a + b, 0) + (game.filLibre || 0);
  return {
    energie: { value: game.resources.energy, cap: game.caps.energy },
    materiaux: { value: game.resources.materials, cap: game.caps.materials },
    confiance: { value: game.resources.confidence },
    lueur: { value: Math.round(lueur) },
  };
}

export function createHud(root) {
  let last = null;
  return {
    /** animate : montre l'écart (+N, −N) et le « coup » sur la puce. */
    render(game, { animate = false } = {}) {
      const vals = resourcesOf(game);
      for (const [name, r] of Object.entries(vals)) {
        const btn = $(`.res[data-res="${name}"]`, root);
        const valueEl = $('.res-value', btn);
        const text = num(r.value);
        if (valueEl.firstChild.nodeValue !== text) valueEl.firstChild.nodeValue = text;
        let capEl = $('.res-cap', btn);
        if (r.cap) {
          if (!capEl) { capEl = document.createElement('span'); capEl.className = 'res-cap'; valueEl.append(capEl); }
          if (capEl.textContent !== '/' + num(r.cap)) capEl.textContent = '/' + num(r.cap);
        }
        const nom = t(LABEL[name]);
        const full = !!(r.cap && r.value >= r.cap);
        setAttr(btn, 'aria-label', r.cap ? `${nom} : ${text} sur ${num(r.cap)}${full ? ', plein' : ''}` : `${nom} : ${text}`);
        setAttr(btn, 'data-full', full ? 'true' : 'false');
        if (animate && last && last[name] !== undefined) {
          const diff = Math.round((r.value - last[name]) * 10) / 10;
          if (diff !== 0) {
            const d = $('.res-delta', btn);
            d.textContent = (diff > 0 ? '+' : '−') + num(Math.abs(diff));
            d.classList.toggle('res-delta--spend', diff < 0);
            restart(d, 'is-shown');
            restart(btn, 'is-hit');
          }
        }
      }
      last = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.value]));
    },
  };
}
