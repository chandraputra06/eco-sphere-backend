import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

/*
 * Dev data layer: simple in-memory repositories with the same shape the
 * Prisma models will have. This lets the API run with zero DB setup.
 * For production, replace these repos with Prisma calls (see prisma/schema.prisma).
 */

const now = () => new Date().toISOString()
const db = {
  users: new Map(),
  organizations: new Map(),
  collectionPoints: new Map(),
  reports: new Map(),
  aiAnalyses: new Map(),
  pickupJobs: new Map(),
  cleanupEvents: new Map(),
  pointTransactions: new Map(),
  challenges: new Map(),
}

function makeRepo(table) {
  const map = db[table]
  return {
    all: () => [...map.values()],
    find: (pred) => [...map.values()].filter(pred),
    findOne: (pred) => [...map.values()].find(pred) || null,
    get: (id) => map.get(id) || null,
    create: (data) => {
      const id = data.id || randomUUID()
      const row = { id, createdAt: now(), ...data }
      map.set(id, row)
      return row
    },
    update: (id, patch) => {
      const row = map.get(id)
      if (!row) return null
      const next = { ...row, ...patch, updatedAt: now() }
      map.set(id, next)
      return next
    },
    remove: (id) => map.delete(id),
  }
}

export const repos = {
  users: makeRepo('users'),
  organizations: makeRepo('organizations'),
  collectionPoints: makeRepo('collectionPoints'),
  reports: makeRepo('reports'),
  aiAnalyses: makeRepo('aiAnalyses'),
  pickupJobs: makeRepo('pickupJobs'),
  cleanupEvents: makeRepo('cleanupEvents'),
  pointTransactions: makeRepo('pointTransactions'),
  challenges: makeRepo('challenges'),
}

/* ── Seed ─────────────────────────────────────────────── */
export function seed() {
  const pw = bcrypt.hashSync('password123', 10)

  // One demo account per role (password: password123)
  const citizen = repos.users.create({
    id: 'u-citizen', name: 'Tut Anca', email: 'citizen@eco.id',
    passwordHash: pw, role: 'citizen', points: 1240,
  })
  repos.users.create({
    id: 'u-collector', name: 'Grapari Denpasar', email: 'collector@eco.id',
    passwordHash: pw, role: 'collector', orgId: 'org-grapari', points: 0,
  })
  repos.users.create({
    id: 'u-manager', name: 'Malu Dong', email: 'manager@eco.id',
    passwordHash: pw, role: 'manager', orgId: 'org-maludong', points: 0,
  })
  repos.users.create({
    id: 'u-csr', name: 'Telkomsel CSR', email: 'csr@eco.id',
    passwordHash: pw, role: 'csr', orgId: 'org-telkomsel', points: 0,
  })
  repos.users.create({
    id: 'u-admin', name: 'Platform Ops', email: 'admin@eco.id',
    passwordHash: pw, role: 'admin', points: 0,
  })

  // Organizations (collector / manager / csr)
  repos.organizations.create({ id: 'org-grapari', name: 'Grapari (Telkomsel)', type: 'collector', verified: true })
  repos.organizations.create({ id: 'org-mbl', name: 'Mitra Bhumi Lestari', type: 'collector', verified: true })
  repos.organizations.create({ id: 'org-maludong', name: 'Malu Dong', type: 'manager', verified: true })
  repos.organizations.create({ id: 'org-wmo', name: 'Waste Management Organization', type: 'manager', verified: true })
  repos.organizations.create({ id: 'org-telkomsel', name: 'Telkomsel', type: 'csr', verified: true })

  // Collection points — ported from the frontend's bankSampahData
  const points = [
    { name: 'Bank Sampah Induk Denpasar', lat: -8.6705, lng: 115.2126, type: 'bank_sampah', address: 'Jl. Cargo, North Denpasar', hours: 'Mon-Fri 08:00-16:00', accepts: ['Plastic', 'Paper', 'Metal', 'Glass'], price: 'Market rate per kg', howToRegister: 'Walk in, bring ID', orgId: 'org-mbl' },
    { name: 'Bank Sampah Gianyar Bersih', lat: -8.5380, lng: 115.3250, type: 'bank_sampah', address: 'Jl. Ngurah Rai, Gianyar', hours: 'Mon-Sat 08:00-15:00', accepts: ['Plastic', 'Paper', 'Organic'], price: 'Paid per kg', howToRegister: 'Contact village coordinator', orgId: 'org-mbl' },
    { name: 'Sanur Metal & E-waste Collector', lat: -8.6880, lng: 115.2620, type: 'pengepul', address: 'Jl. Danau Poso, Sanur', hours: 'Daily 08:00-17:00', accepts: ['Metal', 'Electronics', 'TV', 'Fridge', 'AC'], price: 'Iron Rp 3,000/kg', howToRegister: 'Walk in directly', orgId: 'org-mbl' },
    { name: 'Bank Sampah Kuta Lestari', lat: -8.7200, lng: 115.1680, type: 'bank_sampah', address: 'Jl. Raya Kuta, Badung', hours: 'Tue & Fri 09:00-14:00', accepts: ['Plastic', 'Bottles', 'Cardboard'], price: 'Plastic bottle Rp 1,500/kg', howToRegister: 'Register via WhatsApp', orgId: 'org-grapari' },
    { name: 'Grapari Renon Drop Point', lat: -8.6710, lng: 115.2390, type: 'bank_sampah', address: 'Jl. Raya Puputan, Renon', hours: 'Mon-Sat 08:00-15:00', accepts: ['Plastic', 'Paper', 'Electronics'], price: 'Reward points', howToRegister: 'Walk in', orgId: 'org-grapari' },
    { name: 'Denpasar Used Cooking Oil Collector', lat: -8.6520, lng: 115.2300, type: 'pengepul', address: 'Jl. Imam Bonjol, Denpasar', hours: 'Mon-Sat 08:00-17:00', accepts: ['Used cooking oil'], price: 'Rp 4,000/liter', howToRegister: 'Walk in with container', orgId: 'org-mbl' },
  ]
  points.forEach((p) => repos.collectionPoints.create(p))

  // A couple of open reports (large volume → waiting for a manager pickup)
  repos.reports.create({
    id: 'r-1', reporterId: citizen.id, lat: -8.6750, lng: 115.2630,
    address: 'Sanur Beach Coast', photoUrl: null,
    category: 'Plastic / Inorganic', volume: 'large', status: 'pending',
  })
  repos.reports.create({
    id: 'r-2', reporterId: citizen.id, lat: -8.6650, lng: 115.2150,
    address: 'Tukad Badung River', photoUrl: null,
    category: 'Organic', volume: 'large', status: 'pending',
  })

  // An active CSR challenge (ported from csrChallenges)
  repos.challenges.create({
    id: 'c-1', csrOrgId: 'org-telkomsel', title: 'Beach Cleanup Sprint',
    description: 'Report 5 critical beach waste spots in 7 days.',
    reward: 'Rp 500.000', target: 500, progress: 57,
    deadline: '2026-07-08', status: 'live',
  })

  // Reporter's starting point ledger
  repos.pointTransactions.create({
    userId: citizen.id, source: 'seed', points: 1240, refId: null,
  })

  return { accounts: 'citizen|collector|manager|csr|admin @eco.id / password123' }
}
