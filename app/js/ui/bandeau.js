// Bandeau d'objectifs (bible §10) : Aujourd'hui, Cette semaine, Cette saison, Prochain rang. Posé sur le monde sous
// la voie d'annonce, toujours visible. Le cœur dit quoi (bandeau(), objectifs.js) ; ici, seulement l'écriture.
// En compact, la rangée montre Aujourd'hui et le prochain rang ; « Voir tous les objectifs » la déplie en carte.
// À partir de 700 px, les quatre sont sur la rangée. Couleur toujours doublée : la barre du rang a son texte, un pas
// fait a sa coche et le mot « fait » pour les lecteurs d'écran.
// Cette semaine (bible §10, « la commande du visiteur ») : quand le marchand est au quai, sa ligne prend la place du
// compte des quêtes et ouvre son comptoir (data-action="visiteur-go") ; le compte passe dans la carte dépliée.
// L'hiver (lot H) : une tempête annoncée ajoute une rangée sous les objectifs, à toutes les largeurs (core/hiver.js,
// alerteTempete) : les jours restants, la barre de trois crans doublée de « 1 sur 3 », et « Rentrer du bois » avec son prix
// (data-action="preparer", protégé du double toucher). Le jour même, l'issue : tenue, le bâtiment sous la neige (le bouton
// ouvre sa fiche, data-action="tempete-voir") ou passée sans rien abîmer. L'objectif d'hiver compte les récoltes de serre ;
// sans serre, il dit d'en bâtir une.
import {
  bandeau as lireBandeau, visiteurDeLaSemaine, alerteTempete, refusPreparer, findEntry, batimentsDuVillage, refusConstruire,
} from '../../core/index.js';
import { t, tn } from '../content.js';
import { $, esc, icon, setAttr, setHtml, setText, restart } from './dom.js';
import { numPossede } from './format.js';
import { coutText } from './batiment.js';

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

function saisonText(s, sansSerre) {
  if (s.aVenir) return t('bandeau.saison.avenir', { saison: t(`saison.${s.id}`) });
  if (s.atteint) return t(`bandeau.saison.${s.objectif}.atteint`);
  if (sansSerre) return t('bandeau.saison.serre.sans');
  return t(`bandeau.saison.${s.objectif}`, { stock: numPossede(s.stock), max: numPossede(s.max) });
}

const ALERTE_ICON = { tenue: 'check', neige: 'pelle' };

/**
 * La rangée de la tempête : { titre, crans, max, etat, aide, issue, go: { action, params, label, html, raison } | null },
 * ou null hors alerte. Le jour même, l'issue vient du registre (clé tempete:{jour}, core/hiver.js).
 */
function alerteModel(c) {
  const a = alerteTempete(c.tasks, c.game, c.ledger, c.now);
  if (!a) return null;
  const m = {
    titre: t(`bandeau.tempete.titre.${a.joursRestants === 0 ? 'zero' : a.joursRestants === 1 ? 'one' : 'other'}`, { n: a.joursRestants }),
    crans: a.crans, max: a.max, etat: '', aide: '', issue: '', go: null,
    label: t(`bandeau.tempete.crans.label${a.crans === 1 ? '' : '.other'}`, { n: a.crans, max: a.max }),
  };
  if (a.joursRestants === 0) {
    const e = findEntry(c.ledger, `tempete:${a.jour}`);
    m.issue = e ? e.resultat : 'souffle';
    if (!e) m.etat = t('bandeau.tempete.souffle');
    else if (e.resultat === 'tenue') m.etat = t('bandeau.tempete.tenue', { cout: coutText({ materials: e.materials }) });
    else if (e.resultat === 'passee') m.etat = t('bandeau.tempete.passee');
    else {
      const nom = t(`bat.${String(e.cible).replace(/-\d+$/, '')}.nom`);
      m.etat = t('bandeau.tempete.neige', { nom });
      m.go = { action: 'tempete-voir', params: { id: e.cible }, label: t('bandeau.tempete.neige.label', { nom }), html: `${icon('pelle')}<span>${esc(t('bandeau.tempete.neige.geste'))}</span>`, raison: null };
    }
    return m;
  }
  m.aide = t('bandeau.tempete.aide');
  if (a.crans >= a.max) { m.etat = t('bandeau.tempete.pret'); m.issue = 'pret'; return m; }
  m.etat = t('bandeau.tempete.crans', { n: a.crans, max: a.max });
  const cout = coutText(a.prix);
  const raison = refusPreparer(c.tasks, c.game, c.ledger, { jour: a.jour, n: a.achetes + 1 }, c.now);
  m.go = {
    action: 'preparer', params: { jour: a.jour, n: a.achetes + 1 }, label: t('bandeau.tempete.geste.label', { cout }), raison,
    html: `${icon(raison ? 'lock' : 'materiaux')}<span class="bandeau-alerte-geste"><span>${esc(t('bandeau.tempete.geste'))}</span><small>${esc(cout)}</small></span>`,
  };
  return m;
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

    const v = b.semaine.kind === 'semaine' ? visiteurDeLaSemaine(c.game, c.now) : null;
    setText(q('#bandeau-semaine'), semaineText(b.semaine));
    q('#bandeau-semaine').hidden = !!v;
    q('.bandeau-visiteur').hidden = !v;
    setText(q('#bandeau-visiteur'), v ? tn('bandeau.visiteur', v.joursRestants) : '');
    const sd = q('.bandeau-semaine-detail');
    sd.hidden = !v;
    setText(sd, v ? semaineText(b.semaine) : '');
    const liste = q('.bandeau-pas-liste');
    liste.hidden = b.semaine.kind !== 'pas';
    setHtml(liste, b.semaine.kind === 'pas' ? pasHtml(b.semaine) : '');

    const sansSerre = b.saison.objectif === 'serre' && !batimentsDuVillage(c.game).some((x) => x.type === 'serre');
    setText(q('#bandeau-saison'), saisonText(b.saison, sansSerre));
    setAttr(q('.bandeau-saison'), 'data-atteint', b.saison.atteint ? 'true' : null);
    const detail = q('.bandeau-saison-detail');
    detail.hidden = !b.saison.objectif;
    const pourquoi = sansSerre && !b.saison.atteint ? refusConstruire(c.game, 'serre', 'serre-1') : null; // l'atelier d'abord
    setText(detail, b.saison.objectif ? `${t(`bandeau.saison.${b.saison.objectif}.titre`)}. ${t(`bandeau.saison.${b.saison.objectif}.detail`)}${pourquoi ? ` ${pourquoi}` : ''}` : '');

    renderAlerte(alerteModel(c));

    const r = b.rang;
    setText(q('#bandeau-rang-nom'), r.suivant);
    setText(q('#bandeau-rang'), tn('bandeau.rang.encore', r.encore));
    q('.bandeau-bar > i').style.setProperty('--part', String(Math.max(0, Math.min(1, r.part))));
  }

  function renderAlerte(m) {
    const box = q('#bandeau-alerte');
    setAttr(root, 'data-alerte', m ? (m.issue || 'annonce') : null);
    box.hidden = !m;
    if (!m) return;
    setText(q('#bandeau-alerte-titre'), m.titre);
    setHtml(q('.bandeau-alerte-mark'), icon(ALERTE_ICON[m.issue] || 'flocon'));
    q('.bandeau-crans').querySelectorAll('i').forEach((el, k) => setAttr(el, 'data-on', k < m.crans ? 'true' : null));
    setText(q('.bandeau-alerte-etat'), m.etat);
    setText(q('.bandeau-alerte-aide'), m.aide ? `${m.label}. ${m.aide}` : m.label);
    setText(q('#bandeau-alerte-raison'), m.go?.raison || '');
    const go = q('.bandeau-alerte-go');
    go.hidden = !m.go;
    if (!m.go) return;
    setAttr(go, 'data-action', m.go.action);
    setAttr(go, 'data-params', JSON.stringify(m.go.params));
    setAttr(go, 'aria-label', m.go.label);
    setAttr(go, 'aria-disabled', m.go.raison ? 'true' : null);
    setAttr(go, 'aria-describedby', m.go.raison ? 'bandeau-alerte-raison' : null);
    setHtml(go, m.go.html);
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
