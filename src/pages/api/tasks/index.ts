import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

const calculateCoefficient = (priority: number, complexity: number, length: number) => {
  let priorityValue = 6 - priority // Convert 1-5 to 5-1
  return complexity + length + priorityValue
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const tasks = await prisma.task.findMany({
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
          dueDate: new Date(dueDate),
          complexity,
          priority,
          length,
          coefficient,
          parentId: parentId || null,
          categoryId,
          notes: notes || null,
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