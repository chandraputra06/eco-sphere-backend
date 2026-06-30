# Eco-Sphere API

Express.js backend for Eco-Sphere — auth + RBAC, waste reports, the AI proxy
(Gemini, server-side), and the role workflows from the flowchart
(citizen · collector · manager · csr · admin).

Runs **with zero database setup**: it uses an in-memory store seeded with your
real waste-bank data, so every endpoint returns live-looking results. When
you're ready for Postgres, swap the data layer for Prisma (`prisma/schema.prisma`
already mirrors the models).

## Quick start

```bash
cp .env.example .env      # works as-is; AI runs in mock mode until you add a key
npm install
npm run dev               # http://localhost:4000
```

Health check: `GET http://localhost:4000/health`

### Demo accounts (password: `password123`)
| Email | Role |
|-------|------|
| citizen@eco.id | citizen |
| collector@eco.id | collector (Grapari) |
| manager@eco.id | manager (Malu Dong) |
| csr@eco.id | csr (Telkomsel) |
| admin@eco.id | admin |

## The AI key (the thing to fix)

Your Gemini key currently ships to the browser via `VITE_GEMINI_API_KEY`.
Here it lives only on the server: the frontend calls `POST /api/v1/ai/classify`,
and Express talks to Gemini. With **no** `GEMINI_API_KEY` set, the endpoint runs
in **mock mode** so you can develop without burning quota.

## API (base: `/api/v1`)

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | public | sign up (role: citizen/collector/manager/csr) |
| POST | `/auth/login` | public | returns `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | public | new tokens from a refresh token |
| GET | `/auth/me` | any | current user |
| POST | `/ai/classify` | any | image → `{ isWaste, category, volume, note }` |
| POST | `/ai/recommend` | any | classification → ranked actions |
| POST | `/reports` | citizen | file a report |
| GET | `/reports` | any | feed (`?status=pending&volume=besar`) |
| GET | `/reports/:id/recommendations` | any | 3-tier routing + nearest banks |
| GET | `/collectors/nearest` | any | `?lat&lng&category` |
| GET/PATCH | `/collectors/jobs` | collector | pickup queue |
| POST | `/community/reports/:id/claim` | manager | take a report |
| POST | `/community/events` | manager | schedule a cleanup |
| POST | `/community/events/:id/resolve` | manager | close + award points |
| GET/POST | `/csr/challenges` | csr | campaigns |
| GET | `/csr/overview` | csr/admin | dashboard KPIs |
| GET | `/leaderboard` | any | ranking |
| POST | `/leaderboard/claim` | any | award points for an action |
| POST | `/admin/orgs/:id/verify` | admin | verify an org |

## Deploy to Render

1. Push this folder to a GitHub repo.
2. Render → **New → Web Service** → pick the repo.
3. Build command `npm install`, start command `npm start`.
4. Add env vars from `.env.example` (set real `JWT_*` secrets, `GEMINI_API_KEY`,
   and `CORS_ORIGINS=https://your-app.vercel.app`).
5. Deploy. Your frontend then points to `https://your-service.onrender.com/api/v1`.

## Going to Postgres (later)

`src/data/store.js` is the only file that knows about storage. Its repos
(`create/get/find/update`) map 1:1 onto Prisma calls, so migrating is mechanical:
generate the client from `prisma/schema.prisma`, then replace the in-memory
repos with Prisma queries — no route or service changes needed.

## Structure

```
src/
  config/env.js          # typed env
  lib/index.js           # ApiError, asyncHandler, JWT helpers
  lib/geo.js             # haversine + recommendation engine (ported from FE)
  middleware/index.js    # authenticate, requireRole, error handler
  data/store.js          # in-memory repos + seed
  modules/<feature>/     # routes + service per feature
  app.js  server.js
```
