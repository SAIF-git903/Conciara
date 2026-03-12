/**
 * Workspace API aggregator: applies auth, mounts workspace-level routes and agents.
 * Base path: /api/workspaces
 * Routes with :agentId live under domains/agents/routes.
 */

import express from 'express';
import { requireAuth } from '../../../common/middleware/authMiddleware.js';
import workspaceCoreRoutes from './workspace.core.routes.js';
import membersRoutes from './members.routes.js';
import workspaceApiKeysRoutes from './workspace.api-keys.routes.js';
import workspaceUsageRoutes from './workspace.usage.routes.js';
import workspaceLimitsRoutes from './workspace.limits.routes.js';
import workspaceCreditsRoutes from './workspace.credits.routes.js';
import workspaceBillingRoutes from './workspace.billing.routes.js';
import crawlsRoutes from './crawls.routes.js';
import agentsRoutes from '../../agents/routes/index.js';

const router = express.Router();

router.use(requireAuth);
router.use(workspaceCoreRoutes);
router.use(membersRoutes);
router.use(workspaceApiKeysRoutes);
router.use(workspaceUsageRoutes);
router.use(workspaceLimitsRoutes);
router.use(workspaceCreditsRoutes);
router.use(workspaceBillingRoutes);
router.use(crawlsRoutes);
router.use(agentsRoutes);

export default router;
export { handlePublicAgentChatStream, getAgentReply } from '../../agents/routes/index.js';
