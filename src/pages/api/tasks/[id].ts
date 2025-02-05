import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  const taskId = parseInt(id as string)

  if (req.method === 'PUT') {
    try {
      const { completed } = req.body
      
      // Check if all children tasks are completed before completing parent
      if (completed) {
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