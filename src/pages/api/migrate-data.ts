import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier la clé d'API de migration
  const apiKey = req.headers['x-migration-key'];
  if (!apiKey || apiKey !== process.env.MIGRATION_API_KEY) {
    console.error('Migration attempted with invalid API key');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Starting data migration process...');

  try {
    // Vérifier si l'utilisateur existe, sinon le créer
    let user = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID }
    });

    if (!user) {
      console.log('Creating demo user account...');
      const hashedPassword = await bcrypt.hash('demo123', 10);
      user = await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@example.com',
          password: hashedPassword
        }
      });
      console.log('Demo user account created successfully');
    } else {
      console.log('Demo user account already exists');
    }

    // Compter les éléments à migrer
    const categoriesCount = await prisma.category.count({
      where: { userId: null }
    });
    const tasksCount = await prisma.task.count({
      where: { userId: null }
    });

    console.log(`Found ${categoriesCount} categories and ${tasksCount} tasks to migrate`);

    // Mettre à jour toutes les catégories existantes
    if (categoriesCount > 0) {
      await prisma.category.updateMany({
        where: {
          userId: null
        },
        data: {
          userId: DEMO_USER_ID
        }
      });
      console.log(`${categoriesCount} categories migrated successfully`);
    }

    // Mettre à jour toutes les tâches existantes
    if (tasksCount > 0) {
      await prisma.task.updateMany({
        where: {
          userId: null
        },
        data: {
          userId: DEMO_USER_ID
        }
      });
      console.log(`${tasksCount} tasks migrated successfully`);
    }

    return res.status(200).json({ 
      message: 'Migration completed successfully',
      stats: {
        categoriesMigrated: categoriesCount,
        tasksMigrated: tasksCount
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      error: 'Error during migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}