// Pictos des écrans de jeu (semaine 3) absents du sprite design/icons.svg : même grille de 24, même trait arrondi
// (réglé par la classe .icon), couleur = currentColor. Dessinés pour ce projet. Rendus en ligne, sans fichier.
const D = {
  // Avis (givre) : flocon à six branches
  givre: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 6.6l2.4-2M9.6 19.4l2.4-2 2.4 2M4.9 10.6l3.1-.4-1.1-2.9M19.1 13.4l-3.1.4 1.1 2.9M4.9 13.4l3.1.4-1.1 2.9M19.1 10.6l-3.1-.4 1.1-2.9',
  // brasero : flamme sur sa vasque
  flamme: 'M12 3.4c2.4 2.4 4 4.6 4 7.2a4 4 0 0 1-8 0c0-1.5.7-2.7 1.7-3.7.2 1.3.8 2.2 1.8 2.5-.6-2.2.1-4.2.5-6zM5 15.6h14l-1.9 4.2H6.9z',
  // lettre du matin
  lettre: 'M3.6 6.4h16.8v11.2H3.6zM3.9 6.8l8.1 6.3 8.1-6.3',
  // chapitre : livre ouvert
  chapitre: 'M12 6.6C10 5.2 7.4 4.7 4.4 5.1v13c3-.4 5.6.1 7.6 1.5 2-1.4 4.6-1.9 7.6-1.5v-13c-3-.4-5.6.1-7.6 1.5zM12 6.6v13',
  // récolter : panier
  panier: 'M4 10.2h16l-1.7 9H5.7zM8.2 10.2l2.3-5.1M15.8 10.2l-2.3-5.1M9.6 13.6v2.8M14.4 13.6v2.8',
  // partager au village : panier qui donne
  partage: 'M4 12.4h16l-1.6 7.8H5.6zM12 3.2v6.6M9.4 5.8 12 3.2l2.6 2.6',
  // Réserve d'hiver : bocal
  bocal: 'M8 4.4h8M8.6 4.4v2.3L7 8.7v10.2c0 .9.7 1.6 1.6 1.6h6.8c.9 0 1.6-.7 1.6-1.6V8.7l-1.6-2V4.4M7 12.2h10',
  // Souffler sur la cendre
  souffle: 'M3.5 9h10.2a2.6 2.6 0 1 0-2.6-2.6M3.5 13h13.8a2.6 2.6 0 1 1-2.6 2.6M3.5 17h6.2',
  // Voile : brume en trois bandes
  voile: 'M4 8.2c2.7-2 5.3-2 8 0s5.3 2 8 0M4 12.6c2.7-2 5.3-2 8 0s5.3 2 8 0M4 17c2.7-2 5.3-2 8 0s5.3 2 8 0',
  // réglages : curseur de prénom
  personne: 'M12 11.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4zM4.8 20c.8-3.6 3.6-5.6 7.2-5.6s6.4 2 7.2 5.6',
};

/** Picto en ligne (aria-hidden). */
export const glyph = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${D[name] || ''}"/></svg>`;
