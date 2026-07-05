import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../data/prisma.js";
import {
  ApiError,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/index.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(["citizen", "collector", "manager", "csr"]).default("citizen"),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    points: u.points ?? 0,
    orgId: u.orgId ?? null,
    phone: u.phone ?? null,
    avatar: u.avatar ?? null,
  };
}

export const authService = {
  async register(body) {
    const data = registerSchema.parse(body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw ApiError.conflict("Email is already registered");
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: bcrypt.hashSync(data.password, 10),
        phone: data.phone || null,
        role: data.role,
        points: 0,
      },
    });
    return this.issueTokens(user);
  },

  async login(body) {
    const data = loginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !bcrypt.compareSync(data.password, user.passwordHash)) {
      throw ApiError.unauthorized("Wrong email or password");
    }
    return this.issueTokens(user);
  },

  async refresh(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized("Missing refresh token");
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid refresh token");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized("Account no longer exists");
    return this.issueTokens(user);
  },

  async me(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");
    return publicUser(user);
  },

  async updateMe(userId, body) {
    const data = updateSchema.parse(body);
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    const user = await prisma.user.update({ where: { id: userId }, data: patch });
    return publicUser(user);
  },

  issueTokens(user) {
    return {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  },
};