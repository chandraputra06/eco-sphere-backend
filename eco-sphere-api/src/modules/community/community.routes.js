import { Router } from 'express'
import { repos } from '../../data/store.js'
import { asyncHandler, ApiError } from '../../lib/index.js'
import { authenticate, requireRole } from '../../middleware/index.js'
import { awardPoints } from '../leaderboard/leaderboard.service.js'

const router = Router()

// Manager orgs (Waste Mgmt Org + Environmental Community) work the same surface.
const manager = requireRole('manager')

// POST /community/reports/:id/claim — take ownership of a pending report
router.post('/reports/:id/claim', authenticate, manager, asyncHandler(async (req, res) => {
  const report = repos.reports.get(req.params.id)
  if (!report) throw ApiError.notFound('Report not found')
  if (report.status !== 'pending') throw ApiError.conflict('Report is no longer pending')
  res.json(repos.reports.update(report.id, { status: 'claimed', claimedByOrgId: req.user.orgId }))
}))

// POST /community/events — schedule a cleanup, optionally tied to a report
router.post('/events', authenticate, manager, asyncHandler(async (req, res) => {
  const { title, reportId, location, scheduledAt, volunteersNeeded } = req.body || {}
  if (!title) throw ApiError.badRequest('title is required')
  const event = repos.cleanupEvents.create({
    communityOrgId: req.user.orgId, title, reportId: reportId || null,
    location: location || null, scheduledAt: scheduledAt || null,
    volunteersNeeded: volunteersNeeded || 0, status: 'published', participants: [],
  })
  if (reportId) repos.reports.update(reportId, { status: 'in_progress' })
  res.status(201).json(event)
}))

// POST /community/events/:id/checkin — a volunteer joins
router.post('/events/:id/checkin', authenticate, asyncHandler(async (req, res) => {
  const event = repos.cleanupEvents.get(req.params.id)
  if (!event) throw ApiError.notFound('Event not found')
  if (!event.participants.includes(req.user.id)) event.participants.push(req.user.id)
  res.json(event)
}))

// POST /community/events/:id/resolve — close the loop + award points to all
router.post('/events/:id/resolve', authenticate, manager, asyncHandler(async (req, res) => {
  const event = repos.cleanupEvents.get(req.params.id)
  if (!event) throw ApiError.notFound('Event not found')
  repos.cleanupEvents.update(event.id, { status: 'resolved' })
  if (event.reportId) repos.reports.update(event.reportId, { status: 'resolved' })

  const awarded = event.participants.map((uid) =>
    awardPoints(uid, 80, 'cleanup', event.id))
  res.json({ event: { ...event, status: 'resolved' }, awarded })
}))

export default router
