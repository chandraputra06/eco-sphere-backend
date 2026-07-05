import { PrismaClient } from '@prisma/client'

// Satu instance PrismaClient dipakai bersama (hindari koneksi berlebih saat dev --watch).
const g = globalThis
export const prisma = g.__ecoPrisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') g.__ecoPrisma = prisma
