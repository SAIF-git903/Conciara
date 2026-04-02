# Cursor rules — Concierge / Conciara

Persistent conventions inferred from this repo. Prefer matching existing code over introducing new patterns.

---

## 1. General project conventions

- **Monorepo layout**: `frontend/` (Next.js app) and `backend/` (Express API) are separate packages with their own `package.json` and `npm` scripts; use **npm** and existing lockfiles.
- **Product naming**: UI/metadata often use **Conciara**; npm package names still reference **dialog-tree** — keep env/docs consistent with what users see unless migrating branding.
- **Local dev defaults**: Backend `npm run dev` → **tsx** watching `src/server.ts`, typically port **3001**; frontend `npm run dev` → Next on **3002** (`package.json`). Align `NEXT_PUBLIC_API_URL` and `FRONTEND_URL` with actual ports.
- **API contract**: JSON under **`/api`**; preserve path prefixes and response shapes unless doing an explicit breaking migration and updating all clients (dashboard + embed/widget).
- **Auth between apps**: Browser stores **`auth_token`**, **`auth_refresh_token`**, **`auth_user`** in `localStorage`; API expects **`Authorization: Bearer <token>`**. Do not bypass the shared axios client on the frontend without replicating refresh + redirect behavior.
- **Cross-cutting docs**: Prefer `backend/docs/ARCHITECTURE.md` and `backend/src/db/migrations/README.md` when extending server structure or migrations.
- **Secrets**: Never commit `.env` / `.env.local`; extend `backend/.env.example` and `frontend/.env.example` when adding variables.
- **Git hygiene**: Do not commit `node_modules/`, `.next/`, `dist/`, or local env files; migration history on shared branches should stay append-only.
- **TypeScript**: Both apps use **`strict: true`** — avoid new `any`; match each file’s prevailing quote/semicolon style (frontend mixes `layout.tsx` semicolons with semicolon-free client components — follow the file you edit).

---

## 2. Backend rules (`/backend`)

### Stack (detected)

- **Node**, **Express 4**, **TypeScript** compiled to **`dist/`**, **`"type": "module"`** (ESM).
- **PostgreSQL** via **`pg`** pool (`src/db/connection.ts`) and **Prisma Client** (`prisma/schema.prisma`, `src/db/prisma.ts`).
- **Custom SQL migrations**: versioned files `src/db/migrations/NNNN_snake_description.ts` exporting **`up`** / **`down`**, run via `npm run migrate` / `migrate.ts` + `migrationRunner.ts` (not Prisma Migrate for DDL).
- **Validation**: **Zod** where schemas are used or added.
- **Real-time**: **Socket.IO** (`server.ts`, `socket/`), path **`/socket.io`**.
- **Docs**: **Swagger** at **`/api-docs`** (`src/config/swagger.ts`); route handlers use **`@swagger`** JSDoc blocks (e.g. `agents.routes.ts`).
- **Billing / webhooks**: **Paddle**; integration routes mounted at **`/api/integrations`** with **`express.raw({ type: 'application/json' })` before `express.json()`** in `server.ts` for signature verification — do not reorder without checking webhook handlers.

### Folder and naming patterns

- **Domains**: `src/domains/<area>/` — e.g. `auth`, `users`, `workspace`, `agents`, `chat`, `qa`, `training`, `billing`, `integrations`.
- **Cross-cutting**: `src/common/` (middleware, rate limits, errors, uploads), `src/shared/` (LLM, S3, email, embeddings, etc. — reusable across domains).
- **Types**: `src/types/` for shared TS types (e.g. `skinConfig.ts`).
- **Routes**: dominantly **`*.routes.ts`** (sometimes **`router.ts`** under `integrations/<name>/`). Aggregators compose routers (e.g. `domains/workspace/routes/index.ts` mounts workspace + agents subtree).
- **Services**: **`*.service.ts`** next to or under the domain; keep route handlers thin, business logic in services.
- **Middleware**: `requireAuth` and related live in **`src/common/middleware/`**; plan/feature checks in **`src/middleware/permissions.ts`** (`requirePermission({ feature: '...' })`).
- **Imports in TS source**: relative paths use **`.js` extensions** (NodeNext module resolution), e.g. `'../agent.service.js'`.

### HTTP API patterns

- **Prefixes**: `/api/auth`, `/api/users`, `/api/api-keys`, `/api/workspaces`, `/api` + `public.routes.ts` (health, models, plans, public widget/chat), `/api/integrations/...`.
- **Workspace-scoped resources**: under **`/api/workspaces/:workspaceId/...`**; numeric IDs parsed with **`parseInt(..., 10)`** and validated with **`isNaN`**.
- **Errors**: JSON body with **`error`** string common; auth may include **`code`** (e.g. `TOKEN_EXPIRED`). Plan limits use **`PlanLimitError`**, **`sendPlanLimitError`**, and structured codes in `common/errors/planLimit.ts`; permission middleware returns **402/403** with **`upgradeRequired`**, **`feature`**, usage fields when applicable.
- **Rate limiting**: `generalApiRateLimiter` on `/api`; stricter limiters on specific mounts (e.g. auth, public chat).

### Data and Prisma

- **Prisma**: `@@map` / `@map` align TS camelCase fields to **snake_case** DB columns; run **`prisma generate`** after schema changes (`postinstall` runs it).
- **New tables/columns**: add a **numbered migration** in `src/db/migrations/` following existing **`up`/`down`** + `pool.query` style; register in the migration loader per `migrationRunner` / README.

---

## 3. Frontend rules (`/frontend`)

### Stack (detected)

- **Next.js 14** App Router (`app/`), **React 18**, **TypeScript** (`strict`), dev server port **3002**.
- **Styling**: **Tailwind CSS** (`tailwind.config.js`, `postcss.config.js`, `app/globals.css`); **v2** dashboard areas use **`v2-theme`** CSS variables plus Tailwind utilities.
- **Class merging**: **`cn()`** from `lib/utils.ts` (**`clsx`** + **`tailwind-merge`**).
- **HTTP**: **`axios`** instance in **`lib/api.ts`** — single place for **`NEXT_PUBLIC_API_URL`** (trim trailing slashes; default `http://localhost:3001/api`), **`ngrok-skip-browser-warning`**, **`Authorization`**, **FormData** (strip `Content-Type`), **401 → refresh** with shared in-flight refresh, and redirect to **`/signin`** on failure. Prefer **`api.get/post/...`** over ad-hoc `fetch` to the backend.
- **Sockets**: **`socket.io-client`**; server URL from **`getSocketUrl()`** (API base with **`/api` removed**).
- **UI libraries**: **Headless UI**, **Radix** (select, popover, tooltip), **Lucide** icons, **Framer Motion**, **Recharts**, **react-markdown** + **remark-gfm**; **Three.js** / **@react-three/fiber** + **drei** where 3D appears (e.g. widget/skins).
- **Other**: **date-fns**, **react-day-picker**, **react-date-range**; **@lottiefiles/dotlottie-react** where used.

### Folder and naming patterns

- **Routes**: `app/` mirrors product flows — `dashboard/[workspaceId]/...`, `onboarding/`, `signin`, `signup`, `embed/`, `widget/`, etc.
- **Components**: `components/` — feature components at top level; **`DynamicComponents/`** for widget/dynamic pieces; **`components/ui/`** for shared primitives (e.g. `select.tsx`).
- **Contexts**: `contexts/` — **`'use client'`** providers (**`AuthContext`**, **`DashboardContext`**, **`UpgradeContext`**); use **`useDashboardOptional`** pattern when hooks must work outside `DashboardProvider`.
- **Hooks**: `hooks/` (e.g. **`usePermissions`** — **`FeatureKey`** union must stay aligned conceptually with backend plan/feature gates when touching limits).
- **Libs**: `lib/` for API helpers, **`plans.ts`**, **`paddle.ts`**, dashboard URL builders, onboarding, workspace selection, widget layout/translations — keep domain-specific helpers here rather than duplicating across pages.
- **Imports**: use **`@/*`** path alias from `tsconfig.json`.
- **Next config**: `next.config.js` sets **iframe-friendly headers** for **`/widget/:path*`** — preserve when changing headers.

### UI and permissions

- **Feature gating**: **`PermissionGate`**, **`PermissionButton`**, and **`usePermissions`** tie into **`workspaceLimits`** from the dashboard API — mirror backend feature names where they overlap (**`createAgent`**, **`inviteMembers`**, **`apiAccess`**, etc.); frontend **`FeatureKey`** includes additional UI-only keys — extend consistently when adding gates.
- **Dashboard shell**: `app/dashboard/layout.tsx` is a large **client** layout: sidebar nav, **`DashboardProvider`**, **`UpgradeProvider`**, socket connection, workspace/agent resolution — prefer small extractions over duplicating navigation logic.
- **Metadata**: root `app/layout.tsx` uses **next/font** (**Inter**) and wraps with **`AuthProvider`** + **`LayoutShell`**.

### Quality

- Run **`npm run lint`** (Next ESLint) for touched files.
- **Embed/widget**: respect existing translation helpers in `lib/widgetTranslations.ts` when changing copy.
