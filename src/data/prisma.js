// src/data/prisma.js — Prisma client singleton (aman untuk serverless Vercel)
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
export const prisma = globalForPrisma.__ecoPrisma ?? new PrismaClient()
globalForPrisma.__ecoPrisma = prisma