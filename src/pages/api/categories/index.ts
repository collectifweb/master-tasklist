import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      })
      return res.status(200).json(categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      return res.status(500).json({ error: 'Error fetching categories' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body
      const category = await prisma.category.create({
        data: { name },
      })
      return res.status(201).json(category)
    } catch (error) {
      console.error('Error creating category:', error)
      return res.status(500).json({ error: 'Error creating category' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}