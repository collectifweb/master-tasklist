import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const feedbackId = parseInt(id as string);

  if (isNaN(feedbackId)) {
    return res.status(400).json({ error: 'ID de feedback invalide' });
  }

  // Vérifier que l'utilisateur est admin pour toutes les opérations
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token invalide' });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  if (req.method === 'GET') {
    try {
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback non trouvé' });
      }

      res.status(200).json(feedback);

    } catch (error) {
      console.error('Erreur lors de la récupération du feedback:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status } = req.body;

      // Validation du statut
      if (!status || !['Nouveau', 'Résolu'].includes(status)) {
        return res.status(400).json({ 
          error: 'Statut invalide. Doit être Nouveau ou Résolu' 
        });
      }

      // Vérifier que le feedback existe
      const existingFeedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!existingFeedback) {
        return res.status(404).json({ error: 'Feedback non trouvé' });
      }

      // Mettre à jour le feedback
      const updateData: any = { status };
      
      // Gérer la date de résolution
      if (status === 'Résolu' && existingFeedback.status !== 'Résolu') {
        updateData.resolvedAt = new Date();
      } else if (status === 'Nouveau' && existingFeedback.status === 'Résolu') {
        updateData.resolvedAt = null;
      }

      const updatedFeedback = await prisma.feedback.update({
        where: { id: feedbackId },
        data: updateData
      });

      res.status(200).json({
        message: 'Statut du feedback mis à jour avec succès',
        feedback: updatedFeedback
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du feedback:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Vérifier que le feedback existe
      const existingFeedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!existingFeedback) {
        return res.status(404).json({ error: 'Feedback non trouvé' });
      }

      // Supprimer le feedback
      await prisma.feedback.delete({
        where: { id: feedbackId }
      });

      res.status(200).json({ message: 'Feedback supprimé avec succès' });

    } catch (error) {
      console.error('Erreur lors de la suppression du feedback:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}