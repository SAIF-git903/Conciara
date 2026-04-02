/**
 * Agent actions CRUD. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import {
  listActions,
  createAction,
  updateAction,
  deleteAction,
  ACTION_TYPES,
} from '../actions.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/actions:
 *   get:
 *     summary: List agent actions
 *     tags: [Actions]
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
 *       200: { description: { actions } }
 */
router.get('/:workspaceId/agents/:agentId/actions', async (req, res) => {
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

    const actions = await listActions(agentId, workspaceId);
    return res.json({ actions });
  } catch (error: any) {
    console.error('List actions error:', error);
    res.status(500).json({ error: 'Failed to list actions' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/actions/types:
 *   get:
 *     summary: List action types
 *     tags: [Actions]
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
 *       200: { description: { types } }
 */
router.get('/:workspaceId/agents/:agentId/actions/types', async (req, res) => {
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

    return res.json({ types: ACTION_TYPES });
  } catch (error: any) {
    console.error('List action types error:', error);
    res.status(500).json({ error: 'Failed to list action types' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/actions:
 *   post:
 *     summary: Create action
 *     tags: [Actions]
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
 *             properties: { type: { type: string }, name: { type: string }, description: { type: string }, enabled: { type: boolean }, config: { type: object }, sortOrder: { type: integer } }
 *     responses:
 *       201: { description: { action } }
 */
router.post('/:workspaceId/agents/:agentId/actions', async (req, res) => {
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

    const { type, name, description, enabled, config, sortOrder } = req.body ?? {};
    const action = await createAction(agentId, workspaceId, {
      type: typeof type === 'string' ? type : 'custom_api',
      name: typeof name === 'string' ? name : 'Unnamed action',
      description: typeof description === 'string' ? description : null,
      enabled: typeof enabled === 'boolean' ? enabled : true,
      config: config ?? undefined,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
    });
    return res.status(201).json({ action });
  } catch (error: any) {
    console.error('Create action error:', error);
    res.status(400).json({ error: error.message || 'Failed to create action' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/actions/{actionId}:
 *   put:
 *     summary: Update action
 *     tags: [Actions]
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
 *       - in: path
 *         name: actionId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string }, description: { type: string }, enabled: { type: boolean }, config: { type: object }, sortOrder: { type: integer } }
 *     responses:
 *       200: { description: { action } }
 */
router.put('/:workspaceId/agents/:agentId/actions/:actionId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const actionId = parseInt(req.params.actionId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(actionId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const { name, description, enabled, config, sortOrder } = req.body ?? {};
    const action = await updateAction(actionId, agentId, workspaceId, {
      ...(typeof name === 'string' && { name }),
      ...(typeof description === 'string' && { description: description || null }),
      ...(typeof enabled === 'boolean' && { enabled }),
      ...(config !== undefined && { config }),
      ...(typeof sortOrder === 'number' && { sortOrder }),
    });
    if (!action) return res.status(404).json({ error: 'Action not found' });
    return res.json({ action });
  } catch (error: any) {
    console.error('Update action error:', error);
    res.status(500).json({ error: 'Failed to update action' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/actions/{actionId}:
 *   delete:
 *     summary: Delete action
 *     tags: [Actions]
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
 *       - in: path
 *         name: actionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:workspaceId/agents/:agentId/actions/:actionId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const actionId = parseInt(req.params.actionId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(actionId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const deleted = await deleteAction(actionId, agentId, workspaceId);
    if (!deleted) return res.status(404).json({ error: 'Action not found' });
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Delete action error:', error);
    res.status(500).json({ error: 'Failed to delete action' });
  }
});

export default router;
