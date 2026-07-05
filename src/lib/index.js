import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/* A typed error we can throw anywhere; the error middleware turns it into JSON. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
  static badRequest(msg, d) { return new ApiError(400, msg, d) }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg) }
  static forbidden(msg = 'You do not have access to this') { return new ApiError(403, msg) }
  static notFound(msg = 'Not found') { return new ApiError(404, msg) }
  static conflict(msg) { return new ApiError(409, msg) }
}

/* Wraps async route handlers so thrown errors reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/* JWT helpers. The token carries the user id + role so RBAC needs no DB hit. */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl },
  )
}
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl })
}
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret)
}
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret)
}
