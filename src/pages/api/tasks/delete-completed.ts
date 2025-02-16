import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { period } = req.body

  try {
    let dateThreshold: Date | undefined

    const now = new Date()

    switch (period) {
      case '30days':
        dateThreshold = new Date(now.setDate(now.getDate() - 30))
        break
      case '6months':
        dateThreshold = new Date(now.setMonth(now.getMonth() - 6))
        break
      case '1year':
        dateThreshold = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      case 'all':
        dateThreshold = undefined
        break
      default:
        return res.status(400).json({ message: 'Période invalide' })
    }

    const whereClause = {
      completed: true,
      ...(dateThreshold && {
        completedAt: {
          lt: dateThreshold
        }
      })
    }

    // Supprimer les tâches qui correspondent aux critères
    const deletedTasks = await prisma.task.deleteMany({
      where: whereClause
    })

    return res.status(200).json({ 
      message: 'Tâches supprimées avec succès',
      count: deletedTasks.count
    })
  } catch (error) {
    console.error('Erreur lors de la suppression des tâches:', error)
    return res.status(500).json({ message: 'Erreur lors de la suppression des tâches' })
  }
}