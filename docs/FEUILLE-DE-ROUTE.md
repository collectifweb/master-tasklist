# Feuille de route

Ce qui est fait, ce qui est en cours et ce qui vient. Cette page se met à jour à chaque envoi en production. Le détail de chaque lot (mesures, essais, décisions) est dans `tasks/todo.md`. Les règles du jeu sont dans `docs/BIBLE-JEU.md`.

*Dernière mise à jour : 12 octobre 2026.*

## Où en est le jeu

La version 2.15 est en ligne depuis le 12 octobre 2026. Le prochain envoi portera un texte corrigé dans la fiche « Pourquoi ? » de la Cote : celui du total avait un double espace, que le navigateur cachait.

## Fait

| Version | En ligne depuis | Ce qu’elle a apporté |
|---|---|---|
| 1 | 5 octobre 2026 | La nouvelle app : les quêtes classées par la Cote, le Fil du jour, l’île, l’installation sur l’écran d’accueil et le code d’accès. Son économie (la Lueur, les avis de saison, les chapitres) a été remplacée par celle de la version 2. |
| 2 | 6 octobre | Le village du Nord : quatre ressources (Énergie, Matériaux, Nourriture, Habitants), les rangs du village, les quartiers qui montent avec des permis, la semaine tenue, les bâtiments, les cinq premiers pas, Fanal et sa lettre du matin. |
| 2.1 | 6 octobre | Le marchand au quai. |
| 2.2 | 7 octobre | Les imprévus, bons et mauvais, toujours réparables. |
| 2.3 | 7 octobre | L’hiver : la neige sur l’île, les tempêtes annoncées et l’objectif « Garder la serre allumée ». |
| 2.3.1 | 7 octobre | Les premiers pas se cochent même avant leur tour. |
| 2.4 | 7 octobre | L’allure du village : selon le nombre de quêtes des deux dernières semaines, le village passe au ralenti, au régulier ou au plein régime, ce qui change ses imprévus. Ni les prix ni ce que rapporte une quête ne bougent. |
| 2.5 | 8 octobre | Les visiteurs à commande : le convoi, la famille du Sud, la scientifique. |
| 2.6 | 8 octobre | L’île vivante : les habitants vont au travail et en reviennent. |
| 2.7 | 8 octobre | Une quête notée après coup (« Déjà faite ») rapporte autant qu’une autre. |
| 2.8 | 8 octobre | L’échange du jour au quai : le marchand rachète tes Matériaux en trop, contre de l’Énergie. |
| 2.9 | 9 octobre | La bande du Hameau, gagnée sur la forêt. |
| 2.10 | 9 octobre | Les bâtiments du rang Village : tour de guet, scierie, poulailler, cabane à sucre. |
| 2.10.1 | 9 octobre | La tour de guet annonce les tempêtes 6 jours d’avance. |
| 2.10.2 | 9 octobre | Le même jeu, publié sur GitHub avec son guide d’installation et sa licence. |
| 2.11 | 9 octobre | Ce que la Nourriture achète : le repas de la semaine, la partie de sucre du printemps, le sirop. |
| 2.12 | 10 octobre | La Mairie garde 4 permis au plus. |
| 2.13 | 11 octobre | La visite du jour : les cultures poussent et les bâtiments produisent dès la première ouverture du jour, sans quête à faire. |
| 2.14 | 11 octobre | La vraie météo : avec une ville choisie dans les Réglages, les tempêtes suivent la neige prévue. |
| 2.14.1 | 12 octobre | Un correctif pour Safari : sur iPhone, les fiches se réduisaient à une bande d’une ligne. Essayé dans le moteur de Safari, pas encore sur un vrai iPhone. |
| 2.15 | 12 octobre | La mise à jour depuis GitHub, par un bouton des Réglages, pour qui installe le jeu chez soi. Coupée sur l’installation d’Alex. |

Autour du jeu : la vidéo de présentation de 40 secondes (11 octobre, `docs/captures/video-promo.mp4`).

## En cours ou en attente

- L’installation d’une amie : elle doit faire une dernière mise à jour à la main. Reste à savoir si le défaut de l’iPhone a disparu chez elle, et si le bouton « Mettre à jour » marche chez son hébergeur. Rien de cela n’a encore été essayé sur un vrai iPhone ni chez un vrai hébergeur.
- Le nom du jeu, à trancher : l’app s’affiche « L’Orée », la vidéo et la revue d’octobre disent « Quêtes du foyer » (`PRODUCT.md`).
- Une vérification ouverte depuis le 5 octobre : une tâche ajoutée par Hermes doit apparaître dans l’app en 30 secondes au plus.
- Quatre textes jamais affichés dans `app/content/fr-CA/interface.json` (`why.priority`, `why.length`, `why.difficulty`, `filter.quick`) : signalés, pas retirés.

## À venir

Décidé dans la bible, pas encore construit. Aucun lot n’est fixé pour l’instant.

- Le contenu des rangs Bourg et Ville. Le jeu compte déjà ces rangs (Bourg à 11 habitants, Ville à 21, puis un palier tous les 15), mais rien ne s’y ouvre encore. Au Bourg : une nouvelle bande de terrain, un marché, une école qui fait produire un peu plus les habitants, une centrale solaire, un garage à chasse-neige qui protège des tempêtes. À la Ville : une île voisine reliée par un pont, une gare, un musée. À chaque palier suivant : du terrain, un bâtiment, un permis, un nouveau visiteur.
- Une bande de terrain au rang Village : seule celle du Hameau existe.
- Les quartiers : les niveaux 4 et plus, et le niveau 3 du Garage (la tournée d’hiver).
- Les saisons : le dégel et la crue au printemps ; l’objectif de l’été (accueillir une nouvelle famille) et la Saint-Jean ; chaque année, de nouvelles variantes. Une saison réussie donnera aussi un décor unique ou une famille.
- Des visiteurs : le colporteur et ses décors, la conteuse et les souvenirs du musée, le violoneux des Fêtes, les améliorations de la scientifique, des décors uniques en échange d’une commande.
- Des imprévus : les mouches noires de juin, le visiteur surprise.
- Les grands chantiers, quand le village tourne à plein régime : un phare, une digue, un pont, un monument.
- Le village plus vivant : des décors à placer soi-même, des habitants qui font mieux produire leur bâtiment, des panneaux solaires.
- L’allure, qui regarderait aussi les réserves, pas seulement les quêtes terminées.

## Plus loin, sans lot prévu

`PRODUCT.md` note ces pistes dans sa section « Horizons », dans cet ordre : un petit site public, sans compte, où les données restent dans l’appareil ; plus tard, un code de synchronisation pour jouer sur plusieurs appareils ; plus loin, des applications Android et iOS.

## Abandonné

La chronique d’Hermes a été abandonnée le 9 octobre 2026 (bible, décision 44). Le jeu tire lui-même ses imprévus, ses visiteurs et ses tempêtes, et Hermes ne fait qu’ajouter les tâches à la liste.
