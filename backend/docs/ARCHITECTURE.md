# Backend Architecture — Restructure for Scalability

This document defines a **domain-based backend structure** so the codebase stays clear, maintainable, and easy to extend. The main change is **splitting the large workspace surface into smaller, single-responsibility modules** while keeping behavior the same.

---

## 1. Current State (Summary)


| Area                | Current location                                                                                                                              | Issue                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Routes**          | `src/routes/` — `workspaces.ts` is ~1800 lines and handles workspace, agents, crawls, documents, training, chat, Q&A, analytics, integrations | One giant module; hard to navigate and review                                     |
| **Services**        | `src/services/` — flat list of 14+ services                                                                                                   | Works but no domain grouping; workspace-related logic is spread across many files |
| **Middleware**      | `src/middleware/`                                                                                                                             | Fine as-is                                                                        |
| **DB**              | `src/db/`                                                                                                                                     | Fine; migrations stay centralized                                                 |
| **Config / Socket** | `src/config/`, `src/socket.ts`                                                                                                                | Fine                                                                              |


**Principle:** *"Make divisions more dividable."* Each domain should be a clear boundary so it can grow (and be owned) independently.

---

## 2. Proposed Folder Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app setup (cors, json, health) — no routes
│   ├── server.ts                 # HTTP server, Socket.IO, mount routes, listen
│   │
│   ├── common/                   # Shared across domains
│   │   ├── middleware/           # Auth, API key (move from src/middleware)
│   │   │   ├── authMiddleware.ts
│   │   │   └── apiKeyMiddleware.ts
│   │   ├── errors.ts             # Optional: ApiError, error handler
│   │   └── access/               # Optional: canManageAgent, canManageWorkspace (re-export or thin wrapper)
│   │       └── accessControl.ts
│   │
│   ├── config/
│   │   └── swagger.ts
│   ├── db/                       # Unchanged
│   │   ├── connection.ts
│   │   ├── prisma.ts
│   │   ├── migrate.ts
│   │   └── migrations/
│   ├── socket.ts                 # Unchanged (Socket.IO instance + agentRoom)
│   ├── types/
│   │   └── ...
│   │
│   ├── domains/
│   │   │
│   │   ├── auth/                 # Login, tokens, sessions, API keys
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.types.ts     # Optional
│   │   │
│   │   ├── users/                # User CRUD, bypass (used by auth + admin)
│   │   │   ├── routes/
│   │   │   │   └── users.routes.ts
│   │   │   └── user.service.ts
│   │   │
│   │   ├── workspace/            # Workspace core + members (no agents/crawls/docs)
│   │   │   ├── routes/
│   │   │   │   └── workspace.routes.ts   # POST /, PATCH /:id, DELETE /:id, leave, generate-preprompt
│   │   │   ├── workspace.service.ts      # create, update, delete, leave, getWorkspacesForUser
│   │   │   ├── members.routes.ts         # GET/POST/DELETE members, invites, resend
│   │   │   ├── members.service.ts         # listMembers, invite, remove, listPendingInvites, resend
│   │   │   └── workspace.types.ts
│   │   │
│   │   ├── agents/               # Agent CRUD, widget config, Slack integration
│   │   │   ├── routes/
│   │   │   │   ├── agents.routes.ts      # GET/POST agents, DELETE agent
│   │   │   │   ├── agent-widget.routes.ts # GET/PATCH widget-config, widget-header upload
│   │   │   │   └── agent-integrations.routes.ts # Slack OAuth + disconnect
│   │   │   ├── agent.service.ts          # createAgent, deleteAgent, getAgentsForWorkspace (from workspaceService)
│   │   │   └── agent.types.ts
│   │   │
│   │   ├── websites/             # Crawls (website URLs → training content)
│   │   │   ├── routes/
│   │   │   │   └── crawls.routes.ts      # workspace crawl, agent crawls list; assign/delete/patch
│   │   │   ├── crawl.service.ts
│   │   │   └── crawl.types.ts
│   │   │
│   │   ├── training/             # Document + crawl training (RAG), crawl-stats, train-from-crawls
│   │   │   ├── routes/
│   │   │   │   ├── documents.routes.ts   # list, upload, train pending, delete
│   │   │   │   ├── crawl-training.routes.ts # GET crawl-stats, POST train-from-crawls
│   │   │   │   └── ...
│   │   │   ├── services/
│   │   │   │   ├── document.service.ts   # agentDocumentService (create, list, delete, train crawl, train pending)
│   │   │   │   ├── rag.service.ts       # retrieveChunks
│   │   │   │   ├── embedding.service.ts
│   │   │   │   └── documentParser.service.ts
│   │   │   └── training.types.ts
│   │   │
│   │   ├── qa/                   # Q&A data source (list, create, update, delete, usage)
│   │   │   ├── routes/
│   │   │   │   └── qa.routes.ts
│   │   │   ├── qa.service.ts
│   │   │   └── qa.types.ts
│   │   │
│   │   ├── chat/                 # Chat (non-stream + stream), intent, chat logs, analytics
│   │   │   ├── routes/
│   │   │   │   ├── chat.routes.ts        # POST chat, POST chat/stream
│   │   │   │   └── chat-logs.routes.ts   # sessions, messages, analytics
│   │   │   ├── services/
│   │   │   │   ├── chat.service.ts       # orchestration (LLM + RAG + QA + intent)
│   │   │   │   ├── chatLog.service.ts
│   │   │   │   └── intent.service.ts
│   │   │   └── chat.types.ts
│   │   │
│   │   └── integrations/         # Slack events (external webhooks)
│   │       ├── routes/
│   │       │   └── slack.routes.ts
│   │       └── ...
│   │
│   └── shared/                   # Cross-domain services (used by multiple domains)
│       ├── llm.service.ts
│       ├── s3.service.ts
│       ├── email.service.ts
│       ├── workspaceInvite.service.ts   # invite tokens, accept (used by workspace + auth?)
│       └── ...
│
├── docs/
│   └── ARCHITECTURE.md           # This file
├── package.json
└── tsconfig.json
```

---

## 3. Why Each Module Exists


| Module           | Purpose                                                                              | Why separate                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **common**       | Middleware, errors, access helpers                                                   | Single place for cross-cutting concerns; no domain owns them.                                       |
| **auth**         | Login, JWT, refresh, password reset, API keys, sessions                              | Clear boundary; used by all protected routes.                                                       |
| **users**        | User CRUD, bypass login                                                              | Often used with auth; separate so user management can grow (roles, profiles) without touching auth. |
| **workspace**    | Workspace CRUD, leave, members, invites, generate-preprompt                          | Core of “workspace”; no agents/crawls/docs. Keeps workspace surface small and understandable.       |
| **agents**       | Agent CRUD, widget config, Slack OAuth                                               | Everything that is “agent identity and config,” not training or chat.                               |
| **websites**     | Crawls (URL → stored content), assign to agent                                       | “Website” = crawl pipeline; training consumes this via training domain.                             |
| **training**     | Documents (upload, list, delete), RAG (chunk, embed), crawl-stats, train-from-crawls | Single place for “feeding knowledge into the agent”; documents + crawl training + progress.         |
| **qa**           | Q&A CRUD and usage                                                                   | Distinct data source; clear ownership.                                                              |
| **chat**         | Chat API, stream, logs, analytics, intent                                            | All conversational UX and persistence in one place.                                                 |
| **integrations** | Slack (and future webhooks)                                                          | External systems; isolated from core product flows.                                                 |
| **shared**       | LLM, S3, email, invite validation                                                    | Used by several domains; avoid circular deps by keeping them shared.                                |


---

## 4. Route Grouping (API surface)

Keep **URL shape** stable so frontend and clients do not break. Mount sub-routers under the same prefix:

- `**/api/auth`** → `auth.routes.ts`
- `**/api/users`** → `users.routes.ts`
- `**/api/api-keys**` → can stay under auth or live in `auth.routes.ts`
- `**/api/workspaces**` → **aggregator** that composes:
  - `workspace.routes.ts` → `/`, `/:workspaceId` (PATCH, DELETE), `/:workspaceId/leave`, `/:workspaceId/generate-preprompt`
  - `members.routes.ts` → `/:workspaceId/members`, `/:workspaceId/invites/resend`
  - `agents.routes.ts` → `/:workspaceId/agents`, `/:workspaceId/agents/:agentId` (DELETE)
  - `agent-widget.routes.ts` → `/:workspaceId/agents/:agentId/widget-config`, `widget-header-image`
  - `agent-integrations.routes.ts` → `/:workspaceId/agents/:agentId/integrations/slack/`*
  - `crawls.routes.ts` → `/:workspaceId/crawl`, `/:workspaceId/crawls/:crawlId`, `/:workspaceId/agents/:agentId/crawls`
  - `documents.routes.ts` → `/:workspaceId/agents/:agentId/documents`, `documents/train`, `documents/:documentId`
  - `crawl-training.routes.ts` → `/:workspaceId/agents/:agentId/crawl-stats`, `train-from-crawls`
  - `qa.routes.ts` → `/:workspaceId/agents/:agentId/qa`, `qa/:qaId`, `qa/:qaId/usage`
  - `chat.routes.ts` → `/:workspaceId/agents/:agentId/chat`, `chat/stream`
  - `chat-logs.routes.ts` → `/:workspaceId/agents/:agentId/chat-logs`, `analytics/chats`

**Aggregator pattern:** One `workspaces/index.ts` (or `workspaces.routes.ts`) that:

- Uses `express.Router()`
- Applies `requireAuth` once
- Mounts each sub-router with `router.use(workspaceRoutes)`, `router.use(agentsRoutes)`, etc., so that paths stay `**/api/workspaces/...`** and no frontend URL changes.

---

## 5. Service Separation


| Current service          | Suggested home                                                                                                                                                                                                                                                                               | Notes                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `authService`            | `domains/auth/auth.service.ts`                                                                                                                                                                                                                                                               | JWT, refresh, sessions, API keys, password reset.                                                                                |
| `userService`            | `domains/users/user.service.ts`                                                                                                                                                                                                                                                              | Keep; maybe rename file to `user.service.ts`.                                                                                    |
| `workspaceService`       | Split: workspace CRUD + leave + delete → `domains/workspace/workspace.service.ts`; members + invites → `domains/workspace/members.service.ts`; createAgent, deleteAgent, getAgentsForWorkspace, canManage* → `domains/agents/agent.service.ts` or keep in workspace as “core” and re-export. | `canManageAgent` / `canManageWorkspace` used everywhere → put in `common/access/accessControl.ts` (or re-export from workspace). |
| `workspaceInviteService` | `shared/workspaceInvite.service.ts`                                                                                                                                                                                                                                                          | Used by workspace (invite flow) and possibly auth (accept).                                                                      |
| `crawlService`           | `domains/websites/crawl.service.ts`                                                                                                                                                                                                                                                          | All crawl-related logic.                                                                                                         |
| `agentDocumentService`   | `domains/training/services/document.service.ts`                                                                                                                                                                                                                                              | Documents + crawl training (trainCrawl*, appendCrawl*, trainPending).                                                            |
| `agentRagService`        | `domains/training/services/rag.service.ts`                                                                                                                                                                                                                                                   | Retrieve chunks.                                                                                                                 |
| `embeddingService`       | `domains/training/services/embedding.service.ts`                                                                                                                                                                                                                                             | Embeddings for RAG.                                                                                                              |
| `documentParserService`  | `domains/training/services/documentParser.service.ts`                                                                                                                                                                                                                                        | Extract text, chunk, MIME.                                                                                                       |
| `agentQaService`         | `domains/qa/qa.service.ts`                                                                                                                                                                                                                                                                   | Q&A CRUD and usage.                                                                                                              |
| `agentChatLogService`    | `domains/chat/services/chatLog.service.ts`                                                                                                                                                                                                                                                   | Sessions, messages, analytics.                                                                                                   |
| `agentIntentService`     | `domains/chat/services/intent.service.ts`                                                                                                                                                                                                                                                    | Intent classification.                                                                                                           |
| `llmService`             | `shared/llm.service.ts`                                                                                                                                                                                                                                                                      | Used by chat, training (preprompt), etc.                                                                                         |
| `s3Service`              | `shared/s3.service.ts`                                                                                                                                                                                                                                                                       | Uploads, presign, widget header.                                                                                                 |
| `emailService`           | `shared/email.service.ts`                                                                                                                                                                                                                                                                    | Invites, password reset.                                                                                                         |


This keeps each domain owning its own persistence and use cases, and shared services in one place to avoid circular dependencies.

---

## 6. Shared Utilities and Common Modules

- **common/middleware**  
  - `requireAuth`, `requireAdmin`, optional auth.  
  - API key middleware for key-based access.
- **common/access** (optional but recommended)  
  - `canManageAgent(userId, agentId)`, `canManageWorkspaceSettings(userId, workspaceId)`, `canManageAgentsInWorkspace(...)`.  
  - Implementations can live in workspace/agent services; this module re-exports or wraps them so routes only depend on `common/access`.
- **common/errors** (optional)  
  - `ApiError` (status + message), central `errorHandler` for Express.  
  - Keeps error contracts consistent across domains.
- **shared/**  
  - LLM, S3, email, workspace invite validation.  
  - Anything used by 2+ domains and that must not depend on a specific domain.
- **db/**  
  - Keep Prisma client and migrations in one place.  
  - Domains import `prisma` from `../../db/prisma.js` (or a shared path).
- **socket.ts**  
  - Stays at `src/socket.ts`; training (and any other domain that emits) imports `getSocketIo`, `agentRoom` from here.

---

## 7. Improvements for Scale

1. **Single responsibility per file**
  Each route file handles one area (e.g. only crawl-stats + train-from-crawls, or only documents). Easier to find code and review PRs.
2. **Domain boundaries**
  New features (e.g. “jobs” or “analytics”) become new domains under `domains/` without touching workspace, chat, or training.
3. **Explicit shared vs domain**
  Shared services in `shared/`; domain logic in `domains/<name>/`. Reduces “who owns this?” confusion.
4. **Aggregator for /api/workspaces**
  One router composes sub-routers; URLs stay the same; each sub-route file stays small.
5. **Optional later**
  - **Jobs/queues:** e.g. `domains/jobs/` for background training, crawl jobs, with a small queue abstraction.  
  - **Logs/analytics:** e.g. `domains/analytics/` for chat analytics, usage, reporting.  
  - **Validation:** Zod (or similar) schemas per route or per domain in `domains/<name>/*.schemas.ts`.
6. **Naming**
  - Routes: `*.routes.ts`.  
  - Services: `*.service.ts`.  
  - Types: `*.types.ts` or `*.schemas.ts`.  
   Consistent naming makes navigation predictable.

---

## 8. Migration Order (Suggested)

1. Add `common/`, `domains/`, `shared/` and move **non-workspace** routes and services (auth, users, api-keys) into `domains/auth`, `domains/users`. Adjust `server.ts` to mount from new paths.
2. Extract **workspace core** (CRUD, leave, generate-preprompt) and **members** into `domains/workspace`; mount under `/api/workspaces` via an aggregator.
3. Extract **agents** (CRUD, widget, integrations) into `domains/agents`; mount under same `/api/workspaces` aggregator.
4. Extract **websites** (crawls) into `domains/websites`; same aggregator.
5. Extract **training** (documents, crawl-stats, train-from-crawls) into `domains/training`; move document/RAG/embedding/parser services; same aggregator.
6. Extract **qa** into `domains/qa`; same aggregator.
7. Extract **chat** and **chat-logs** into `domains/chat`; same aggregator.
8. Move **integrations** (Slack) into `domains/integrations` (or keep under `routes/` and mount from server).
9. Move **shared** services (LLM, S3, email, invite) into `shared/`.
10. Add `common/access` and optional `common/errors`; refactor route handlers to use them.
11. Remove or deprecate the old monolithic `routes/workspaces.ts` once all handlers are moved and tests pass.

Throughout: keep **URLs and response shapes unchanged**; only move and split code. Run the full test suite (and manual smoke tests for auth, workspace, agent, crawl, training, chat) after each step.

---

## 9. Phase 1 completed (current state)

The following has been implemented:

- **`src/common/middleware/`** — `authMiddleware.ts`, `apiKeyMiddleware.ts` (moved from `src/middleware/`). They import from `domains/auth` and `domains/users`.
- **`src/domains/auth/`** — `auth.service.ts` (from `services/authService.ts`), `routes/auth.routes.ts`, `routes/api-keys.routes.ts`. Dynamic imports in auth.routes point to `../../../services/` for workspace, email, workspaceInvite and to `../../users/user.service.js` for user.
- **`src/domains/users/`** — `user.service.ts` (from `services/userService.ts`), `routes/users.routes.ts`. User service imports `hashPassword` from `../auth/auth.service.js` and uses dynamic import for `getWorkspacesForUser` from `../../services/workspaceService.js`.
- **`server.ts`** — Uses `domains/auth/routes/auth.routes.js`, `domains/users/routes/users.routes.js`, `domains/auth/routes/api-keys.routes.js`; bypass and socket use `domains/users/user.service.js` and `domains/auth/auth.service.js`.
- **`routes/workspaces.ts`** — Uses `../common/middleware/authMiddleware.js`.
- **`services/workspaceInviteService.ts`** — Imports `createUser` from `../domains/users/user.service.js`.
- **`db/seedAdmin.ts`** — Imports `createUser` from `../domains/users/user.service.js`.

**Removed (replaced by above):** `routes/auth.ts`, `routes/users.ts`, `routes/apiKeys.ts`, `middleware/authMiddleware.ts`, `middleware/apiKeyMiddleware.ts`, `services/authService.ts`, `services/userService.ts`.

---

## 10. Phase 2 completed (current state)

- **`src/domains/workspace/routes/index.ts`** — Aggregator: applies `requireAuth`, then mounts `workspace.core.routes`, `members.routes`, `crawls.routes`, `agents.routes` (from `domains/agents`), and the remainder from `routes/workspaces.js`. Re-exports `handlePublicAgentChatStream` and `getAgentReply` from workspaces.
- **`src/domains/workspace/routes/`** — `workspace.core.routes.ts` (CRUD, leave, generate-preprompt), `members.routes.ts`, `crawls.routes.ts` (crawl CRUD + GET agents/:agentId/crawls).
- **`src/domains/agents/routes/agents.routes.ts`** — GET/POST/DELETE agents (list, create, delete).
- **`src/routes/workspaces.ts`** — Trimmed to “rest” routes only: widget-config, integrations (Slack), documents, crawl-stats, train-from-crawls, qa, chat, chat-logs, analytics, plus `getAgentReply` and `handlePublicAgentChatStream`. No longer uses `requireAuth` (aggregator does).
- **`server.ts`** — Imports workspace router and `handlePublicAgentChatStream` from `domains/workspace/routes/index.js`.
- **`routes/slackEvents.ts`** — Imports `getAgentReply` from `../domains/workspace/routes/index.js`.

**Phase 2 follow-up completed:** All remaining routes have been extracted. `routes/workspaces.ts` is now a thin re-export from `domains/workspace/routes/index.js`. New modules:
- **`common/uploads.ts`** — shared multer configs (`upload`, `uploadImage`) for documents and widget header.
- **`domains/workspace/routes/widget.routes.ts`** — widget-config GET/PATCH, widget-header-image POST.
- **`domains/workspace/routes/integrations.routes.ts`** — Slack GET, oauth-url, POST, DELETE.
- **`domains/workspace/routes/documents.routes.ts`** — documents GET/POST/train/DELETE.
- **`domains/workspace/routes/crawl-training.routes.ts`** — crawl-stats GET, train-from-crawls POST (with in-memory progress map).
- **`domains/workspace/routes/qa.routes.ts`** — qa GET/POST, qa/:qaId/usage GET, PUT, DELETE.
- **`domains/workspace/routes/chat-logs.routes.ts`** — chat-logs GET, chat-logs/:sessionId GET, analytics/chats GET.
- **`domains/workspace/chat/chatHelpers.ts`** — AGENT_ROLE_PROMPTS, CONVERSATION_RULES, getRolePrompt, buildAgentChatSystemContent.
- **`domains/workspace/routes/chat.routes.ts`** — POST chat, POST chat/stream; exports getAgentReply, handlePublicAgentChatStream, runAgentChatStream.

---

## 11. Summary


| Goal                          | How                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Viewability**               | Domain folders and small, single-purpose route/service files.                                               |
| **Developer usability**       | Clear names, predictable locations, one place per concern.                                                  |
| **No large workspace module** | Workspace split into workspace core, agents, websites, training, qa, chat, integrations.                    |
| **Scalability**               | New domains (jobs, analytics) added without touching existing ones; shared code in `shared/` and `common/`. |
| **Single responsibility**     | Each module owns one bounded area; routes thin, logic in services.                                          |


This structure follows *“make divisions more dividable”*: each part can evolve and be owned independently while keeping the API stable and the backend easy to navigate and extend.