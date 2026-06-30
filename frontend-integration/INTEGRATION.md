# Wiring your React app to the API

Three changes. The biggest one removes your exposed Gemini key.

## 1. Add the client + env

- Copy `api.js` → `src/services/api.js`
- In the **frontend** `.env`:
  ```
  VITE_API_BASE=http://localhost:4000/api/v1
  ```
- You can now **delete** `VITE_GEMINI_API_KEY` from the frontend.

## 2. Replace the Gemini block in `WasteReport.jsx`

In `handleAnalyzeAI`, delete the whole `GoogleGenerativeAI` section (the key
lookup, `genAI`, `model.generateContent`, the prompt, and the JSON-regex parse)
and replace it with one call:

```js
import { api } from '../services/api'

// ...inside handleAnalyzeAI, after setIsAnalyzing(true):
try {
  const data = await api.classify(preview)   // preview is your base64 data URL
  const waste = data.isWaste !== false
  setIsWaste(waste)
  setCategory(waste ? (data.category || 'Unknown') : '')
  setVolume(waste ? (data.volume || 'small') : '')   // backend returns small|medium|large
  setAiNote(data.note || '')
  setHasAnalyzed(true)
} catch (err) {
  setAiError(err.message)
} finally {
  setIsAnalyzing(false)
}
```

Your `isBig` check still works — just widen it for the new middle tier:

```js
const isBig = ['large', 'besar'].includes(volume.toLowerCase())
const isMedium = ['medium', 'sedang'].includes(volume.toLowerCase())
```

(Optional) Let the backend own the recommendation logic too, instead of the
local `nearestBankSampah` / `processingTips`:

```js
const rec = await api.recommend({ lat: coords?.lat, lng: coords?.lng, category, volume })
// rec.tier → 'kecil' | 'sedang' | 'besar', rec.actions → ranked options with points & banks
```

## 3. Make auth real

Replace `src/services/authService.js` usage:

```js
// before:  loginUser()  (just set a localStorage flag)
// after:
import { api } from './api'
await api.login(email, password)   // stores tokens, returns the user (with .role)
```

Then route by `user.role` so each actor lands on the right surface
(citizen → Scan Waste, collector → jobs, manager → report feed, csr → dashboard).
`ProtectedRoute` can check `api.isLoggedIn()`; add a `RoleRoute` that also checks
the role from `api.me()`.

## 4. Award points from the server

When the user taps **Submit Report**, instead of the local points pop-up math,
call:

```js
const { earned } = await api.claimPoints({ reportId, action: selectedAction, selfChoice })
setEarnedPoints(earned)   // keep your existing count-up animation
```

---

### Suggested order
1. Stand up the backend (`npm run dev`) — works in mock AI mode immediately.
2. Do change #1 + #2 so Scan Waste runs through the server (key now hidden).
3. Add a real `GEMINI_API_KEY` on the backend `.env` to leave mock mode.
4. Then auth (#3) and points (#4), then build out the collector/manager/csr screens.
