import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const feedbackId = parseInt(id as string);

    if (isNaN(feedbackId)) {
      return res.status(400).json({ error: 'ID de feedback invalide' });
    }

    // Vérifier que l'utilisateur est admin pour toutes les opérations
    await requireAdmin(req);

    if (req.method === 'GET') {
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback non trouvé' });
      }

      return res.status(200).json(feedback);

    } else if (req.method === 'PATCH') {
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

      return res.status(200).json({
        message: 'Statut du feedback mis à jour avec succès',
        feedback: updatedFeedback
      });

    } else if (req.method === 'DELETE') {
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

      return res.status(200).json({ message: 'Feedback supprimé avec succès' });

    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
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