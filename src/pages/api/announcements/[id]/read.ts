import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const announcementId = parseInt(id as string);

  if (isNaN(announcementId)) {
    return res.status(400).json({ message: 'ID d\'annonce invalide' });
  }

  try {
    if (req.method === 'POST') {
      // Mark announcement as read
      const user = await requireAuth(req);

      // Check if announcement exists and is active
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          isActive: true,
          publishedAt: {
            lte: new Date()
          }
        }
      });

      if (!announcement) {
        return res.status(404).json({ message: 'Annonce non trouvée' });
      }

      // Create or update read record
      await prisma.userAnnouncementRead.upsert({
        where: {
          userId_announcementId: {
            userId: user.id,
            announcementId: announcementId
          }
        },
        update: {
          readAt: new Date()
        },
        create: {
          userId: user.id,
          announcementId: announcementId,
          readAt: new Date()
        }
      });

      return res.status(200).json({ message: 'Annonce marquée comme lue' });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error: any) {
    console.error('Mark as read API error:', error);
    
    if (error.message === 'Token manquant') {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (error.message === 'Utilisateur non trouvé') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
}