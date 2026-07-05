import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { ApiError } from '../../lib/index.js'
import { buildRecommendation } from '../../lib/geo.js'

const classifySchema = z.object({ image: z.string().min(10), mimeType: z.string().optional() })

const PROMPT = `
You are an environmental expert. Analyze this image.
Reply with ONLY valid JSON, no other text, in exactly this shape:
{
  "isWaste": true | false,
  "category": "Organic" | "Plastic / Inorganic" | "B3 / Hazardous" | null,
  "volume": "Kecil" | "Sedang" | "Besar" | null,
  "ewaste": true | false,
  "note": "one short sentence"
}
Rules:
- "isWaste" is true ONLY for real, physical discarded waste/trash/litter.
- "ewaste" is true if the item is electronic waste: a SIM card, phone, battery, charger, cable, circuit board, or other electronics. For e-waste, also set category to "B3 / Hazardous".
- If not actual waste, set isWaste=false and the rest null/false, explain briefly in "note".
- Volume: "Kecil" = one person clears it quickly. "Sedang" = a noticeable pile. "Besar" = overflowing / needs many people.
`

function normalizeVolume(v = '') {
  const s = String(v).toLowerCase()
  if (s.includes('besar') || s.includes('large')) return 'large'
  if (s.includes('sedang') || s.includes('medium')) return 'medium'
  return 'small'
}

function mockClassify() {
  const samples = [
    { isWaste: true, category: 'Plastic / Inorganic', volume: 'small', ewaste: false, note: 'Mock: botol plastik — sampah anorganik kecil.' },
    { isWaste: true, category: 'Organic', volume: 'large', ewaste: false, note: 'Mock: tumpukan sampah organik besar.' },
    { isWaste: true, category: 'B3 / Hazardous', volume: 'small', ewaste: true, note: 'Mock: kartu SIM / limbah elektronik.' },
  ]
  return { ...samples[Math.floor(Math.random() * samples.length)], _mock: true }
}

export const aiService = {
  async classify(body) {
    const { image, mimeType } = classifySchema.parse(body)
    if (env.ai.mock) return mockClassify()

    const isDataUrl = image.startsWith('data:')
    const mt = mimeType || (isDataUrl ? image.substring(image.indexOf(':') + 1, image.indexOf(';')) : 'image/jpeg')
    const base64 = isDataUrl ? image.split(',')[1] : image

    const genAI = new GoogleGenerativeAI(env.ai.apiKey)
    const model = genAI.getGenerativeModel({ model: env.ai.model })

    let text
    try {
      const result = await model.generateContent([PROMPT, { inlineData: { data: base64, mimeType: mt } }])
      text = result.response.text()
    } catch (err) {
      const status = err?.status ?? err?.code
      if (status === 429 || /quota|rate limit/i.test(err?.message || '')) throw new ApiError(429, 'AI usage limit reached. Try again shortly.')
      throw new ApiError(502, 'AI service error', err?.message)
    }

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw ApiError.badRequest('AI did not return valid JSON. Try another photo.')
    const data = JSON.parse(match[0])

    const isWaste = data.isWaste !== false
    return {
      isWaste,
      category: isWaste ? (data.category || 'Unknown') : null,
      volume: isWaste ? normalizeVolume(data.volume) : null,
      ewaste: isWaste ? data.ewaste === true : false,
      note: data.note || '',
    }
  },

  async recommend({ lat, lng, category, volume, ewaste }) {
    return buildRecommendation({ lat, lng, category, volume, ewaste })
  },
}

export { normalizeVolume }
