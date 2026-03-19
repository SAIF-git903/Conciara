# Frontend — Cursor rules (ConversaTree)

Full monorepo rules: `**../.cursor/rules.md**` (repo root). Below: general context + **frontend-only** conventions.

---

## General (shared)

- **Monorepo**: This app lives in `frontend/`; API is `backend/`. Use **npm**; dev server default port **3002** (`npm run dev`).
- **API**: JSON under `/api` on the backend. Set `**NEXT_PUBLIC_API_URL`** (e.g. `http://localhost:3001/api`); do not break response shapes without updating all callers.
- **Auth**: `localStorage` keys `**auth_token`**, `**auth_refresh_token`**, `**auth_user**`. Use `**lib/api.ts**` (Bearer token + refresh + `/signin` redirect)—do not bypass without matching that behavior.
- **Secrets**: Use `.env.local`; never commit. Update `**frontend/.env.example`** when adding vars.
- **TypeScript**: `**strict: true`**. Match the style of the file you edit (semicolons vary across files).

---

## Frontend rules (`/frontend`)

### Stack

- **Next.js 14** App Router (`app/`), **React 18**, **TypeScript**, dev port **3002**.
- **Styling**: **Tailwind** (`tailwind.config.js`, `app/globals.css`); dashboard **v2** uses `**v2-theme`** CSS variables + Tailwind.
- **Classes**: `**cn()`** in `lib/utils.ts` (**clsx** + **tailwind-merge**).
- **HTTP**: **axios** in `**lib/api.ts`** — base URL, `ngrok-skip-browser-warning`, auth header, FormData handling, 401 refresh. Prefer `**api`** over raw `**fetch`** to the API.
- **Sockets**: **socket.io-client** + `**getSocketUrl()`** from `lib/api.ts`.
- **UI**: Headless UI, Radix (select, popover, tooltip, Accordion), Lucide, Framer Motion, Recharts, react-markdown + remark-gfm; Three.js / R3F + drei where 3D is used (e.g. skins/widget).
- **Dates**: date-fns, react-day-picker, react-date-range.

## Skeleton Loading Rules

- Use skeleton loaders **only for dynamically loaded data** (e.g., API responses, async content)
- Do NOT use skeletons for static or hardcoded content
- Static text and UI elements must be rendered immediately without placeholders
- Skeletons should mimic the shape and layout of the actual dynamic content
- Replace skeletons as soon as data is available (avoid unnecessary delay)
- Avoid overusing skeletons; prefer them only where loading states impact user experience
- Keep skeleton UI consistent with existing design patterns in the project

### Structure

- **Routes**: `app/` — e.g. `dashboard/[workspaceId]/...`, `onboarding/`, `signin`, `signup`, `embed/`, `widget/`.
- **Components**: `components/`, `**DynamicComponents/`**, `**components/ui/`** primitives.
- **Contexts**: `contexts/` — `AuthContext`, `DashboardContext`, `UpgradeContext` (client). Use `**useDashboardOptional`** when a hook must work outside `DashboardProvider`.
- **Hooks**: `hooks/` — e.g. `**usePermissions`**; keep `**FeatureKey`** aligned with backend feature/plan gates when changing limits.
- **Libs**: `lib/` — API, `plans.ts`, `paddle.ts`, dashboard URLs, onboarding, workspace selection, widget helpers. Avoid duplicating across pages.
- **Imports**: `**@/*`** alias (`tsconfig.json`).
- **Next**: `next.config.js` — preserve **iframe/CSP headers** for `**/widget/:path*`**.

### Permissions & layout

- Gate with `**PermissionGate`**, `**PermissionButton`**, `**usePermissions**` + `**workspaceLimits**`. Overlap backend feature names (`createAgent`, `inviteMembers`, `apiAccess`, …); extend `**FeatureKey**` consistently for new UI gates.
- `**app/dashboard/layout.tsx**`: large client shell (nav, providers, socket)—extract helpers instead of copying nav logic.
- `**app/layout.tsx**`: next/font Inter, `**AuthProvider**`, `**LayoutShell**`.

### Quality

- `**npm run lint**` on touched files.
- Widget/embed copy: use `**lib/widgetTranslations.ts**` patterns where applicable.

