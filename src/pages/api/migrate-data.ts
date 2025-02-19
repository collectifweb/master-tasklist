import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const DEMO_USER_ID = '1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier si l'utilisateur existe, sinon le créer
    let user = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@example.com',
          password: 'demo' // Dans un cas réel, il faudrait hasher le mot de passe
        }
      });
    }

    // Mettre à jour toutes les catégories existantes
    await prisma.category.updateMany({
      where: {
        userId: null
      },
      data: {
        userId: DEMO_USER_ID
      }
    });

    // Mettre à jour toutes les tâches existantes
    await prisma.task.updateMany({
      where: {
        userId: null
      },
      data: {
        userId: DEMO_USER_ID
      }
    });

    return res.status(200).json({ message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Error during migration' });
  }
}