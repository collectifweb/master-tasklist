/**
 * Calcule le coefficient d'une tâche selon la nouvelle formule.
 * Formule: [priorité + (5 - complexité) + (5 - durée)]
 * Le coefficient favorise les tâches qui sont :
 * - prioritaires (priorité élevée)
 * - faciles à faire (complexité basse)
 * - rapides à exécuter (durée basse)
 * 
 * @param priority - Priorité de la tâche (1-5, où 5 est le plus prioritaire)
 * @param complexity - Complexité de la tâche (1-5)
 * @param length - Durée de la tâche (1-5)
 * @returns Le coefficient, un nombre entre 1 et 13.
 */
export const calculateCoefficient = (priority: number, complexity: number, length: number): number => {
  // Le score pour la complexité et la durée est inversé (5 - valeur), 
  // car une valeur basse (facile/court) est meilleure.
  const scoreComplexity = 5 - complexity;
  const scoreLength = 5 - length;
  
  // La priorité est directement ajoutée, car une valeur haute (urgent) est meilleure.
  const coefficient = priority + scoreComplexity + scoreLength;

  // Le résultat théorique pour des entrées de 1 à 5 est :
  // Min: 1 + (5-5) + (5-5) = 1
  // Max: 5 + (5-1) + (5-1) = 13
  return coefficient;
}