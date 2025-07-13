import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { userEmail, type, subject, message } = req.body;

      // Validation des données
      if (!userEmail || !type || !message) {
        return res.status(400).json({ 
          error: 'Email, type et message sont obligatoires' 
        });
      }

      // Validation du type
      const validTypes = ['Bug', 'Suggestion', 'Autre'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: 'Type invalide. Doit être Bug, Suggestion ou Autre' 
        });
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        return res.status(400).json({ 
          error: 'Format d\'email invalide' 
        });
      }

      // Limitation de longueur
      if (message.length > 2000) {
        return res.status(400).json({ 
          error: 'Le message ne peut pas dépasser 2000 caractères' 
        });
      }

      if (subject && subject.length > 200) {
        return res.status(400).json({ 
          error: 'Le sujet ne peut pas dépasser 200 caractères' 
        });
      }

      // Créer le feedback
      const feedback = await prisma.feedback.create({
        data: {
          userEmail: userEmail.toLowerCase().trim(),
          type,
          subject: subject?.trim() || null,
          message: message.trim(),
          status: 'Nouveau'
        }
      });

      return res.status(201).json({ 
        message: 'Feedback envoyé avec succès',
        id: feedback.id 
      });

    } else if (req.method === 'GET') {
      // Vérifier que l'utilisateur est admin
      await requireAdmin(req);

      // Paramètres de pagination et filtres
      const { page = '1', limit = '10', status, type, search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construire les filtres
      const where: any = {};
      if (status && status !== 'all' && ['Nouveau', 'Résolu'].includes(status as string)) {
        where.status = status;
      }
      if (type && type !== 'all' && ['Bug', 'Suggestion', 'Autre'].includes(type as string)) {
        where.type = type;
      }
      if (search) {
        where.OR = [
          { userEmail: { contains: search as string, mode: 'insensitive' } },
          { subject: { contains: search as string, mode: 'insensitive' } },
          { message: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Récupérer les feedback avec pagination
      const [feedbacks, total] = await Promise.all([
        prisma.feedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.feedback.count({ where })
      ]);

      return res.status(200).json({
        feedbacks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Feedback API error:', error);
    
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