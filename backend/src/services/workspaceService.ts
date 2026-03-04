/**
 * Workspace & Agent service (v2).
 * Owner/member model: owner can do everything; member can only manage agents (train, sources, analytics, delete).
 */

import { prisma } from '../db/prisma.js';
import { linkLatestCrawlToAgent } from './crawlService.js';

export type WorkspaceRole = 'owner' | 'member';

export interface WorkspaceWithRole {
  id: number;
  name: string;
  plan: string;
  role: WorkspaceRole;
}

export interface AgentInfo {
  id: number;
  workspaceId: number;
  name: string;
}

/**
 * Create a default workspace for a new owner (e.g. from seed or internal use).
 * Also creates one default agent.
 */
export async function createDefaultWorkspaceForOwner(
  userId: number,
  name: string = 'My Workspace'
): Promise<{ workspaceId: number; agentId: number }> {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      plan: 'free',
      ownerId: userId,
    },
  });
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    },
  });
  const agent = await prisma.agent.create({
    data: {
      workspaceId: workspace.id,
      name: 'Default Agent',
    },
  });
  return { workspaceId: workspace.id, agentId: agent.id };
}

/**
 * Create a workspace for the current user (onboarding). User becomes owner.
 */
export async function createWorkspace(
  userId: number,
  name: string,
  _slug?: string
): Promise<WorkspaceWithRole> {
  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      plan: 'free',
      ownerId: userId,
    },
  });
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    },
  });
  return {
    id: workspace.id,
    name: workspace.name,
    plan: workspace.plan,
    role: 'owner',
  };
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
 * Get all workspaces for a user with their role in each (for v2 login/me).
 */
export async function getWorkspacesForUser(userId: number): Promise<WorkspaceWithRole[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { workspace: { name: 'asc' } },
  });
  return memberships.map((m: { workspace: { id: number; name: string; plan: string }; role: string }) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    plan: m.workspace.plan,
    role: m.role as WorkspaceRole,
  }));
}

/**
 * Get all agents in a workspace (for a user who has access).
 */
export async function getAgentsForWorkspace(workspaceId: number): Promise<AgentInfo[]> {
  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
  return agents.map((a: { id: number; workspaceId: number; name: string }) => ({
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
 * Members can: train, edit sources, view analytics, delete agents. They cannot change workspace settings or billing.
 */
export async function canManageAgentsInWorkspace(userId: number, workspaceId: number): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
  return !!member; // owner or member
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
  const workspaceMember = agent.workspace.members.find((m: { userId: number }) => m.userId === userId);
  if (workspaceMember) return true;
  const agentMember = await prisma.agentMember.findUnique({
    where: { agentId_userId: { agentId, userId } },
  });
  return !!agentMember;
}
