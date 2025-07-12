import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const announcementId = parseInt(id as string);

  if (isNaN(announcementId)) {
    return res.status(400).json({ message: 'ID d\'annonce invalide' });
  }

  try {
    if (req.method === 'GET') {
      // Get single announcement
      const user = await requireAuth(req);
      
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          isActive: true,
          publishedAt: {
            lte: new Date()
          }
        },
        include: {
          reads: {
            where: { userId: user.id },
            select: { readAt: true }
          }
        }
      });

      if (!announcement) {
        return res.status(404).json({ message: 'Annonce non trouvée' });
      }

      const announcementWithReadStatus = {
        ...announcement,
        isRead: announcement.reads.length > 0,
        reads: undefined
      };

      return res.status(200).json(announcementWithReadStatus);
    }

    if (req.method === 'PUT') {
      // Update announcement (admin only)
      await requireAdmin(req);
      const { title, content, category, publishedAt, isActive } = req.body;

      const announcement = await prisma.announcement.update({
        where: { id: announcementId },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          ...(category && { category }),
          ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
          ...(isActive !== undefined && { isActive })
        }
      });

      return res.status(200).json(announcement);
    }

    if (req.method === 'DELETE') {
      // Delete announcement (admin only)
      await requireAdmin(req);

      await prisma.announcement.delete({
        where: { id: announcementId }
      });

      return res.status(200).json({ message: 'Annonce supprimée' });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error: any) {
    console.error('Announcement API error:', error);
    
    if (error.message === 'Token manquant') {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (error.message === 'Utilisateur non trouvé') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    if (error.message === 'Permissions insuffisantes') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
}