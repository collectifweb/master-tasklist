// Pictos des écrans de rendez-vous absents du sprite design/icons.svg : même grille de 24, même trait arrondi
// (réglé par la classe .icon), couleur = currentColor. Dessinés pour ce projet. Rendus en ligne, sans fichier.
const D = {
  // lettre du matin
  lettre: 'M3.6 6.4h16.8v11.2H3.6zM3.9 6.8l8.1 6.3 8.1-6.3',
  // réglages : curseur de prénom
  personne: 'M12 11.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4zM4.8 20c.8-3.6 3.6-5.6 7.2-5.6s6.4 2 7.2 5.6',
};

/** Picto en ligne (aria-hidden). */
export const glyph = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${D[name] || ''}"/></svg>`;
