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
          displaymode: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      return res.json(user);
    }

    if (req.method === 'PUT') {
      const { name, displaymode } = req.body;

      // Validate input
      const updateData: { name?: string; displaymode?: string } = {};
      
      if (name !== undefined) {
        if (typeof name !== 'string') {
          return res.status(400).json({ message: 'Le nom doit être une chaîne de caractères' });
        }
        updateData.name = name;
      }

      if (displaymode !== undefined) {
        if (typeof displaymode !== 'string' || !['light', 'dark'].includes(displaymode)) {
          return res.status(400).json({ message: 'Le mode d\'affichage doit être "light" ou "dark"' });
        }
        updateData.displaymode = displaymode;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          displaymode: true,
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