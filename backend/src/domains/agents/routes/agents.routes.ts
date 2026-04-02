/**
 * Agent CRUD routes. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import {
  getAgentsForWorkspace,
  getAgent,
  updateAgent,
  canManageAgentsInWorkspace,
  createAgent,
  deleteAgent,
} from '../agent.service.js';
import { PlanLimitError, sendPlanLimitError } from '../../../common/errors/planLimit.js';
import { requirePermission } from '../../../middleware/permissions.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents:
 *   get:
 *     summary: List agents in workspace
 *     tags: [Agents]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: { agents } }
 */
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

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents:
 *   post:
 *     summary: Create agent
 *     tags: [Agents]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string }, model: { type: string }, prePrompt: { type: string }, logoUrl: { type: string } }
 *     responses:
 *       201: { description: { agent } }
 */
router.post('/:workspaceId/agents', requirePermission({ feature: 'createAgent' }), async (req, res) => {
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
  } catch (error: unknown) {
    if (error instanceof PlanLimitError) {
      return sendPlanLimitError(res, error);
    }
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent', details: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}:
 *   get:
 *     summary: Get agent by ID
 *     tags: [Agents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: { agent } }
 *       404: { description: Agent not found }
 */
router.get('/:workspaceId/agents/:agentId', async (req, res) => {
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

    const agent = await getAgent(agentId, workspaceId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    return res.json({ agent });
  } catch (error: any) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}:
 *   patch:
 *     summary: Update agent
 *     tags: [Agents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string }, model: { type: string }, prePrompt: { type: string }, logoUrl: { type: string } }
 *     responses:
 *       200: { description: { agent } }
 */
router.patch('/:workspaceId/agents/:agentId', async (req, res) => {
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

    const { name, model, prePrompt, logoUrl } = req.body;
    const updates: { model?: string; prePrompt?: string; name?: string; logoUrl?: string } = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof model === 'string') updates.model = model;
    if (typeof prePrompt === 'string') updates.prePrompt = prePrompt;
    if (typeof logoUrl === 'string') updates.logoUrl = logoUrl;

    const agent = await updateAgent(agentId, workspaceId, updates);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    return res.json({ agent });
  } catch (error: any) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Failed to update agent', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}:
 *   delete:
 *     summary: Delete agent
 *     tags: [Agents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Agent deleted }
 *       404: { description: Agent not found }
 */
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
