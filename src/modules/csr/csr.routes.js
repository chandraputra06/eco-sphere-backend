import { Router } from 'express'
import { prisma } from '../../data/prisma.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'

const router = Router()

router.get('/overview', authenticate, requireRole('csr', 'admin'), asyncHandler(async (_req, res) => {
  const [reportsTotal, reportsResolved, activeChallenges, collectionPoints] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({ where: { status: 'resolved' } }),
    prisma.challenge.count({ where: { status: 'live' } }),
    prisma.collectionPoint.count(),
  ])
  res.json({ reportsTotal, reportsResolved, activeChallenges, collectionPoints, wasteDivertedTons: 128.4, co2OffsetTons: 342 })
}))

router.get('/challenges', authenticate, asyncHandler(async (_req, res) => { res.json(await prisma.challenge.findMany()) }))

router.post('/challenges', authenticate, requireRole('csr'), asyncHandler(async (req, res) => {
  const { title, description, reward, target, deadline } = req.body || {}
  if (!title) throw ApiError.badRequest('title is required')
  const challenge = await prisma.challenge.create({
    data: { csrOrgId: req.user.orgId, title, description: description || null, reward: reward || null, target: target || 0, progress: 0, deadline: deadline ? new Date(deadline) : null, status: 'live' },
  })
  res.status(201).json(challenge)
}))

export default router
