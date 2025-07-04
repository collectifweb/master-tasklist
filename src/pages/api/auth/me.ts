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
      try {
        // Try to get user with displaymode column
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

        // Try to get displaymode using raw query
        let displaymode = 'light';
        try {
          const result = await prisma.$queryRaw<Array<{ displaymode: string }>>`
            SELECT displaymode FROM "User" WHERE id = ${userId}
          `;
          if (result.length > 0 && result[0].displaymode) {
            displaymode = result[0].displaymode;
          }
        } catch (error) {
          // Column doesn't exist yet, use default
          console.log('displaymode column not found, using default');
        }

        return res.json({ ...user, displaymode });
      } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
      }
    }

    if (req.method === 'PUT') {
      const { name, displaymode } = req.body;

      // Validate input
      if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json({ message: 'Le nom doit être une chaîne de caractères' });
      }

      if (displaymode !== undefined && (typeof displaymode !== 'string' || !['light', 'dark'].includes(displaymode))) {
        return res.status(400).json({ message: 'Le mode d\'affichage doit être "light" ou "dark"' });
      }

      if (name === undefined && displaymode === undefined) {
        return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
      }

      try {
        // Update name if provided
        if (name !== undefined) {
          await prisma.user.update({
            where: { id: userId },
            data: { name },
          });
        }

        // Update displaymode if provided
        if (displaymode !== undefined) {
          try {
            await prisma.$executeRaw`
              UPDATE "User" 
              SET displaymode = ${displaymode}
              WHERE id = ${userId}
            `;
          } catch (error) {
            console.log('displaymode column not found, skipping update');
          }
        }

        // Get updated user data
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

        // Get displaymode
        let userDisplaymode = 'light';
        try {
          const result = await prisma.$queryRaw<Array<{ displaymode: string }>>`
            SELECT displaymode FROM "User" WHERE id = ${userId}
          `;
          if (result.length > 0 && result[0].displaymode) {
            userDisplaymode = result[0].displaymode;
          }
        } catch (error) {
          console.log('displaymode column not found, using default');
        }

        return res.json({ ...user, displaymode: userDisplaymode });
      } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur' });
      }
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Me API Error:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}