---
version: 1
slug: "design-reference-html"
primary_target: "design/reference.html"
related_targets: ["css/tokens.css","css/base.css","css/components.css"]
---

# Surface : fondations visuelles de app/ (page de référence)

Portée : jetons, base et composants de la semaine 1 de « La lisière rallumée », plus la mise en page qui accueillera le monde SVG de la semaine 2. Mode : Operate (Alex choisit, ajoute et termine de vraies quêtes, surtout au téléphone, en visites de quelques secondes).

Monde : établi. Palette et matières de 006 (DESIGN.md « La lisière réparée ») et esthétique du spike dom-svg (aplats low-poly à 3 tons, socle en strates). On étend, on ne remplace pas. Aucune question posée : le propriétaire dort, décisions tirées de PRODUCT.md, RECOMMANDATION.md §1-3-6-7, GLITCHES.md, MOTION.md.

Contraintes : aucune police ni bibliothèque chargée depuis Internet (un fichier local serait permis ; choix de la semaine 1 : polices du système, voir « Typographie » ci-dessous), aucune donnée réelle, 44 px, 4,5:1, couleur toujours doublée, aucun rouge pour une échéance passée, braise réservée aux menaces et à la casse, annonce de gain qui ne couvre jamais un bouton.

## Direction contract

THESIS : l'interface est le papier de lanterne posé sur l'Orée ; le monde reste dessous et visible. Refuse le tableau de bord de tâches plein écran et la liste qui écrase la carte.

OWN-WORLD : papier récolte et crème sur un ciel-lac ; sauge profonde pour agir, verre solaire pour l'information, terre pour les Matériaux et les caisses d'échéance, lumière de lanterne pour la Lueur, cendre chaude pour l'archivé, braise seulement pour la casse. Tout ce qui s'enfonce a un socle plein (face latérale du bloc, comme les strates de l'île) ; tout ce qui flotte a une ombre douce.

STORY : en deux secondes, Alex lit la quête n° 1, sa durée et sa Cote, et touche « Fait ». Le gain s'annonce dans une voie réservée sous les ressources, jamais par-dessus un bouton.

FIRST VIEWPORT : 390×844. Ressources en haut sur le ciel ; monde sur 70 % de la hauteur ; feuille du bas repliée (≈30 %) qui montre le Fil du jour : titre sur 2 lignes, ≈ durée, Cote, raison, « Fait ✓ » et « Je m'y mets ». À ≥1000 px ou en paysage (≥700 px), la feuille devient une colonne à droite de clamp(340px, 34vw, 420px) : 420 px à 1280, 340 px sur un téléphone en paysage pour laisser ≈ 60 % de la largeur au monde. Tablette en portrait : HUD, voie et feuille sur une colonne centrée de 720 px au plus, monde ≈ 74 % de la hauteur.

FORM : monde établi (006 + spike dom-svg) et composition imposée par la demande (monde 70 %, feuille du bas, colonne, Fil du jour) et par RECOMMANDATION.md. new-work §3 ne prévoit concept-seed (--scope surface) que pour une page « genuinely open » : ce n'est pas le cas, donc aucun tirage et aucune clé de seed. Voie code-led, sans maquette générée.

Typographie : 006 déclarait « Oree Display » par local("Aptos Display"), local("Trebuchet MS"), absentes d'Android (GLITCHES G68) : le rôle d'affichage n'existait pas sur l'appareil cible. Ici il devient réel par un jeton --font-display (pile arrondie du système, graisse 800) sur les titres, les chiffres du HUD et la Cote. Embarquer un fichier de police libre reste une décision ouverte pour le propriétaire (pas d'outil de sous-ensemble woff2 sur le poste, dépôt public).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
