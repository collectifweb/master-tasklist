# Orée vivante

Orée vivante transforme une liste de tâches en jeu de gestion agricole. Les tâches accomplies produisent des ressources qui servent à développer une ferme, construire des installations et résoudre des incidents dans un monde blocky agro-futuriste.

## État du projet

Le dépôt contient actuellement :

- l’application historique dans `index.html`;
- le cahier des charges dans `PRODUCT.md`;
- plusieurs explorations interactives dans `sketches/`;
- l’itération principale dans `sketches/006-oree-vivante/`.

La version 006 comprend notamment une carte interactive, la gestion locale des quêtes, la construction par toucher, clavier ou glisser-déposer, la progression par ressources et des incidents aux jours 2 à 4.

## Données

Aucune tâche personnelle ne doit être versionnée.

- `tasks.json` contient les données réelles de l’instance hébergée et est ignoré par Git.
- `tasks.example.json` contient uniquement des exemples génériques utilisables en développement.
- Les prototypes sauvegardent leur progression dans `localStorage`.
- Les captures locales susceptibles d’afficher des données privées sont ignorées.

Pour développer localement :

```bash
cp tasks.example.json tasks.json
python3 -m http.server 8080
```

Ouvrir ensuite :

- application historique : `http://127.0.0.1:8080/`
- Orée vivante : `http://127.0.0.1:8080/sketches/006-oree-vivante/`

## Vérifications

```bash
node --check sketches/006-oree-vivante/js/data.js
node --check sketches/006-oree-vivante/js/model.js
node --check sketches/006-oree-vivante/js/ui.js
node --check sketches/006-oree-vivante/js/app.js
python3 -m json.tool tasks.example.json
```

## Principes de confidentialité

- Ne jamais committer `tasks.json`.
- Ne pas inclure de titres de tâches réelles dans les prototypes, tests, captures ou exemples.
- Garder les données de production sur l’hébergement prévu à cet effet.
- Vérifier les fichiers suivis avant chaque publication publique.

## Licence

Aucune licence open source n’est accordée pour le moment. Tous droits réservés.
