/**
 * Workspace CRUD, members, invites, leave (v2).
 * Owner/member model: owner can do everything; member can only manage agents.
 */

import { prisma } from '../../db/prisma.js';
import { canManageWorkspaceSettings } from '../agents/agent.service.js';

export type WorkspaceRole = 'owner' | 'member';

export interface WorkspaceWithRole {
  id: number;
  name: string;
  plan: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberInfo {
  id: number;
  userId: number;
  email: string;
  fullName: string | null;
  role: WorkspaceRole;
}

export interface PendingInviteInfo {
  email: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteResultMember {
  kind: 'member';
  member: WorkspaceMemberInfo;
}

export interface InviteResultPendingInvite {
  kind: 'pendingInvite';
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
}

export type InviteResult = InviteResultMember | InviteResultPendingInvite;

/**
 * Create a default workspace for a new owner (e.g. from seed or internal use).
 * Also creates one default agent via agent.service.
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
  const { createAgent } = await import('../agents/agent.service.js');
  const agent = await createAgent(workspace.id, 'Default Agent');
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
 * Get all workspaces for a user with their role in each (for v2 login/me).
 */
export async function getWorkspacesForUser(userId: number): Promise<WorkspaceWithRole[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { workspace: { name: 'asc' } },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    plan: m.workspace.plan,
    role: m.role as WorkspaceRole,
  }));
}

/**
 * Update workspace (name). Only owner can update. Returns updated workspace.
 */
export async function updateWorkspace(
  workspaceId: number,
  userId: number,
  data: { name?: string }
): Promise<WorkspaceWithRole> {
  const canManage = await canManageWorkspaceSettings(userId, workspaceId);
  if (!canManage) throw new Error('Only the workspace owner can update workspace settings');

  const name = typeof data.name === 'string' ? data.name.trim() : undefined;
  if (name === undefined) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, plan: true },
    });
    if (!workspace) throw new Error('Workspace not found');
    return { id: workspace.id, name: workspace.name, plan: workspace.plan, role: 'owner' };
  }
  if (!name) throw new Error('Workspace name cannot be empty');

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name },
    select: { id: true, name: true, plan: true },
  });
  return { id: workspace.id, name: workspace.name, plan: workspace.plan, role: 'owner' };
}

/**
 * List all members of a workspace (owner + members). Caller must have access to the workspace.
 */
export async function listWorkspaceMembers(workspaceId: number): Promise<WorkspaceMemberInfo[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.user.email,
    fullName: m.user.fullName,
    role: m.role as WorkspaceRole,
  }));
}

/**
 * List pending invites for a workspace (invites not yet accepted). Caller must have access.
 */
export async function listPendingInvites(workspaceId: number): Promise<PendingInviteInfo[]> {
  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return invites.map((i) => ({
    email: i.email,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }));
}

/**
 * Resend a workspace invite (new token, new email). Only owner. Email must have a pending invite.
 */
export async function resendWorkspaceInvite(
  workspaceId: number,
  email: string,
  requestedByUserId: number
): Promise<{ inviteLink: string; expiresAt: string }> {
  const isOwner = await canManageWorkspaceSettings(requestedByUserId, workspaceId);
  if (!isOwner) throw new Error('Only the workspace owner can resend invites');

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email is required');

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error('Workspace not found');

  const existing = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email: normalizedEmail },
  });
  if (!existing) throw new Error('No pending invite found for this email');

  const { generateInviteToken, getInviteExpiresAt } = await import('../../shared/workspaceInvite.service.js');
  const expiresAt = getInviteExpiresAt();
  const inviteToken = generateInviteToken();

  await prisma.workspaceInvite.update({
    where: { id: existing.id },
    data: { token: inviteToken, expiresAt },
  });

  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const inviteLink = `${baseUrl}/signup?invite=${encodeURIComponent(inviteToken)}`;

  try {
    const { sendWorkspaceInviteEmail } = await import('../../shared/email.service.js');
    await sendWorkspaceInviteEmail(normalizedEmail, workspace.name, inviteLink);
  } catch (err) {
    console.error('Failed to resend workspace invite email:', err);
  }

  return { inviteLink, expiresAt: expiresAt.toISOString() };
}

/**
 * Invite a user to the workspace by email. Caller must be owner.
 * - If user exists: add them as member and return { kind: 'member', member }.
 * - If user doesn't exist: create a pending invite and return { kind: 'pendingInvite', inviteLink, ... }.
 */
export async function inviteWorkspaceMember(
  workspaceId: number,
  email: string,
  invitedByUserId: number
): Promise<InviteResult> {
  const isOwner = await canManageWorkspaceSettings(invitedByUserId, workspaceId);
  if (!isOwner) throw new Error('Only the workspace owner can invite members');

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email is required');

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, fullName: true },
  });

  if (user) {
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (existing) throw new Error('This user is already a member of the workspace');

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role: 'member' },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    return {
      kind: 'member',
      member: {
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        fullName: member.user.fullName,
        role: 'member',
      },
    };
  }

  const { generateInviteToken, getInviteExpiresAt } = await import('../../shared/workspaceInvite.service.js');
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error('Workspace not found');

  const expiresAt = getInviteExpiresAt();
  const inviteToken = generateInviteToken();

  await prisma.workspaceInvite.deleteMany({
    where: { workspaceId, email: normalizedEmail },
  });
  await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: normalizedEmail,
      token: inviteToken,
      invitedByUserId,
      expiresAt,
    },
  });

  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const inviteLink = `${baseUrl}/signup?invite=${encodeURIComponent(inviteToken)}`;

  try {
    const { sendWorkspaceInviteEmail } = await import('../../shared/email.service.js');
    await sendWorkspaceInviteEmail(normalizedEmail, workspace.name, inviteLink);
  } catch (err) {
    console.error('Failed to send workspace invite email:', err);
  }

  return {
    kind: 'pendingInvite',
    inviteToken,
    inviteLink,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Remove a member from the workspace. Caller must be owner. Cannot remove the last owner (yourself).
 */
export async function removeWorkspaceMember(
  workspaceId: number,
  userIdToRemove: number,
  requestedByUserId: number
): Promise<void> {
  const isOwner = await canManageWorkspaceSettings(requestedByUserId, workspaceId);
  if (!isOwner) throw new Error('Only the workspace owner can remove members');

  const memberToRemove = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: userIdToRemove } },
  });
  if (!memberToRemove) throw new Error('Member not found in this workspace');
  if (memberToRemove.role === 'owner' && memberToRemove.userId === requestedByUserId) {
    throw new Error('You cannot remove yourself as owner. Transfer ownership first or delete the workspace.');
  }
  if (memberToRemove.role === 'owner') {
    throw new Error('Cannot remove the workspace owner');
  }

  await prisma.workspaceMember.delete({
    where: { id: memberToRemove.id },
  });
}

/**
 * Leave a workspace (remove current user's membership). Only members can leave; owner must delete the workspace or transfer ownership.
 */
export async function leaveWorkspace(workspaceId: number, userId: number): Promise<void> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error('You are not a member of this workspace');
  if (member.role === 'owner') {
    throw new Error('Owners cannot leave. Delete the workspace or transfer ownership first.');
  }
  await prisma.workspaceMember.delete({
    where: { id: member.id },
  });
}

/**
 * Delete a workspace and all its data (agents, members, invites, crawls, etc.). Only the owner can delete.
 */
export async function deleteWorkspace(workspaceId: number, userId: number): Promise<void> {
  const canManage = await canManageWorkspaceSettings(userId, workspaceId);
  if (!canManage) throw new Error('Only the workspace owner can delete the workspace');

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!workspace) throw new Error('Workspace not found');

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });
}
