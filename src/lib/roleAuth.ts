import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export type UserRole = 'user' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function requireAuth(req: NextApiRequest): Promise<AuthenticatedUser> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('Token manquant');
  }

  const userId = await verifyToken(token);
  if (!userId) {
    throw new Error('Token invalide');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  return {
    id: user.id,
    email: user.email,
    role: (user.role as UserRole) || 'user',
  };
}

export async function requireRole(req: NextApiRequest, requiredRole: UserRole): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  
  // Admin can access everything
  if (user.role === 'admin') {
    return user;
  }
  
  // Check if user has the required role
  if (user.role !== requiredRole) {
    throw new Error('Permissions insuffisantes');
  }
  
  return user;
}

export async function requireAdmin(req: NextApiRequest): Promise<AuthenticatedUser> {
  return requireRole(req, 'admin');
}

export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse, user: AuthenticatedUser) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = await requireAuth(req);
      return handler(req, res, user);
    } catch (error: any) {
      console.error('Auth error:', error);
      
      if (error.message === 'Token manquant' || error.message === 'Token invalide') {
        return res.status(401).json({ message: error.message });
      }
      
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ message: error.message });
      }
      
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  };
}

export function withRole(requiredRole: UserRole, handler: (req: NextApiRequest, res: NextApiResponse, user: AuthenticatedUser) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = await requireRole(req, requiredRole);
      return handler(req, res, user);
    } catch (error: any) {
      console.error('Role auth error:', error);
      
      if (error.message === 'Token manquant' || error.message === 'Token invalide') {
        return res.status(401).json({ message: error.message });
      }
      
      if (error.message === 'Utilisateur non trouvé') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'Permissions insuffisantes') {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  };
}

export function withAdmin(handler: (req: NextApiRequest, res: NextApiResponse, user: AuthenticatedUser) => Promise<void>) {
  return withRole('admin', handler);
}