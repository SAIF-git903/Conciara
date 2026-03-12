/**
 * Socket.IO instance for server-side emit (e.g. agent training progress, credits).
 * Set from server.ts after creating the IO server.
 */

import type { Server } from 'socket.io';
import { getWorkspaceCredits } from '../domains/billing/credits.service.js';
import { getPlanForWorkspace } from '../domains/billing/plan.service.js';

let io: Server | null = null;

export function setSocketIo(server: Server): void {
  io = server;
}

export function getSocketIo(): Server | null {
  return io;
}

/** Room name for an agent's training progress subscribers. */
export function agentRoom(agentId: number): string {
  return `agent:${agentId}`;
}

/** Room name for workspace subscribers (e.g. real-time credits). */
export function workspaceRoom(workspaceId: number): string {
  return `workspace:${workspaceId}`;
}

/** Payload for credits-updated event (matches frontend CreditUsageWidget shape). */
export interface CreditsUpdatedPayload {
  workspaceId: number;
  monthlyAllowance: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  bonusCredits: number;
  totalAvailable: number;
  resetDate: string;
  plan: string;
}

/** Emit credits-updated to all sockets in the workspace room. Call after deduct/reset/addBonus. */
export async function emitCreditsUpdated(workspaceId: number): Promise<void> {
  const server = getSocketIo();
  if (!server) return;
  try {
    const [credits, plan] = await Promise.all([
      getWorkspaceCredits(workspaceId),
      getPlanForWorkspace(workspaceId),
    ]);
    const totalAvailable = credits.monthlyRemaining + credits.bonusCredits;
    const payload: CreditsUpdatedPayload = {
      workspaceId,
      monthlyAllowance: plan.messageCredits,
      monthlyUsed: credits.monthlyUsed,
      monthlyRemaining: credits.monthlyRemaining,
      bonusCredits: credits.bonusCredits,
      totalAvailable,
      resetDate: credits.resetDate.toISOString(),
      plan: plan.name,
    };
    server.to(workspaceRoom(workspaceId)).emit('credits-updated', payload);
  } catch {
    // Ignore; credits fetch can fail if workspace was deleted etc.
  }
}
