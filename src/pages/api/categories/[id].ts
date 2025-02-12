import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  try {
    switch (req.method) {
      case 'PUT':
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Name is required' });
        }

        const updatedCategory = await prisma.category.update({
          where: { id },
          data: { name },
        });

        return res.json(updatedCategory);

      case 'DELETE':
        // Vérifier si la catégorie est utilisée
        const tasksCount = await prisma.task.count({
          where: { categoryId: id },
        });

        if (tasksCount > 0) {
          return res.status(400).json({
            error: 'Cette catégorie ne peut pas être supprimée car elle est utilisée par des tâches',
          });
        }

        await prisma.category.delete({
          where: { id },
        });

        return res.status(204).end();

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Category API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}