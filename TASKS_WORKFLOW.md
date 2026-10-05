# 📋 Gestionnaire de Tâches Familiales — Workflow

## Concept

Alex me envoie ses tâches (texte ou vocal) et je les classe automatiquement selon :
- **Difficulté** (1-10)
- **Longueur** (1-10)
- **Priorité** (1-10)
- **Catégorie** (Maison, Terrain, Enfants, Véhicule, Administratif, autre)
- **Deadline** (si mentionnée)

Les tâches sont stockées dans `tasks/tasks.json` et affichées sur `https://todo.example.com`.

---

## Comment Alex envoie une tâche

### Texte
> "Ranger le placard, deadline vendredi"

> "Ramasser les feuilles — priorité haute"

### Vocal
> Audio Whisper → transcription → classification automatique

Alex peut donner les critères explicitement ou me laisser évaluer seul. Dans le doute, je demande.

---

## Ce que je fais à la réception d'une tâche

1. **Transcrire si vocal** (Whisper local)
2. **Évaluer les critères** selon le contenu
3. **Categoriser** automatiquement (catégorie la plus appropriée)
4. **Créer l'entrée dans `tasks/tasks.json`** avec uuid, task, difficulty, length, priority, domain, deadline, status, created
5. **Confirmer** à Alex la classification

### Règles d'évaluation par défaut

| Contexte | Difficulté | Longueur |
|---|---|---|
| Réparation maison simple | 3-4 | 2-3 |
| Travail extérieur moyen | 4-5 | 5-6 |
| Projet complexe (toit, aménagement) | 7-8 | 7-9 |
| Tâche administrative | 2-3 | 1-3 |
| Enfants (courses, rdv) | 1-2 | 1-3 |

### Catégories disponibles

- **Maison** 🏠 — réparations, entretien intérieur, améliorations
- **Terrain** 🌿 — jardinage, haies, pelouse, aménagement extérieur
- **Enfants** 👶 — rdv, courses, activités, école
- **Véhicule** 🚗 — auto, réparations, immatriculation
- **Administratif** 📋 — paperasse, assurances, banques, gouvernement

---

## Questions types que Alex peut poser

- *"Quelles sont les tâches rapides à faire maintenant ?"*
  → Filtre length ≤ 3 ET difficulty ≤ 4, statut = todo

- *"Qu'est-ce qui est prioritaire ?"*
  → Filtre priority ≥ 7, statut = todo

- *"Montre-moi les tâches du terrain"*
  → Filtre domain = Terrain

- *"Qu'est-ce qui deadline cette semaine ?"*
  → Filtre deadline dans les 7 jours

- *"Quelles sont les tâches complétées ?"*
  → Filtre status = done

---

## Fichiers du système

| Fichier | Rôle |
|---|---|
| `tasks/index.html` | Frontend — page web consultable via `https://todo.example.com` |
| `tasks/tasks.json` | **Données des tâches** — c'est ici que je lis/écris les tâches |
| `tasks/tasks-server.py` | Serveur HTTP local sur port 8767 |
| `tasks/TASKS_WORKFLOW.md` | Ce fichier — documentation du workflow |

---

## Architecture technique

```
                    todo.example.com
                              │
                       HTTPS / LiteSpeed
                              │
                   ┌──────────▼──────────┐
                   │ index.html          │
                   │ tasks.json          │
                   │ tasks-api.php       │
                   └──────────▲──────────┘
                              │
                  SSH/SCP sync toutes les minutes
                              │
                   ┌──────────┴──────────┐
                   │ tasks/tasks.json    │
                   │ copie locale agent  │
                   └─────────────────────┘

Accès public actuel: `https://todo.example.com`
Hébergement actuel : LiteSpeed/PHP dans `/home/deploy/todo`
Synchronisation     : `tasks-sync.timer` toutes les minutes
```

---

## Commandes de maintenance

La configuration réelle (dossier des tâches, hôte, port, clé, chemin distant) vit **hors du dépôt**, dans `~/.config/oree/sync.env` (modèle : `sync.env.example`). Rien de tout cela ne doit être versionné.

**Écritures simultanées avec la nouvelle app** (`app/api/api.php`, qui écrit aussi `tasks.json`) :
- Le script prend sur le serveur le même verrou que l'app (`tasks.json.lock`, à côté du fichier) avant de remplacer la liste. Il vérifie aussi que la liste distante n'a pas changé depuis sa lecture : sinon il renonce sans rien écraser (code 6) et réessaie à la minute suivante.
- Il retient comme référence l'empreinte du contenu réellement transféré, jamais une empreinte relue après coup.
- Si les deux côtés ont changé, il s'arrête sur un conflit (code 4) et garde une copie locale : à résoudre à la main.
- Banc d'essai sans serveur : `bash tests/sync-tasks-remote.test.sh sync-tasks-remote.sh`.
- **Le serveur doit avoir `flock`.** La machine d'Hermes doit utiliser cette version du script.

```bash
# Synchroniser immédiatement dans les deux directions
./sync-tasks-remote.sh sync

# Après une modification locale faite par l'agent
./sync-tasks-remote.sh push

# Récupérer les modifications faites depuis le tableau web
./sync-tasks-remote.sh pull

# Vérifier la synchronisation automatique
systemctl --user status tasks-sync.timer
journalctl --user -u tasks-sync.service --no-pager -n 30
```

---

## Débloquer l'accès à l'app (trop de codes faux)

Après 5 codes d'accès faux en 15 minutes depuis une même adresse, ou 20 en tout, l'app refuse tout code pendant 15 minutes et affiche « Trop d'essais ». Pour débloquer tout de suite, par SSH sur l'hébergement, dans le dossier du site (celui de `tasks.json`) :

```bash
rm -f app/api/data/lockout.json
```

Ce fichier ne contient que les compteurs d'essais ratés (les adresses y sont gardées sous forme d'empreinte, jamais en clair). Le supprimer débloque tout le monde d'un coup, sans avoir besoin de l'adresse d'Alex, et n'efface rien d'autre. Ne jamais toucher aux autres fichiers de `app/api/data/` : état du jeu, registre, sauvegardes.

---

## Cycle de vie d'une tâche

```
[Reçue] → [Classée] → [Visible sur todo.example.com]
                                    │
                          Alex complète la tâche
                                    │
                               [Marquée "done"]
                                    │
                          (reste visible dans filtre "Complétées")
```

---

## Bugs connus et résolutions

### Les tâches affichées ne correspondent pas au JSON

**Symptôme :** Le fichier `tasks.json` est correct mais le navigateur affiche les anciennes données de démo.

**Cause :** La fonction `load()` est asynchrone (fait un `fetch`) mais l'init ne l'appelait pas correctement :

```javascript
// ❌ Avant — load() appelé sans attendre, render() s'exécutait avant
load();
render();

// ✅ Après — IIFE async qui attend le chargement
(async () => { await load(); render(); })();
```

**Solution :** Corriger l'init dans `index.html` pour attendre `load()` avant `render()`.

**Vérification :**
```bash
# Le JSON servi est correct
curl http://localhost:8767/tasks.json | python3 -m json.tool

# Le HTML contient la bonne init
grep -A2 "INIT" /home/user/todo-app/index.html
```

---

_Mis à jour : 2026-05-12_