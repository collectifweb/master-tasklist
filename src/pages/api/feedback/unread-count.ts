import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Vérifier que l'utilisateur est admin
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Compter les feedback avec le statut "Nouveau"
    const newFeedbackCount = await prisma.feedback.count({
      where: {
        status: 'Nouveau'
      }
    });

    res.status(200).json({ count: newFeedbackCount });

  } catch (error) {
    console.error('Erreur lors du comptage des nouveaux feedback:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}