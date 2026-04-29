/**
 * Agent Q&A: manual question–answer pairs. CRUD, retrieval by similarity, usage tracking.
 */

import { prisma } from '../../db/prisma.js';
import { generateEmbedding } from '../../shared/embedding.service.js';

export interface AgentQaEntry {
  id: number;
  agentId: number;
  workspaceId: number;
  question: string;
  answer: string;
  timesAsked: number;
  lastAskedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetrievedQa {
  id: number;
  question: string;
  answer: string;
  similarity?: number;
}

let hasVectorExtension: boolean | null = null;

async function checkVectorExtension(): Promise<boolean> {
  if (hasVectorExtension !== null) return hasVectorExtension;
  try {
    const result = await prisma.$queryRaw<[{ has_vector: boolean | null }]>`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector
    `;
    hasVectorExtension = result[0]?.has_vector ?? false;
    return hasVectorExtension;
  } catch {
    hasVectorExtension = false;
    return false;
  }
}

function mapEntry(row: { id: number; agentId: number; workspaceId: number; question: string; answer: string; timesAsked: number; lastAskedAt: Date | null; createdAt: Date; updatedAt: Date }): AgentQaEntry {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    question: row.question,
    answer: row.answer,
    timesAsked: row.timesAsked,
    lastAskedAt: row.lastAskedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listQaByAgent(agentId: number): Promise<AgentQaEntry[]> {
  const rows = await prisma.agentQa.findMany({
    where: { agentId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(mapEntry);
}

export async function createQa(
  agentId: number,
  workspaceId: number,
  question: string,
  answer: string
): Promise<AgentQaEntry> {
  const trimmedQ = question?.trim() || '';
  const trimmedA = answer?.trim() || '';
  if (!trimmedQ || !trimmedA) throw new Error('Question and answer are required.');

  const row = await prisma.agentQa.create({
    data: {
      agentId,
      workspaceId,
      question: trimmedQ,
      answer: trimmedA,
    },
  });

  const embedding = await generateEmbedding(trimmedQ);
  if (embedding) {
    const hasVector = await checkVectorExtension();
    const embeddingValue = `[${embedding.join(',')}]`;
    if (hasVector) {
      await prisma.$executeRawUnsafe(
        'UPDATE agent_qa SET question_embedding = $1::vector WHERE id = $2',
        embeddingValue,
        row.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        'UPDATE agent_qa SET question_embedding = $1 WHERE id = $2',
        embeddingValue,
        row.id
      );
    }
  }

  const updated = await prisma.agentQa.findUniqueOrThrow({ where: { id: row.id } });
  return mapEntry(updated);
}

export async function updateQa(
  qaId: number,
  agentId: number,
  data: { question?: string; answer?: string }
): Promise<AgentQaEntry | null> {
  const existing = await prisma.agentQa.findFirst({ where: { id: qaId, agentId } });
  if (!existing) return null;

  const question = data.question !== undefined ? data.question.trim() : existing.question;
  const answer = data.answer !== undefined ? data.answer.trim() : existing.answer;
  if (!question || !answer) throw new Error('Question and answer cannot be empty.');

  await prisma.agentQa.update({
    where: { id: qaId },
    data: { question, answer, updatedAt: new Date() },
  });

  const embedding = await generateEmbedding(question);
  if (embedding) {
    const hasVector = await checkVectorExtension();
    const embeddingValue = `[${embedding.join(',')}]`;
    if (hasVector) {
      await prisma.$executeRawUnsafe(
        'UPDATE agent_qa SET question_embedding = $1::vector WHERE id = $2',
        embeddingValue,
        qaId
      );
    } else {
      await prisma.$executeRawUnsafe(
        'UPDATE agent_qa SET question_embedding = $1 WHERE id = $2',
        embeddingValue,
        qaId
      );
    }
  }

  const updated = await prisma.agentQa.findUniqueOrThrow({ where: { id: qaId } });
  return mapEntry(updated);
}

export async function deleteQa(qaId: number, agentId: number): Promise<boolean> {
  const result = await prisma.agentQa.deleteMany({ where: { id: qaId, agentId } });
  return result.count > 0;
}

const MIN_QA_SIMILARITY = 0.5;
const DEFAULT_QA_TOP_K = 5;

/**
 * Retrieve Q&A entries most relevant to the query (vector similarity or keyword fallback).
 */
export async function retrieveQa(
  agentId: number,
  query: string,
  topK: number = DEFAULT_QA_TOP_K
): Promise<RetrievedQa[]> {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const hasVector = await checkVectorExtension();
  const queryEmbedding = await generateEmbedding(trimmed);

  if (hasVector && queryEmbedding) {
    const embeddingValue = `[${queryEmbedding.join(',')}]`;
    const rows = await prisma.$queryRawUnsafe<
      { id: number; question: string; answer: string; similarity: number }[]
    >(
      `SELECT id, question, answer,
              (1 - (question_embedding <=> $2::vector)) AS similarity
       FROM agent_qa
       WHERE agent_id = $1 AND question_embedding IS NOT NULL
       ORDER BY question_embedding <=> $2::vector
       LIMIT $3`,
      agentId,
      embeddingValue,
      topK
    );
    return rows
      .filter((r) => (r.similarity ?? 0) >= MIN_QA_SIMILARITY)
      .map((r) => ({ id: r.id, question: r.question, answer: r.answer, similarity: r.similarity }));
  }

  const words = trimmed
    .split(/\s+/)
    .map((w) => w.replace(/\W/g, '').toLowerCase())
    .filter((w) => w.length > 2);
  const all = await prisma.agentQa.findMany({
    where: { agentId },
    select: { id: true, question: true, answer: true },
  });
  if (words.length === 0) {
    return all.slice(0, topK).map((r) => ({ id: r.id, question: r.question, answer: r.answer }));
  }
  const scored = all.map((r) => {
    const q = r.question.toLowerCase();
    const matchCount = words.filter((w) => q.includes(w)).length;
    const score = matchCount / words.length;
    return { ...r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((r) => r.score > 0)
    .slice(0, topK)
    .map((r) => ({ id: r.id, question: r.question, answer: r.answer }));
}

/**
 * Record that a Q&A was used (increments times_asked, last_asked_at, and appends usage event).
 */
export async function recordQaUsage(qaIds: number[]): Promise<void> {
  if (qaIds.length === 0) return;
  const now = new Date();
  await prisma.agentQa.updateMany({
    where: { id: { in: qaIds } },
    data: { timesAsked: { increment: 1 }, lastAskedAt: now, updatedAt: now },
  });
  await prisma.agentQaUsage.createMany({
    data: qaIds.map((qaId) => ({ qaId, askedAt: now })),
  });
}

/**
 * Get usage events for a Q&A for charting (e.g. count per day).
 */
export async function getQaUsageStats(
  qaId: number,
  agentId: number,
  days: number = 30
): Promise<{ date: string; count: number }[]> {
  const qa = await prisma.agentQa.findFirst({ where: { id: qaId, agentId } });
  if (!qa) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.agentQaUsage.findMany({
    where: { qaId, askedAt: { gte: since } },
    select: { askedAt: true },
    orderBy: { askedAt: 'asc' },
  });

  const byDay = new Map<string, number>();
  for (const e of events) {
    const d = e.askedAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const result: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}
