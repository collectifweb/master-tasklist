## Prototype: Le Conseil du Foyer

### Stance
Un RPG adulte traité comme un journal de campagne contemporain: la décision utile passe avant la décoration, et la cérémonie n’apparaît qu’au moment d’accomplir une vraie tâche.

### Choix de conception
- **Direction visuelle:** ivoire, bleu nuit et cuivre; typographie éditoriale; lignes cartographiques fines; sceaux et médaillons géométriques sans parchemin, mascotte ni icône emoji.
- **Mobile-first:** colonne unique et navigation basse sur téléphone; recommandation et registre côte à côte sur grand écran; cibles tactiles de 44 px minimum.
- **Conseil explicable:** la recommandation annonce pourquoi elle gagne selon le contexte choisi. Le score est calculé par `priorité × 100 + (10 − longueur) × 10 + (10 − difficulté)`, ce qui garantit que la priorité domine, puis la brièveté, puis la simplicité.
- **Données:** les quêtes affichées reprennent les entrées réelles de `tasks.json`; les modifications du prototype restent uniquement en mémoire et disparaissent au rechargement.
- **Accessibilité:** HTML sémantique, navigation clavier, focus visible, contrastes soutenus, libellés accessibles et prise en charge de `prefers-reduced-motion`.

### Interactions
- Changer le contexte du Conseil: disponible, moins de 30 minutes, énergie basse ou autour du foyer.
- Trier les quêtes par priorité, longueur, difficulté ou score du Conseil.
- Ajouter une quête depuis le registre, avec aperçu immédiat du score.
- Modifier le titre, le domaine et les valeurs P/L/D d’une quête; le score est recalculé en direct.
- Accomplir une quête avec un sceau animé, puis annuler depuis le message de confirmation.
- Réactiver depuis le Journal une quête accomplie pendant la session.
- Parcourir les vues Quêtes, Journal, Foyer et Profil; basculer les préférences de démonstration.

### Forces
- La prochaine action est identifiable et justifiée en quelques secondes.
- La métaphore RPG reste adulte et directement liée au travail réel.
- Le prototype couvre le cœur du flux: choisir, trier, ajouter, modifier, accomplir, annuler et réactiver.
- Le fichier HTML est autonome, sans dépendance ni requête réseau.

### Faiblesses et limites
- Aucun stockage persistant, aucune synchronisation et aucune écriture vers l’API existante.
- Les unités de longueur restent abstraites (échelle 1–9) plutôt que converties en durées validées.
- Les vues Foyer et Profil démontrent une direction produit, mais ne constituent pas encore des systèmes complets de progression ou de réglages.
- La date et le résumé de campagne sont figés pour ce prototype du 4 octobre 2026.

### Ouverture
Ouvrir directement `index.html` dans un navigateur moderne. Aucun serveur ni outil de compilation n’est requis.
