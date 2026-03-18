/**
 * Workspace members and invites routes.
 * Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgentsInWorkspace } from '../../agents/agent.service.js';
import {
  listWorkspaceMembers,
  listPendingInvites,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  resendWorkspaceInvite,
} from '../workspace.service.js';
import { PlanLimitError, sendPlanLimitError } from '../../../common/errors/planLimit.js';
import { requirePermission } from '../../../middleware/permissions.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     summary: List workspace members and pending invites
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: members, pendingInvites }
 */
router.get('/:workspaceId/members', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const [members, pendingInvites] = await Promise.all([
      listWorkspaceMembers(workspaceId),
      listPendingInvites(workspaceId),
    ]);
    return res.json({ members, pendingInvites });
  } catch (error: any) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to load members', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/invites/resend:
 *   post:
 *     summary: Resend invite email
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { email: { type: string } }
 *             required: [email]
 *     responses:
 *       200: { description: Invite resent }
 */
router.post('/:workspaceId/invites/resend', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await resendWorkspaceInvite(workspaceId, email, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error?.message === 'Only the workspace owner can resend invites') {
      return res.status(403).json({ error: error.message });
    }
    if (error?.message === 'No pending invite found for this email') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   post:
 *     summary: Invite member to workspace (owner only)
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { email: { type: string } }
 *             required: [email]
 *     responses:
 *       201: { description: member or pendingInvite }
 */
router.post('/:workspaceId/members', requirePermission({ feature: 'inviteMembers', requireOwner: true }), async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await inviteWorkspaceMember(workspaceId, email, userId);
    if (result.kind === 'member') {
      return res.status(201).json({ member: result.member });
    }
    return res.status(201).json({
      pendingInvite: true,
      inviteLink: result.inviteLink,
      expiresAt: result.expiresAt,
    });
  } catch (error: unknown) {
    if (error instanceof PlanLimitError) {
      return sendPlanLimitError(res, error);
    }
    const err = error as Error;
    if (err?.message === 'Only the workspace owner can invite members') {
      return res.status(403).json({ error: err.message });
    }
    if (err?.message === 'This user is already a member of the workspace') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member', details: err?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     summary: Remove member from workspace
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Member removed }
 */
router.delete('/:workspaceId/members/:userId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const userIdToRemove = parseInt(req.params.userId, 10);
    if (isNaN(workspaceId) || isNaN(userIdToRemove)) {
      return res.status(400).json({ error: 'Invalid workspace or user ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await removeWorkspaceMember(workspaceId, userIdToRemove, userId);
    return res.status(200).json({ message: 'Member removed' });
  } catch (error: any) {
    if (error?.message === 'Only the workspace owner can remove members') {
      return res.status(403).json({ error: error.message });
    }
    if (error?.message === 'Member not found in this workspace') {
      return res.status(404).json({ error: error.message });
    }
    if (error?.message?.includes('cannot remove yourself') || error?.message?.includes('Cannot remove the workspace owner')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member', details: error?.message });
  }
});

export default router;
