import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// UUID fixe pour l'utilisateur de démonstration
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const categories = await prisma.category.findMany({
          where: {
            OR: [
              { userId: DEMO_USER_ID },
              { userId: null }
            ]
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
          return res.status(400).json({ error: 'Name is required' });
        }

        const newCategory = await prisma.category.create({
          data: { 
            name,
            userId: DEMO_USER_ID
          },
        });

        return res.status(201).json(newCategory);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Categories API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}