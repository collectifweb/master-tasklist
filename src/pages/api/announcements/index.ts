import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get announcements for users
      const user = await requireAuth(req);
      const { category, page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        isActive: true,
        publishedAt: {
          lte: new Date()
        }
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            reads: {
              where: { userId: user.id },
              select: { readAt: true }
            }
          },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.announcement.count({ where })
      ]);

      const announcementsWithReadStatus = announcements.map(announcement => ({
        ...announcement,
        isRead: announcement.reads.length > 0,
        reads: undefined
      }));

      return res.status(200).json({
        announcements: announcementsWithReadStatus,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    if (req.method === 'POST') {
      // Create announcement (admin only)
      await requireAdmin(req);
      const { title, content, category, publishedAt } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: 'Titre et contenu requis' });
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          category: category || 'Nouveautés',
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          isActive: true
        }
      });

      return res.status(201).json(announcement);
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error: any) {
    console.error('Announcements API error:', error);
    
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