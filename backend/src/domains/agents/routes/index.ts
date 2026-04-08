/**
 * Agents API aggregator: all routes that include :agentId.
 * Mounted under /api/workspaces (by workspace aggregator).
 */

import express from 'express';
import agentsRoutes from './agents.routes.js';
import agentCrawlsRoutes from './agent-crawls.routes.js';
import widgetRoutes from './widget.routes.js';
import integrationsRoutes from './integrations.routes.js';
import documentsRoutes from './documents.routes.js';
import crawlTrainingRoutes from './crawl-training.routes.js';
import qaRoutes from './qa.routes.js';
import chatLogsRoutes from '../../chat/routes/chat-logs.routes.js';
import chatRoutes from '../../chat/routes/chat.routes.js';
import actionsRoutes from './actions.routes.js';

const router = express.Router();

router.use(agentsRoutes);
router.use(agentCrawlsRoutes);
router.use(widgetRoutes);
router.use(integrationsRoutes);
router.use(documentsRoutes);
router.use(crawlTrainingRoutes);
router.use(qaRoutes);
router.use(chatLogsRoutes);
router.use(chatRoutes);
router.use(actionsRoutes);

export default router;
export { handlePublicAgentChatStream, getAgentReply } from '../../chat/routes/chat.routes.js';
