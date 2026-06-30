import { createApp } from './app.js'
import { env } from './config/env.js'
import { seed } from './data/store.js'

const info = seed()
const app = createApp()

app.listen(env.port, () => {
  console.log(`\n  Eco-Sphere API  →  http://localhost:${env.port}`)
  console.log(`  Health          →  http://localhost:${env.port}/health`)
  console.log(`  AI mode         →  ${env.ai.mock ? 'MOCK (no GEMINI_API_KEY set)' : 'Gemini'}`)
  console.log(`  Demo accounts   →  ${info.accounts}\n`)
})
