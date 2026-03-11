/**
 * Workspace credits: ensure row, check remaining, deduct, reset period.
 */

import { prisma } from '../../db/prisma.js';
import { getPlanForWorkspace } from './plan.service.js';

const FREE_PLAN_NAME = 'free';

function now(): Date {
  return new Date();
}

function periodMonth(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export async function ensureWorkspaceCredits(workspaceId: number): Promise<void> {
  const plan = await getPlanForWorkspace(workspaceId);
  const { start, end } = periodMonth();
  await prisma.workspaceCredits.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      includedCredits: plan.messageCredits,
      bonusCredits: 0,
      usedCredits: 0,
      periodStart: start,
      periodEnd: end,
    },
    update: {},
  });
}

export async function getOrCreateCreditsRow(workspaceId: number) {
  let row = await prisma.workspaceCredits.findUnique({
    where: { workspaceId },
  });
  if (!row) {
    await ensureWorkspaceCredits(workspaceId);
    row = await prisma.workspaceCredits.findUnique({
      where: { workspaceId },
    });
  }
  if (!row) throw new Error('Failed to create workspace credits');
  return row;
}

/** Returns remaining credits; if period ended, resets and returns new remaining. */
export async function getRemainingCredits(workspaceId: number): Promise<{
  includedCredits: number;
  bonusCredits: number;
  usedCredits: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
}> {
  const row = await getOrCreateCreditsRow(workspaceId);
  const nowDate = now();
  if (nowDate >= row.periodEnd) {
    await resetPeriod(workspaceId);
    const next = await getOrCreateCreditsRow(workspaceId);
    const remaining = next.includedCredits + next.bonusCredits - next.usedCredits;
    return {
      includedCredits: next.includedCredits,
      bonusCredits: next.bonusCredits,
      usedCredits: next.usedCredits,
      remaining: Math.max(0, remaining),
      periodStart: next.periodStart,
      periodEnd: next.periodEnd,
    };
  }
  const remaining = row.includedCredits + row.bonusCredits - row.usedCredits;
  return {
    includedCredits: row.includedCredits,
    bonusCredits: row.bonusCredits,
    usedCredits: row.usedCredits,
    remaining: Math.max(0, remaining),
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
  };
}

/** Deduct credits. Returns true if deducted, false if insufficient (caller should 402). */
export async function deductCredits(workspaceId: number, amount: number): Promise<boolean> {
  const row = await getOrCreateCreditsRow(workspaceId);
  const nowDate = now();
  if (nowDate >= row.periodEnd) await resetPeriod(workspaceId);
  const fresh = await getOrCreateCreditsRow(workspaceId);
  const remaining = fresh.includedCredits + fresh.bonusCredits - fresh.usedCredits;
  if (remaining < amount) return false;
  await prisma.workspaceCredits.update({
    where: { workspaceId },
    data: { usedCredits: { increment: amount }, updatedAt: nowDate },
  });
  return true;
}

export async function resetPeriod(workspaceId: number): Promise<void> {
  const plan = await getPlanForWorkspace(workspaceId);
  const { start, end } = periodMonth();
  await prisma.workspaceCredits.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      includedCredits: plan.messageCredits,
      bonusCredits: 0,
      usedCredits: 0,
      periodStart: start,
      periodEnd: end,
    },
    update: {
      includedCredits: plan.messageCredits,
      usedCredits: 0,
      periodStart: start,
      periodEnd: end,
      updatedAt: now(),
    },
  });
}

export async function addBonusCredits(workspaceId: number, amount: number): Promise<void> {
  await prisma.workspaceCredits.update({
    where: { workspaceId },
    data: { bonusCredits: { increment: amount }, updatedAt: now() },
  });
}
