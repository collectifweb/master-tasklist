import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier que la requête provient d'un cron job ou d'une source autorisée
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Effectuer une requête simple pour maintenir la base de données active
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    const categoryCount = await prisma.category.count();
    
    // Log pour le monitoring
    console.log(`Keep-alive ping: ${userCount} users, ${taskCount} tasks, ${categoryCount} categories`);
    
    return res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      stats: {
        users: userCount,
        tasks: taskCount,
        categories: categoryCount
      },
      message: 'Base de données maintenue active'
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du maintien de la base de données',
      timestamp: new Date().toISOString()
    });
  }
}