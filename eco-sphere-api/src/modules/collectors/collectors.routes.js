import { Router } from 'express'
import { repos } from '../../data/store.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'
import { nearestCollectionPoints } from '../../lib/geo.js'

const router = Router()

// GET /collectors/nearest?lat=&lng=&category= — public-ish helper for citizens
router.get('/nearest', authenticate, asyncHandler(async (req, res) => {
  const lat = req.query.lat != null ? Number(req.query.lat) : null
  const lng = req.query.lng != null ? Number(req.query.lng) : null
  res.json(nearestCollectionPoints({ lat, lng, category: req.query.category, limit: 3 }))
}))

// GET /collectors/jobs?status=open — work queue for a collector org
router.get('/jobs', authenticate, requireRole('collector'), asyncHandler(async (req, res) => {
  const status = req.query.status
  let jobs = repos.pickupJobs.find((j) => j.collectorOrgId === req.user.orgId || !j.collectorOrgId)
  if (status) jobs = jobs.filter((j) => j.status === status)
  res.json(jobs)
}))

// PATCH /collectors/jobs/:id — accept / start / complete a pickup
router.patch('/jobs/:id', authenticate, requireRole('collector'), asyncHandler(async (req, res) => {
  const job = repos.pickupJobs.get(req.params.id)
  if (!job) throw ApiError.notFound('Job not found')
  const { status, weightKg, valueIdr } = req.body || {}
  const next = repos.pickupJobs.update(job.id, {
    status: status || job.status,
    collectorOrgId: req.user.orgId,
    ...(weightKg != null ? { weightKg } : {}),
    ...(valueIdr != null ? { valueIdr } : {}),
  })
  res.json(next)
}))

export default router
