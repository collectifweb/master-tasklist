// Barre de ressources : Énergie, Matériaux, Nourriture, Habitants et Permis (sans plafond). Le chiffre change « à l'impact ».
import { t } from '../content.js';
import { $, restart, setAttr } from './dom.js';
import { num } from './format.js';

const LABEL = { energie: 'resource.energy', materiaux: 'resource.materials.other', nourriture: 'resource.food', habitants: 'resource.habitants', permis: 'resource.permis' };

export function resourcesOf(game) {
  return {
    energie: game.resources.energy,
    materiaux: game.resources.materials,
    nourriture: game.resources.food,
    habitants: game.habitants,
    permis: Math.max(0, Math.floor(Number(game.permis?.dispo) || 0)),
  };
}

export function createHud(root) {
  let last = null;
  return {
    /** animate : montre l'écart (+N, −N) et le « coup » sur la puce. */
    render(game, { animate = false } = {}) {
      const vals = resourcesOf(game);
      for (const [name, value] of Object.entries(vals)) {
        const btn = $(`.res[data-res="${name}"]`, root);
        const valueEl = $('.res-value', btn);
        const text = num(value);
        if (valueEl.firstChild.nodeValue !== text) valueEl.firstChild.nodeValue = text;
        setAttr(btn, 'aria-label', `${t(LABEL[name])}\u00a0: ${text}`);
        if (animate && last && last[name] !== undefined) {
          const diff = Math.round((value - last[name]) * 10) / 10;
          if (diff !== 0) {
            const d = $('.res-delta', btn);
            d.textContent = (diff > 0 ? '+' : '−') + num(Math.abs(diff));
            d.classList.toggle('res-delta--spend', diff < 0);
            restart(d, 'is-shown');
            restart(btn, 'is-hit');
          }
        }
      }
      last = vals;
    },
  };
}
