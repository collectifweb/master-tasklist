# Règles sandbox — Colonie Orée

## Score de recommandation

Le score sert uniquement à ordonner les tâches:

`score = round(55 × priorité/10 + 25 × (11-longueur)/10 + 20 × (11-difficulté)/10)`

Ordre secondaire: priorité décroissante, longueur croissante, difficulté croissante, date de création, identifiant.

## Ressources

- Énergie: interventions, plantations, constructions et réponses immédiates.
- Matériaux: bâtiments, améliorations et réparations.
- Réputation: progression cumulative non dépensable; ouvre secteurs et chapitres.
- Solde sandbox initial: 16 Énergie, 12 Matériaux, 0 Réputation.
- Aucun solde négatif.

## Récompenses de tâches

Les récompenses ne dépendent pas du score de recommandation.

- Micro: +2 Énergie, +1 Matériau.
- Courte: +3 Énergie, +2 Matériaux.
- Moyenne: +5 Énergie, +4 Matériaux, +1 Réputation.
- Longue: +8 Énergie, +7 Matériaux, +2 Réputation.
- Jalon: +12 Énergie, +10 Matériaux, +3 Réputation.
- Difficulté 7 à 10: +2 Matériaux et +1 Réputation dans la démonstration.

## Bonus hors tâches

Pour le prototype, ils sont simulables mais plafonnés:

- Retour quotidien: +1 Énergie, une fois par jour.
- Planification de 1 à 3 tâches: +1 Énergie, une fois par jour.
- Ajout d’une vraie tâche structurée: +1 Énergie, une fois par jour.
- Bilan: +1 Énergie, +1 Matériau, +1 Réputation, une fois par semaine.

## Ferme minimale

- Trois parcelles.
- Planter coûte 3 Énergie.
- Une culture mûrit en deux jours simulés et produit 2 Matériaux.
- États: vide, semée, croissance, mûre, endommagée, récupération.
- Serre hydroponique: 12 Énergie et 28 Matériaux.
- Recycleur: 8 Énergie et 20 Matériaux.

## Bastion minimal

- Intégrité initiale: 72/100.
- Secteurs: Porte agricole, Tour météo, Archives enfouies.
- Réparer coûte 6 Énergie et 12 Matériaux.
- Le prototype montre un fragment du chapitre « Le premier sillon ».

## Événement démontré

Larves cendrées:

- Traiter: 6 Énergie, aucune perte.
- Protéger durablement: 4 Énergie et 8 Matériaux, réduit les prochains coûts.
- Accepter la perte: une parcelle devient endommagée; elle se répare pour 4 Énergie.

L’événement ne touche jamais les tâches ou leur historique.

## Horloge de démonstration

Le prototype fournit un contrôle « Avancer d’un jour » dans les outils de simulation. Les cultures et événements sont déterministes. Le rechargement conserve le sandbox local; « Réinitialiser » restaure l’état initial.
