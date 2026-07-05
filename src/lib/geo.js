import { prisma } from '../data/prisma.js'

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CATEGORY_RULES = [
  { keys: ['b3', 'hazard'], materials: ['Electronics', 'Metal', 'Used cooking oil'] },
  { keys: ['inorganic', 'plastic'], materials: ['Plastic', 'Metal', 'Glass', 'Paper', 'Bottles', 'Cardboard', 'Electronics'] },
  { keys: ['organic'], materials: ['Organic'] },
]
export function materialsForCategory(category = '') {
  const c = category.toLowerCase()
  const rule = CATEGORY_RULES.find((r) => r.keys.some((k) => c.includes(k)))
  return rule ? rule.materials : []
}

export async function nearestCollectionPoints({ lat, lng, category, ewaste = false, limit = 3 }) {
  const all = await prisma.collectionPoint.findMany()
  let list = all
  if (ewaste) {
    // Limbah elektronik / kartu SIM -> arahkan ke titik Grapari (Telkomsel)
    const grapari = all.filter((p) => p.orgId === 'org-grapari')
    list = grapari.length ? grapari : all.filter((p) => (p.accepts || []).some((a) => /electronic|sim|battery/i.test(a)))
  } else {
    const materials = materialsForCategory(category)
    if (materials.length) {
      const matched = all.filter((p) => (p.accepts || []).some((a) => materials.includes(a)))
      list = matched.length ? matched : all
    }
  }
  list = list.map((p) => ({ ...p, distanceKm: lat != null && lng != null ? distanceKm(lat, lng, p.lat, p.lng) : null }))
  if (lat != null && lng != null) list.sort((a, b) => a.distanceKm - b.distanceKm)
  return list.slice(0, limit)
}

export function processingTips(category = '') {
  const c = category.toLowerCase()
  if (c.includes('b3') || c.includes('hazard')) {
    return { title: 'Hazardous Waste Handling', steps: ['Do not mix it with regular household waste.', 'Store batteries, electronics, or bulbs in a separate, closed container.', 'Drop it off at a hazardous-waste collection point.', 'Avoid burning it or pouring it into drains.'] }
  }
  if (c.includes('inorganic') || c.includes('plastic')) {
    return { title: 'DIY Recycling', steps: ['Rinse and dry packaging so it does not smell.', 'Sort by type: plastic, paper, metal, glass.', 'Flatten bottles and cardboard to save space.', 'Collect enough before dropping it off at a waste bank.'] }
  }
  return { title: 'Simple Home Composting', steps: ['Use an old bucket and punch holes in the bottom for airflow.', 'Chop vegetable, fruit, and leaf scraps into small pieces.', 'Layer with soil or finished compost, and stir every 3 days.', 'In 3-4 weeks the compost is ready for your plants.'] }
}

export function pointsFor(action, selfChoice) {
  if (action === 'community') return 80
  if (action === 'self') return selfChoice === 'bank' ? 60 : 40
  return 30
}

export async function buildRecommendation({ lat, lng, category, volume, ewaste = false }) {
  const tier = (volume || 'small').toLowerCase()
  if (ewaste) {
    const grapari = await nearestCollectionPoints({ lat, lng, ewaste: true, limit: 3 })
    return { tier: 'ewaste', headline: 'Limbah elektronik / kartu SIM — antar ke Grapari terdekat.', actions: [
      { type: 'self', subtype: 'grapari', label: 'Antar ke Grapari terdekat', points: pointsFor('self', 'bank'), banks: grapari },
    ] }
  }
  const banks = await nearestCollectionPoints({ lat, lng, category, limit: 3 })
  const tips = processingTips(category)

  if (tier === 'large' || tier === 'besar') {
    return { tier: 'besar', headline: 'Large volume — collective handling is more effective.', actions: [
      { type: 'map', label: 'Add to Smart Waste Map', points: pointsFor('map'), result: 'A manager org can pick it up.' },
      { type: 'community', label: 'Request a community cleanup', points: pointsFor('community') },
    ] }
  }
  if (tier === 'medium' || tier === 'sedang') {
    return { tier: 'sedang', headline: 'Medium volume — handle it yourself or rally a group.', actions: [
      { type: 'self', subtype: 'bank', label: 'Take to a waste bank', points: pointsFor('self', 'bank'), banks },
      { type: 'community', label: 'Join a community cleanup', points: pointsFor('community') },
    ] }
  }
  return { tier: 'kecil', headline: 'Small volume — you can handle it yourself today.', actions: [
    { type: 'self', subtype: 'bank', label: 'Take to a waste bank', points: pointsFor('self', 'bank'), banks },
    { type: 'self', subtype: 'diy', label: 'DIY processing', points: pointsFor('self', 'diy'), tips },
  ] }
}
