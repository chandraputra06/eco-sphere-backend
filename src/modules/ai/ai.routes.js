import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { aiService } from './ai.service.js'
import { asyncHandler } from '../../lib/index.js'
import { authenticate } from '../../middleware/index.js'

const router = Router()

// AI is the most expensive surface — rate-limit it harder than the rest.
const aiLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false })

// POST /ai/classify — server-side Gemini call (the key never reaches the client)
router.post('/classify', authenticate, aiLimiter, asyncHandler(async (req, res) => {
  res.json(await aiService.classify(req.body))
}))

// POST /ai/recommend — turn a classification into ranked, role-aware actions
router.post('/recommend', authenticate, asyncHandler(async (req, res) => {
  const { lat, lng, category, volume } = req.body || {}
  res.json(await aiService.recommend({ lat, lng, category, volume }))
}))

export default router
