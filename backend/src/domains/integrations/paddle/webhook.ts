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
  } catch (e) {
    console.warn('[Paddle] fetchPaddleSubscriptionById failed:', (e as Error)?.message);
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
      console.warn(
        '[Paddle] Cannot link subscription: no workspace_id in custom_data and PADDLE_API_KEY is not set. ' +
          'Set PADDLE_API_KEY in .env (from Paddle Dashboard → Developer Tools → Authentication) so we can resolve by customer email (required for Hosted Checkout).'
      );
    } else if (!sub.customer_id) {
      console.warn('[Paddle] Subscription payload has no customer_id — cannot resolve by email.');
    } else {
      const email = await getPaddleCustomerEmail(sub.customer_id);
      if (!email) {
        console.warn('[Paddle] Could not fetch customer email from Paddle for customer_id=', sub.customer_id, '(check PADDLE_API_KEY and that it matches your Paddle environment, e.g. sandbox key for sandbox).');
      } else {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: { id: true },
        });
        if (!user) {
          console.warn(
            '[Paddle] No user in DB with email matching Paddle customer. ' +
              'Ensure you sign up / log in with the same email you use at Paddle checkout (' +
              email.replace(/(.{2})(.*)(@.*)/, '$1***$3') +
              ').'
          );
        } else {
          // First, check if we have stored checkout context for this email
          const checkoutContext = await prisma.checkoutContext.findUnique({
            where: { 
              userEmail: email.toLowerCase().trim(),
            },
          });

          if (checkoutContext && checkoutContext.expiresAt > new Date()) {
            workspaceId = checkoutContext.workspaceId;
            console.log('[Paddle] Linked by checkout context to workspaceId=', workspaceId);
            
            // Clean up the context after use
            await prisma.checkoutContext.delete({
              where: { userEmail: email.toLowerCase().trim() },
            }).catch(() => {}); // Ignore errors if already deleted
          } else {
          // Find the best workspace to associate with this subscription
          // Priority: workspace without active subscription > most recently updated
          const workspaces = await prisma.workspace.findMany({
            where: { ownerId: user.id },
            select: { 
              id: true, 
              updatedAt: true,
              workspaceSubscription: {
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
            console.warn('[Paddle] User found but has no workspace.');
          } else if (workspaces.length === 1) {
            workspaceId = workspaces[0].id;
            console.log('[Paddle] Linked by customer email to workspaceId=', workspaceId, '(only workspace)');
          } else {
            // Multiple workspaces - prefer one without active paid subscription
            const workspaceWithoutPaidSub = workspaces.find(w => 
              !w.workspaceSubscription || 
              w.workspaceSubscription.status !== 'active' ||
              w.workspaceSubscription.plan?.name === 'free'
            );
            
            if (workspaceWithoutPaidSub) {
              workspaceId = workspaceWithoutPaidSub.id;
              console.log('[Paddle] Linked by customer email to workspaceId=', workspaceId, '(workspace without active paid subscription)');
            } else {
              // All workspaces have active subscriptions, use most recently updated
              workspaceId = workspaces[0].id;
              console.log('[Paddle] Linked by customer email to workspaceId=', workspaceId, '(most recently updated, all have subscriptions)');
            }
          }
          }
        }
      }
    }
  }
  if (workspaceId == null || Number.isNaN(workspaceId)) {
    console.warn('[Paddle] No workspace_id in custom_data and could not resolve by customer email — subscription not linked.');
    return null;
  }

  const priceId = sub.items?.[0]?.price?.id;
  if (!priceId) {
    console.warn('[Paddle] Subscription has no price ID in items[0] — cannot map to plan. Payload items may use price_id or price.id.');
  }
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
  if (priceId && !plan) {
    console.warn('[Paddle] No plan in DB for price_id=', priceId, '— run seed-plans and ensure Paddle price IDs match.');
  }
  const planId = plan?.id ?? (await prisma.plan.findUnique({ where: { name: 'free' } }))?.id;
  if (!planId) return null;

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
  console.log('[Paddle] Updated workspace', workspaceId, 'to plan:', planName);
  await resetPeriod(workspaceId);
  return workspaceId;
}

export async function handlePaddleWebhook(req: express.Request, res: express.Response): Promise<void> {
  // Return 200 immediately to acknowledge receipt
  res.status(200).send('OK');
  
  if (!PADDLE_ENABLED) {
    console.warn('[Paddle] Webhook received but Paddle not configured (missing PADDLE_WEBHOOK_SECRET)');
    return;
  }
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    console.error('[Paddle] Webhook received non-buffer body');
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
    let payload: { event_type?: string; data?: Record<string, unknown> };
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).send('Invalid JSON');
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
        data = normalizeSubscriptionData(rawData);
      } else if (eventType === 'transaction.completed') {
        data = normalizeTransactionData(rawData);
      } else {
        eventType = '';
        data = {} as PaddleSubscriptionData;
      }
    } catch (e) {
      console.error('[Paddle] Webhook signature verification failed:', (e as Error)?.message);
      console.error(
        '[Paddle] Check PADDLE_WEBHOOK_SECRET (Developer Tools → Notifications → your URL → Secret key). For local ngrok testing you can set PADDLE_WEBHOOK_SKIP_VERIFY=1'
      );
      return;
    }
  }

  if (!eventType || !data) {
    console.log('[Paddle] Webhook received but no event type or data');
    return;
  }
  console.log('[Paddle] Processing webhook:', eventType);
  
  // Process webhook in background to avoid timeout
  setImmediate(async () => {
    try {
    switch (eventType) {
      case 'subscription.created': {
        const workspaceId = await applySubscriptionToWorkspace(data as PaddleSubscriptionData);
        console.log('[Paddle] Subscription created for workspace:', workspaceId);
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
          // Record billing transaction with retry logic
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
              console.log('[Paddle] Billing transaction recorded:', txn.id, 'for workspace', workspaceId);
              break;
            } catch (e) {
              retries--;
              console.warn('[Paddle] Failed to record billing transaction (retries left:', retries, '):', (e as Error)?.message);
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              }
            }
          }
        }
        break;
      }
      default:
        console.log('[Paddle] Unhandled event type:', eventType);
        break;
    }
    console.log('[Paddle] Webhook processed successfully:', eventType);
    } catch (err) {
      console.error('[Paddle] Webhook handler error:', err);
      // Don't throw - webhook already acknowledged
    }
  });
}
