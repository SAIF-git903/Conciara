import { prisma } from '../../db/prisma.js';
import { sendEmail } from '../../shared/email.service.js';
import { Prisma } from '@prisma/client';

type Audience = 'owners' | 'members' | 'all' | 'userIds';

export interface DispatchWorkspaceNotificationInput {
  workspaceId: number;
  actorUserId?: number;
  eventType: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  audience?: Audience;
  userIds?: number[];
  excludeActor?: boolean;
  defaultEmailEnabled?: boolean;
  emailSubject?: string;
}

function resolveAudienceUsers(
  memberships: Array<{
    userId: number;
    role: string;
    user: { email: string; fullName: string | null };
  }>,
  audience: Audience,
  userIds: number[]
) {
  if (audience === 'all') return memberships;
  if (audience === 'owners') return memberships.filter((m) => m.role === 'owner');
  if (audience === 'members') return memberships.filter((m) => m.role === 'member');
  const set = new Set(userIds);
  return memberships.filter((m) => set.has(m.userId));
}

export async function dispatchWorkspaceNotification(input: DispatchWorkspaceNotificationInput): Promise<void> {
  const audience = input.audience ?? 'all';
  const targetUserIds = input.userIds ?? [];
  const excludeActor = input.excludeActor ?? true;
  const defaultEmailEnabled = input.defaultEmailEnabled ?? false;

  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId: input.workspaceId },
    include: { user: { select: { email: true, fullName: true } } },
  });
  if (memberships.length === 0) return;

  const scoped = resolveAudienceUsers(memberships, audience, targetUserIds).filter((m) => {
    if (!excludeActor) return true;
    if (!input.actorUserId) return true;
    return m.userId !== input.actorUserId;
  });
  if (scoped.length === 0) return;

  const preferences = await prisma.notificationPreference.findMany({
    where: {
      workspaceId: input.workspaceId,
      userId: { in: scoped.map((s) => s.userId) },
      eventType: input.eventType,
    },
  });
  const prefMap = new Map(preferences.map((p) => [`${p.userId}:${p.eventType}`, p]));

  const inAppRows = scoped
    .filter((recipient) => {
      const pref = prefMap.get(`${recipient.userId}:${input.eventType}`);
      return pref ? pref.inAppEnabled : true;
    })
    .map((recipient) => ({
      workspaceId: input.workspaceId,
      userId: recipient.userId,
      eventType: input.eventType,
      title: input.title,
      message: input.message,
      data: (input.data as Prisma.InputJsonValue | undefined) ?? undefined,
    }));

  if (inAppRows.length > 0) {
    await prisma.notification.createMany({ data: inAppRows });
  }

  const emailRecipients = scoped.filter((recipient) => {
    const pref = prefMap.get(`${recipient.userId}:${input.eventType}`);
    return pref ? pref.emailEnabled : defaultEmailEnabled;
  });

  if (emailRecipients.length > 0) {
    await Promise.allSettled(emailRecipients.map((recipient) => (
      sendEmail({
        to: recipient.user.email,
        subject: input.emailSubject || input.title,
        text: input.message,
      })
    )));
  }
}

export async function listUserWorkspaceNotifications(
  workspaceId: number,
  userId: number,
  options?: { unreadOnly?: boolean; limit?: number; offset?: number }
) {
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const offset = Math.max(0, options?.offset ?? 0);

  const where: any = { workspaceId, userId };
  if (options?.unreadOnly) where.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { workspaceId, userId, isRead: false } }),
  ]);

  return { items, total, unreadCount, limit, offset };
}

export async function markNotificationRead(workspaceId: number, userId: number, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, workspaceId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(workspaceId: number, userId: number) {
  return prisma.notification.updateMany({
    where: { workspaceId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function listNotificationPreferences(workspaceId: number, userId: number) {
  return prisma.notificationPreference.findMany({
    where: { workspaceId, userId },
    orderBy: { eventType: 'asc' },
  });
}

export async function upsertNotificationPreference(
  workspaceId: number,
  userId: number,
  eventType: string,
  inAppEnabled: boolean,
  emailEnabled: boolean
) {
  return prisma.notificationPreference.upsert({
    where: { workspaceId_userId_eventType: { workspaceId, userId, eventType } },
    update: { inAppEnabled, emailEnabled },
    create: { workspaceId, userId, eventType, inAppEnabled, emailEnabled },
  });
}

export async function cleanupReadNotifications(olderThanDays: number): Promise<number> {
  const safeDays = Number.isFinite(olderThanDays) && olderThanDays > 0 ? Math.floor(olderThanDays) : 30;
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: { not: null, lt: cutoff },
    },
  });
  return result.count;
}

