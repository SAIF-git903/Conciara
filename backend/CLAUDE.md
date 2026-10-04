# Backend

Express + TypeScript API. Entry point: `src/server.ts`. Port: `3009` (set in `.env`).

## Dev Commands

```bash
npm run dev          # tsx watch (auto-restart on file change)
npm run build        # tsc → dist/
npm run start        # node dist/server.js (production)
npm run migrate      # run pending SQL migrations
npm run seed-admin   # seed admin user
npm run seed-plans   # seed subscription plans
```

Swagger UI available at `http://localhost:3009/api-docs` in dev.

## Project Structure

```
src/
├── server.ts              # Express app setup, middleware, route mounting
├── domains/               # Feature domains (each owns routes + service)
│   ├── auth/              # JWT auth, OAuth (Google, Apple), sessions, API keys
│   ├── users/             # User CRUD
│   ├── workspace/         # Workspace core, members, billing, notifications
│   ├── agents/            # Agent CRUD, widget config
│   ├── websites/          # Website crawl (cheerio scraper)
│   ├── training/          # Document upload, chunking, embedding (RAG)
│   ├── qa/                # Q&A data source
│   ├── chat/              # Chat orchestration, message logging
│   ├── integrations/      # Webhooks: Paddle, Slack, WhatsApp, Zendesk, Shopify
│   ├── billing/           # Credits, plans, subscriptions
│   ├── audit/             # Audit log writes
│   └── notifications/     # In-app notifications
├── shared/                # Services without domain ownership
│   ├── llm.service.ts     # OpenAI wrapper
│   ├── s3.service.ts      # AWS S3
│   ├── email.service.ts   # Nodemailer (Gmail SMTP)
│   └── embedding.service.ts
├── common/
│   ├── middleware/        # authMiddleware, apiKeyMiddleware, workspaceApiKeyMiddleware
│   └── rateLimit.ts
├── db/
│   ├── prisma.ts          # Prisma client singleton
│   ├── migrate.ts         # Custom migration runner
│   └── migrations/        # 29 numbered SQL files
├── socket/
│   ├── index.ts           # Socket.IO instance + agentRoom helpers
│   └── connectionHandler.ts
└── routes/
    └── public.routes.ts   # Public chat widget endpoint (no auth)
```

## Route Prefixes

| Prefix | Domain |
|---|---|
| `/api/auth` | Login, signup, OAuth, refresh, logout, password reset |
| `/api/users` | User profile CRUD |
| `/api/api-keys` | Per-user API key management |
| `/api/workspaces` | Workspace + all sub-resources (agents, docs, chat, QA, billing, settings) |
| `/api/integrations` | Webhooks (raw body, signature-verified) |

## Authentication

- **Access token:** JWT, 15 min TTL, `Authorization: Bearer <token>` header
- **Refresh token:** JWT, 7 days, passed in request body to `/api/auth/refresh`
- **API keys:** prefixed `ct_`, stored hashed, used by SDK/webhooks via `x-api-key` header
- **OAuth:** Google (client_id/secret) and Apple (ES256 PKCS#8 private key)

Protect routes with `authMiddleware` from `src/common/middleware/authMiddleware.ts`. Workspace-scoped routes additionally check membership.

## Database

- Prisma v5 + PostgreSQL + pgvector extension
- Schema: `prisma/schema.prisma`
- **Do not run `prisma migrate dev`** — use `npm run migrate` (custom runner)
- After editing `schema.prisma`, run `prisma generate` to update the client

Key models: `User`, `Workspace`, `WorkspaceMember`, `Agent`, `AgentDocument`, `AgentDocumentChunk` (with vector), `AgentChatSession`, `AgentChatMessage`, `Plan`, `WorkspaceSubscription`, `WorkspaceCredits`, `AuditLog`, `Notification`

## RAG Pipeline

1. Upload file → `multer` → `documentParser.service.ts` (mammoth for docx, pdf-parse for PDF)
2. Split into chunks → store as `AgentDocumentChunk` rows
3. Generate embeddings via OpenAI → store as pgvector column
4. On chat query: embed query → cosine similarity search → inject top-k chunks into system prompt

## Credits System

Each chat message consumes credits based on model (tracked in `billing/model-credits.ts`). Credits reset monthly per plan. Exceeding limit returns a plan-limit error; frontend shows upgrade modal.

## Socket.IO

Used for real-time training progress. Backend emits to `agent:<agentId>` room. Frontend joins room during training and displays progress bar.

## Webhook Patterns

Webhook routes under `/api/integrations/*` receive raw body (via `express.raw()`) for HMAC signature verification before parsing JSON. Never swap to `express.json()` on these routes.
