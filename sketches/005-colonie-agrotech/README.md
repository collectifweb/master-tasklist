# Colonie Orée — tranche verticale interactive

Prototype mobile-first d’un gestionnaire de quêtes et jeu de colonie agro-tech. Il reprend l’énergie graphique de **Vecteur**, la boucle productive du **Potager** et le mystère du **Bastion**, sans faux terminal ni écriture dans les données réelles.

## Lancer

Les modules JavaScript ES exigent un serveur statique :

```bash
cd sketches/005-colonie-agrotech
python3 -m http.server 8080
```

Ouvrir ensuite `http://localhost:8080/`.

## Parcours démontré

1. **Aujourd’hui** classe les vraies tâches copiées depuis `tasks.json` avec la formule définie dans `RULES.md`.
2. **Commencer** crée une mission active; elle peut être terminée ou annulée sans modifier la tâche.
3. Une complétion crédite séparément Énergie, Matériaux et Réputation selon la longueur et la difficulté.
4. **Quêtes** permet recherche, tris, ajout, édition, réactivation et changement d’état dans la copie locale.
5. **Colonie** propose trois parcelles : planter coûte 3 Énergie, la maturité arrive après deux jours, récolter rapporte 2 Matériaux.
6. Au **jour 2**, l’événement déterministe **Larves cendrées** bloque l’horloge jusqu’à un choix parmi trois réponses chiffrées.
7. Les infrastructures consomment les ressources prévues : Serre hydroponique (12 E / 28 M) et Recycleur (8 E / 20 M).
8. Le **Bastion** contient Porte agricole, Tour météo et Archives enfouies. Réparer la Tour coûte 6 E / 12 M; les Archives demandent aussi 3 Réputation.
9. **Réinitialiser le sandbox** restaure le monde et la copie des tâches dans leur état initial.

## Persistance et sûreté

- État stocké uniquement dans `localStorage` sous la clé `colonie-oree-sandbox-v1`.
- Aucune requête `fetch`, XHR, WebSocket, formulaire réseau ou appel à l’API de production.
- `tasks.json`, `BRIEF.md`, `RULES.md` et les prototypes précédents ne sont jamais modifiés par l’application.
- La réinitialisation ne touche que la clé locale du prototype.

## Architecture

- `index.html` — structure sémantique, sprite SVG, quatre vues et dialogues.
- `styles.css` — direction Vecteur adulte, panorama, responsive mobile/tablette et réduction de mouvement.
- `js/data.js` — copie sandbox des tâches et règles statiques du monde.
- `js/model.js` — score, récompenses, persistance et transitions déterministes.
- `js/ui.js` — gabarits de rendu échappés et états accessibles.
- `js/app.js` — orchestration, interactions, navigation, annonces et animations significatives.

## Accessibilité

- Corps de texte à 16 px, cibles tactiles d’au moins 44 px et focus visible.
- Contrôles HTML natifs, dialogues natifs, libellés explicites et régions `aria-live`.
- Information d’état exprimée par texte en plus de la couleur.
- `prefers-reduced-motion` supprime déplacements, balayages et rotations tout en gardant les confirmations d’état.
- Téléphone : navigation basse et colonne unique. Tablette : rail gauche et composition maître-détail.
