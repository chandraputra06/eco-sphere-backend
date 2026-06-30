import { ApiError, verifyAccessToken } from '../lib/index.js'
import { env } from '../config/env.js'

/* Reads the Bearer token, verifies it, and attaches req.user. */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next(ApiError.unauthorized())
  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, role: payload.role, name: payload.name }
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'))
  }
}

/* Guards a route by role. Usage: requireRole('collector'), requireRole('manager','admin'). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`))
    }
    next()
  }
}

/* Centralised error handler — every thrown ApiError becomes a clean JSON body. */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  if (status >= 500 && !env.isProd) console.error(err)
  res.status(status).json({
    error: {
      message: err.message || 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
    },
  })
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { message: 'Route not found' } })
}
