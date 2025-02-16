import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { calculateCoefficient } from '@/util/coefficient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Récupérer toutes les tâches actives
    const activeTasks = await prisma.task.findMany({
      where: {
        completed: false
      }
    })

    // Recalculer les coefficients pour chaque tâche
    const updates = activeTasks.map(task => {
      const newCoefficient = calculateCoefficient(
        task.priority,
        task.complexity,
        task.length
      )
      return prisma.task.update({
        where: { id: task.id },
        data: { coefficient: newCoefficient }
      })
    })

    // Exécuter toutes les mises à jour
    await prisma.$transaction(updates)

    return res.status(200).json({ 
      message: 'Coefficients recalculés avec succès',
      count: activeTasks.length
    })
  } catch (error) {
    console.error('Erreur lors du recalcul des coefficients:', error)
    return res.status(500).json({ message: 'Erreur lors du recalcul des coefficients' })
  }
}