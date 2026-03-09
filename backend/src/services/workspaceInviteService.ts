/**
 * Workspace invite flow for users who don't have an account yet.
 * Owner sends invite by email → we create a pending invite with token → they sign up via link.
 */

import { randomBytes } from 'crypto';
import { prisma } from '../db/prisma.js';
import { createUser } from './userService.js';

const INVITE_EXPIRY_DAYS = 7;

export interface InviteValidateResult {
  email: string;
  workspaceName: string;
  valid: boolean;
}

export interface InviteAcceptResult {
  userId: number;
  email: string;
  fullName: string | null;
  workspaceId: number;
}

/**
 * Validate an invite token. Returns email and workspace name if valid and not expired.
 */
export async function validateInviteToken(token: string): Promise<InviteValidateResult | null> {
  if (!token?.trim()) return null;
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: token.trim() },
    include: { workspace: { select: { name: true } } },
  });
  if (!invite || invite.expiresAt < new Date()) return null;
  return {
    email: invite.email,
    workspaceName: invite.workspace.name,
    valid: true,
  };
}

/**
 * Accept an invite: create user, add to workspace, delete invite. Token must be valid.
 */
export async function acceptInvite(
  token: string,
  password: string,
  fullName?: string | null
): Promise<InviteAcceptResult> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: token.trim() },
    include: { workspace: true },
  });
  if (!invite) throw new Error('Invalid or expired invite link');
  if (invite.expiresAt < new Date()) throw new Error('This invite link has expired');

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
  });
  if (existingUser) {
    await prisma.workspaceInvite.delete({ where: { id: invite.id } });
    throw new Error('An account with this email already exists. Sign in and ask for a new invite.');
  }

  const user = await createUser({
    email: invite.email.toLowerCase(),
    password,
    fullName: fullName?.trim() || undefined,
    role: 'member',
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: 'member',
    },
  });

  await prisma.workspaceInvite.delete({ where: { id: invite.id } });

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName ?? null,
    workspaceId: invite.workspaceId,
  };
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function getInviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d;
}
