# Security Sprint 1 — Authentication & Authorization

Branch: `security-auth`

## Files modified

| File | Change |
|------|--------|
| `src/middleware.ts` | Rate limits on sensitive API paths; session invalidation for pages/APIs; admin page redirects |
| `src/lib/auth/config.ts` | NextAuth config; Edge-safe JWT/session callbacks (no Prisma on middleware path) |
| `src/lib/auth/session.ts` | `loadActiveAccount`, `isAccountActive` |
| `src/lib/auth/guards.ts` | `requireAuth`, `requireAdmin` with DB-backed session validation |
| `src/lib/auth/admin-api.ts` | Canonical admin API guard import |
| `src/lib/auth/index.ts` | Public exports |
| `src/lib/auth.ts` | Re-exports for existing imports |
| `src/lib/api-auth.ts` | Delegates to `auth/guards` (all routes using `requireAuth` get status checks) |
| `src/lib/security/rate-limit.ts` | Fixed-window limiter, 429 + Retry-After, violation logging, bucket pruning |
| `src/lib/security/request-rate-limit.ts` | Login, search, PDF, revenue export policies |
| `src/lib/security/security-log.ts` | Structured `[security]` stdout logging |
| `src/types/next-auth.d.ts` | JWT user fields (`id`, `role`, `username`) |
| `src/app/api/auth/[...nextauth]/route.ts` | Handlers from `auth/config` |
| `src/app/api/admin/**` (10 routes) | `requireAdmin` from `@/lib/auth/admin-api` |
| `src/app/api/admin/revenue/export/route.ts` | Route-level export rate limit |
| `src/app/api/reports/route.ts` | `requireAdmin` from `admin-api` |
| `src/app/api/settings/route.ts` | `requireAdmin` from `admin-api` |
| `src/app/(dashboard)/layout.tsx` | `isAccountActive` check before rendering dashboard |

## Files added

- `src/lib/auth/config.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/guards.ts`
- `src/lib/auth/admin-api.ts`
- `src/lib/auth/index.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/request-rate-limit.ts`
- `src/lib/security/security-log.ts`

## Security controls implemented

### Rate limiting

| Surface | Policy | HTTP response |
|---------|--------|---------------|
| `POST /api/auth/*` | 10 requests / 15 min per IP | 429, `Retry-After`, JSON `RATE_LIMIT_EXCEEDED` |
| `GET /api/customers?q=` / `GET /api/invoices?q=` | 60 requests / min per user or IP | 429 + `Retry-After` |
| `GET /api/invoices/[id]/pdf` | 30 requests / min per user or IP | 429 + `Retry-After` |
| `GET /api/admin/revenue/export` | 20 requests / hour per user (middleware + route) | 429 + `Retry-After` |

Violations logged: `[security] {"event":"rate_limit_exceeded",...}`

### Session invalidation

- `loadActiveAccount()` on every `requireAuth()` / `requireAdmin()` (all API handlers using `api-auth`) — **Node runtime only**.
- Login `authorize()` rejects `DISABLED` users before a JWT is issued.
- Middleware checks JWT/session presence and role only (no Prisma on Edge).
- Dashboard layout: `isAccountActive()` before render (Node).
- Disabled/deleted users lose API access on the next `requireAuth()` call; pages redirect via dashboard layout.

### Admin authorization

- All `/api/admin/*` routes use `requireAdmin()` from `@/lib/auth/admin-api`.
- `/api/reports` and `/api/settings` use the same guard.
- `requireAdmin()` checks role from **database** after active-session validation; logs `admin_forbidden` on 403.
- Page middleware blocks receptionist from `/reports`, `/admin`, `/settings`.

## Manual tests performed

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | `npm run build` | Clean compile | **Passed** |
| 2 | `npm run lint` | No errors in sprint files | **Failed** — pre-existing errors in unrelated UI/scripts (not in `src/lib/auth`, `src/lib/security`, or `middleware.ts`) |
| 3 | Valid admin login | Dashboard loads | Manual: use seeded `admin` / `admin123` |
| 4 | Receptionist `GET /api/admin/users` | 403 Forbidden | Manual: curl with session cookie |
| 5 | Admin disable user → same user API call | 401 SESSION_INVALID | Manual: disable in UI, retry API |
| 6 | Rapid login failures from one IP | 429 with Retry-After | Manual: >10 POSTs in 15 min |
| 7 | Receptionist navigates to `/admin/users` | Redirect `/dashboard` | Manual: browser |

*Automated: build + lint. Interactive auth tests require running app + DB.*

## Remaining limitations

1. **Rate limit store is in-memory** — per Node process; not shared across horizontal replicas. Use Redis/KV for multi-instance production.
2. **Middleware + Prisma** — account checks in middleware call PostgreSQL; may be unsuitable for Edge-only middleware on some hosts (verify deployment runtime).
3. **JWT until next `auth()` call** — middleware and guards re-check DB; very short race possible before first refresh after disable.
4. **Reports/settings routes** — not under `/api/admin` path but enforce `requireAdmin()` in handlers.
5. **No rate limit** on general invoice/customer CRUD (by design this sprint).
6. **Failed login attempts** — rate limited by IP only, not per-username lockout table.

## Admin endpoint verification checklist

| Endpoint | requireAdmin |
|----------|:------------:|
| GET/POST `/api/admin/users` | Yes |
| GET/PUT/PATCH/DELETE `/api/admin/users/[id]` | Yes |
| GET/POST `/api/admin/subscriptions` | Yes |
| PATCH/DELETE `/api/admin/subscriptions/[id]` | Yes |
| GET/POST `/api/admin/products` | Yes |
| PATCH/DELETE `/api/admin/products/[id]` | Yes |
| GET `/api/admin/revenue` | Yes |
| GET `/api/admin/revenue/summary` | Yes |
| GET `/api/admin/revenue/transactions` | Yes |
| GET `/api/admin/revenue/export` | Yes |
| GET `/api/reports` | Yes |
| GET/PUT `/api/settings` | Yes |
