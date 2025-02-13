/**
 * Calcule le coefficient d'une tâche selon la formule :
 * 15 - complexité - longueur - priorité(inversée)
 * 
 * Plus le coefficient est élevé, plus la tâche est importante à faire.
 * La tâche est considérée plus importante si elle est :
 * - rapide à exécuter (longueur basse)
 * - facile à faire (complexité basse)
 * - prioritaire (priorité proche de 1)
 * 
 * @param priority - Priorité de la tâche (1-5, où 1 est le plus prioritaire)
 * @param complexity - Complexité de la tâche (1-5)
 * @param length - Longueur/durée de la tâche (1-5)
 * @returns nombre entre 4 et 12 (15 - max 3 fois 5 = 0, ou 15 - min 3 fois 1 = 12)
 */
export const calculateCoefficient = (priority: number, complexity: number, length: number): number => {
  // Convertit la priorité 1-5 en 5-1 selon la formule
  let priorityValue = 0;
  switch (priority) {
    case 5: priorityValue = 1; break;
    case 4: priorityValue = 2; break;
    case 3: priorityValue = 3; break;
    case 2: priorityValue = 4; break;
    case 1: priorityValue = 5; break;
    default: priorityValue = 3; // valeur par défaut si invalide
  }
  
  return 15 - (complexity + length + priorityValue);
}