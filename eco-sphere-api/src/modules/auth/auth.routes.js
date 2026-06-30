import { Router } from 'express'
import { authService } from './auth.service.js'
import { asyncHandler } from '../../lib/index.js'
import { authenticate } from '../../middleware/index.js'

const router = Router()

router.post('/register', asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body))
}))

router.post('/login', asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body))
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  res.json(await authService.refresh(req.body?.refreshToken))
}))

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json(authService.me(req.user.id))
}))

export default router
