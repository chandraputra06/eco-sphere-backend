import { prisma } from '../../data/prisma.js'

export async function awardPoints(userId, points, source, refId = null) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  await prisma.pointTransaction.create({ data: { userId, points, source, refId } })
  const updated = await prisma.user.update({ where: { id: userId }, data: { points: { increment: points } } })
  return { userId, points, total: updated.points, source }
}

export const leaderboardService = {
  async top(limit = 20) {
    const users = await prisma.user.findMany({ where: { role: { in: ['citizen', 'manager'] } }, orderBy: { points: 'desc' }, take: limit })
    return users.map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, points: u.points || 0 }))
  },
}
