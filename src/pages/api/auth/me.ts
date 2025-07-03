import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      return res.json(user);
    }

    if (req.method === 'PUT') {
      const { name } = req.body;

      if (typeof name !== 'string') {
        return res.status(400).json({ message: 'Le nom est requis' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      return res.json(updatedUser);
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Me API Error:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}