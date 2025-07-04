import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check for migration API key
  const apiKey = req.headers['x-migration-key'];
  if (apiKey !== process.env.MIGRATION_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Try to add the displaymode column using raw SQL
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "displaymode" TEXT DEFAULT 'light'
    `;

    return res.json({ 
      success: true, 
      message: 'displaymode column added successfully' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}