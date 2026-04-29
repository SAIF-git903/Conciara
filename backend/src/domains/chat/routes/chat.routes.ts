/**
 * Agent chat (message + stream) and exports for public embed / Slack.
 * Mounted under /api/workspaces (via agents aggregator).
 * When the agent has Custom API actions, uses tool calling and executes them before replying.
 */

import express from 'express';
import { ActionType } from '@prisma/client';
import { canManageAgent } from '../../agents/agent.service.js';
import { executeServerSideActionProxyRuntime } from '../../agents/routes/actions.routes.js';
import { prisma } from '../../../db/prisma.js';
import { chatCompletion, chatCompletionStream } from '../../../shared/llm.service.js';
import { retrieveChunks } from '../../training/services/rag.service.js';
import { retrieveQa, recordQaUsage } from '../../qa/qa.service.js';
import { createOrGetSession, appendMessage } from '../services/chatLog.service.js';
import {
  classifyIntent,
  isConversationalIntent,
  deriveSessionState,
} from '../services/intent.service.js';
import { buildAgentChatSystemContent } from '../chatHelpers.js';
import { getRemainingCredits, deductCredits } from '../../billing/credits.service.js';
import { getCreditsForModel } from '../../billing/model-credits.js';
import { emitCreditsUpdated } from '../../../socket/index.js';

const router = express.Router();

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** Coerce an arbitrary body value into a flat Record<string, string>, silently dropping non-string entries. */
function toSessionData(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    if (typeof raw === 'string') {
      out[key] = raw;
    } else if (typeof raw === 'number' || typeof raw === 'boolean') {
      out[key] = String(raw);
    }
  }
  return out;
}

function extractNumericCandidates(text: string): number[] {
  const matches = text.match(/-?\d+(\.\d+)?/g) ?? [];
  return matches
    .map((raw) => Number(raw))
    .filter((n) => Number.isFinite(n));
}

function inferCollectedInputsFromMessage(
  inputFields: Array<{ name: string; required: boolean; type: string }>,
  userMessage: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const nums = extractNumericCandidates(userMessage);
  const normalized = userMessage.trim();
  const lower = normalized.toLowerCase();
  const maybeYes = ['yes', 'true', 'y', 'ok'].includes(lower);
  const maybeNo = ['no', 'false', 'n'].includes(lower);

  for (const field of inputFields) {
    const fieldName = field.name.trim();
    if (!fieldName) continue;
    if (field.type === 'number') {
      if (nums.length > 0) {
        out[fieldName] = nums[0];
        continue;
      }
    } else if (field.type === 'boolean') {
      if (maybeYes) {
        out[fieldName] = true;
        continue;
      }
      if (maybeNo) {
        out[fieldName] = false;
        continue;
      }
    } else {
      if (normalized) {
        out[fieldName] = normalized;
        continue;
      }
    }
  }
  return out;
}

function hasAllRequiredInputs(
  inputFields: Array<{ name: string; required: boolean; type: string }>,
  collectedInputs: Record<string, unknown>
): boolean {
  const requiredFields = inputFields.filter((field) => field.required && field.name.trim());
  if (requiredFields.length === 0) return true;
  return requiredFields.every((field) => {
    const value = collectedInputs[field.name.trim()];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

function buildActionResultFallbackReply(params: {
  userMessage: string;
  collectedInputs: Record<string, unknown>;
  executionResult: { success: boolean; statusCode: number; responseBody: unknown };
}): string {
  const { collectedInputs, executionResult } = params;
  const firstInputValue = Object.values(collectedInputs)[0];
  const displayInput = firstInputValue !== undefined ? String(firstInputValue) : 'the provided value';
  const body = executionResult.responseBody;
  const prettyBody = typeof body === 'string' ? body : JSON.stringify(body, null, 2);

  if (!executionResult.success) {
    return `I tried checking details for ${displayInput}, but the request failed (status ${executionResult.statusCode}). Please try again or provide another product ID.`;
  }

  return `I checked the product details for ${displayInput}. Here is what we found:\n\n\`\`\`json\n${prettyBody}\n\`\`\``;
}

function responseStillAsksForInput(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /provide|confirm|specific/.test(lower) &&
    /product id|id/.test(lower)
  ) || /please hold|let me check|one moment|checking/.test(lower);
}

function responseClaimsNotFound(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /not found/.test(lower) ||
    /couldn'?t find/.test(lower) ||
    /don't have information/.test(lower) ||
    /do not have information/.test(lower) ||
    /not sure about that product/.test(lower)
  );
}

function responseBodyLooksLikeProduct(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const row = body as Record<string, unknown>;
  return typeof row.title === 'string' || typeof row.image === 'string' || typeof row.price === 'number';
}

async function tryHeuristicActionExecution(params: {
  agentId: number;
  userMessage: string;
  firstReply: string;
}): Promise<{ actionId: string; collectedInputs: Record<string, unknown> } | null> {
  const { agentId, userMessage, firstReply } = params;
  const hasNumericCandidate = extractNumericCandidates(userMessage).length > 0;
  const asksForId = /product id|order id|ticket id|provide.*id|confirm.*id/i.test(firstReply);
  const looksLikeInputMessage =
    /^\s*\d+(\.\d+)?\s*$/.test(userMessage) ||
    /product\s*id|id\s*is|order\s*id|ticket\s*id/i.test(userMessage) ||
    (hasNumericCandidate && /product|details|check|lookup/i.test(userMessage));
  const looksLikeHoldMessage =
    /please hold|let me check|i(?:'|’)ll check|one moment|checking/i.test(firstReply);
  if (!looksLikeInputMessage && !looksLikeHoldMessage && !(asksForId && hasNumericCandidate)) return null;

  const enabledServerActions = await prisma.action.findMany({
    where: {
      chatbotId: agentId,
      isEnabled: true,
      type: ActionType.CUSTOM_ACTION,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, config: true },
  });
  if (enabledServerActions.length !== 1) return null;

  const action = enabledServerActions[0];
  const config = toRecord(action.config);
  const executionMode = toStringValue(config.executionMode);
  if (executionMode !== 'server_side') return null;

  const inputFieldsRaw = Array.isArray(config.inputFields) ? config.inputFields : [];
  const inputFields = inputFieldsRaw
    .map((field) => toRecord(field))
    .map((field) => ({
      name: toStringValue(field.name),
      required: Boolean(field.required),
      type: toStringValue(field.type) || 'string',
    }))
    .filter((field) => !!field.name);
  const collectedInputs = inferCollectedInputsFromMessage(inputFields, userMessage);
  if (!hasAllRequiredInputs(inputFields, collectedInputs)) return null;

  return { actionId: action.id, collectedInputs };
}

function parseActionDirective(rawContent: string): { actionId: string; collectedInputs: Record<string, unknown> } | null {
  const tryParse = (candidate: string): { actionId: string; collectedInputs: Record<string, unknown> } | null => {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const directType = typeof parsed.type === 'string' ? parsed.type.trim().toLowerCase() : '';
      const directActionId =
        directType === 'action' && typeof parsed.actionId === 'string'
          ? parsed.actionId.trim()
          : '';
      const directInputs =
        parsed.collectedInputs && typeof parsed.collectedInputs === 'object' && !Array.isArray(parsed.collectedInputs)
          ? (parsed.collectedInputs as Record<string, unknown>)
          : {};
      if (directActionId) return { actionId: directActionId, collectedInputs: directInputs };

      const toolCall = parsed.tool_call && typeof parsed.tool_call === 'object' ? (parsed.tool_call as Record<string, unknown>) : null;
      const nestedType = toolCall && typeof toolCall.type === 'string' ? String(toolCall.type).trim().toLowerCase() : '';
      const nestedActionId =
        toolCall && nestedType === 'action' && typeof toolCall.actionId === 'string'
          ? toolCall.actionId.trim()
          : '';
      const nestedInputs =
        toolCall && toolCall.collectedInputs && typeof toolCall.collectedInputs === 'object' && !Array.isArray(toolCall.collectedInputs)
          ? (toolCall.collectedInputs as Record<string, unknown>)
          : {};
      if (nestedActionId) return { actionId: nestedActionId, collectedInputs: nestedInputs };
      return null;
    } catch {
      return null;
    }
  };

  const trimmed = rawContent.trim();
  const full = tryParse(trimmed);
  if (full) return full;

  // Try JSON code blocks first.
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1].trim());
    if (fenced) return fenced;
  }

  const lines = rawContent.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    const fromLastLine = tryParse(lines[lines.length - 1]);
    if (fromLastLine) return fromLastLine;
  }

  // Embedded JSON object anywhere in text, e.g. "Let me check...\n{...}".
  const startCandidates = ['{"type":"action"', '{"tool_call"'];
  for (const needle of startCandidates) {
    const start = rawContent.indexOf(needle);
    if (start < 0) continue;
    let depth = 0;
    let end = -1;
    for (let i = start; i < rawContent.length; i += 1) {
      const ch = rawContent[i];
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end > start) {
      const embedded = tryParse(rawContent.slice(start, end + 1));
      if (embedded) return embedded;
    }
  }

  return null;
}

async function resolveReplyWithActions(params: {
  modelId: string;
  systemContent: string;
  historyList: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  agentId: number;
  sessionId?: string | null;
  sessionData?: Record<string, string>;
}): Promise<string> {
  const { modelId, systemContent, historyList, userMessage, agentId, sessionId, sessionData } = params;
  const firstReply = await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
    maxTokens: 1024,
    temperature: 0.7,
  });
  const directive =
    parseActionDirective(firstReply) ??
    (await tryHeuristicActionExecution({
      agentId,
      userMessage,
      firstReply,
    }));
  if (!directive) return firstReply;

  let executionResult: {
    success: boolean;
    statusCode: number;
    responseBody: unknown;
    durationMs: number;
    error?: string;
    message?: string;
  };
  try {
    executionResult = await executeServerSideActionProxyRuntime({
      chatbotId: agentId,
      actionId: directive.actionId,
      collectedInputs: directive.collectedInputs,
      context: {
        sessionId: sessionId ?? undefined,
        sessionData: sessionData ?? {},
      },
      isTest: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    // If model emitted a non-server-side or stale action id, keep the original reply instead of failing chat.
    if (message.toLowerCase().includes('enabled server-side custom action not found')) {
      return firstReply;
    }
    throw error;
  }

  // Auth expired: surface a static user-facing message and log the real error for the business.
  if (executionResult.error === 'auth_expired') {
    console.warn(
      `[chat-actions] ts=${new Date().toISOString()} agentId=${agentId} actionId=${directive.actionId} authExpired=true serverMessage="${executionResult.message ?? ''}"`,
    );
    return "I'm having trouble connecting to the store right now. Please try again shortly.";
  }

  const followUpSystemContent = `${systemContent}

The requested server-side custom action has been executed.
Action ID: ${directive.actionId}
Status code: ${executionResult.statusCode}
Success: ${executionResult.success ? 'true' : 'false'}
Execution duration ms: ${executionResult.durationMs}
Action result JSON:
${JSON.stringify(executionResult.responseBody)}

Now respond to the user naturally using this action result and the CURRENT user message only.
Important:
- Do NOT ask again for inputs that were already collected and used.
- Do NOT output action JSON again for this turn.
- Do NOT say "please hold on" or "checking now"; provide the final answer immediately.
- If the API result indicates "not found", mention the exact provided input value and suggest trying another value.`;

  const followUpReply = await chatCompletion(modelId, followUpSystemContent, [
    ...historyList,
    { role: 'assistant', content: firstReply },
    { role: 'user', content: userMessage },
  ], {
    maxTokens: 1024,
    temperature: 0.2,
  });

  if (responseStillAsksForInput(followUpReply)) {
    return buildActionResultFallbackReply({
      userMessage,
      collectedInputs: directive.collectedInputs,
      executionResult,
    });
  }

  // Guard against model hallucinating "not found" when API actually returned product-like data.
  if (executionResult.success && responseBodyLooksLikeProduct(executionResult.responseBody) && responseClaimsNotFound(followUpReply)) {
    return buildActionResultFallbackReply({
      userMessage,
      collectedInputs: directive.collectedInputs,
      executionResult,
    });
  }

  return followUpReply;
}

async function buildActionsSystemBlock(agentId: number): Promise<string> {
  const actions = await prisma.action.findMany({
    where: { chatbotId: agentId, isEnabled: true },
    orderBy: { createdAt: 'asc' },
  });
  if (actions.length === 0) return '';

  const lines: string[] = [];
  lines.push('\n\n## Available Actions');
  lines.push('');
  lines.push('You have access to the following actions. Use them when appropriate based on the trigger instructions.');
  lines.push('');

  for (const action of actions) {
    const config = toObject(action.config);
    if (action.type === ActionType.CUSTOM_ACTION) {
      const inputFields = Array.isArray(config.inputFields) ? config.inputFields : [];
      const inputList = inputFields
        .map((field) => {
          const row = toObject(field);
          const name = toStringValue(row.name);
          const description = toStringValue(row.description);
          const required = Boolean(row.required);
          if (!name) return '';
          return `- ${name}${required ? ' (required)' : ''}: ${description || 'No description provided'}`;
        })
        .filter(Boolean)
        .join('\n');
      lines.push(`Action: ${action.name}`);
      lines.push(`Function: ${toStringValue(config.actionFunctionName)}`);
      lines.push(`When to use: ${toStringValue(config.triggerInstructions) || 'When relevant to user intent'}`);
      lines.push(`Inputs to collect:\n${inputList || '- No inputs defined'}`);
      lines.push(`Response handling: ${toStringValue(config.responseMapping) || 'Return the result naturally'}`);
      lines.push(`Execution instruction: Once all required inputs are collected for this server-side action, output ONLY JSON in this exact format:
{"type":"action","actionId":"${action.id}","collectedInputs":{"input_name":"value"}}`);
      lines.push('');
      continue;
    }
    if (action.type === ActionType.CUSTOM_BUTTONS) {
      const buttons = Array.isArray(config.buttons) ? config.buttons : [];
      const labels = buttons
        .map((row) => toStringValue(toObject(row).label))
        .filter(Boolean)
        .join(', ');
      lines.push(`Action: ${action.name}`);
      lines.push(`When to use: ${toStringValue(config.triggerInstructions) || 'When relevant to user intent'}`);
      lines.push(`Available buttons: ${labels || 'No buttons defined'}`);
      lines.push(`Instruction: When triggered, output buttons in the following JSON format so the widget can render them: {"type":"buttons","actionId":"${action.id}","buttons":[{"id":"","label":""}]}`);
      lines.push('');
    }
  }

  lines.push('Always collect ALL required inputs before calling any action. If an action fails, inform the user politely and offer to try again or take an alternative path.');
  return lines.join('\n');
}

/** Run SSE stream for agent chat. Used by auth and public-embed routes. */
export async function runAgentChatStream(
  agent: { id: number; workspaceId: number; prePrompt: string | null; model: string | null; role?: string | null },
  body: { message?: string; history?: unknown; sessionId?: string; sessionData?: unknown },
  res: express.Response
): Promise<void> {
  const agentId = agent.id;
  const { message, history, sessionId: bodySessionId } = body;
  const sessionData = toSessionData(body.sessionData);
  const userMessage = typeof message === 'string' ? message.trim() : '';
  if (!userMessage) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const historyList = Array.isArray(history)
    ? history
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : [];

  const intent = classifyIntent(userMessage);
  const sessionState = deriveSessionState(historyList, intent);
  const isConversational = isConversationalIntent(intent);

  let qaBlock = '';
  let contextBlock = '';
  let websiteBlock = '';
  const actionsBlock = await buildActionsSystemBlock(agentId);
  let qaMatches: { id: number }[] = [];

  if (!isConversational) {
    const [chunks, qa] = await Promise.all([
      retrieveChunks(agentId, userMessage, 20),
      retrieveQa(agentId, userMessage, 5),
    ]);
    qaMatches = qa;
    qaBlock =
      qa.length > 0
        ? `\n\nPRIORITY – Use these exact answers when the user's question matches. Prefer them over other context.\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}\n\n`
        : '';
    contextBlock =
      chunks.length > 0
        ? `\n\nUse the following relevant excerpts from the agent's training data to answer. The training data may include information from multiple websites or stores; use any relevant excerpt and, if the user's question could refer to more than one, consider all and clarify which store when helpful.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
        : '';
    websiteBlock = '';
  }

  const agentRole = (agent as { role?: string | null }).role ?? 'general';
  const systemContent = buildAgentChatSystemContent({
    prePrompt: agent.prePrompt,
    role: agentRole,
    qaBlock,
    contextBlock,
    websiteBlock,
    actionsBlock,
    sessionState,
    isConversational,
  });

  const modelId = agent.model || 'gpt-4o-mini';
  const creditCost = getCreditsForModel(modelId);
  const workspaceId = agent.workspaceId;

  const { remaining } = await getRemainingCredits(workspaceId);
  if (remaining < creditCost) {
    res.status(402).json({
      code: 'CREDITS_EXHAUSTED',
      message: 'Message credits exhausted',
    });
    return;
  }

  if (!isConversational && qaMatches.length > 0) {
    await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let fullReply = '';
  try {
    if (actionsBlock.trim()) {
      fullReply = await resolveReplyWithActions({
        modelId,
        systemContent,
        historyList,
        userMessage,
        agentId,
        sessionId: bodySessionId ?? null,
        sessionData,
      });
      res.write(`data: ${JSON.stringify({ content: fullReply })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    } else {
      for await (const chunk of chatCompletionStream(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
        maxTokens: 1024,
        temperature: 0.7,
      })) {
        fullReply += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }

    const replyText = fullReply.trim();
    const deducted = await deductCredits(workspaceId, creditCost);
    const creditsUsed = deducted ? creditCost : 0;
    const { sessionIdExternal, sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
    await appendMessage(sessionRowId, agentId, 'user', userMessage);
    await appendMessage(sessionRowId, agentId, 'assistant', replyText, creditsUsed);
    if (deducted) void emitCreditsUpdated(workspaceId);
    res.write(`data: ${JSON.stringify({ sessionId: sessionIdExternal })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (streamErr: any) {
    console.error('Agent chat stream error:', streamErr);
    res.write(`data: ${JSON.stringify({ error: streamErr.message || 'Stream failed' })}\n\n`);
  }
  res.end();
}

/** Public embed: handle chat stream. Used by server.ts. */
export async function handlePublicAgentChatStream(
  workspaceId: number,
  agentId: number,
  body: { message?: string; history?: unknown; sessionId?: string; sessionData?: unknown },
  res: express.Response
): Promise<void> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, workspaceId },
  });
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  await runAgentChatStream(agent, body, res);
}

/** Single AI reply for an agent (used by Slack and other integrations). */
export async function getAgentReply(
  agent: { id: number; workspaceId: number; prePrompt: string | null; model: string | null; role?: string | null },
  userMessage: string,
  bodySessionId?: string | null
): Promise<string> {
  const agentId = agent.id;
  const historyList: { role: 'user' | 'assistant'; content: string }[] = [];
  const intent = classifyIntent(userMessage);
  const sessionState = deriveSessionState(historyList, intent);
  const isConversational = isConversationalIntent(intent);

  let qaBlock = '';
  let contextBlock = '';
  let websiteBlock = '';
  const actionsBlock = await buildActionsSystemBlock(agentId);
  let qaMatches: { id: number }[] = [];

  if (!isConversational) {
    const [chunks, qa] = await Promise.all([
      retrieveChunks(agentId, userMessage, 20),
      retrieveQa(agentId, userMessage, 5),
    ]);
    qaMatches = qa;
    qaBlock =
      qa.length > 0
        ? `\n\nPRIORITY – Use these exact answers when the user's question matches. Prefer them over other context.\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}\n\n`
        : '';
    contextBlock =
      chunks.length > 0
        ? `\n\nUse the following relevant excerpts from the agent's training data to answer. The training data may include information from multiple websites or stores; use any relevant excerpt and, if the user's question could refer to more than one, consider all and clarify which store when helpful.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
        : '';
    websiteBlock = '';
  }

  const agentRole = (agent as { role?: string | null }).role ?? 'general';
  const systemContent = buildAgentChatSystemContent({
    prePrompt: agent.prePrompt,
    role: agentRole,
    qaBlock,
    contextBlock,
    websiteBlock,
    actionsBlock,
    sessionState,
    isConversational,
  });

  const modelId = agent.model || 'gpt-4o-mini';
  const creditCost = getCreditsForModel(modelId);
  const workspaceId = agent.workspaceId;
  const { remaining } = await getRemainingCredits(workspaceId);
  if (remaining < creditCost) {
    throw new Error('Message credits exhausted. Please upgrade your plan or add credits.');
  }

  const reply = actionsBlock.trim()
    ? await resolveReplyWithActions({
        modelId,
        systemContent,
        historyList,
        userMessage,
        agentId,
        sessionId: bodySessionId ?? null,
      })
    : await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
        maxTokens: 1024,
        temperature: 0.7,
      });

  if (!isConversational && qaMatches.length > 0) {
    await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
  }

  const deducted = await deductCredits(workspaceId, creditCost);
  const creditsUsed = deducted ? creditCost : 0;
  const { sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
  await appendMessage(sessionRowId, agentId, 'user', userMessage);
  await appendMessage(sessionRowId, agentId, 'assistant', reply, creditsUsed);
  if (deducted) void emitCreditsUpdated(workspaceId);

  return reply;
}

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/chat:
 *   post:
 *     summary: Send chat message (authenticated)
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { message: { type: string }, history: { type: array }, sessionId: { type: string } }
 *             required: [message]
 *     responses:
 *       200: { description: { message, sessionId } }
 */
router.post('/:workspaceId/agents/:agentId/chat', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { message, history, sessionId: bodySessionId } = req.body;
    const sessionData = toSessionData(req.body?.sessionData);
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyList = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const intent = classifyIntent(userMessage);
    const sessionState = deriveSessionState(historyList, intent);
    const isConversational = isConversationalIntent(intent);

    let qaBlock = '';
    let contextBlock = '';
    let websiteBlock = '';
    const actionsBlock = await buildActionsSystemBlock(agentId);
    let qaMatches: { id: number }[] = [];

    if (!isConversational) {
      const [chunks, qa] = await Promise.all([
        retrieveChunks(agentId, userMessage, 20),
        retrieveQa(agentId, userMessage, 5),
      ]);
      qaMatches = qa;
      qaBlock =
        qa.length > 0
          ? `\n\nPRIORITY – Use these exact answers when the user's question matches. Prefer them over other context.\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}\n\n`
          : '';
      contextBlock =
        chunks.length > 0
          ? `\n\nUse the following relevant excerpts from the agent's training data to answer. The training data may include information from multiple websites or stores; use any relevant excerpt and, if the user's question could refer to more than one, consider all and clarify which store when helpful.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
          : '';
      websiteBlock = '';
    }

    const agentRole = (agent as { role?: string | null }).role ?? 'general';
    const systemContent = buildAgentChatSystemContent({
      prePrompt: agent.prePrompt,
      role: agentRole,
      qaBlock,
      contextBlock,
      websiteBlock,
      actionsBlock,
      sessionState,
      isConversational,
    });

    const modelId = agent.model || 'gpt-4o-mini';

    const reply = actionsBlock.trim()
      ? await resolveReplyWithActions({
          modelId,
          systemContent,
          historyList,
          userMessage,
          agentId,
          sessionId: bodySessionId ?? null,
          sessionData,
        })
      : await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
          maxTokens: 1024,
          temperature: 0.7,
        });

    if (!isConversational && qaMatches.length > 0) {
      await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
    }

    const { sessionIdExternal, sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
    await appendMessage(sessionRowId, agentId, 'user', userMessage);
    await appendMessage(sessionRowId, agentId, 'assistant', reply);

    return res.json({ message: reply, sessionId: sessionIdExternal });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/chat/stream:
 *   post:
 *     summary: Send chat message with SSE stream (authenticated)
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { message: { type: string }, history: { type: array }, sessionId: { type: string } }
 *             required: [message]
 *     responses:
 *       200: { description: SSE stream }
 */
router.post('/:workspaceId/agents/:agentId/chat/stream', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await runAgentChatStream(agent, req.body, res);
  } catch (error: any) {
    console.error('Agent chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Chat failed' });
    } else {
      res.end();
    }
  }
});

export default router;
