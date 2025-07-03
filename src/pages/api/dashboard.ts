import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { startOfWeek, endOfWeek } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: { category: true },
    });

    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: { where: { completed: false } } },
        },
      },
    });

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const activeTasks = tasks.filter(t => !t.completed);
    const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const completedThisWeek = tasks.filter(t => {
      return t.completed && t.completedAt && new Date(t.completedAt) >= weekStart && new Date(t.completedAt) <= weekEnd;
    });

    const topPriorityTasks = [...activeTasks]
      .sort((a, b) => b.coefficient - a.coefficient)
      .slice(0, 5);
      
    const categoryDistribution = categories
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        _count: {
          tasks: cat._count.tasks,
        },
      }))
      .filter(cat => cat._count.tasks > 0);

    return res.status(200).json({
      username: user?.name || '',
      stats: {
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        completedThisWeek: completedThisWeek.length,
        topPriorityTasks,
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}