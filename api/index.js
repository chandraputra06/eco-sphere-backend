// api/index.js — Vercel serverless entry for the Eco-Sphere API
// Membungkus app Express dari src/app.js. TIDAK memanggil app.listen()
// dan TIDAK menjalankan migrasi (Vercel serverless: DB sudah dimigrasi di Neon).
import { createApp } from '../src/app.js'

const app = createApp()

export default app