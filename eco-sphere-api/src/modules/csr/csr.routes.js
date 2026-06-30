import { Router } from 'express'
import { repos } from '../../data/store.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'

const router = Router()

// GET /csr/overview — KPI rollup for the partner dashboard
router.get('/overview', authenticate, requireRole('csr', 'admin'), asyncHandler(async (req, res) => {
  const reports = repos.reports.all()
  const resolved = reports.filter((r) => r.status === 'resolved').length
  res.json({
    reportsTotal: reports.length,
    reportsResolved: resolved,
    activeChallenges: repos.challenges.find((c) => c.status === 'live').length,
    collectionPoints: repos.collectionPoints.all().length,
    // Placeholder impact metrics — wire to real aggregates later.
    wasteDivertedTons: 128.4,
    co2OffsetTons: 342,
  })
}))

// GET /csr/challenges
router.get('/challenges', authenticate, asyncHandler(async (_req, res) => {
  res.json(repos.challenges.all())
}))

// POST /csr/challenges — sponsor a new campaign
router.post('/challenges', authenticate, requireRole('csr'), asyncHandler(async (req, res) => {
  const { title, description, reward, target, deadline } = req.body || {}
  if (!title) throw ApiError.badRequest('title is required')
  const challenge = repos.challenges.create({
    csrOrgId: req.user.orgId, title, description: description || '',
    reward: reward || null, target: target || 0, progress: 0,
    deadline: deadline || null, status: 'live',
  })
  res.status(201).json(challenge)
}))

export default router
