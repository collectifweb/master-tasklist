import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { calculateCoefficient } from '@/util/coefficient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  const taskId = parseInt(id as string)

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
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
      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }
      return res.status(200).json(task)
    } catch (error) {
      console.error('Error fetching task:', error)
      return res.status(500).json({ error: 'Error fetching task' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { completed, name, dueDate, complexity, priority, length, parentId, categoryId, notes } = req.body
      
      if (completed !== undefined) {
        // Check if all children tasks are completed before completing parent
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            children: {
              select: {
                completed: true,
              },
            },
          },
        })
        
        if (task?.children.some(child => !child.completed)) {
          return res.status(400).json({ 
            error: 'Cannot complete task: all subtasks must be completed first' 
          })
        }

        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: { completed },
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
        return res.status(200).json(updatedTask)
      } else {
        // Calculate coefficient using shared utility

        const coefficient = calculateCoefficient(priority, complexity, length)

        // Full task update
        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            name,
            dueDate: dueDate ? new Date(dueDate) : undefined,
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
        return res.status(200).json(updatedTask)
      }
    } catch (error) {
      console.error('Error updating task:', error)
      return res.status(500).json({ error: 'Error updating task' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if task has children
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          children: {
            select: { id: true },
          },
        },
      })

      if (task?.children.length) {
        return res.status(400).json({ 
          error: 'Cannot delete task: please delete all subtasks first' 
        })
      }

      await prisma.task.delete({
        where: { id: taskId },
      })
      return res.status(200).json({ message: 'Task deleted successfully' })
    } catch (error) {
      console.error('Error deleting task:', error)
      return res.status(500).json({ error: 'Error deleting task' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}