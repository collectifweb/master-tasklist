import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Verify password
    const isValid = await compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Create JWT token
    const token = sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Return user data and token
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displaymode: user.displaymode,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
}