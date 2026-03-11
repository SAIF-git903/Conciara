/**
 * Plan and subscription helpers: resolve workspace to plan, enforce limits.
 */

import { prisma } from '../../db/prisma.js';

const FREE_PLAN_NAME = 'free';

export interface PlanInfo {
  id: string;
  name: string;
  displayName: string;
  messageCredits: number;
  maxAgents: number;
  maxMembers: number;
  maxTrainingBytes: bigint;
  apiAccess: boolean;
}

export async function getPlanByName(name: string): Promise<PlanInfo | null> {
  const plan = await prisma.plan.findUnique({
    where: { name },
  });
  if (!plan) return null;
  return {
    id: plan.id,
    name: plan.name,
    displayName: plan.displayName,
    messageCredits: plan.messageCredits,
    maxAgents: plan.maxAgents,
    maxMembers: plan.maxMembers,
    maxTrainingBytes: plan.maxTrainingBytes,
    apiAccess: plan.apiAccess,
  };
}

export async function getPlanForWorkspace(workspaceId: number): Promise<PlanInfo> {
  const sub = await prisma.workspaceSubscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (sub?.plan && ['active', 'trialing'].includes(sub.status)) {
    return {
      id: sub.plan.id,
      name: sub.plan.name,
      displayName: sub.plan.displayName,
      messageCredits: sub.plan.messageCredits,
      maxAgents: sub.plan.maxAgents,
      maxMembers: sub.plan.maxMembers,
      maxTrainingBytes: sub.plan.maxTrainingBytes,
      apiAccess: sub.plan.apiAccess,
    };
  }
  const free = await getPlanByName(FREE_PLAN_NAME);
  if (!free) throw new Error('Free plan not found. Run seedPlans.');
  return free;
}

export async function workspaceHasApiAccess(workspaceId: number): Promise<boolean> {
  const plan = await getPlanForWorkspace(workspaceId);
  return plan.apiAccess;
}

export async function checkAgentLimit(workspaceId: number): Promise<{ allowed: boolean; current: number; max: number }> {
  const plan = await getPlanForWorkspace(workspaceId);
  const current = await prisma.agent.count({ where: { workspaceId } });
  return { allowed: current < plan.maxAgents, current, max: plan.maxAgents };
}

export async function checkMemberLimit(workspaceId: number): Promise<{ allowed: boolean; current: number; max: number }> {
  const plan = await getPlanForWorkspace(workspaceId);
  const current = await prisma.workspaceMember.count({ where: { workspaceId } });
  return { allowed: current < plan.maxMembers, current, max: plan.maxMembers };
}

export async function checkTrainingBytesLimit(
  workspaceId: number,
  agentId: number,
  additionalBytes: bigint
): Promise<{ allowed: boolean; current: bigint; max: bigint }> {
  const plan = await getPlanForWorkspace(workspaceId);
  const current = await prisma.agentDocument.aggregate({
    where: { agentId },
    _sum: { fileSize: true },
  });
  const currentBytes = current._sum.fileSize ?? BigInt(0);
  const newTotal = currentBytes + additionalBytes;
  return {
    allowed: newTotal <= plan.maxTrainingBytes,
    current: currentBytes,
    max: plan.maxTrainingBytes,
  };
}
