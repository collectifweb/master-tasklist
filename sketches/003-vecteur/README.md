## Vecteur

### Stance
Une interface arcade/sci-fi adulte qui traite chaque tâche comme un vecteur d’action concret : énergique, graphique et précise, sans basculer dans le cockpit, le faux terminal ou le HUD décoratif.

### Choix de conception
- **Hiérarchie :** le meilleur prochain choix domine la vue Aujourd’hui; les alternatives restent immédiatement accessibles et triables.
- **Score d’élan :** le calcul est visible et explicable — priorité 55 %, brièveté 25 %, facilité 20 % — plutôt qu’un score opaque.
- **Direction visuelle :** charbon et ivoire, cyan structurel, jaune acide pour l’action, rouge signal réservé aux accents; grille vectorielle, diagonales et constellation abstraite des domaines.
- **Typographie :** caractères système, avec une pile condensée pour les titres afin de conserver le rendu numérique sans dépendance externe.
- **Données :** quêtes et domaines repris de `tasks.json`, avec formulations raccourcies uniquement lorsque la densité mobile l’exige.
- **Responsive :** mobile-first avec navigation basse; à partir de la tablette, la navigation devient un rail latéral et la vue Aujourd’hui passe en deux colonnes.
- **Accessibilité :** corps à 16 px, cibles de 44 px minimum, focus visible, libellés explicites, contraste élevé, contrôles natifs et prise en charge de `prefers-reduced-motion`.

### Interactions
- Navigation fonctionnelle entre **Aujourd’hui**, **Quêtes**, **Progression** et **Profil**.
- Tris directs par élan, priorité, longueur et difficulté.
- Filtres par domaine et état, avec recherche textuelle.
- Ajout et édition de quête dans une boîte de dialogue; les changements restent uniquement dans la session du prototype, sans écriture réseau.
- Lancement d’une mission avec état actif et temps écoulé.
- Complétion par balayage vectoriel accessible via un vrai contrôle `range`, avec solution de rechange par bouton.
- Animation de progression, mise à jour des listes et retour d’état par message `aria-live`.
- Réglages de profil interactifs.

### Forces
- Le prochain choix est identifiable en quelques secondes et son classement est justifié.
- L’esthétique est distinctive tout en laissant les tâches réelles au premier plan.
- Les interactions principales forment un parcours complet : choisir, comprendre, lancer, terminer, progresser.
- La constellation ajoute une signature visuelle et une lecture des domaines sans concurrencer la liste.
- Le prototype est autonome : HTML, CSS, SVG et JavaScript sont contenus dans `index.html`.

### Faiblesses et limites
- Les changements ne persistent pas après rechargement; c’est volontaire pour ce prototype sans écriture réseau.
- Le score et les statistiques de progression sont des hypothèses de conception, pas une économie de jeu validée.
- La complétion par balayage est une exploration gestuelle; elle devra être testée sur plusieurs appareils tactiles avant production.
- La constellation est illustrative et non un outil d’analyse détaillé.
