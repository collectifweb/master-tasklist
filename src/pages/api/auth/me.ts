import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Me API Error:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}