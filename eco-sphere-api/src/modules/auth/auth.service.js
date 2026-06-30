import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { repos } from '../../data/store.js'
import { ApiError, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/index.js'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['citizen', 'collector', 'manager', 'csr']).default('citizen'),
})
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, points: u.points ?? 0, orgId: u.orgId ?? null }
}

export const authService = {
  async register(body) {
    const data = registerSchema.parse(body)
    if (repos.users.findOne((u) => u.email === data.email)) {
      throw ApiError.conflict('Email is already registered')
    }
    const user = repos.users.create({
      name: data.name,
      email: data.email,
      passwordHash: bcrypt.hashSync(data.password, 10),
      role: data.role,
      points: 0,
    })
    return this.issueTokens(user)
  },

  async login(body) {
    const data = loginSchema.parse(body)
    const user = repos.users.findOne((u) => u.email === data.email)
    if (!user || !bcrypt.compareSync(data.password, user.passwordHash)) {
      throw ApiError.unauthorized('Wrong email or password')
    }
    return this.issueTokens(user)
  },

  async refresh(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized('Missing refresh token')
    let payload
    try { payload = verifyRefreshToken(refreshToken) }
    catch { throw ApiError.unauthorized('Invalid refresh token') }
    const user = repos.users.get(payload.sub)
    if (!user) throw ApiError.unauthorized('Account no longer exists')
    return this.issueTokens(user)
  },

  me(userId) {
    const user = repos.users.get(userId)
    if (!user) throw ApiError.notFound('User not found')
    return publicUser(user)
  },

  issueTokens(user) {
    return {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    }
  },
}
