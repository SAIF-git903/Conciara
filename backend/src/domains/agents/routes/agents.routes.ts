/**
 * Agent CRUD routes. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import {
  getAgentsForWorkspace,
  canManageAgentsInWorkspace,
  createAgent,
  deleteAgent,
} from '../agent.service.js';

const router = express.Router();

router.get('/:workspaceId/agents', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const agents = await getAgentsForWorkspace(workspaceId);
    return res.json({ agents });
  } catch (error: any) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

router.post('/:workspaceId/agents', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const { name, model, prePrompt, logoUrl } = req.body;
    const agentName = typeof name === 'string' && name.trim() ? name.trim() : 'My Agent';
    const agent = await createAgent(workspaceId, agentName, {
      model: typeof model === 'string' ? model : undefined,
      prePrompt: typeof prePrompt === 'string' ? prePrompt : undefined,
      logoUrl: typeof logoUrl === 'string' ? logoUrl : undefined,
    });
    return res.status(201).json({ agent });
  } catch (error: any) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent', details: error.message });
  }
});

router.delete('/:workspaceId/agents/:agentId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const deleted = await deleteAgent(agentId, workspaceId);
    if (!deleted) return res.status(404).json({ error: 'Agent not found' });
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete agent error:', error);
    res.status(500).json({ error: 'Failed to delete agent', details: error?.message });
  }
});

export default router;
