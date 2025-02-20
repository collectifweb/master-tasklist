import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    switch (req.method) {
      case 'GET':
        const categories = await prisma.category.findMany({
          where: {
            userId: userId
          },
          include: {
            _count: {
              select: { tasks: true }
            }
          }
        });

        const formattedCategories = categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          taskCount: cat._count.tasks
        }));

        return res.json(formattedCategories);

      case 'POST':
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Le nom est requis' });
        }

        const newCategory = await prisma.category.create({
          data: { 
            name,
            userId: userId
          },
        });

        return res.status(201).json(newCategory);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Categories API Error:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}