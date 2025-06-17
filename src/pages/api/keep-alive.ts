import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Vérifier si c'est un cron job Vercel (pour la sécurité des tâches automatiques)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron') || 
                      req.headers['x-vercel-cron'] === '1';
  
  // Pour les crons Vercel, vérifier l'authentification
  if (isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Non autorisé pour cron job' });
  }

  try {
    // Effectuer une requête simple pour maintenir la base de données active
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    const categoryCount = await prisma.category.count();
    
    // Log pour le monitoring
    const source = isVercelCron ? 'CRON' : 'MANUAL';
    console.log(`Keep-alive ping [${source}]: ${userCount} users, ${taskCount} tasks, ${categoryCount} categories`);
    
    return res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      source: source,
      stats: {
        users: userCount,
        tasks: taskCount,
        categories: categoryCount
      },
      message: `Base de données maintenue active (${source})`
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du maintien de la base de données',
      timestamp: new Date().toISOString()
    });
  }
}