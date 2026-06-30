import { repos } from '../data/store.js'

/* Haversine distance in km (ported from the frontend). */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* Maps an AI category to the material keywords used by collection points. */
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

/* Nearest collection points, optionally filtered by what the category needs. */
export function nearestCollectionPoints({ lat, lng, category, limit = 3 }) {
  const materials = materialsForCategory(category)
  let list = repos.collectionPoints.all().map((p) => ({
    ...p,
    distanceKm: lat != null && lng != null ? distanceKm(lat, lng, p.lat, p.lng) : null,
  }))
  if (materials.length) {
    const matched = list.filter((p) => (p.accepts || []).some((a) => materials.includes(a)))
    if (matched.length) list = matched
  }
  if (lat != null && lng != null) list.sort((a, b) => a.distanceKm - b.distanceKm)
  return list.slice(0, limit)
}

/* Self-processing tips per category (ported). */
export function processingTips(category = '') {
  const c = category.toLowerCase()
  if (c.includes('b3') || c.includes('hazard')) {
    return { title: 'Hazardous Waste Handling', steps: [
      'Do not mix it with regular household waste.',
      'Store batteries, electronics, or bulbs in a separate, closed container.',
      'Drop it off at a hazardous-waste collection point or e-waste collector.',
      'Avoid burning it or pouring it into drains.',
    ] }
  }
  if (c.includes('inorganic') || c.includes('plastic')) {
    return { title: 'DIY Recycling', steps: [
      'Rinse and dry packaging so it does not smell.',
      'Sort by type: plastic, paper, metal, glass.',
      'Flatten bottles and cardboard to save space.',
      'Collect enough before dropping it off at a waste bank.',
    ] }
  }
  return { title: 'Simple Home Composting', steps: [
    'Use an old bucket and punch holes in the bottom for airflow.',
    'Chop vegetable, fruit, and leaf scraps into small pieces.',
    'Layer with soil or finished compost, and stir every 3 days.',
    'In 3-4 weeks the compost is ready for your plants.',
  ] }
}

/* Points per action (ported from the frontend's pointsFor). */
export function pointsFor(action, selfChoice) {
  if (action === 'community') return 80
  if (action === 'self') return selfChoice === 'bank' ? 60 : 40
  return 30 // map / large report
}

/*
 * Recommendation engine — the 3-tier routing from the team's flowchart.
 *   kecil (small)  → handle yourself: nearest waste bank OR DIY tips
 *   sedang (medium)→ handle yourself OR organise/join a community cleanup
 *   besar (large)  → escalate: add to waste map + manager pickup, or community
 */
export function buildRecommendation({ lat, lng, category, volume }) {
  const tier = (volume || 'small').toLowerCase()
  const banks = nearestCollectionPoints({ lat, lng, category, limit: 3 })
  const tips = processingTips(category)

  if (tier === 'large' || tier === 'besar') {
    return {
      tier: 'besar',
      headline: 'Large volume — collective handling is more effective.',
      actions: [
        { type: 'map', label: 'Add to Smart Waste Map', points: pointsFor('map'), result: 'A manager org can pick it up.' },
        { type: 'community', label: 'Request a community cleanup', points: pointsFor('community') },
      ],
    }
  }
  if (tier === 'medium' || tier === 'sedang') {
    return {
      tier: 'sedang',
      headline: 'Medium volume — you can handle it, or rally a small group.',
      actions: [
        { type: 'self', subtype: 'bank', label: 'Take to a waste bank', points: pointsFor('self', 'bank'), banks },
        { type: 'community', label: 'Join a community cleanup', points: pointsFor('community') },
      ],
    }
  }
  return {
    tier: 'kecil',
    headline: 'Small volume — you can handle it yourself today.',
    actions: [
      { type: 'self', subtype: 'bank', label: 'Take to a waste bank', points: pointsFor('self', 'bank'), banks },
      { type: 'self', subtype: 'diy', label: 'DIY processing', points: pointsFor('self', 'diy'), tips },
    ],
  }
}
