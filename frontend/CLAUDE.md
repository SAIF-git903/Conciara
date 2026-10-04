# Frontend

Next.js 14 App Router + TypeScript. Dev runs on port 3002 (`npm run dev`).

## Dev Commands

```bash
npm run dev      # next dev -p 3002
npm run build    # next build
npm run lint     # eslint
```

## Project Structure

```
app/                        # App Router (file-based routes)
├── layout.tsx              # Root layout — wraps everything in AuthProvider + LayoutShell
├── page.tsx                # Home (landing or redirect to dashboard)
├── auth/                   # signin, signup, forgot-password, reset-password, callback (OAuth)
├── onboarding/             # Multi-step workspace + agent creation wizard
├── dashboard/
│   └── [workspaceId]/
│       ├── page.tsx        # Workspace overview
│       ├── agents/         # Agent list
│       ├── data-sources/   # Files, website crawl, Q&A
│       ├── playground/[agentId]/    # Chat testing
│       ├── analytics/              # Charts, chat logs
│       ├── settings/               # Billing, members, API keys, audit, notifications
│       ├── connected-apps/         # Slack OAuth flow
│       └── actions/[agentId]/      # Custom actions
├── pricing/                # Public pricing page
├── account/                # User account settings
├── embed/chat/             # Embeddable chat widget (no shell)
└── docs/                   # In-app documentation

components/                 # Reusable components
contexts/
├── AuthContext.tsx          # User auth state (login, signup, logout, token refresh)
├── DashboardContext.tsx     # Active workspace + agent selection
└── UpgradeContext.tsx       # Controls upgrade/plan modals globally

hooks/
├── usePermissions.ts        # Role-based permission checks
└── useActions.ts / useActionTest.ts

lib/
├── api.ts                  # Axios instance with JWT auto-refresh interceptor
├── plans.ts                # Plan definitions + feature limits
├── paddle.ts               # Paddle.js integration
└── dashboard-url.ts        # URL builder helpers
```

## API Communication

All backend calls go through `lib/api.ts` — an axios instance that:
1. Reads `NEXT_PUBLIC_API_URL` for the base URL (set in `.env.local`)
2. Attaches `Authorization: Bearer <token>` from localStorage (`auth_token`)
3. On 401, automatically calls `/api/auth/refresh` and retries the original request
4. On refresh failure, redirects to `/signin`

**Never use raw `fetch` for backend calls — always use the axios instance from `lib/api.ts`.**

## Auth

- Tokens stored in localStorage: `auth_token`, `auth_refresh_token`, `auth_user`
- `AuthContext` provides `login()`, `signup()`, `logout()`, `user`, `isLoading`
- Protected pages check `user` from `AuthContext`; redirect to `/signin` if null
- OAuth callback lands at `/auth/callback` which exchanges code for tokens

## Styling

- **Tailwind CSS 3** — utility classes throughout
- **CSS variables** in `app/globals.css` define the design system (colors, radii, fonts)
- **Radix UI** for accessible primitives (Accordion, Select, Popover, Tooltip)
- **Select/Dropdown** — always use `@/components/ui/select`, never a raw `<select>` or Radix directly
- **Framer Motion** for transitions and animations
- Use `clsx` + `tailwind-merge` for conditional classes: `import { cn } from "@/lib/utils"`

## State Management

React Context only — no Redux or Zustand. The three contexts cover:
- **AuthContext**: who is logged in
- **DashboardContext**: which workspace/agent is active in the sidebar
- **UpgradeContext**: whether the upgrade modal is open (triggered from anywhere on plan limit errors)

## Key Patterns

**Permission gating** — wrap UI behind `<PermissionGate permission="...">` or use `usePermissions()` hook. Roles: `owner`, `admin`, `member`.

**Plan limit errors** — backend returns `{ code: "PLAN_LIMIT_..." }`. Catch these in the API layer and call `openUpgradeModal()` from `UpgradeContext`.

**Real-time training** — join Socket.IO room `agent:<agentId>` to receive training progress events. See `contexts/DashboardContext.tsx` for the socket setup.

**Dynamic workspace routing** — most pages are under `/dashboard/[workspaceId]/`. Get `workspaceId` from `useParams()` or from `DashboardContext`.

**Chat widget embed** — `/embed/chat` is a standalone page (no sidebar/header). It reads config from URL params and communicates back to parent via `postMessage`.

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:3009/api
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
NEXT_PUBLIC_SOCKET_URL=http://localhost:3009
```

Create `frontend/.env.local` for local dev (not committed).
