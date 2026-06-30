import { z } from 'zod'
import { repos } from '../../data/store.js'
import { ApiError } from '../../lib/index.js'
import { buildRecommendation } from '../../lib/geo.js'
import { aiService, normalizeVolume } from '../ai/ai.service.js'

const createSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  // Optional: if the client already ran /ai/classify, it can pass results in.
  category: z.string().optional(),
  volume: z.string().optional(),
  note: z.string().optional(),
})

export const reportsService = {
  async create(userId, body) {
    const data = createSchema.parse(body)
    const volume = data.volume ? normalizeVolume(data.volume) : null

    const report = repos.reports.create({
      reporterId: userId,
      lat: data.lat,
      lng: data.lng,
      address: data.address || null,
      photoUrl: data.photoUrl || null,
      category: data.category || null,
      volume,
      status: 'pending',
    })

    if (data.category || volume) {
      repos.aiAnalyses.create({
        reportId: report.id, isWaste: true,
        category: data.category || null, volume, note: data.note || '',
      })
    }
    return report
  },

  list(filter = {}) {
    let list = repos.reports.all()
    if (filter.status) list = list.filter((r) => r.status === filter.status)
    if (filter.volume) {
      const v = normalizeVolume(filter.volume)
      list = list.filter((r) => r.volume === v)
    }
    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  },

  get(id) {
    const report = repos.reports.get(id)
    if (!report) throw ApiError.notFound('Report not found')
    return report
  },

  recommendations(id) {
    const report = this.get(id)
    return buildRecommendation({
      lat: report.lat, lng: report.lng,
      category: report.category, volume: report.volume,
    })
  },
}
