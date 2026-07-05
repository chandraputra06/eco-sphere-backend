import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = bcrypt.hashSync('password123', 10)

  const orgs = [
    { id: 'org-grapari', name: 'Grapari (Telkomsel)', type: 'collector', verified: true },
    { id: 'org-mbl', name: 'Mitra Bhumi Lestari', type: 'waste_mgmt', verified: true },
    { id: 'org-wmo', name: 'Bali Waste Cycle', type: 'waste_mgmt', verified: true },
    { id: 'org-maludong', name: 'Malu Dong Community', type: 'community', verified: true },
    { id: 'org-jagabumi', name: 'Jaga Bumi Bali', type: 'community', verified: true },
    { id: 'org-telkomsel', name: 'Telkomsel', type: 'csr', verified: true },
  ]
  for (const o of orgs) await prisma.organization.upsert({ where: { id: o.id }, update: o, create: o })

  const users = [
    { id: 'u-citizen', name: 'Tut Anca', email: 'citizen@eco.id', role: 'citizen', points: 1240, orgId: null },
    { id: 'u-collector', name: 'Grapari Denpasar', email: 'collector@eco.id', role: 'collector', orgId: 'org-grapari' },
    { id: 'u-manager', name: 'Malu Dong', email: 'manager@eco.id', role: 'manager', orgId: 'org-maludong' },
    { id: 'u-csr', name: 'Telkomsel CSR', email: 'csr@eco.id', role: 'csr', orgId: 'org-telkomsel' },
    { id: 'u-admin', name: 'Platform Ops', email: 'admin@eco.id', role: 'admin', orgId: null },
  ]
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, orgId: u.orgId },
      create: { ...u, passwordHash },
    })
  }

  const points = [
    { id: 'p-1', name: 'Bank Sampah Induk Denpasar', lat: -8.6705, lng: 115.2126, type: 'bank_sampah', hours: 'Mon-Fri 08:00-16:00', accepts: ['Plastic', 'Paper', 'Metal', 'Glass'], price: 'Market rate per kg', howToRegister: 'Walk in, bring ID', orgId: 'org-mbl' },
    { id: 'p-2', name: 'Bank Sampah Gianyar Bersih', lat: -8.5380, lng: 115.3250, type: 'bank_sampah', hours: 'Mon-Sat 08:00-15:00', accepts: ['Plastic', 'Paper', 'Organic'], price: 'Paid per kg', howToRegister: 'Contact village coordinator', orgId: 'org-mbl' },
    { id: 'p-3', name: 'Sanur Metal & E-waste Collector', lat: -8.6880, lng: 115.2620, type: 'pengepul', hours: 'Daily 08:00-17:00', accepts: ['Metal', 'Electronics'], price: 'Iron Rp 3,000/kg', howToRegister: 'Walk in directly', orgId: 'org-mbl' },
    { id: 'p-4', name: 'Grapari Kuta', lat: -8.7200, lng: 115.1680, type: 'bank_sampah', hours: 'Tue & Fri 09:00-14:00', accepts: ['Plastic', 'Electronics', 'SIM card'], price: 'Reward points', howToRegister: 'Datang langsung', orgId: 'org-grapari' },
    { id: 'p-5', name: 'Grapari Renon Drop Point', lat: -8.6710, lng: 115.2390, type: 'bank_sampah', hours: 'Mon-Sat 08:00-15:00', accepts: ['Plastic', 'Paper', 'Electronics'], price: 'Reward points', howToRegister: 'Walk in', orgId: 'org-grapari' },
    { id: 'p-6', name: 'Denpasar Used Cooking Oil Collector', lat: -8.6520, lng: 115.2300, type: 'pengepul', hours: 'Mon-Sat 08:00-17:00', accepts: ['Used cooking oil'], price: 'Rp 4,000/liter', howToRegister: 'Walk in with container', orgId: 'org-mbl' },
    { id: 'p-7', name: 'Grapari Sanur e-Waste Point', lat: -8.6880, lng: 115.2600, type: 'bank_sampah', hours: 'Daily 09:00-17:00', accepts: ['Electronics', 'SIM card', 'Battery'], price: 'Reward points', howToRegister: 'Datang langsung', orgId: 'org-grapari' },
  ]
  for (const p of points) await prisma.collectionPoint.upsert({ where: { id: p.id }, update: p, create: p })

  const reps = [
    { id: 'r-1', reporterId: 'u-citizen', lat: -8.6750, lng: 115.2630, address: 'Sanur Beach Coast', category: 'Plastic / Inorganic', volume: 'large', status: 'pending' },
    { id: 'r-2', reporterId: 'u-citizen', lat: -8.6650, lng: 115.2150, address: 'Tukad Badung River', category: 'Organic', volume: 'large', status: 'pending' },
  ]
  for (const r of reps) await prisma.report.upsert({ where: { id: r.id }, update: r, create: r })

  await prisma.challenge.upsert({
    where: { id: 'c-1' },
    update: {},
    create: { id: 'c-1', csrOrgId: 'org-telkomsel', title: 'Beach Cleanup Sprint', description: 'Report 5 critical beach waste spots in 7 days.', reward: 'Rp 500.000', target: 500, progress: 57, deadline: new Date('2026-07-08'), status: 'live' },
  })

  console.log('Seed selesai. Akun demo: citizen|collector|manager|csr|admin @eco.id / password123')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())