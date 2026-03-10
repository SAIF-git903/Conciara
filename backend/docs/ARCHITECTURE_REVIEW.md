# Backend Architectural Review (Post-Restructure)

Full review of the backend after the doc-style domain restructure to ensure nothing is misplaced and the architecture is consistent.

---

## 1. Intended Layout (Verified)

| Layer | Location | Role |
|-------|----------|------|
| **Shared** | `src/shared/` | Cross-domain: `llm.service.ts`, `s3.service.ts`, `email.service.ts`, `workspaceInvite.service.ts`, `documentParser.service.ts`, `embedding.service.ts`. Single source of truth; all consumers import from here. |
| **Workspace** | `src/domains/workspace/` | `workspace.service.ts` (CRUD, members, invites, leave, delete); routes: `workspace.core`, `members`, `crawls`. Aggregator mounts agents and re-exports chat handlers. |
| **Agents** | `src/domains/agents/` | `agent.service.ts` (createAgent, deleteAgent, getAgentsForWorkspace, canManage*); routes: agents, agent-crawls, widget, integrations, documents, crawl-training, qa. Chat and chat-logs are **mounted from** `domains/chat/routes/`. |
| **Websites** | `src/domains/websites/` | `crawl.service.ts` (crawlWebsite, crawlAndStore, list/delete/assign, linkLatestCrawlToAgent, training content, etc.). |
| **Training** | `src/domains/training/services/` | `document.service.ts` (documents + crawl training), `rag.service.ts` (retrieveChunks). Use `shared/` for embedding and documentParser. |
| **QA** | `src/domains/qa/` | `qa.service.ts` (Q&A CRUD, retrieveQa, recordQaUsage, getQaUsageStats). |
| **Chat** | `src/domains/chat/` | `services/chatLog.service.ts`, `services/intent.service.ts`; `chatHelpers.ts`; `routes/chat.routes.ts`, `routes/chat-logs.routes.ts`. Exports `handlePublicAgentChatStream`, `getAgentReply`. |
| **Backward compat** | `src/services/` | **Re-exports only.** All 13 service files re-export from `shared/` or domain modules. No duplicate implementations. |

---

## 2. Route and Export Chain (Verified)

- **Entry:** `server.ts` imports `workspaceRoutes` and `handlePublicAgentChatStream` from `domains/workspace/routes/index.js`.
- **Workspace index** applies `requireAuth`, mounts `workspace.core`, `members`, `crawls`, then `agents/routes/index.js`; re-exports `handlePublicAgentChatStream` and `getAgentReply` from `../../agents/routes/index.js`.
- **Agents index** mounts agents, agent-crawls, widget, integrations, documents, crawl-training, qa, then **chat-logs** and **chat** from `../../chat/routes/`; re-exports chat handlers from `../../chat/routes/chat.routes.js`.
- **Slack** (`routes/slackEvents.ts`) and **workspaces** (`routes/workspaces.ts`) import `getAgentReply` and default from `domains/workspace/routes/index.js`. Chain is correct.

---

## 3. Imports (Verified)

- **Shared:** No remaining imports from the old full implementations in `services/` for llm, s3, email, workspaceInvite, documentParser, or embedding; all use `shared/`.
- **Domain → domain:** Chat routes use `../../agents/agent.service.js` (canManageAgent), `../../training/services/rag.service.js`, `../../qa/qa.service.js`; workspace/agents routes use `services/workspaceService.js` (re-export). Consistent.
- **DB:** `db/setup.ts`, `db/migrate.ts`, `db/migrationRunner.ts`, `db/ensureCrawlColumns.ts` do not depend on workspace or agent services. No misplaced coupling.

---

## 4. Fixes Applied During Review

1. **Duplicate implementations in `services/`**  
   The six shared services (`llmService`, `s3Service`, `emailService`, `workspaceInviteService`, `documentParserService`, `embeddingService`) were still **full implementations** alongside `shared/`. They were replaced with **re-exports** from `shared/` so there is a single source of truth and no duplicated logic. Build verified with `npm run build`.

---

## 5. Recommended Cleanup (Manual)

1. **Dead route files in agents**  
   `domains/agents/routes/chat.routes.ts` and `domains/agents/routes/chat-logs.routes.ts` are **no longer mounted**; the agents aggregator uses `domains/chat/routes/chat.routes.js` and `domains/chat/routes/chat-logs.routes.js`. These two files in agents are dead code. Safe to **delete** to avoid confusion.

2. **Orphaned chatHelpers in workspace**  
   `domains/workspace/chat/chatHelpers.ts` is only referenced by the unused `domains/agents/routes/chat.routes.ts`. The canonical chat helpers are in `domains/chat/chatHelpers.ts`. Safe to **delete** `domains/workspace/chat/chatHelpers.ts` after removing the dead agents chat routes.

---

## 6. Conclusion

The restructure is **applied correctly**: shared vs domain boundaries are clear, route and re-export chains are correct, and all imports point to the intended modules. The only issues found were duplicate code in `services/` (now re-exports) and dead/orphaned files under agents and workspace/chat; the latter can be removed manually as above.
