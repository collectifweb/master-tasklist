import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export const verifyToken = async (token: string): Promise<string | null> => {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      console.error('Invalid token payload');
      return null;
    }
    return decoded.userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};