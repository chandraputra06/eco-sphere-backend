import { Router } from 'express'
import { reportsService } from './reports.service.js'
import { asyncHandler } from '../../lib/index.js'
import { authenticate } from '../../middleware/index.js'

const router = Router()

// POST /reports — citizen files a report
router.post('/', authenticate, asyncHandler(async (req, res) => {
  res.status(201).json(await reportsService.create(req.user.id, req.body))
}))

// GET /reports?status=pending&volume=besar — feed for citizens, managers, communities
router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json(reportsService.list({ status: req.query.status, volume: req.query.volume }))
}))

// GET /reports/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  res.json(reportsService.get(req.params.id))
}))

// GET /reports/:id/recommendations — AI rec engine for this report
router.get('/:id/recommendations', authenticate, asyncHandler(async (req, res) => {
  res.json(reportsService.recommendations(req.params.id))
}))

export default router
