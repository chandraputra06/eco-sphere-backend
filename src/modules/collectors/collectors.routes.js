import { Router } from 'express'
import { prisma } from '../../data/prisma.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'
import { nearestCollectionPoints } from '../../lib/geo.js'

const router = Router()

router.get('/nearest', authenticate, asyncHandler(async (req, res) => {
  const lat = req.query.lat != null ? Number(req.query.lat) : null
  const lng = req.query.lng != null ? Number(req.query.lng) : null
  const ewaste = req.query.ewaste === '1' || req.query.ewaste === 'true'
  res.json(await nearestCollectionPoints({ lat, lng, category: req.query.category, ewaste, limit: 3 }))
}))

router.get('/jobs', authenticate, requireRole('collector'), asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.status) where.status = req.query.status
  res.json(await prisma.pickupJob.findMany({ where }))
}))

router.patch('/jobs/:id', authenticate, requireRole('collector'), asyncHandler(async (req, res) => {
  const job = await prisma.pickupJob.findUnique({ where: { id: req.params.id } })
  if (!job) throw ApiError.notFound('Job not found')
  const { status, weightKg, valueIdr } = req.body || {}
  const next = await prisma.pickupJob.update({
    where: { id: job.id },
    data: { status: status || job.status, collectorOrgId: req.user.orgId, ...(weightKg != null ? { weightKg } : {}), ...(valueIdr != null ? { valueIdr } : {}) },
  })
  res.json(next)
}))

export default router
