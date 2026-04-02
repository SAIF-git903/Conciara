# Backend — Cursor rules (Conciara)

Full monorepo rules: **`../.cursor/rules.md`** (repo root). Below: general context + **backend-only** conventions.

---

## General (shared)

- **Monorepo**: This service is `backend/`; UI is `frontend/`. Use **npm**; dev **`npm run dev`** (tsx → `src/server.ts`), default port **3001**.
- **API contract**: JSON under **`/api`**. Preserve paths and response shapes unless you migrate every client (dashboard + embed).
- **Env**: **`FRONTEND_URL`** must match the real frontend origin (including port). Never commit `.env`; keep **`backend/.env.example`** updated.
- **Docs**: **`backend/docs/ARCHITECTURE.md`**, **`backend/src/db/migrations/README.md`** for structure and migrations.
- **TypeScript**: **`strict: true`**. Relative imports in source use **`.js`** extensions (NodeNext).

---

## Backend rules (`/backend`)

### Stack

- **Express 4**, **TypeScript** → **`dist/`**, **`"type": "module"`** (ESM).
- **PostgreSQL**: **`pg`** pool (`src/db/connection.ts`) + **Prisma Client** (`prisma/schema.prisma`, `src/db/prisma.ts`).
- **Migrations**: **`src/db/migrations/NNNN_snake_description.ts`** with **`up`/`down`** and `pool.query`; **`npm run migrate`**. DDL is not via Prisma Migrate.
- **Validation**: **Zod** where used or added.
- **Real-time**: **Socket.IO**, path **`/socket.io`** (`server.ts`, `socket/`).
- **API docs**: Swagger **`/api-docs`** (`src/config/swagger.ts`); **`@swagger`** JSDoc on routes.
- **Paddle / webhooks**: **`/api/integrations`** — **`express.raw({ type: 'application/json' })`** is registered **before** **`express.json()`** in `server.ts`. Do not reorder without verifying signatures.

### Structure

- **Domains**: `src/domains/<area>/` (auth, users, workspace, agents, chat, qa, training, billing, integrations, …).
- **Shared**: `src/common/` (middleware, rate limits, errors, uploads), `src/shared/` (LLM, S3, email, embeddings—cross-domain).
- **Types**: `src/types/` for shared TS (e.g. `skinConfig.ts`).
- **Routes**: **`*.routes.ts`** (or **`integrations/<name>/router.ts`**). Aggregators (e.g. `domains/workspace/routes/index.ts`) mount sub-routers.
- **Logic**: **`*.service.ts`** — keep route handlers thin.
- **Auth / plans**: **`src/common/middleware/authMiddleware.ts`** (`requireAuth`); **`src/middleware/permissions.ts`** (`requirePermission({ feature: '...' })`).

### HTTP patterns

- **Mounts**: `/api/auth`, `/api/users`, `/api/api-keys`, `/api/workspaces`, `/api` + `public.routes.ts`, `/api/integrations/...`.
- **Workspace paths**: **`/api/workspaces/:workspaceId/...`**; parse IDs with **`parseInt(id, 10)`** and **`isNaN`** checks.
- **Errors**: JSON **`error`**; auth may set **`code`** (e.g. `TOKEN_EXPIRED`). Plan limits: **`PlanLimitError`**, **`sendPlanLimitError`**, `common/errors/planLimit.ts`. Permissions: **402/403** with **`upgradeRequired`**, **`feature`**, usage when applicable.
- **Rate limits**: `generalApiRateLimiter` on `/api`; tighter limiters on auth/public chat where defined.

### Data

- **Prisma**: camelCase in TS, **snake_case** in DB via **`@map`/`@@map`**. Run **`prisma generate`** after schema changes.
- **New schema**: add numbered migration + follow **`migrationRunner`** / README registration.
