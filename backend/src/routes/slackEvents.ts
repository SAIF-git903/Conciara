/**
 * Slack Events API handler.
 * Uses a single ConversaTree Slack app: SLACK_SIGNING_SECRET verifies all events.
 * OAuth callback stores bot token per agent; no user-supplied token or signing secret.
 * Must be mounted with express.raw({ type: 'application/json' }) for POST /events so raw body is available.
 */

import crypto from 'crypto';
import express from 'express';
import { prisma } from '../db/prisma.js';
import { getAgentReply } from './workspaces.js';

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || '';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

function verifySlackSignature(
  rawBody: Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  signingSecret: string
): boolean {
  if (!signingSecret || !signature || !timestamp) return false;
  const base = `v0:${timestamp}:${rawBody.toString('utf8')}`;
  const expected = 'v0=' + crypto.createHmac('sha256', signingSecret).update(base).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

/** Convert common markdown to Slack mrkdwn so replies render properly (bold, links, lists). */
function markdownToSlackMrkdwn(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return (
    text
      // Markdown links [label](url) → Slack <url|label> (do first so we don't touch brackets inside)
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<$2|$1>')
      // Bold: **word** or __word__ → *word*
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      .replace(/__(.+?)__/g, '_$1_')
      // List items: ensure leading bullet for lines that start with "- " (Slack renders • or - as bullets)
      .replace(/^\s*-\s+/gm, '• ')
      // Trim trailing whitespace per line for cleaner appearance
      .replace(/[ \t]+$/gm, '')
      .trim()
  );
}

const router = express.Router();

/** OAuth callback: Slack redirects here with code + state. Exchange code, store integration, redirect to dashboard. */
router.get('/oauth/callback', async (req: express.Request, res: express.Response) => {
  const { code, state, error } = req.query;
  const redirectTo = `${FRONTEND_URL}/dashboard/connected-apps/slack`;
  if (error) {
    res.redirect(redirectTo + '?slack=denied');
    return;
  }
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const stateSecret = process.env.JWT_SECRET || process.env.SLACK_OAUTH_STATE_SECRET || 'slack-oauth-state';
  const [payloadB64, sig] = state.split('.');
  if (!payloadB64 || !sig) {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  let payload: { workspaceId?: number; agentId?: number; userId?: number; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const expectedSig = crypto.createHmac('sha256', stateSecret).update(payloadB64).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8')) || (payload.exp != null && Date.now() / 1000 > payload.exp)) {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const { workspaceId, agentId } = payload;
  if (typeof workspaceId !== 'number' || typeof agentId !== 'number') {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URI) {
    console.error('[Slack] OAuth callback: missing SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, or SLACK_REDIRECT_URI');
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: SLACK_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    ok?: boolean;
    access_token?: string;
    bot_user_id?: string;
    team?: { id?: string; name?: string };
    error?: string;
  };
  if (!tokenRes.ok || !tokenData.ok || !tokenData.access_token) {
    console.error('[Slack] OAuth token exchange failed:', tokenData.error || tokenRes.statusText);
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, workspaceId },
    select: { id: true, integrations: true },
  } as { where: { id: number; workspaceId: number }; select: { id: true; integrations: true } });
  if (!agent) {
    res.redirect(redirectTo + '?slack=error');
    return;
  }
  const current = (agent as { integrations?: unknown }).integrations as Record<string, unknown> | null | undefined;
  const integrations = current ?? {};
  const updated = {
    ...integrations,
    slack: {
      accessToken: tokenData.access_token,
      teamId: tokenData.team?.id ?? '',
      teamName: tokenData.team?.name ?? undefined,
      botUserId: tokenData.bot_user_id,
    },
  };
  await prisma.agent.update({
    where: { id: agentId },
    data: { integrations: updated },
  });
  res.redirect(redirectTo + '?slack=success');
});

router.post('/events', async (req: express.Request, res: express.Response) => {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).send('Bad request');
  }
  const signature = req.headers['x-slack-signature'] as string | undefined;
  const timestamp = req.headers['x-slack-request-timestamp'] as string | undefined;
  const ts = parseInt(timestamp || '0', 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return res.status(401).send('Request too old');
  }

  let payload: { type?: string; challenge?: string; team_id?: string; event?: { type?: string; text?: string; channel?: string; user?: string; bot_id?: string; subtype?: string; channel_type?: string } };
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  if (payload.type === 'url_verification') {
    if (!SLACK_SIGNING_SECRET) {
      console.warn('[Slack] url_verification: SLACK_SIGNING_SECRET is not set');
      return res.status(401).send('Invalid signature');
    }
    if (!verifySlackSignature(rawBody, signature, timestamp, SLACK_SIGNING_SECRET)) {
      return res.status(401).send('Invalid signature');
    }
    return res.json({ challenge: payload.challenge });
  }

  if (payload.type !== 'event_callback') {
    return res.status(200).send();
  }

  const teamId = payload.team_id;
  if (!teamId) {
    return res.status(200).send();
  }

  const agents = await prisma.agent.findMany({
    select: { id: true, workspaceId: true, prePrompt: true, model: true, role: true, integrations: true },
  } as { select: { id: true; workspaceId: true; prePrompt: true; model: true; role: true; integrations: true } });
  type AgentWithIntegrations = (typeof agents)[number] & { integrations?: { slack?: { teamId?: string; accessToken?: string; botUserId?: string } } | null };
  const agent = (agents as AgentWithIntegrations[]).find((a) => {
    const integrations = a.integrations as { slack?: { teamId?: string; accessToken?: string } } | null;
    return integrations?.slack?.teamId === teamId;
  });
  if (!agent) {
    console.warn('[Slack] event_callback: no agent connected for team_id', teamId);
    return res.status(200).send();
  }

  const slackConfig = ((agent as AgentWithIntegrations).integrations as { slack?: { accessToken?: string; botUserId?: string } } | null)?.slack;
  if (!slackConfig?.accessToken) {
    console.warn('[Slack] event_callback: agent', (agent as { id: number }).id, 'has no Slack accessToken for team_id', teamId);
    return res.status(200).send();
  }
  if (!SLACK_SIGNING_SECRET || !verifySlackSignature(rawBody, signature, timestamp, SLACK_SIGNING_SECRET)) {
    console.warn('[Slack] event_callback signature verification failed for team_id', teamId);
    return res.status(401).send('Invalid signature');
  }

  const event = payload.event;
  if (!event || event.type !== 'message') {
    return res.status(200).send();
  }
  if (event.bot_id || event.subtype) {
    return res.status(200).send();
  }

  const channel = event.channel;
  const text = (event.text || '').trim();
  if (!channel || !text) {
    return res.status(200).send();
  }
  const accessToken = slackConfig?.accessToken;
  const botUserId = slackConfig?.botUserId;
  if (!accessToken) {
    return res.status(200).send();
  }

  const isMention = botUserId && text.includes(`<@${botUserId}>`);
  const isDm = event.channel_type === 'im';
  if (!isMention && !isDm) {
    return res.status(200).send();
  }

  const userMessage = isMention && botUserId ? text.replace(new RegExp(`<@${botUserId}>\\s*`, 'gi'), '').trim() : text;
  const messageToReply = userMessage || 'Hi'; // treat empty @mention as "Hi" so we still reply
  console.log('[Slack] replying for team_id', teamId, 'agent', (agent as { id: number }).id, 'channel', channel);

  res.status(200).send();

  let reply: string;
  try {
    reply = await getAgentReply(agent, messageToReply);
  } catch (err) {
    console.error('[Slack] getAgentReply error:', err);
    reply = 'Sorry, I had trouble answering that. Please try again.';
  }

  const slackText = markdownToSlackMrkdwn(reply);
  try {
    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: slackText,
        mrkdwn: true,
        thread_ts: (event as { thread_ts?: string }).thread_ts || undefined,
      }),
    });
    const postData = (await postRes.json()) as { ok?: boolean; error?: string };
    if (!postRes.ok || !postData.ok) {
      console.error('[Slack] chat.postMessage failed:', postData.error || postRes.statusText, 'channel', channel);
    }
  } catch (err) {
    console.error('[Slack] chat.postMessage request error:', err);
  }
});

export default router;
