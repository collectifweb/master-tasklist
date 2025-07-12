import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const user = await requireAuth(req);

      // Count unread announcements
      const unreadCount = await prisma.announcement.count({
        where: {
          isActive: true,
          publishedAt: {
            lte: new Date()
          },
          NOT: {
            reads: {
              some: {
                userId: user.id
              }
            }
          }
        }
      });

      return res.status(200).json({ unreadCount });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error: any) {
    console.error('Unread count API error:', error);
    
    if (error.message === 'Token manquant') {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (error.message === 'Utilisateur non trouvé') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
}