import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo123';

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
    // Vérifier si l'utilisateur existe
    console.log('Checking for existing demo user...');
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: DEMO_USER_ID },
          { email: DEMO_EMAIL }
        ]
      }
    });

    if (!user) {
      console.log('Creating demo user account...');
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: DEMO_EMAIL,
          password: hashedPassword
        }
      });
      console.log('Demo user account created successfully:', { id: user.id, email: user.email });
    } else {
      console.log('Demo user account already exists:', { id: user.id, email: user.email });
      
      // Mettre à jour le mot de passe si nécessaire
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log('Demo user password updated');
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
          userId: user.id
        }
      });
      console.log(`${categoriesCount} categories migrated successfully to user ${user.id}`);
    }

    // Mettre à jour toutes les tâches existantes
    if (tasksCount > 0) {
      await prisma.task.updateMany({
        where: {
          userId: null
        },
        data: {
          userId: user.id
        }
      });
      console.log(`${tasksCount} tasks migrated successfully to user ${user.id}`);
    }

    // Vérifier les résultats
    const finalCategoriesCount = await prisma.category.count({
      where: { userId: user.id }
    });
    const finalTasksCount = await prisma.task.count({
      where: { userId: user.id }
    });

    const results = {
      message: 'Migration completed successfully',
      user: { id: user.id, email: user.email },
      stats: {
        categoriesMigrated: categoriesCount,
        tasksMigrated: tasksCount,
        totalCategories: finalCategoriesCount,
        totalTasks: finalTasksCount
      }
    };

    console.log('Migration results:', results);
    return res.status(200).json(results);
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      error: 'Error during migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}