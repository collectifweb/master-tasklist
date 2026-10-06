// Barre de ressources : Énergie, Matériaux, Nourriture, Habitants et Permis (sans plafond). Le chiffre change « à l'impact ».
import { t } from '../content.js';
import { $, restart, setAttr } from './dom.js';
import { num, numPossede, numGain, entierGain } from './format.js';

const LABEL = { energie: 'resource.energy', materiaux: 'resource.materials.other', nourriture: 'resource.food', habitants: 'resource.habitants', permis: 'resource.permis' };

/** Chiffre de la puce : à partir de 1 000, la forme courte (« 1,2 k », « 12 k ») tient dans une puce de téléphone ; la valeur complète reste dans le nom lu. */
export function shortNum(n) {
  const v = Math.floor(Math.round(n * 10) / 10); // ce que le joueur possède : vers le bas
  if (Math.abs(v) < 1000) return numPossede(n);
  if (Math.abs(v) < 10000) return `${num(v / 1000)}\u00a0k`;
  return `${Math.round(v / 1000)}\u00a0k`;
}

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
        const text = shortNum(value);
        if (valueEl.firstChild.nodeValue !== text) valueEl.firstChild.nodeValue = text;
        setAttr(btn, 'aria-label', `${t(LABEL[name])}\u00a0: ${numPossede(value)}`);
        if (animate && last && last[name] !== undefined) {
          const diff = Math.round((value - last[name]) * 10) / 10;
          if (entierGain(diff) !== 0) { // un écart qui s'arrondit à 0 n'est pas montré
            const d = $('.res-delta', btn);
            d.textContent = (diff > 0 ? '+' : '−') + numGain(Math.abs(diff));
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
