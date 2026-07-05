import { Router } from 'express'
import { reportsService } from './reports.service.js'
import { asyncHandler } from '../../lib/index.js'
import { authenticate } from '../../middleware/index.js'

const router = Router()
router.post('/', authenticate, asyncHandler(async (req, res) => { res.status(201).json(await reportsService.create(req.user.id, req.body)) }))
router.get('/', authenticate, asyncHandler(async (req, res) => { res.json(await reportsService.list({ status: req.query.status, volume: req.query.volume })) }))
router.get('/:id', authenticate, asyncHandler(async (req, res) => { res.json(await reportsService.get(req.params.id)) }))
router.get('/:id/recommendations', authenticate, asyncHandler(async (req, res) => { res.json(await reportsService.recommendations(req.params.id)) }))
export default router
