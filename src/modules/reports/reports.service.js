import { z } from 'zod'
import { prisma } from '../../data/prisma.js'
import { ApiError } from '../../lib/index.js'
import { buildRecommendation } from '../../lib/geo.js'
import { normalizeVolume } from '../ai/ai.service.js'

const createSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  category: z.string().optional(),
  volume: z.string().optional(),
  note: z.string().optional(),
  handlerOrgId: z.string().optional(),
  action: z.string().optional(),
})

export const reportsService = {
  async create(userId, body) {
    const data = createSchema.parse(body)
    const volume = data.volume ? normalizeVolume(data.volume) : null
    const assignedOrgId = data.handlerOrgId || null
    const report = await prisma.report.create({
      data: {
        reporterId: userId, lat: data.lat, lng: data.lng, address: data.address || null,
        photoUrl: data.photoUrl || null, category: data.category || null, volume,
        status: assignedOrgId ? 'claimed' : 'pending',
        claimedByOrgId: assignedOrgId,
      },
    })
    if (data.category || volume) {
      await prisma.aiAnalysis.create({ data: { reportId: report.id, isWaste: true, category: data.category || null, volume, note: data.note || '' } })
    }
    return report
  },

  async list(filter = {}) {
    const where = {}
    if (filter.status) where.status = filter.status
    if (filter.volume) where.volume = normalizeVolume(filter.volume)
    return prisma.report.findMany({ where, orderBy: { createdAt: 'desc' } })
  },

  async get(id) {
    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) throw ApiError.notFound('Report not found')
    return report
  },

  async recommendations(id) {
    const report = await this.get(id)
    return buildRecommendation({ lat: report.lat, lng: report.lng, category: report.category, volume: report.volume })
  },
}
