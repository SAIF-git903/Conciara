import express from 'express';
import { canManageAgentsInWorkspace } from '../../agents/agent.service.js';
import {
  listNotificationPreferences,
  listUserWorkspaceNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotificationPreference,
} from '../../notifications/notification.service.js';

const router = express.Router();

router.get('/:workspaceId/notifications', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
    const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);

    const result = await listUserWorkspaceNotifications(workspaceId, userId, { unreadOnly, limit, offset });
    return res.json(result);
  } catch (error: any) {
    console.error('List notifications error:', error);
    return res.status(500).json({ error: 'Failed to list notifications', details: error?.message });
  }
});

router.post('/:workspaceId/notifications/:notificationId/read', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const result = await markNotificationRead(workspaceId, userId, req.params.notificationId);
    return res.json({ updated: result.count });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read', details: error?.message });
  }
});

router.post('/:workspaceId/notifications/read-all', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const result = await markAllNotificationsRead(workspaceId, userId);
    return res.json({ updated: result.count });
  } catch (error: any) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ error: 'Failed to mark all notifications as read', details: error?.message });
  }
});

router.get('/:workspaceId/notifications/preferences', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const preferences = await listNotificationPreferences(workspaceId, userId);
    return res.json({ preferences });
  } catch (error: any) {
    console.error('List notification preferences error:', error);
    return res.status(500).json({ error: 'Failed to list notification preferences', details: error?.message });
  }
});

router.put('/:workspaceId/notifications/preferences/:eventType', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const eventType = String(req.params.eventType || '').trim();
    if (!eventType) return res.status(400).json({ error: 'eventType is required' });

    const inAppEnabled = req.body?.inAppEnabled !== false;
    const emailEnabled = req.body?.emailEnabled === true;

    const preference = await upsertNotificationPreference(
      workspaceId,
      userId,
      eventType,
      inAppEnabled,
      emailEnabled
    );
    return res.json({ preference });
  } catch (error: any) {
    console.error('Upsert notification preference error:', error);
    return res.status(500).json({ error: 'Failed to update notification preference', details: error?.message });
  }
});

export default router;

