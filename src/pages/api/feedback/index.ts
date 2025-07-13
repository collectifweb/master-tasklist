import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
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

      res.status(201).json({ 
        message: 'Feedback envoyé avec succès',
        id: feedback.id 
      });

    } catch (error) {
      console.error('Erreur lors de la création du feedback:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  } else if (req.method === 'GET') {
    try {
      // Vérifier que l'utilisateur est admin
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Token invalide ou utilisateur non identifié' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Paramètres de pagination et filtres
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const skip = (page - 1) * limit;

      // Construire les filtres
      const where: any = {};
      if (status && ['Nouveau', 'Résolu'].includes(status)) {
        where.status = status;
      }
      if (type && ['Bug', 'Suggestion', 'Autre'].includes(type)) {
        where.type = type;
      }

      // Récupérer les feedback avec pagination
      const [feedbacks, total] = await Promise.all([
        prisma.feedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.feedback.count({ where })
      ]);

      res.status(200).json({
        feedbacks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des feedback:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}