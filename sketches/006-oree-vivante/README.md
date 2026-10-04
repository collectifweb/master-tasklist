# Orée vivante — jeu de ferme mobile

Tranche verticale interactive de **Quêtes du foyer** : la carte isométrique est l’accueil et les tâches réelles alimentent une ferme agro-futuriste manipulable. Tout fonctionne dans un sandbox local et déterministe.

## Lancer

Les modules ES nécessitent un serveur statique :

```bash
cd sketches/006-oree-vivante
python3 -m http.server 8765
```

Ouvrir ensuite `http://localhost:8765/`.

## Boucle jouable

1. Passer ou parcourir l’onboarding en trois moments.
2. Déplier la tâche recommandée, lire son score, la commencer puis la terminer.
3. Voir Énergie, Matériaux et Réputation rejoindre la barre de ressources.
4. Planter une parcelle, inspecter la Tour météo et gagner 3 Réputation.
5. Stabiliser la Tour pour 6 Énergie et 12 Matériaux, puis émettre le signal météo qui clôt le chapitre **Le premier sillon**.
6. Inspecter et manipuler les trois parcelles, la serre endommagée, l’entrepôt, l’éboulis, la Tour et le Bastion directement sur la carte.
7. Déblayer l’éboulis pour ouvrir six cases supplémentaires.
8. Ouvrir **Construire**, choisir une nouvelle parcelle, un silo compact ou une balise florale, sélectionner une case, tourner le fantôme, placer ou annuler.
9. Recharger la page pour vérifier la persistance, ou réinitialiser le sandbox depuis le registre des quêtes.

## Contrôles de la carte

- Glisser avec le pointeur pour déplacer la carte.
- Boutons `−`, recentrage, rotation et `+` pour les actions sans geste caché.
- Au clavier, focaliser la carte puis utiliser les flèches, `+`, `−`, `0` pour recentrer et `R` pour tourner.
- Les bâtiments, parcelles, obstacles et secteurs du Bastion sont de vrais boutons accessibles.

## Ressources

- **Énergie** : planter, intervenir et répondre immédiatement aux incidents.
- **Matériaux** : construire, améliorer et réparer.
- **Réputation** : confiance cumulative, jamais dépensée; elle ouvre personnages, secteurs et chapitres.

Chaque ressource explique son rôle au toucher. La recommandation utilise priorité, brièveté et facilité; les récompenses dépendent plutôt de la longueur et de la difficulté.

## Persistance et sûreté

- État stocké uniquement dans `localStorage` sous `oree-vivante-sandbox-v3`.
- Les tâches de `tasks.json` sont copiées dans `js/data.js`; le fichier source n’est jamais modifié.
- Aucun `fetch`, XHR, WebSocket, `sendBeacon`, formulaire réseau ou appel à l’API de production.
- La réinitialisation supprime uniquement la progression locale de cette itération.

## Architecture

- `index.html` — structure sémantique, HUD, carte, feuilles, onboarding et dialogues.
- `styles.css` — monde blocky chaud, carte isométrique, mobile/tablette, états et réduction de mouvement.
- `js/data.js` — copie sandbox des tâches, objets, chapitre et état initial.
- `js/model.js` — règles, économie, persistance, progression et placement.
- `js/ui.js` — rendu échappé de la carte, des quêtes, des objectifs et des inspecteurs.
- `js/app.js` — orchestration, interactions, clavier, caméra, construction et annonces.
- `DESIGN.md` et `.impeccable/design.json` — système visuel extrait de l’implémentation.
- `review/` — captures de vérification; elles ne sont pas chargées par l’application.

## Vérifications exécutées

Le 4 octobre 2026 :

- Chromium mobile émulé à **390 × 844** : carte à environ **58 %** du viewport, aucun débordement horizontal, aucune cible visible sous 44 px.
- Chromium tablette à **834 × 1112** : composition carte + inspecteur latéral, sans débordement horizontal.
- Parcours réel : onboarding, mission, complétion et flux de ressources, plantation, déblayage, construction sur grille, rotation, placement, contrôles caméra, progression jusqu’au signal météo, persistance et reset.
- Clavier : déplacement/zoom/rotation de la carte, focus visible, feuille modale et échappement.
- `prefers-reduced-motion: reduce` : transitions de caméra et animation du signal neutralisées, états toujours annoncés.
- `node --check` sur les quatre modules JavaScript.
- Inspection réseau : seules les ressources locales HTML/CSS/JS sont chargées.

Les captures ont été produites avec Chromium; aucun appareil iOS/Android physique ni Safari mobile n’a été disponible dans ce banc de test.
