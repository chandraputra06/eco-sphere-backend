import { Router } from 'express'
import { repos } from '../../data/store.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'

const router = Router()
const admin = requireRole('admin')

// POST /admin/orgs/:id/verify — gate role tools behind verification
router.post('/orgs/:id/verify', authenticate, admin, asyncHandler(async (req, res) => {
  const org = repos.organizations.get(req.params.id)
  if (!org) throw ApiError.notFound('Organization not found')
  res.json(repos.organizations.update(org.id, { verified: true }))
}))

// GET /admin/reports/flagged — placeholder for the AI fraud/spam queue
router.get('/reports/flagged', authenticate, admin, asyncHandler(async (_req, res) => {
  // In production: filter by ai risk score. Here: surface anything still pending.
  res.json(repos.reports.find((r) => r.status === 'pending'))
}))

// PATCH /admin/reports/:id/moderate — accept or reject
router.patch('/reports/:id/moderate', authenticate, admin, asyncHandler(async (req, res) => {
  const report = repos.reports.get(req.params.id)
  if (!report) throw ApiError.notFound('Report not found')
  const decision = req.body?.decision === 'reject' ? 'rejected' : report.status
  res.json(repos.reports.update(report.id, { status: decision }))
}))

export default router
