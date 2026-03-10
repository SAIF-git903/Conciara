/**
 * Agent CRUD and permission checks (v2).
 * createAgent uses linkLatestCrawlToAgent from crawl service (websites when migrated).
 */

import { prisma } from '../../db/prisma.js';
import { linkLatestCrawlToAgent } from '../websites/crawl.service.js';

export interface AgentInfo {
  id: number;
  workspaceId: number;
  name: string;
}

/**
 * Create an agent in a workspace. Caller must have access to the workspace.
 * Optional model, prePrompt, logoUrl (e.g. from onboarding).
 */
export async function createAgent(
  workspaceId: number,
  name: string,
  options?: { model?: string; prePrompt?: string; logoUrl?: string }
): Promise<AgentInfo> {
  const agent = await prisma.agent.create({
    data: {
      workspaceId,
      name: name.trim() || 'My Agent',
      model: options?.model?.trim() || undefined,
      prePrompt: options?.prePrompt?.trim() || undefined,
      logoUrl: options?.logoUrl?.trim() || undefined,
    },
  });
  await linkLatestCrawlToAgent(workspaceId, agent.id);
  return {
    id: agent.id,
    workspaceId: agent.workspaceId,
    name: agent.name,
  };
}

/**
 * Delete an agent. Verifies workspace; cascades to documents, chunks, Q&A, etc.
 * Returns true if deleted, false if not found or wrong workspace.
 */
export async function deleteAgent(agentId: number, workspaceId: number): Promise<boolean> {
  const result = await prisma.agent.deleteMany({
    where: { id: agentId, workspaceId },
  });
  return result.count > 0;
}

/**
 * Get all agents in a workspace (for a user who has access).
 */
export async function getAgentsForWorkspace(workspaceId: number): Promise<AgentInfo[]> {
  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
  return agents.map((a) => ({
    id: a.id,
    workspaceId: a.workspaceId,
    name: a.name,
  }));
}

/**
 * Check if user can manage workspace settings and billing (only owner).
 */
export async function canManageWorkspaceSettings(userId: number, workspaceId: number): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  return member?.role === 'owner';
}

/**
 * Check if user can manage agents in this workspace (owner or workspace-level member).
 */
export async function canManageAgentsInWorkspace(userId: number, workspaceId: number): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  return !!member;
}

/**
 * Check if user can manage a specific agent (workspace-level access or agent-level invite).
 */
export async function canManageAgent(userId: number, agentId: number): Promise<boolean> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { workspace: { include: { members: true } } },
  });
  if (!agent) return false;
  const workspaceMember = agent.workspace.members.find((m) => m.userId === userId);
  if (workspaceMember) return true;
  const agentMember = await prisma.agentMember.findUnique({
    where: { agentId_userId: { agentId, userId } },
  });
  return !!agentMember;
}
