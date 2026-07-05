import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/index.js'

import authRoutes from './modules/auth/auth.routes.js'
import reportRoutes from './modules/reports/reports.routes.js'
import aiRoutes from './modules/ai/ai.routes.js'
import collectorRoutes from './modules/collectors/collectors.routes.js'
import communityRoutes from './modules/community/community.routes.js'
import csrRoutes from './modules/csr/csr.routes.js'
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes.js'
import adminRoutes from './modules/admin/admin.routes.js'
import organizationRoutes from './modules/organizations/organizations.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin(origin, cb) {
      // allow same-origin / curl (no origin) and any configured frontend origin
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '12mb' })) // base64 photos can be large
  app.use(morgan(env.isProd ? 'combined' : 'dev'))
  app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }))

  app.get('/health', (_req, res) => res.json({ ok: true, env: env.nodeEnv, ai: env.ai.mock ? 'mock' : 'gemini' }))

  const v1 = express.Router()
  v1.use('/auth', authRoutes)
  v1.use('/reports', reportRoutes)
  v1.use('/ai', aiRoutes)
  v1.use('/collectors', collectorRoutes)
  v1.use('/community', communityRoutes)
  v1.use('/csr', csrRoutes)
  v1.use('/leaderboard', leaderboardRoutes)
  v1.use('/admin', adminRoutes)
  v1.use('/organizations', organizationRoutes)
  app.use('/api/v1', v1)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
