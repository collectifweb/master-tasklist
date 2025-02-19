import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { calculateCoefficient } from '@/util/coefficient'

// UUID fixe pour l'utilisateur de démonstration
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          OR: [
            { userId: DEMO_USER_ID },
            { userId: null }
          ]
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
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return res.status(500).json({ error: 'Error fetching tasks' })
    }
  }

  if (req.method === 'POST') {
    try {
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
          userId: DEMO_USER_ID
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
    } catch (error) {
      console.error('Error creating task:', error)
      return res.status(500).json({ error: 'Error creating task' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}