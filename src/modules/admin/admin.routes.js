import { Router } from 'express'
import { prisma } from '../../data/prisma.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'

const router = Router()
const admin = requireRole('admin')

router.post('/orgs/:id/verify', authenticate, admin, asyncHandler(async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) throw ApiError.notFound('Organization not found')
  res.json(await prisma.organization.update({ where: { id: org.id }, data: { verified: true } }))
}))

router.get('/reports/flagged', authenticate, admin, asyncHandler(async (_req, res) => {
  res.json(await prisma.report.findMany({ where: { status: 'pending' } }))
}))

router.patch('/reports/:id/moderate', authenticate, admin, asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } })
  if (!report) throw ApiError.notFound('Report not found')
  const decision = req.body?.decision === 'reject' ? 'rejected' : report.status
  res.json(await prisma.report.update({ where: { id: report.id }, data: { status: decision } }))
}))

export default router
