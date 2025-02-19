import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_CO_DEV_ENV}/api/migrate-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Migration failed');
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error during migration:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
}