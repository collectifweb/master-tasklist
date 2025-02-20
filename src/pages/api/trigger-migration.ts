import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.MIGRATION_API_KEY) {
    console.error('MIGRATION_API_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log('Triggering data migration...');
    const response = await fetch(`${process.env.NEXT_PUBLIC_CO_DEV_ENV}/api/migrate-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Migration-Key': process.env.MIGRATION_API_KEY
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Migration failed:', errorData);
      throw new Error(errorData.error || 'Migration failed');
    }

    const data = await response.json();
    console.log('Migration completed:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error during migration:', error);
    return res.status(500).json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}