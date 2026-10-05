// Chapitres pilotés par le contenu : content/fr-CA/chapitres.json est passé en paramètre (`chapitres`), core/ ne lit
// aucun fichier. Objectifs évalués d'après leur `condition`, puis retenus une fois atteints (game.chapter.objectives :
// { id: jour }) ; fin de chapitre = tous les objectifs atteints, jour du chapitre ≥ dureeMinJours et Confiance du
// chapitre suivant (CHAPTER_GATES). Moments d'histoire : 3 par jour au plus.
import { Ctx } from './quests.js';
import { gameDay } from './time.js';
import { reverseKey } from './ledger.js';
import { chapterStatus, advanceChapter, SECTOR_THRESHOLDS } from './economy.js';
import { BUILDABLES, SEED_COST } from './build.js';

export const STORY_PER_DAY = 3;

/** Types de condition reconnus (un type inconnu vaut toujours faux). */
export const CONDITION_TYPES = [
  'lisiere', 'confiance', 'semis', 'recolte', 'reserve', 'batiment', 'decor', 'secteur_palier', 'lueur_en_reserve',
  'avis', 'quetes', 'etape', 'un_parmi',
];

// min / max facultatifs ; sans l'un ni l'autre : au moins 1.
const inRange = (n, c) => (c.min === undefined && c.max === undefined ? n >= 1 : n >= (c.min ?? -Infinity) && n <= (c.max ?? Infinity));
const cropCount = (counts, crop) => (crop ? counts?.[crop] ?? 0 : Object.values(counts ?? {}).reduce((s, n) => s + n, 0));

// Gains de quête (ou d'étape) comptés depuis `since`, sans ceux qui ont été remballés.
function liveEntries(s, type) {
  const keys = new Set(s.ledger.map((e) => e.key));
  return s.ledger.filter((e) => e.type === type && e.day && e.day >= s.since && (e.pe || 0) >= 0
    && !keys.has(reverseKey(e.taskId, e.occurrence)));
}

/**
 * Évalue une condition de chapitres.json. s = { game, tasks, ledger, since } ; `since` = premier jour compté pour
 * `quetes` et `etape` (le début du chapitre). Toutes les autres conditions lisent des compteurs cumulés depuis le
 * début de la partie (semis, récoltes, mises en réserve, jours de lisière) : elles ne reculent jamais.
 */
export function evalCondition(cond, s) {
  const g = s.game;
  switch (cond && cond.type) {
    case 'lisiere': return inRange((g.lisiereDays ?? []).length, cond);
    case 'confiance': return inRange(g.resources.confidence, cond);
    case 'semis': return inRange(cropCount(g.garden?.sown, cond.culture), cond);
    case 'recolte': return inRange(cropCount(g.garden?.harvested, cond.culture), cond);
    case 'reserve': return inRange(g.garden?.reserved ?? 0, cond);
    case 'batiment': // un bâtiment sans état est « construit »
      return (g.placements ?? []).some((p) => (p.id === cond.id || p.model === cond.id) && (!cond.etat || (p.state ?? 'construit') === cond.etat));
    case 'decor': return inRange((g.placements ?? []).filter((p) => p.model === cond.id).length, cond);
    case 'secteur_palier': {
      const t = SECTOR_THRESHOLDS.find((x) => x.name === cond.palier);
      return !!t && !!g.sectors[cond.secteur]?.open && g.sectors[cond.secteur].stage >= t.stage;
    }
    case 'lueur_en_reserve': return inRange(g.lueur?.[cond.secteur] ?? 0, cond); // Lueur accumulée du secteur
    case 'avis': return (g.avis?.history ?? []).some((h) => h.id === cond.id);
    case 'quetes': return inRange(liveEntries(s, 'reward').filter((e) => !cond.secteur || e.lueur?.sector === cond.secteur).length, cond);
    case 'etape': {
      const byId = new Map((s.tasks ?? []).map((t) => [String(t.id), t]));
      const long = (e) => {
        const t = byId.get(String(e.taskId));
        return !!t && (t.frozen?.length ?? t.length) >= (cond.longueurMin ?? 1);
      };
      return inRange(liveEntries(s, 'step').filter(long).length, cond);
    }
    case 'un_parmi': return (cond.conditions ?? []).some((c) => evalCondition(c, s));
    default: return false;
  }
}

export function chapterDef(chapitres, n) {
  return (chapitres?.chapitres ?? []).find((c) => c.numero === n) ?? null;
}

// Coût affiché dans le détail d'un objectif ({cout}), quand la condition vise un semis ou une construction.
function objectiveCost(cond) {
  if (!cond) return null;
  if (cond.type === 'semis' && Object.hasOwn(SEED_COST, cond.culture)) return { energy: SEED_COST[cond.culture], materials: 0 };
  if ((cond.type === 'batiment' || cond.type === 'decor') && Object.hasOwn(BUILDABLES, cond.id)) return { ...BUILDABLES[cond.id].cost };
  return null;
}

/**
 * État du chapitre en cours : { number, id, titre, day, minDays, confidence, needed, objectives: [{ id, texte, detail,
 * done, doneDay, cost }], done, total, contenu, canFinish }. `contenu: false` (chapitre absent de chapitres.json) :
 * le chapitre ne finit jamais tout seul.
 */
export function chapterProgress(game, tasks, ledger, chapitres, now) {
  const st = chapterStatus(game, now);
  const def = chapterDef(chapitres, st.number);
  const latched = game.chapter.objectives ?? {};
  const s = { game, tasks, ledger, since: game.chapter.startDay };
  const objectives = (def?.objectifs ?? []).map((o) => ({
    id: o.id, texte: o.texte, detail: o.detail ?? null,
    done: !!latched[o.id] || evalCondition(o.condition, s), doneDay: latched[o.id] ?? null,
    cost: objectiveCost(o.condition),
  }));
  const done = objectives.filter((o) => o.done).length;
  const minDays = Math.max(def?.dureeMinJours ?? 0, st.minDays);
  return {
    number: st.number, id: def?.id ?? null, titre: def?.titre ?? null, day: st.day, minDays,
    confidence: st.confidence, needed: st.needed, objectives, done, total: objectives.length, contenu: !!def,
    canFinish: !!def && done === objectives.length && st.day >= minDays && st.canAdvance,
  };
}

/**
 * Retient les objectifs nouvellement atteints (événements { type: 'objectif-atteint', chapter, id }) et, si tout est
 * prêt, termine le chapitre ({ type: 'chapitre-fin', chapter }, puis les événements d'advanceChapter : 'chapitre',
 * 'secteur-seuil'). Fonction pure : renvoie { game, events }. Appelée par advanceTime (avis.js).
 */
export function syncChapter(game, tasks, ledger, chapitres, now) {
  let g = game;
  const events = [];
  const latch = () => {
    const p = chapterProgress(g, tasks, ledger, chapitres, now);
    const fresh = p.objectives.filter((o) => o.done && !o.doneDay);
    if (fresh.length) {
      g = structuredClone(g);
      g.chapter.objectives = { ...(g.chapter.objectives ?? {}) };
      for (const o of fresh) {
        g.chapter.objectives[o.id] = gameDay(now);
        events.push({ type: 'objectif-atteint', chapter: p.number, id: o.id });
      }
    }
    return p;
  };
  const p = latch();
  if (!p.contenu) return { game, events: [] };
  if (p.canFinish) {
    events.push({ type: 'chapitre-fin', chapter: p.number });
    const r = advanceChapter(g, now);
    g = r.game;
    events.push(...r.events);
    latch(); // objectifs du nouveau chapitre déjà atteints : retenus tout de suite (un 2e appel au même instant ne fait rien)
  }
  return { game: g, events };
}

function avisContent(chapitres, id) {
  for (const c of chapitres?.chapitres ?? []) if (c.avis && c.avis.id === id) return c.avis;
  return null;
}

/**
 * Moments d'histoire à montrer maintenant, 3 par jour au plus (moins ceux déjà montrés aujourd'hui), dans cet ordre :
 * introduction, objectifs atteints puis fin des chapitres passés, ouverture du chapitre, résultat du dernier Avis, annonce de l'Avis en cours,
 * objectifs atteints, beats (`jour_du_chapitre`), annonces d'objectifs. Lignes filtrées par leur `si` ; les gabarits
 * ({prenom}, {jour}, {du_secteur}…) restent à remplir par l'interface. Rien n'est noté : l'interface appelle
 * markStorySeen avec les identifiants qu'elle a montrés. Renvoie [{ id, kind, chapter?, avis?, result?, day?, lignes }].
 */
export function storyMoments(game, tasks, ledger, chapitres, now) {
  const today = gameDay(now);
  const story = game.story ?? { seen: [], day: null, count: 0 };
  const budget = STORY_PER_DAY - (story.day === today ? story.count : 0);
  const out = [];
  if (budget <= 0 || !chapitres) return out;
  const seen = new Set(story.seen);
  const s = { game, tasks, ledger, since: game.chapter.startDay };
  const lines = (ls) => (ls ?? []).filter((l) => !l.si || evalCondition(l.si, s)).map((l) => ({ voix: l.voix, texte: l.texte }));
  const take = (id, kind, ls, extra = {}) => {
    const lignes = lines(ls);
    if (out.length >= budget || seen.has(id) || !lignes.length) return;
    out.push({ id, kind, ...extra, lignes });
    seen.add(id);
  };
  const n = game.chapter.number;

  if (chapitres.introduction) take('introduction', 'introduction', chapitres.introduction.lignes);
  for (const c of chapitres.chapitres ?? []) {
    if (c.numero >= n) continue;
    // chapitre fini : tous ses objectifs sont atteints, le dernier (qui l'a terminé) a droit à son moment avant la fin
    for (const o of c.objectifs ?? []) if (o.atteint) take(`${o.id}.atteint`, 'objectif-atteint', o.atteint, { chapter: c.numero });
    if (c.fin) take(`${c.id}.fin`, 'fin', c.fin.lignes, { chapter: c.numero });
  }

  const def = chapterDef(chapitres, n);
  const prog = def ? chapterProgress(game, tasks, ledger, chapitres, now) : null;
  const done = new Set(prog ? prog.objectives.filter((o) => o.done).map((o) => o.id) : []);
  if (def && def.ouverture) {
    const trig = def.ouverture.declencheur;
    if (trig?.type !== 'objectif_atteint' || done.has(trig.objectif)) take(`${def.id}.ouverture`, 'ouverture', def.ouverture.lignes, { chapter: n });
  }
  const opened = !def || !def.ouverture || seen.has(`${def.id}.ouverture`);

  const last = (game.avis?.history ?? []).at(-1);
  const lastText = last && avisContent(chapitres, last.id);
  if (lastText && lastText[last.result]) take(`avis.${last.id}.${last.result}`, 'avis-resultat', lastText[last.result], { avis: last.id, result: last.result });
  const cur = game.avis?.current;
  const curText = cur && avisContent(chapitres, cur.id);
  if (opened && curText) take(`avis.${cur.id}.annonce`, 'avis-annonce', curText.annonce, { avis: cur.id, day: cur.day });

  if (def && opened) {
    for (const o of def.objectifs ?? []) if (done.has(o.id) && o.atteint) take(`${o.id}.atteint`, 'objectif-atteint', o.atteint, { chapter: n });
    for (const b of def.beats ?? []) {
      if (b.declencheur?.type === 'jour_du_chapitre' && prog.day >= b.declencheur.jour) take(b.id, 'beat', b.lignes, { chapter: n });
    }
    for (const o of def.objectifs ?? []) if (!done.has(o.id) && o.annonce) take(`${o.id}.annonce`, 'objectif-annonce', o.annonce, { chapter: n });
  }
  return out;
}

/** Note les moments d'histoire montrés (params.ids) : ils ne reviennent plus et comptent dans les 3 du jour. */
export function markStorySeen(tasks, game, ledger, params, now) {
  const ctx = new Ctx(tasks, game, ledger, params, now);
  const story = ctx.game.story ?? { seen: [], day: null, count: 0 };
  const fresh = [...new Set(params.ids ?? [])].filter((id) => !story.seen.includes(id));
  if (fresh.length) {
    const count = (story.day === ctx.day ? story.count : 0) + fresh.length;
    ctx.game = { ...ctx.game, story: { seen: [...story.seen, ...fresh], day: ctx.day, count } };
  }
  return ctx.result();
}
