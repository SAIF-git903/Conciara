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
  } catch (e) {
    console.warn('[Paddle] getPaddleCustomerEmail failed:', (e as Error)?.message);
    return null;
  }
}

/** SDK returns camelCase; normalize to the shape our handlers expect (snake_case). */
function normalizeSubscriptionData(d: {
  id: string;
  status: string;
  customerId: string;
  customData?: Record<string, unknown> | null;
  currentBillingPeriod?: { startsAt: string; endsAt: string } | null;
  billingCycle?: { interval: string; frequency: number } | null;
  scheduledChange?: { action: string } | null;
  items?: Array<{ price?: { id: string } | null }>;
}): PaddleSubscriptionData {
  return {
    id: d.id,
    status: d.status,
    customer_id: d.customerId,
    custom_data: d.customData as PaddleSubscriptionData['custom_data'],
    current_billing_period: d.currentBillingPeriod
      ? { starts_at: d.currentBillingPeriod.startsAt, ends_at: d.currentBillingPeriod.endsAt }
      : null,
    billing_cycle: d.billingCycle ? { interval: d.billingCycle.interval, frequency: d.billingCycle.frequency } : null,
    scheduled_change: d.scheduledChange ?? null,
    items: d.items?.map((item) => ({ price: item.price ? { id: item.price.id } : undefined })) ?? [],
  };
}

function normalizeTransactionData(d: { id: string; subscriptionId?: string | null }): PaddleTransactionData {
  return { id: d.id, subscription_id: d.subscriptionId ?? null };
}

/** Paddle subscription data (subset we use) */
interface PaddleSubscriptionData {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: { workspace_id?: string; workspaceId?: number } | null;
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  billing_cycle?: { interval: string; frequency: number } | null;
  scheduled_change?: { action: string } | null;
  items?: Array<{ price?: { id: string } }>;
}

/** Paddle transaction data (subset we use) */
interface PaddleTransactionData {
  id: string;
  subscription_id?: string | null;
}

export async function handlePaddleWebhook(req: express.Request, res: express.Response): Promise<void> {
  if (!PADDLE_ENABLED) {
    res.status(503).send('Paddle not configured');
    return;
  }
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).send('Bad request');
    return;
  }
  const sig = (req.headers['paddle-signature'] as string) || '';
  let eventType: string;
  let data: PaddleSubscriptionData | PaddleTransactionData;

  if (PADDLE_WEBHOOK_SKIP_VERIFY) {
    if (!sig) {
      console.warn('[Paddle] Webhook skip-verify is ON but no Paddle-Signature header present');
    } else {
      console.warn('[Paddle] Webhook signature verification SKIPPED (PADDLE_WEBHOOK_SKIP_VERIFY). Use only for local testing.');
    }
    let payload: { event_type?: string; data?: PaddleSubscriptionData | PaddleTransactionData };
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).send('Invalid JSON');
      return;
    }
    eventType = payload.event_type ?? '';
    data = payload.data as PaddleSubscriptionData | PaddleTransactionData;
  } else {
    if (!sig) {
      console.error('[Paddle] Webhook missing Paddle-Signature header');
      res.status(400).send('Invalid signature');
      return;
    }
    const rawRequestBody = rawBody.toString('utf8');
    try {
      const eventData = await paddle.webhooks.unmarshal(rawRequestBody, PADDLE_WEBHOOK_SECRET, sig);
      eventType = eventData.eventType;
      const rawData = eventData.data as unknown as Record<string, unknown>;
      if (eventType.startsWith('subscription.')) {
        data = normalizeSubscriptionData(rawData as Parameters<typeof normalizeSubscriptionData>[0]);
      } else if (eventType === 'transaction.completed') {
        data = normalizeTransactionData(rawData as { id: string; subscriptionId?: string | null });
      } else {
        eventType = '';
        data = {} as PaddleSubscriptionData;
      }
    } catch (e) {
      console.error('[Paddle] Webhook signature verification failed:', (e as Error)?.message);
      console.error(
        '[Paddle] Check PADDLE_WEBHOOK_SECRET (Developer Tools → Notifications → your URL → Secret key). For local ngrok testing you can set PADDLE_WEBHOOK_SKIP_VERIFY=1'
      );
      res.status(400).send('Invalid signature');
      return;
    }
  }

  if (!eventType || !data) {
    res.status(200).send();
    return;
  }
  console.log('[Paddle] Webhook received:', eventType);
  try {
    switch (eventType) {
      case 'subscription.created': {
        const sub = data as PaddleSubscriptionData;
        let workspaceIdRaw = sub.custom_data?.workspace_id ?? sub.custom_data?.workspaceId;
        let workspaceId = typeof workspaceIdRaw === 'string' ? parseInt(workspaceIdRaw, 10) : workspaceIdRaw;
        if (workspaceId == null || Number.isNaN(workspaceId)) {
          const email = await getPaddleCustomerEmail(sub.customer_id);
          if (email) {
            const user = await prisma.user.findUnique({
              where: { email: email.toLowerCase().trim() },
              select: { id: true },
            });
            if (user) {
              const workspace = await prisma.workspace.findFirst({
                where: { ownerId: user.id },
                orderBy: { updatedAt: 'desc' },
                select: { id: true },
              });
              if (workspace) {
                workspaceId = workspace.id;
                console.log('[Paddle] subscription.created: linked by email to workspaceId=', workspaceId);
              }
            }
          }
          if (workspaceId == null || Number.isNaN(workspaceId)) {
            console.warn('[Paddle] subscription.created: no workspace_id in custom_data and could not resolve by customer email');
            break;
          }
        }
        const priceId = sub.items?.[0]?.price?.id;
        const plan = priceId
          ? await prisma.plan.findFirst({
              where: {
                OR: [
                  { paddlePriceIdMonthly: priceId },
                  { paddlePriceIdYearly: priceId },
                ],
              },
            })
          : null;
        const planId = plan?.id ?? (await prisma.plan.findUnique({ where: { name: 'free' } }))?.id;
        if (!planId) break;
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
        const planName = plan?.name ?? 'free';
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { plan: planName },
        });
        break;
      }
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.resumed': {
        const sub = data as PaddleSubscriptionData;
        const workspaceSub = await prisma.workspaceSubscription.findFirst({
          where: { paddleSubscriptionId: sub.id },
          include: { plan: true },
        });
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
        if (subscriptionId) {
          const workspaceSub = await prisma.workspaceSubscription.findFirst({
            where: { paddleSubscriptionId: subscriptionId },
          });
          if (workspaceSub) {
            await resetPeriod(workspaceSub.workspaceId);
          }
        }
        break;
      }
      default:
        break;
    }
    res.status(200).send();
  } catch (err) {
    console.error('[Paddle] Webhook handler error:', err);
    res.status(500).send('Webhook handler error');
  }
}
