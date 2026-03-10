/**
 * Agent integrations (Slack). Mounted under /api/workspaces (via aggregator).
 */

import crypto from 'crypto';
import express from 'express';
import { Prisma } from '@prisma/client';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';

const router = express.Router();
const SLACK_OAUTH_SCOPES = 'chat:write,app_mentions:read,channels:history,channels:read,groups:history,groups:read,im:history,im:read,im:write';

router.get('/:workspaceId/agents/:agentId/integrations/slack', async (req, res) => {
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

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { integrations: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const integrations = (agent.integrations as { slack?: { teamId?: string; teamName?: string } } | null) ?? {};
    const slack = integrations.slack;
    return res.json({
      connected: !!slack?.teamId,
      teamName: slack?.teamName ?? undefined,
    });
  } catch (error: any) {
    console.error('Get Slack integration error:', error);
    res.status(500).json({ error: 'Failed to get Slack integration', details: error?.message });
  }
});

router.get('/:workspaceId/agents/:agentId/integrations/slack/oauth-url', async (req, res) => {
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

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(503).json({ error: 'Slack integration is not configured. Set SLACK_CLIENT_ID and SLACK_REDIRECT_URI.' });
    }

    const stateSecret = process.env.JWT_SECRET || process.env.SLACK_OAUTH_STATE_SECRET || 'slack-oauth-state';
    const exp = Math.floor(Date.now() / 1000) + 600;
    const payload = { workspaceId, agentId, userId, exp };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', stateSecret).update(payloadB64).digest('hex');
    const state = `${payloadB64}.${sig}`;

    const redirectUrl = 'https://slack.com/oauth/v2/authorize?' + new URLSearchParams({
      client_id: clientId,
      scope: SLACK_OAUTH_SCOPES,
      redirect_uri: redirectUri,
      state,
    });
    return res.json({ redirectUrl });
  } catch (error: any) {
    console.error('Slack OAuth URL error:', error);
    res.status(500).json({ error: 'Failed to get Slack authorization URL', details: error?.message });
  }
});

router.post('/:workspaceId/agents/:agentId/integrations/slack', async (req, res) => {
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

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { id: true, integrations: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { accessToken, signingSecret } = req.body ?? {};
    const token = typeof accessToken === 'string' ? accessToken.trim() : '';
    const secret = typeof signingSecret === 'string' ? signingSecret.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'accessToken is required' });
    }
    if (!secret) {
      return res.status(400).json({ error: "signingSecret is required so we can verify events from your Slack app. Find it in your app's Basic Information > Signing Secret." });
    }

    return res.status(400).json({ error: 'Connect via OAuth: use the Connect to Slack button in Connected Apps.' });
  } catch (error: any) {
    console.error('Connect Slack error:', error);
    res.status(500).json({ error: 'Failed to connect Slack', details: error?.message });
  }
});

router.delete('/:workspaceId/agents/:agentId/integrations/slack', async (req, res) => {
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

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { id: true, integrations: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const integrations = (agent.integrations as Record<string, unknown> | null) ?? {};
    const { slack: _removed, ...rest } = integrations;
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        integrations:
          Object.keys(rest).length > 0 ? (rest as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    return res.json({ ok: true, connected: false });
  } catch (error: any) {
    console.error('Disconnect Slack error:', error);
    res.status(500).json({ error: 'Failed to disconnect Slack', details: error?.message });
  }
});

export default router;
