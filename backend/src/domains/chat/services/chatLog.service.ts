/**
 * Agent chat logs (v2): persist and list chat sessions/messages per agent.
 */

import { prisma } from '../../../db/prisma.js';
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

export async function listSessionsByAgent(
  agentId: number,
  limit: number = 20,
  offset: number = 0,
  search?: string | null,
  fromDate?: Date | null,
  toDate?: Date | null
): Promise<AgentChatSessionSummary[]> {
  const where: {
    agentId: number;
    messages?: { some: { content: { contains: string; mode: 'insensitive' } } };
    createdAt?: { gte?: Date; lte?: Date };
  } = { agentId };
  if (search?.trim()) {
    where.messages = {
      some: { content: { contains: search.trim(), mode: 'insensitive' } },
    };
  }
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
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

export async function sessionBelongsToAgent(
  sessionIdExternal: string,
  agentId: number
): Promise<boolean> {
  const session = await prisma.agentChatSession.findUnique({
    where: { agentId_sessionId: { agentId, sessionId: sessionIdExternal } },
  });
  return !!session;
}

export interface ChatAnalyticsResult {
  totalMessages: number;
  totalConversations: number;
  trendPct: number;
  chatsByDay: { date: string; dayLabel: string; chats: number }[];
}

export async function getChatAnalytics(
  agentId: number,
  startDate: Date,
  endDate: Date
): Promise<ChatAnalyticsResult> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const [totalMessages, totalConversations, sessionsInRange] = await Promise.all([
    prisma.agentChatMessage.count({
      where: { agentId, createdAt: { gte: start, lte: end } },
    }),
    prisma.agentChatSession.count({
      where: { agentId, createdAt: { gte: start, lte: end } },
    }),
    prisma.agentChatSession.findMany({
      where: { agentId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
  ]);

  const dayMap = new Map<string, number>();
  for (const s of sessionsInRange as { createdAt: Date }[]) {
    const d = s.createdAt.toISOString().slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
  }

  const chatsByDay: { date: string; dayLabel: string; chats: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const dayLabel = cursor.toLocaleDateString(undefined, { weekday: 'short' });
    chatsByDay.push({ date: dateStr, dayLabel, chats: dayMap.get(dateStr) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const previousConversations = await prisma.agentChatSession.count({
    where: { agentId, createdAt: { gte: prevStart, lte: prevEnd } },
  });

  let trendPct = 0;
  if (previousConversations > 0) {
    trendPct = Math.round(((totalConversations - previousConversations) / previousConversations) * 100);
  } else if (totalConversations > 0) {
    trendPct = 100;
  }

  return { totalMessages, totalConversations, trendPct, chatsByDay };
}
