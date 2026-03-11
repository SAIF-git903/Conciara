# How This Application Works

A short overview of the **Concierge** (ConversaTree) platform: an AI chatbot builder where you create agents, train them on your data, and expose them via a website widget, Slack, or Microsoft Teams.

---

## What It Is

- **Product**: SaaS to build, train, and deploy AI chat agents.
- **Users**: Sign up, create workspaces, add agents per workspace, and connect agents to Slack/Teams or embed a chat widget on any site.
- **Agents**: Each agent has a name, optional system prompt, LLM model, and “training” (documents, Q&A pairs, and/or crawled website content). Chat uses that context plus the LLM to answer.

---

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js (App Router), React, Tailwind |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL (Prisma ORM) |
| **LLM** | OpenAI-style API (e.g. GPT-4o-mini) via `shared/llm.service` |
| **Realtime** | Socket.IO (optional) |
| **Storage** | AWS S3 for uploads (e.g. agent logos, widget assets) |

---

## Core Concepts

### Workspaces and agents

- **Workspace**: Top-level container (e.g. “Acme Corp”). Has members (owner/member) and optional invites.
- **Agent**: Belongs to one workspace. Has identity (name, logo), model, system prompt, role (general/support/sales), widget config, and optional integrations (Slack, Teams).
- **Agent members**: Optional; fine-grained “who can manage this agent” within the workspace.

### Training data (per agent)

- **Documents (files)**: Upload PDFs, docs, etc. Backend chunks and embeds them; chunks are stored in PostgreSQL (with pgvector for embeddings). Used for RAG at chat time.
- **Q&A**: Curated question/answer pairs. At chat time, the best-matching Q&A can be injected as high-priority context (and usage can be tracked).
- **Website crawl**: Crawl a URL; extracted content is stored and can be assigned to an agent and used like document chunks.

### Chat flow

1. **Request**: User sends a message (widget, Slack, Teams, or dashboard playground) with optional `sessionId` and `history`.
2. **Intent**: Message is classified (e.g. conversational vs factual). Conversational turns may get no RAG.
3. **RAG**: For non-conversational intents, the backend retrieves relevant **document chunks** (vector search) and **Q&A** matches for the agent.
4. **System prompt**: Built from the agent’s system prompt, role, and the retrieved blocks (QA first, then chunks).
5. **LLM**: The model is called (streaming for widget/dashboard; single reply for Slack/Teams) with system + history + user message.
6. **Logging**: Messages are stored in `AgentChatSession` / `AgentChatMessage` and can be used for chat logs and analytics.

---

## Where Things Live

### Backend (`backend/`)

- **`src/server.ts`**: Express app, CORS, mounts routes, Socket.IO. Integrations use raw body for webhook signatures.
- **`src/db/`**: Prisma client, migrations, DB connection.
- **`src/domains/`**:
  - **auth**: Login, tokens, API keys.
  - **users**: User CRUD.
  - **workspace**: Workspace CRUD, members, invites; aggregates agent-related routes.
  - **agents**: Agent CRUD, widget config, **integrations (Slack/Teams)** — connection status, OAuth/connect token, disconnect, proactive (Teams).
  - **chat**: Chat and chat/stream handlers, intent, chat logs; exports `getAgentReply` and `handlePublicAgentChatStream`.
  - **training**: Documents, chunks, RAG, crawl training.
  - **qa**: Q&A CRUD and usage.
  - **integrations**: **Slack** (events, OAuth callback) and **Teams** (Bot Framework messages endpoint). Webhooks hit `/api/integrations/<slack|teams>/...`.
- **`src/shared/`**: LLM service, S3.
- **`src/routes/public.routes.ts`**: No-auth routes — health, models, **public widget config**, **public chat stream** (embed).

Authenticated API is under **`/api/workspaces`** (workspace-scoped; includes agents, documents, crawls, Q&A, chat, chat-logs, integrations). Public/embed uses **`/api/public/...`** and **`/api/integrations/...`**.

### Frontend (`frontend/`)

- **`app/`**: Next.js App Router.
  - **Auth**: signin, signup, forgot/reset password, auth callback.
  - **Onboarding**: choose workspace, create workspace, configure/link/personality for new agent.
  - **Dashboard**: workspace switcher and agent switcher; main areas:
    - **Workspace home** (`[workspaceId]`): list agents, quick links.
    - **Playground** (`playground/[agentId]`): live chat with the agent and training/settings sidebar.
    - **Data sources**: **Files**, **Q&A**, **Website** (crawl) per agent.
    - **Activity**: **Chat logs** (sessions/messages per agent).
    - **Analytics**: Chats (e.g. counts, trends).
    - **Settings**: General, Chatbot (widget/config), API keys, Billing (placeholder).
    - **Members**: Workspace members and invites.
    - **Connected Apps**: **Slack** and **Teams** (connect, disconnect, Teams proactive message).
  - **Embed**: **`/embed/chat`** — embeddable chat page; reads `workspaceId`, `agentId`, and optional `apiUrl` from query; loads widget config from API and streams chat via public stream endpoint.

### Embed and widget

- **Config**: `GET /api/public/widget-config?workspaceId=&agentId=` returns the agent’s widget/skin config (theme, header, bubbles, input, etc.), used by the embed page and dashboard preview.
- **Chat**: `POST /api/public/workspaces/:workspaceId/agents/:agentId/chat/stream` — body: `{ message, history?, sessionId? }`; response: SSE stream of the assistant reply. No auth required (public embed).
- The **SkinRenderer** (and related components) render the chat UI from that config; the same component is used in the dashboard playground and in the embed.

---

## Integrations (high level)

- **Slack**: OAuth in dashboard; bot token stored per agent. Events hit `/api/integrations/slack/events`; when someone DMs or @mentions the bot, backend uses `getAgentReply` and posts the reply back to Slack.
- **Teams**: Bot registered in Azure; messaging endpoint is `/api/integrations/teams/messages`. User links tenant by sending `/connect <token>` in Teams (token from dashboard). Channel, group, 1:1, and meeting messages are handled; conversation ref is stored for **proactive** messages sent from the dashboard. See `backend/docs/TEAMS_SETUP.md` for setup.

---

## Where API keys fit

**API keys** are **user-level** credentials for **programmatic access** to the API (scripts, external services, or headless clients) instead of logging in with a browser and using a JWT.

- **Scope**: Tied to a **user**, not to a workspace or agent. Each key has a name, optional expiry, and a list of **permissions** (e.g. `chat:read`, `chat:write`, `tree:read`, `tree:write`, or `*` for all). When a key is used, the backend can treat the request as that user and enforce those permissions.
- **Where they’re managed**: **Dashboard → Settings → API keys** (under the current workspace’s settings in the UI). Owners can list and revoke any key in the system; members see and revoke only their own. Create returns the raw key **once**; only a hash is stored.
- **Backend**: **`/api/api-keys`** — `GET` (list), `POST` (create), `DELETE /:id` (revoke). All require **JWT auth**. Key creation and verification live in **`domains/auth`** (auth.service); verification uses the **`X-Api-Key`** header and **`common/middleware/apiKeyMiddleware`** (`requireAPIKey`, `requireAuthOrAPIKey`, `requireAPIKeyPermission`).
- **Current use**: The **workspace and agent routes** use only **JWT** (`requireAuth`). API key middleware is implemented but **not yet applied** to those routes, so today keys are for **future use** or for any route you protect with `requireAuthOrAPIKey` — they give you a second way to authenticate the same user (key instead of Bearer token) with optional permission checks.

So in the application, API keys fit as the **programmatic-auth** layer: same identity and (optionally) permissions as the logged-in user, but usable from outside the browser.

---

## Data Model (summary)

- **User**, **UserSession**, **ApiKey** — identity and auth.
- **Workspace**, **WorkspaceMember**, **WorkspaceInvite** — tenants and access.
- **Agent** — per-workspace; `widgetConfig` (JSON), `integrations` (JSON: Slack/Teams tokens and refs).
- **AgentMember** — optional agent-level access.
- **AgentDocument**, **AgentDocumentChunk** — uploaded files and RAG chunks.
- **AgentQa**, **AgentQaUsage** — Q&A pairs and usage.
- **WebsiteCrawl** — crawled content (can be tied to an agent).
- **AgentChatSession**, **AgentChatMessage** — chat history for logs and analytics.

---

## Quick Request Flows

1. **Embed chat**: Page loads → fetch widget config → user sends message → POST to public chat stream → SSE chunks rendered in SkinRenderer.
2. **Dashboard chat (playground)**: Same stream endpoint, with auth; session/history managed in UI.
3. **Slack**: User messages bot → Slack sends event to `/api/integrations/slack/events` → backend finds agent by Slack team ID → `getAgentReply` → reply posted to Slack.
4. **Teams**: User messages bot → Teams sends activity to `/api/integrations/teams/messages` → backend finds agent by tenant ID (or handles `/connect` token) → `getAgentReply` → reply sent via Bot Framework Connector.

This document is a brief map of how the application works; for deeper backend structure see `backend/docs/ARCHITECTURE.md`, and for Teams setup see `backend/docs/TEAMS_SETUP.md`.
