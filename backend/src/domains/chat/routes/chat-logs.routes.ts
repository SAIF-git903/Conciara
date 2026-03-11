/**
 * Chat logs and analytics. Mounted under /api/workspaces (via agents aggregator).
 */

import express from 'express';
import { canManageAgent } from '../../agents/agent.service.js';
import { prisma } from '../../../db/prisma.js';
import {
  listSessionsByAgent,
  getSessionMessages,
  sessionBelongsToAgent,
  getChatAnalytics,
} from '../services/chatLog.service.js';

const router = express.Router();

router.get('/:workspaceId/agents/:agentId/analytics/chats', async (req, res) => {
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

    const startParam = typeof req.query.start === 'string' ? req.query.start : null;
    const endParam = typeof req.query.end === 'string' ? req.query.end : null;
    const end = endParam ? new Date(endParam) : new Date();
    const start = startParam ? new Date(startParam) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; })();
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const analytics = await getChatAnalytics(agentId, start, end);
    return res.json(analytics);
  } catch (error: any) {
    console.error('Chat analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics', details: error?.message });
  }
});

router.get('/:workspaceId/agents/:agentId/chat-logs', async (req, res) => {
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

    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10) || 20);
    const offset = parseInt(String(req.query.offset || 0), 10) || 0;
    const search = typeof req.query.search === 'string' ? req.query.search : null;
    const fromParam = typeof req.query.fromDate === 'string' ? req.query.fromDate : null;
    const toParam = typeof req.query.toDate === 'string' ? req.query.toDate : null;
    const fromDate = fromParam ? new Date(fromParam) : null;
    const toDate = toParam ? new Date(toParam) : null;
    if (fromParam && (!fromDate || isNaN(fromDate.getTime()))) {
      return res.status(400).json({ error: 'Invalid fromDate' });
    }
    if (toParam && (!toDate || isNaN(toDate.getTime()))) {
      return res.status(400).json({ error: 'Invalid toDate' });
    }

    const sessions = await listSessionsByAgent(agentId, limit, offset, search, fromDate, toDate);
    return res.json({ sessions });
  } catch (error: any) {
    console.error('Chat logs list error:', error);
    res.status(500).json({ error: 'Failed to load chat logs', details: error?.message });
  }
});

router.get('/:workspaceId/agents/:agentId/chat-logs/:sessionId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const sessionId = req.params.sessionId;
    if (isNaN(workspaceId) || isNaN(agentId) || !sessionId) {
      return res.status(400).json({ error: 'Invalid workspace, agent, or session ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const belongs = await sessionBelongsToAgent(sessionId, agentId);
    if (!belongs) return res.status(404).json({ error: 'Session not found' });

    const messages = await getSessionMessages(agentId, sessionId);
    return res.json({ messages });
  } catch (error: any) {
    console.error('Chat log session error:', error);
    res.status(500).json({ error: 'Failed to load session', details: error?.message });
  }
});

export default router;
