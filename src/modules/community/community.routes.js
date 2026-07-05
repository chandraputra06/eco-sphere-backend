import { Router } from 'express'
import { prisma } from '../../data/prisma.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'
import { awardPoints } from '../leaderboard/leaderboard.service.js'

const router = Router()
const manager = requireRole('manager')

router.post('/reports/:id/claim', authenticate, manager, asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } })
  if (!report) throw ApiError.notFound('Report not found')
  if (report.status !== 'pending') throw ApiError.conflict('Report is no longer pending')
  res.json(await prisma.report.update({ where: { id: report.id }, data: { status: 'claimed', claimedByOrgId: req.user.orgId } }))
}))

router.post('/events', authenticate, manager, asyncHandler(async (req, res) => {
  const { title, reportId, location, scheduledAt, volunteersNeeded } = req.body || {}
  if (!title) throw ApiError.badRequest('title is required')
  const event = await prisma.cleanupEvent.create({
    data: { communityOrgId: req.user.orgId, title, reportId: reportId || null, location: location || null, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, volunteersNeeded: volunteersNeeded || 0, status: 'published', participants: [] },
  })
  if (reportId) await prisma.report.update({ where: { id: reportId }, data: { status: 'in_progress' } })
  res.status(201).json(event)
}))

router.post('/events/:id/checkin', authenticate, asyncHandler(async (req, res) => {
  const event = await prisma.cleanupEvent.findUnique({ where: { id: req.params.id } })
  if (!event) throw ApiError.notFound('Event not found')
  const participants = Array.isArray(event.participants) ? [...event.participants] : []
  if (!participants.includes(req.user.id)) participants.push(req.user.id)
  res.json(await prisma.cleanupEvent.update({ where: { id: event.id }, data: { participants } }))
}))

router.post('/events/:id/resolve', authenticate, manager, asyncHandler(async (req, res) => {
  const event = await prisma.cleanupEvent.findUnique({ where: { id: req.params.id } })
  if (!event) throw ApiError.notFound('Event not found')
  await prisma.cleanupEvent.update({ where: { id: event.id }, data: { status: 'resolved' } })
  if (event.reportId) await prisma.report.update({ where: { id: event.reportId }, data: { status: 'resolved' } })
  const parts = Array.isArray(event.participants) ? event.participants : []
  const awarded = await Promise.all(parts.map((uid) => awardPoints(uid, 80, 'cleanup', event.id)))
  res.json({ event: { ...event, status: 'resolved' }, awarded })
}))

export default router
