import { prisma } from '../../db/prisma.js';
import { Prisma } from '@prisma/client';

export interface LogAuditInput {
  workspaceId?: number | null;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  outcome?: 'success' | 'failure';
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(input: LogAuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      outcome: input.outcome ?? 'success',
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function listWorkspaceAuditLogs(
  workspaceId: number,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    actorUserId?: number;
  }
) {
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const offset = Math.max(0, options?.offset ?? 0);

  const where: any = { workspaceId };
  if (options?.action) where.action = options.action;
  if (typeof options?.actorUserId === 'number') where.actorUserId = options.actorUserId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, limit, offset };
}

