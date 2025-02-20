import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { calculateCoefficient } from '@/util/coefficient'
import { verifyToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Vérifier le token et obtenir l'ID de l'utilisateur
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    if (req.method === 'GET') {
      const tasks = await prisma.task.findMany({
        where: {
          userId: userId
        },
        include: {
          category: true,
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              completed: true,
            },
          },
        },
        orderBy: [
          { completed: 'asc' },
          { dueDate: 'asc' },
        ],
      })
      return res.status(200).json(tasks)
    }

    if (req.method === 'POST') {
      const { name, dueDate, complexity, priority, length, parentId, categoryId, notes } = req.body
      
      const coefficient = calculateCoefficient(priority, complexity, length)
      
      const task = await prisma.task.create({
        data: {
          name,
          dueDate: dueDate ? new Date(dueDate) : null,
          complexity,
          priority,
          length,
          coefficient,
          parentId: parentId || null,
          categoryId,
          notes: notes || null,
          userId: userId
        },
        include: {
          category: true,
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      return res.status(201).json(task)
    }

    return res.status(405).json({ error: 'Méthode non autorisée' })
  } catch (error) {
    console.error('Tasks API Error:', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}