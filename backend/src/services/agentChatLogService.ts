/**
 * Agent chat logs (v2): persist and list chat sessions/messages per agent. Uses Prisma.
 */

import { prisma } from '../db/prisma.js';
import { randomUUID } from 'crypto';

export interface AgentChatSessionSummary {
  id: string;
  sessionId: string;
  preview: string;
  startedAt: string;
  messageCount: number;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

/** Create or get session by agent + session_id string; returns external session id and session row. */
export async function createOrGetSession(
  agentId: number,
  sessionIdExternal: string | null
): Promise<{ sessionIdExternal: string; sessionRowId: number }> {
  const sessionId = sessionIdExternal?.trim() || randomUUID();
  const session = await prisma.agentChatSession.upsert({
    where: {
      agentId_sessionId: { agentId, sessionId },
    },
    create: {
      agentId,
      sessionId,
    },
    update: { updatedAt: new Date() },
  });
  return { sessionIdExternal: session.sessionId, sessionRowId: session.id };
}

/** Append a message to a session (sessionRowId = AgentChatSession.id). */
export async function appendMessage(
  sessionRowId: number,
  agentId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await prisma.$transaction([
    prisma.agentChatMessage.create({
      data: { sessionId: sessionRowId, agentId, role, content },
    }),
    prisma.agentChatSession.update({
      where: { id: sessionRowId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

/** List sessions for an agent (newest first), optional search in message content. */
export async function listSessionsByAgent(
  agentId: number,
  limit: number = 50,
  offset: number = 0,
  search?: string | null
): Promise<AgentChatSessionSummary[]> {
  const where: { agentId: number; messages?: { some: { content: { contains: string; mode: 'insensitive' } } } } = {
    agentId,
  };
  if (search?.trim()) {
    where.messages = {
      some: { content: { contains: search.trim(), mode: 'insensitive' } },
    };
  }

  const sessions = await prisma.agentChatSession.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      _count: { select: { messages: true } },
      messages: {
        where: { role: 'user' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { content: true },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.sessionId,
    sessionId: s.sessionId,
    preview: s.messages[0]?.content || 'No messages',
    startedAt: s.createdAt.toISOString(),
    messageCount: s._count.messages,
  }));
}

/** Get all messages for a session (sessionIdExternal = AgentChatSession.sessionId string). */
export async function getSessionMessages(
  agentId: number,
  sessionIdExternal: string
): Promise<AgentChatMessage[]> {
  const messages = await prisma.agentChatMessage.findMany({
    where: {
      session: {
        agentId,
        sessionId: sessionIdExternal,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map((m) => ({
    id: String(m.id),
    role: m.role as 'user' | 'assistant',
    content: m.content,
    at: m.createdAt.toISOString(),
  }));
}

/** Check that a session belongs to the given agent. */
export async function sessionBelongsToAgent(
  sessionIdExternal: string,
  agentId: number
): Promise<boolean> {
  const session = await prisma.agentChatSession.findUnique({
    where: { agentId_sessionId: { agentId, sessionId: sessionIdExternal } },
  });
  return !!session;
}
