/**
 * Agent actions: CRUD and list. Actions let the agent call APIs, search the web, collect leads, etc.
 */

import { prisma } from '../../db/prisma.js';
import { Prisma } from '@prisma/client';

export const ACTION_TYPES = [
  'custom_api',
  'web_search',
  'collect_leads',
  'escalate',
  'calendly',
  'cal_com',
  'shopify',
  'stripe',
  'salesforce',
  'slack',
  'custom_button',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface AgentActionRow {
  id: number;
  agentId: number;
  workspaceId: number;
  type: string;
  name: string;
  description: string | null;
  enabled: boolean;
  config: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listActions(agentId: number, workspaceId: number): Promise<AgentActionRow[]> {
  const rows = await prisma.agentAction.findMany({
    where: { agentId, workspaceId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    workspaceId: r.workspaceId,
    type: r.type,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    config: r.config,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function createAction(
  agentId: number,
  workspaceId: number,
  data: { type: string; name: string; description?: string | null; enabled?: boolean; config?: unknown; sortOrder?: number }
): Promise<AgentActionRow> {
  if (!ACTION_TYPES.includes(data.type as ActionType)) {
    throw new Error(`Invalid action type: ${data.type}`);
  }
  const maxOrder = await prisma.agentAction
    .aggregate({
      where: { agentId },
      _max: { sortOrder: true },
    })
    .then((r) => r._max.sortOrder ?? -1);
  const sortOrder = data.sortOrder ?? maxOrder + 1;

  const row = await prisma.agentAction.create({
    data: {
      agentId,
      workspaceId,
      type: data.type,
      name: data.name.trim() || 'Unnamed action',
      description: data.description?.trim() || null,
      enabled: data.enabled ?? true,
      config: (data.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      sortOrder,
    },
  });
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    type: row.type,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    config: row.config,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateAction(
  actionId: number,
  agentId: number,
  workspaceId: number,
  data: { name?: string; description?: string | null; enabled?: boolean; config?: unknown; sortOrder?: number }
): Promise<AgentActionRow | null> {
  const existing = await prisma.agentAction.findFirst({
    where: { id: actionId, agentId, workspaceId },
  });
  if (!existing) return null;

  const update: Prisma.AgentActionUpdateInput = {};
  if (data.name !== undefined) update.name = data.name.trim() || 'Unnamed action';
  if (data.description !== undefined) update.description = data.description?.trim() || null;
  if (data.enabled !== undefined) update.enabled = data.enabled;
  if (data.config !== undefined) update.config = (data.config as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;

  const row = await prisma.agentAction.update({
    where: { id: actionId },
    data: update,
  });
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    type: row.type,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    config: row.config,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteAction(actionId: number, agentId: number, workspaceId: number): Promise<boolean> {
  const result = await prisma.agentAction.deleteMany({
    where: { id: actionId, agentId, workspaceId },
  });
  return result.count > 0;
}

/** Get enabled custom_api actions for an agent (for chat tool calling). */
export async function getEnabledCustomApiActions(agentId: number): Promise<AgentActionRow[]> {
  const rows = await prisma.agentAction.findMany({
    where: { agentId, type: 'custom_api', enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    workspaceId: r.workspaceId,
    type: r.type,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    config: r.config,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}
