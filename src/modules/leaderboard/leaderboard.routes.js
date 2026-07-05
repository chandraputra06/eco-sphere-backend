import { Router } from 'express'
import { z } from 'zod'
import { leaderboardService, awardPoints } from './leaderboard.service.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate } from '../../middleware/index.js'
import { pointsFor } from '../../lib/geo.js'
import { prisma } from '../../data/prisma.js'

const router = Router()
const claimSchema = z.object({ reportId: z.string(), action: z.enum(['self', 'community', 'map']), selfChoice: z.enum(['bank', 'diy']).optional() })

router.get('/', authenticate, asyncHandler(async (req, res) => { res.json(await leaderboardService.top(Number(req.query.limit) || 20)) }))

router.post('/claim', authenticate, asyncHandler(async (req, res) => {
  const { reportId, action, selfChoice } = claimSchema.parse(req.body)
  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) throw ApiError.notFound('Report not found')
  const points = pointsFor(action, selfChoice)
  const result = await awardPoints(req.user.id, points, `action:${action}`, reportId)
  res.json({ earned: points, ...result })
}))

export default router
