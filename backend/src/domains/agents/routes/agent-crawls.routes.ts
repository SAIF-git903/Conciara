/**
 * Agent crawl list (routes with :agentId). Mounted under /api/workspaces via aggregator.
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { listCrawlsByWorkspace } from '../../websites/crawl.service.js';
import { prisma } from '../../../db/prisma.js';

const router = express.Router();

/** GET /:workspaceId/agents/:agentId/crawls - list crawls for agent (linked or workspace-level). */
router.get('/:workspaceId/agents/:agentId/crawls', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const crawls = await listCrawlsByWorkspace(workspaceId, agentId);
    return res.json({ crawls });
  } catch (error: any) {
    console.error('List crawls error:', error);
    res.status(500).json({ error: 'Failed to list crawls', details: error?.message });
  }
});

export default router;
