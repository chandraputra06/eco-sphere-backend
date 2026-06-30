import { repos } from '../../data/store.js'

/* Single source of truth for points: append to the ledger AND update the cached
 * total on the user. Other modules import awardPoints to keep this consistent. */
export function awardPoints(userId, points, source, refId = null) {
  const user = repos.users.get(userId)
  if (!user) return null
  repos.pointTransactions.create({ userId, points, source, refId })
  const updated = repos.users.update(userId, { points: (user.points || 0) + points })
  return { userId, points, total: updated.points, source }
}

export const leaderboardService = {
  top(limit = 20) {
    return repos.users
      .find((u) => u.role === 'citizen' || u.role === 'manager')
      .map((u) => ({ id: u.id, name: u.name, points: u.points || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((row, i) => ({ rank: i + 1, ...row }))
  },
}
