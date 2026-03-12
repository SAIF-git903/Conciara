/**
 * Paddle Billing webhook handler: subscription.* and transaction.completed.
 * Uses @paddle/paddle-node-sdk webhooks.unmarshal() for verification when not skipping.
 * Raw body required (express.raw({ type: 'application/json' }) on the route).
 */

import express from 'express';
import { Paddle } from '@paddle/paddle-node-sdk';
import { prisma } from '../../../db/prisma.js';
import { resetPeriod } from '../../billing/credits.service.js';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
const PADDLE_ENABLED = !!PADDLE_WEBHOOK_SECRET;
const PADDLE_WEBHOOK_SKIP_VERIFY =
  process.env.PADDLE_WEBHOOK_SKIP_VERIFY === '1' || process.env.PADDLE_WEBHOOK_SKIP_VERIFY === 'true';

const PADDLE_API_BASE =
  process.env.PADDLE_API_BASE_URL ||
  (PADDLE_API_KEY.includes('sdbx_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com');

const paddle = new Paddle(PADDLE_API_KEY || 'dummy-key-for-webhook-only');

/** Fetch customer email from Paddle API (for linking subscription when custom_data is missing, e.g. Hosted Checkout). */
async function getPaddleCustomerEmail(customerId: string): Promise<string | null> {
  if (!PADDLE_API_KEY) return null;
  try {
    const res = await fetch(`${PADDLE_API_BASE}/customers/${encodeURIComponent(customerId)}`, {
      headers: { Authorization: `Bearer ${PADDLE_API_KEY}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { email?: string } };
    return json?.data?.email ?? null;
  } catch {
    return null;
  }
}

/** Fetch subscription by ID from Paddle API (for syncing when we receive transaction.completed before subscription.created). */
async function fetchPaddleSubscriptionById(subscriptionId: string): Promise<PaddleSubscriptionData | null> {
  if (!PADDLE_API_KEY) return null;
  try {
    const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${PADDLE_API_KEY}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Record<string, unknown> };
    const raw = json?.data;
    if (!raw?.id) return null;
    return normalizeSubscriptionData(raw);
  } catch {
    return null;
  }
}

/** Normalize subscription payload to our shape. Paddle raw webhooks use snake_case; SDK uses camelCase — accept both. */
function normalizeSubscriptionData(d: Record<string, unknown>): PaddleSubscriptionData {
  const customerId = (d.customerId ?? d.customer_id) as string | undefined;
  const customData = (d.customData ?? d.custom_data) as PaddleSubscriptionData['custom_data'];
  const currentBillingPeriod = (d.currentBillingPeriod ?? d.current_billing_period) as
    | { startsAt?: string; endsAt?: string; starts_at?: string; ends_at?: string }
    | null
    | undefined;
  const billingCycle = (d.billingCycle ?? d.billing_cycle) as
    | { interval?: string; frequency?: number }
    | null
    | undefined;
  const scheduledChange = (d.scheduledChange ?? d.scheduled_change) as { action?: string } | null | undefined;
  const items = (d.items ?? []) as Array<Record<string, unknown>>;
  return {
    id: String(d.id ?? ''),
    status: String(d.status ?? ''),
    customer_id: customerId ?? '',
    custom_data: customData ?? null,
    current_billing_period:
      currentBillingPeriod != null
        ? {
            starts_at: currentBillingPeriod.startsAt ?? currentBillingPeriod.starts_at ?? '',
            ends_at: currentBillingPeriod.endsAt ?? currentBillingPeriod.ends_at ?? '',
          }
        : null,
    billing_cycle:
      billingCycle != null
        ? { interval: billingCycle.interval ?? 'month', frequency: billingCycle.frequency ?? 1 }
        : null,
    scheduled_change: scheduledChange ?? null,
    items:
      items?.map((item) => {
        const priceObj = item?.price as { id?: string } | undefined;
        const priceId = priceObj?.id ?? (item?.price_id as string | undefined);
        return { price: priceId != null ? { id: priceId } : undefined };
      }) ?? [],
  };
}

function normalizeTransactionData(d: Record<string, unknown>): PaddleTransactionData {
  const details = d.details as { totals?: { total?: string } } | undefined;
  const totals = details?.totals;
  const amountCents = totals?.total != null ? parseInt(String(totals.total), 10) : undefined;
  const subscriptionId = (d.subscriptionId ?? d.subscription_id) as string | null | undefined;
  const currencyCode = (d.currencyCode ?? d.currency_code) as string | undefined;
  return {
    id: String(d.id ?? ''),
    subscription_id: subscriptionId ?? null,
    currency_code: currencyCode ?? undefined,
    amount_cents: Number.isNaN(amountCents as number) ? undefined : amountCents,
  };
}

/** Paddle subscription data (subset we use) */
interface PaddleSubscriptionData {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: { workspace_id?: string; workspaceId?: number } | null;
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  billing_cycle?: { interval: string; frequency: number } | null;
  scheduled_change?: { action?: string } | null;
  items?: Array<{ price?: { id: string } }>;
}

/** Paddle transaction data (subset we use) */
interface PaddleTransactionData {
  id: string;
  subscription_id?: string | null;
  currency_code?: string;
  amount_cents?: number;
}

/**
 * Resolve workspace ID from subscription (custom_data or customer email), then upsert WorkspaceSubscription
 * and update workspace.plan. Returns workspaceId on success, null otherwise.
 */
async function applySubscriptionToWorkspace(sub: PaddleSubscriptionData): Promise<number | null> {
  let workspaceIdRaw = sub.custom_data?.workspace_id ?? sub.custom_data?.workspaceId;
  let workspaceId = typeof workspaceIdRaw === 'string' ? parseInt(workspaceIdRaw, 10) : workspaceIdRaw;
  if (workspaceId == null || Number.isNaN(workspaceId)) {
    if (!PADDLE_API_KEY) {
      // cannot resolve by email without PADDLE_API_KEY
    } else if (!sub.customer_id) {
      // cannot resolve by email
    } else {
      const email = await getPaddleCustomerEmail(sub.customer_id);
      if (!email) {
        // could not fetch customer email
      } else {
        const emailKey = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email: emailKey },
          select: { id: true },
        });
        if (!user) {
          // no user with matching email
        } else {
          const checkoutContext = await prisma.checkoutContext.findUnique({
            where: { userEmail: emailKey },
          });
          const now = new Date();
          if (checkoutContext && checkoutContext.expiresAt > now) {
            workspaceId = checkoutContext.workspaceId;
            await prisma.checkoutContext.delete({
              where: { userEmail: emailKey },
            }).catch(() => {});
          } else {
          // Find the best workspace to associate with this subscription
          // Priority: workspace without active subscription > most recently updated
          const workspaces = await prisma.workspace.findMany({
            where: { ownerId: user.id },
            select: { 
              id: true, 
              updatedAt: true,
              subscription: {
                select: { 
                  id: true, 
                  status: true,
                  planId: true,
                  plan: { select: { name: true } }
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
          });
          if (workspaces.length === 0) {
            // user has no workspace
          } else if (workspaces.length === 1) {
            workspaceId = workspaces[0].id;
          } else {
            const workspaceWithoutPaidSub = workspaces.find(w =>
              !w.subscription ||
              w.subscription.status !== 'active' ||
              w.subscription.plan?.name === 'free'
            );
            workspaceId = workspaceWithoutPaidSub?.id ?? workspaces[0].id;
          }
          }
        }
      }
    }
  }
  if (workspaceId == null || Number.isNaN(workspaceId)) {
    return null;
  }

  let priceId = sub.items?.[0]?.price?.id as string | undefined;
  if (!priceId && Array.isArray(sub.items) && sub.items.length > 0) {
    const first = sub.items[0] as { price_id?: string; price?: { id?: string } };
    priceId = first?.price?.id ?? first?.price_id;
  }
  if (!priceId) {
    return null;
  }
  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { paddlePriceIdMonthly: priceId },
        { paddlePriceIdYearly: priceId },
      ],
    },
  });
  if (!plan) {
    return null;
  }
  const planId = plan.id;
  const interval = sub.billing_cycle?.interval === 'month' ? 'monthly' : 'yearly';
  const period = sub.current_billing_period;
  const start = period?.starts_at ? new Date(period.starts_at) : new Date();
  const end = period?.ends_at ? new Date(period.ends_at) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.workspaceSubscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      planId,
      paddleCustomerId: sub.customer_id,
      paddleSubscriptionId: sub.id,
      status: sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active',
      billingCycle: interval,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
    update: {
      planId,
      paddleCustomerId: sub.customer_id,
      paddleSubscriptionId: sub.id,
      status: sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active',
      billingCycle: interval,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
  });
  const planName = plan.name;
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan: planName },
  });
  await resetPeriod(workspaceId);
  return workspaceId;
}

export async function handlePaddleWebhook(req: express.Request, res: express.Response): Promise<void> {
  const sig = (req.headers['paddle-signature'] as string) || '';
  res.status(200).send('OK');

  if (!PADDLE_ENABLED) {
    return;
  }
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return;
  }
  let eventType: string;
  let data: PaddleSubscriptionData | PaddleTransactionData;

  if (PADDLE_WEBHOOK_SKIP_VERIFY) {
    let payload: { event_type?: string; data?: Record<string, unknown> };
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return;
    }
    eventType = payload.event_type ?? '';
    const raw = payload.data;
    if (eventType.startsWith('subscription.')) {
      data = normalizeSubscriptionData((raw ?? {}) as Record<string, unknown>);
    } else if (eventType === 'transaction.completed' && raw) {
      data = normalizeTransactionData((raw as Record<string, unknown>) ?? {});
    } else {
      data = (raw ?? {}) as unknown as PaddleSubscriptionData | PaddleTransactionData;
    }
  } else {
    if (!sig) {
      return;
    }
    const rawRequestBody = rawBody.toString('utf8');
    try {
      const eventData = await paddle.webhooks.unmarshal(rawRequestBody, PADDLE_WEBHOOK_SECRET, sig);
      eventType = eventData.eventType;
      const rawData = eventData.data as unknown as Record<string, unknown>;
      if (eventType.startsWith('subscription.')) {
        data = normalizeSubscriptionData(rawData);
      } else if (eventType === 'transaction.completed') {
        data = normalizeTransactionData(rawData);
      } else {
        eventType = '';
        data = {} as PaddleSubscriptionData;
      }
    } catch {
      return;
    }
  }

  if (!eventType || !data) {
    return;
  }

  setImmediate(async () => {
    try {
    switch (eventType) {
      case 'subscription.created': {
        await applySubscriptionToWorkspace(data as PaddleSubscriptionData);
        break;
      }
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.resumed': {
        const sub = data as PaddleSubscriptionData;
        let workspaceSub = await prisma.workspaceSubscription.findFirst({
          where: { paddleSubscriptionId: sub.id },
          include: { plan: true },
        });
        if (!workspaceSub && (sub.status === 'active' || sub.status === 'trialing')) {
          const workspaceId = await applySubscriptionToWorkspace(sub);
          if (workspaceId != null) {
            workspaceSub = await prisma.workspaceSubscription.findFirst({
              where: { paddleSubscriptionId: sub.id },
              include: { plan: true },
            });
          }
        }
        if (workspaceSub) {
          const status = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'canceled';
          const period = sub.current_billing_period;
          const currentPeriodStart = period?.starts_at ? new Date(period.starts_at) : workspaceSub.currentPeriodStart;
          const currentPeriodEnd = period?.ends_at ? new Date(period.ends_at) : workspaceSub.currentPeriodEnd;
          await prisma.workspaceSubscription.update({
            where: { id: workspaceSub.id },
            data: {
              status,
              cancelAtPeriodEnd: sub.scheduled_change?.action === 'cancel',
              currentPeriodStart,
              currentPeriodEnd,
              updatedAt: new Date(),
            },
          });
          const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceSub.workspaceId },
            select: { id: true },
          });
          if (workspace) {
            const planName = status === 'active' || status === 'trialing' ? workspaceSub.plan.name : 'free';
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: { plan: planName },
            });
          }
        }
        break;
      }
      case 'subscription.canceled': {
        const sub = data as PaddleSubscriptionData;
        const workspaceSub = await prisma.workspaceSubscription.findFirst({
          where: { paddleSubscriptionId: sub.id },
          include: { plan: true },
        });
        if (workspaceSub) {
          await prisma.workspaceSubscription.update({
            where: { id: workspaceSub.id },
            data: { status: 'canceled', updatedAt: new Date() },
          });
          await prisma.workspace.update({
            where: { id: workspaceSub.workspaceId },
            data: { plan: 'free' },
          });
        }
        break;
      }
      case 'subscription.past_due': {
        const sub = data as PaddleSubscriptionData;
        await prisma.workspaceSubscription.updateMany({
          where: { paddleSubscriptionId: sub.id },
          data: { status: 'past_due', updatedAt: new Date() },
        });
        break;
      }
      case 'transaction.completed': {
        const txn = data as PaddleTransactionData;
        const subscriptionId = txn.subscription_id;
        let workspaceId: number | null = null;

        if (subscriptionId) {
          let workspaceSub = await prisma.workspaceSubscription.findFirst({
            where: { paddleSubscriptionId: subscriptionId },
          });
          if (!workspaceSub && PADDLE_API_KEY) {
            const sub = await fetchPaddleSubscriptionById(subscriptionId);
            if (sub) {
              workspaceId = await applySubscriptionToWorkspace(sub);
              if (workspaceId != null) {
                workspaceSub = await prisma.workspaceSubscription.findFirst({
                  where: { paddleSubscriptionId: subscriptionId },
                });
              }
            }
          }
          if (workspaceSub) {
            workspaceId = workspaceSub.workspaceId;
            await resetPeriod(workspaceSub.workspaceId);
          }
        }

        if (workspaceId != null) {
          let retries = 3;
          while (retries > 0) {
            try {
              await prisma.workspaceBillingTransaction.upsert({
                where: {
                  workspaceId_paddleTransactionId: { workspaceId, paddleTransactionId: txn.id },
                },
                create: {
                  workspaceId,
                  paddleTransactionId: txn.id,
                  amountCents: txn.amount_cents ?? undefined,
                  currencyCode: txn.currency_code ?? undefined,
                  status: 'completed',
                },
                update: {
                  amountCents: txn.amount_cents ?? undefined,
                  currencyCode: txn.currency_code ?? undefined,
                  status: 'completed',
                },
              });
              break;
            } catch {
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }
        break;
      }
      default:
        break;
    }
    } catch {
      // webhook already acknowledged
    }
  });
}
