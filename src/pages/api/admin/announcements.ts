import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get all announcements for admin (including drafts and inactive)
      await requireAdmin(req);
      const { page = '1', limit = '10', category, status } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (category && category !== 'all') {
        where.category = category;
      }

      if (status === 'published') {
        where.isActive = true;
        where.publishedAt = { lte: new Date() };
      } else if (status === 'draft') {
        where.OR = [
          { publishedAt: null },
          { publishedAt: { gt: new Date() } }
        ];
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            _count: {
              select: {
                reads: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.announcement.count({ where })
      ]);

      // Add statistics for each announcement
      const announcementsWithStats = await Promise.all(
        announcements.map(async (announcement) => {
          const totalUsers = await prisma.user.count();
          const readCount = announcement._count.reads;
          const readPercentage = totalUsers > 0 ? Math.round((readCount / totalUsers) * 100) : 0;

          return {
            ...announcement,
            stats: {
              readCount,
              totalUsers,
              readPercentage
            },
            _count: undefined
          };
        })
      );

      return res.status(200).json({
        announcements: announcementsWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' });
  } catch (error: any) {
    console.error('Admin announcements API error:', error);
    
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