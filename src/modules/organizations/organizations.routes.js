import { Router } from 'express'
import { prisma } from '../../data/prisma.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'

const router = Router()
const orgStaff = requireRole('manager', 'collector', 'admin')

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const where = {}
  if (req.query.type) where.type = req.query.type
  const orgs = await prisma.organization.findMany({ where, orderBy: { name: 'asc' } })
  res.json(orgs.map((o) => ({ id: o.id, name: o.name, type: o.type, verified: o.verified })))
}))

router.get('/me/reports', authenticate, orgStaff, asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { claimedByOrgId: req.user.orgId },
    orderBy: { createdAt: 'desc' },
    include: { reporter: { select: { name: true, phone: true } } },
  })
  res.json(reports)
}))

router.patch('/me/reports/:id', authenticate, orgStaff, asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } })
  if (!report) throw ApiError.notFound('Report not found')
  if (report.claimedByOrgId !== req.user.orgId) throw ApiError.forbidden('This report is not assigned to your organization')
  const allowed = ['claimed', 'in_progress', 'resolved', 'rejected']
  const status = allowed.includes(req.body?.status) ? req.body.status : report.status
  res.json(await prisma.report.update({ where: { id: report.id }, data: { status } }))
}))

// GET /organizations/me/stats — aggregated metrics for the dashboard charts
router.get('/me/stats', authenticate, orgStaff, asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({ where: { claimedByOrgId: req.user.orgId } })

  const byStatus = { claimed: 0, in_progress: 0, resolved: 0, rejected: 0 }
  const byCategory = {}
  reports.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
    const cat = r.category || 'Other'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  })

  const trend = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i)
    const next = new Date(day); next.setDate(day.getDate() + 1)
    const count = reports.filter((r) => { const c = new Date(r.createdAt); return c >= day && c < next }).length
    trend.push({ label: day.toLocaleDateString('en-US', { weekday: 'short' }), value: count })
  }

  const total = reports.length
  const resolutionRate = total ? Math.round((byStatus.resolved / total) * 100) : 0
  res.json({ total, byStatus, byCategory, resolutionRate, trend })
}))

export default router