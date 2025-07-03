import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { calculateCoefficient } from '@/util/coefficient'
import { verifyToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('Authorization header missing');
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      console.error('Token not found in Authorization header');
      return res.status(401).json({ error: 'Token manquant' });
    }

    let userId;
    try {
      userId = await verifyToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Token invalide' });
    }

    if (!userId) {
      console.error('User ID not found in token');
      return res.status(401).json({ error: 'Token invalide' });
    }

    const { id } = req.query
    const taskId = parseInt(id as string)

    // Verify task ownership
    const taskExists = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: userId
      }
    });

    if (!taskExists) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    if (req.method === 'GET') {
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
      return res.status(200).json(task)
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { completed, name, dueDate, complexity, priority, length, parentId, categoryId, notes } = req.body;

      const dataToUpdate: any = {};

      const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (!existingTask) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }

      // Use new values if provided, otherwise fall back to existing values for calculation
      const newPriority = priority !== undefined ? priority : existingTask.priority;
      const newComplexity = complexity !== undefined ? complexity : existingTask.complexity;
      const newLength = length !== undefined ? length : existingTask.length;
      dataToUpdate.coefficient = calculateCoefficient(newPriority, newComplexity, newLength);

      if (name !== undefined) dataToUpdate.name = name;
      if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
      if (complexity !== undefined) dataToUpdate.complexity = complexity;
      if (priority !== undefined) dataToUpdate.priority = priority;
      if (length !== undefined) dataToUpdate.length = length;
      if (parentId !== undefined) dataToUpdate.parentId = parentId || null;
      if (categoryId !== undefined) dataToUpdate.categoryId = categoryId;
      if (notes !== undefined) dataToUpdate.notes = notes || null;

      if (completed !== undefined) {
        if (completed) {
          const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { children: { select: { completed: true } } },
          });
          if (task?.children.some(child => !child.completed)) {
            return res.status(400).json({
              error: 'Impossible de terminer la tâche : toutes les sous-tâches doivent être terminées',
            });
          }
        }
        dataToUpdate.completed = completed;
        dataToUpdate.completedAt = completed ? new Date() : null;
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: dataToUpdate,
        include: {
          category: true,
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(200).json(updatedTask);
    }

    if (req.method === 'DELETE') {
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
          error: 'Impossible de supprimer la tâche : veuillez d\'abord supprimer toutes les sous-tâches' 
        })
      }

      await prisma.task.delete({
        where: { id: taskId },
      })
      return res.status(200).json({ message: 'Tâche supprimée avec succès' })
    }

    return res.status(405).json({ error: 'Méthode non autorisée' })
  } catch (error) {
    console.error('Tasks API Error:', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}