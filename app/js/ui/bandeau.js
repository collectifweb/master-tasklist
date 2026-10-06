// Bandeau d'objectifs (bible §10) : Aujourd'hui, Cette semaine, Cette saison, Prochain rang. Posé sur le monde sous
// la voie d'annonce, toujours visible. Le cœur dit quoi (bandeau(), objectifs.js) ; ici, seulement l'écriture.
// En compact, la rangée montre Aujourd'hui et le prochain rang ; « Voir tous les objectifs » la déplie en carte.
// À partir de 700 px, les quatre sont sur la rangée. Couleur toujours doublée : la barre du rang a son texte, un pas
// fait a sa coche et le mot « fait » pour les lecteurs d'écran.
import { bandeau as lireBandeau } from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon, setAttr, setHtml, setText, restart } from './dom.js';
import { numPossede } from './format.js';

/** Texte du geste proposé par un premier pas (prochainGeste du cœur). */
function gesteText(a) {
  if (a.geste === 'construire') return t(`pas.geste.${String(a.cible).replace(/-\d+$/, '')}`);
  if (a.geste === 'semer') return t(String(a.cible).startsWith('serre') ? 'pas.geste.semer.serre' : 'pas.geste.parcelle');
  return t(`pas.geste.${a.geste}`);
}

/** Aujourd'hui : { texte, raison } pour la ligne du bandeau. */
function aujourdhuiText(a) {
  if (a.kind === 'pas') return { texte: gesteText(a), raison: a.raison };
  if (a.kind === 'quete') return { texte: a.titre, raison: null };
  return { texte: t('bandeau.rien'), raison: null };
}

function semaineText(s) {
  if (s.kind === 'pas') return t('bandeau.semaine.pas', { n: s.faits, total: s.total });
  if (!s.quetes) return t('bandeau.semaine.rien');
  return `${tn('bandeau.semaine.quetes', s.quetes)} ${tn('bandeau.semaine.jours', s.jours)}`;
}

function saisonText(s) {
  if (s.aVenir) return t('bandeau.saison.avenir', { saison: t(`saison.${s.id}`) });
  if (s.atteint) return t(`bandeau.saison.${s.objectif}.atteint`);
  return t(`bandeau.saison.${s.objectif}`, { stock: numPossede(s.stock), max: numPossede(s.max) });
}

/** Les cinq premiers pas, en liste (carte dépliée) : coche et « fait » pour un pas atteint, le pas courant en gras. */
function pasHtml(s) {
  return s.pas.map((p) => {
    const etat = p.fait ? 'is-done' : p.id === s.courant ? 'is-now' : '';
    const sr = p.fait ? t('bandeau.pas.fait') : p.id === s.courant ? t('bandeau.pas.courant') : '';
    return `<li class="bandeau-pas ${etat}"><span class="bandeau-pas-mark">${p.fait ? icon('check') : ''}</span><span>${esc(t(`pas.${p.id}.nom`))}${sr ? `<span class="sr-only"> (${esc(sr)})</span>` : ''}</span></li>`;
  }).join('');
}

/**
 * root : section#bandeau. Renvoie { render(ctx), toggle(force?), light(), action() } ; action() donne le geste
 * d'Aujourd'hui ({ kind, geste, cible, taskId }) pour le contrôleur.
 */
export function createBandeau(root) {
  let last = null;
  let allume = false; // allumé par le 3e écran d'accueil avant même que la partie le note
  const q = (sel) => $(sel, root);

  function render(c) {
    const b = lireBandeau(c.tasks, c.game, c.ledger, c.now);
    last = b;
    // le bandeau s'allume quand l'accueil a été vu (3e écran ou « Passer ») ; avant, il est posé mais éteint
    setAttr(root, 'data-lit', String(allume || !!c.game.accueil));
    setAttr(q('.bandeau-more'), 'aria-label', t('bandeau.plus'));

    const a = aujourdhuiText(b.aujourdhui);
    setText(q('#bandeau-today'), a.texte);
    setAttr(q('.bandeau-today'), 'aria-label', `${t('bandeau.aria', { texte: a.texte })}${a.raison ? ` ${a.raison}` : ''}`);
    setText(q('.bandeau-raison'), a.raison || '');
    q('.bandeau-raison').hidden = !a.raison;
    setAttr(q('.bandeau-today'), 'data-kind', b.aujourdhui.kind);

    setText(q('#bandeau-semaine'), semaineText(b.semaine));
    const liste = q('.bandeau-pas-liste');
    liste.hidden = b.semaine.kind !== 'pas';
    setHtml(liste, b.semaine.kind === 'pas' ? pasHtml(b.semaine) : '');

    setText(q('#bandeau-saison'), saisonText(b.saison));
    setAttr(q('.bandeau-saison'), 'data-atteint', b.saison.atteint ? 'true' : null);
    const detail = q('.bandeau-saison-detail');
    detail.hidden = !b.saison.objectif;
    setText(detail, b.saison.objectif ? `${t(`bandeau.saison.${b.saison.objectif}.titre`)}. ${t(`bandeau.saison.${b.saison.objectif}.detail`)}` : '');

    const r = b.rang;
    setText(q('#bandeau-rang-nom'), r.suivant);
    setText(q('#bandeau-rang'), tn('bandeau.rang.encore', r.encore));
    q('.bandeau-bar > i').style.setProperty('--part', String(Math.max(0, Math.min(1, r.part))));
  }

  function toggle(force) {
    const open = force ?? root.dataset.open !== 'true';
    setAttr(root, 'data-open', open ? 'true' : null);
    setAttr(q('.bandeau-more'), 'aria-expanded', String(open));
    return open;
  }

  /** 3e écran d'accueil : le bandeau s'allume (balayage de lumière ; en mouvement réduit, un simple fondu). */
  function light() {
    allume = true;
    setAttr(root, 'data-lit', 'true');
    restart(root, 'is-lighting');
  }

  return { render, toggle, light, action: () => last && last.aujourdhui };
}
