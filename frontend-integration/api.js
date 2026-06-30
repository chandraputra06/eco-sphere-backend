/**
 * Eco-Sphere API client — drop into src/services/api.js
 *
 * Add to your frontend .env:
 *   VITE_API_BASE=http://localhost:4000/api/v1        (dev)
 *   VITE_API_BASE=https://your-service.onrender.com/api/v1   (prod)
 *
 * Note: VITE_GEMINI_API_KEY can now be DELETED from the frontend — the key
 * lives only on the backend.
 */

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api/v1'

const TOKENS = 'eco_sphere_tokens'

function getTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS)) || {} } catch { return {} }
}
function setTokens(t) { localStorage.setItem(TOKENS, JSON.stringify(t)) }
function clearTokens() { localStorage.removeItem(TOKENS) }

async function request(path, { method = 'GET', body, auth = true, _retry } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const { accessToken, refreshToken } = getTokens()
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Transparent refresh on a single 401
  if (res.status === 401 && auth && refreshToken && !_retry) {
    const ok = await refresh(refreshToken)
    if (ok) return request(path, { method, body, auth, _retry: true })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`)
  return data
}

async function refresh(refreshToken) {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { clearTokens(); return false }
    const data = await res.json()
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return true
  } catch { clearTokens(); return false }
}

export const api = {
  // ── auth ──────────────────────────────────────────────
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', auth: false, body: { email, password } })
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data.user
  },
  async register(payload) {
    const data = await request('/auth/register', { method: 'POST', auth: false, body: payload })
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data.user
  },
  me: () => request('/auth/me'),
  logout: () => clearTokens(),
  isLoggedIn: () => Boolean(getTokens().accessToken),

  // ── AI (replaces the client-side Gemini call) ─────────
  // dataUrl is the same base64 preview you already build in WasteReport.jsx
  classify: (dataUrl) => request('/ai/classify', { method: 'POST', body: { image: dataUrl } }),
  recommend: (payload) => request('/ai/recommend', { method: 'POST', body: payload }),

  // ── reports ───────────────────────────────────────────
  createReport: (payload) => request('/reports', { method: 'POST', body: payload }),
  listReports: (query = '') => request(`/reports${query}`),
  reportRecommendations: (id) => request(`/reports/${id}/recommendations`),

  // ── collectors / points / leaderboard ────────────────
  nearestCollectors: ({ lat, lng, category }) =>
    request(`/collectors/nearest?lat=${lat}&lng=${lng}&category=${encodeURIComponent(category || '')}`),
  claimPoints: (payload) => request('/leaderboard/claim', { method: 'POST', body: payload }),
  leaderboard: () => request('/leaderboard'),

  // ── role surfaces ─────────────────────────────────────
  collectorJobs: (status = '') => request(`/collectors/jobs${status ? `?status=${status}` : ''}`),
  csrOverview: () => request('/csr/overview'),
  csrChallenges: () => request('/csr/challenges'),
}
