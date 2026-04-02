/**
 * Agent chat (message + stream) and exports for public embed / Slack.
 * Mounted under /api/workspaces (via aggregator).
 * When the agent has Custom API actions, uses tool calling and executes them before replying.
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import { chatCompletion, chatCompletionStream, chatCompletionWithTools } from '../../../shared/llm.service.js';
import { retrieveChunks } from '../../training/services/rag.service.js';
import { retrieveQa, recordQaUsage } from '../../qa/qa.service.js';
import { createOrGetSession, appendMessage } from '../../chat/services/chatLog.service.js';
import {
  classifyIntent,
  isConversationalIntent,
  deriveSessionState,
} from '../../chat/services/intent.service.js';
import { buildAgentChatSystemContent } from '../../workspace/chat/chatHelpers.js';
import { getEnabledCustomApiActions } from '../actions.service.js';
import {
  buildToolsFromCustomApiActions,
  executeCustomApiAction,
  actionIdFromToolName,
} from '../chatTools.js';

const MAX_TOOL_ROUNDS = 5;

type ChatMessage =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: { id: string; name: string; arguments: string }[] }
  | { role: 'tool'; content: string; toolCallId: string };

/**
 * Run chat with optional Custom API tools: loop until we get a text reply or hit max rounds.
 */
async function runChatWithTools(
  agentId: number,
  modelId: string,
  systemContent: string,
  historyList: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): Promise<string> {
  const actions = await getEnabledCustomApiActions(agentId);
  if (actions.length === 0) {
    return chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
      maxTokens: 1024,
      temperature: 0.7,
    });
  }
  const tools = buildToolsFromCustomApiActions(actions);
  const toolList = tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters as Record<string, unknown>,
    },
  }));

  let messages: ChatMessage[] = [...historyList, { role: 'user', content: userMessage }];
  let lastContent: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await chatCompletionWithTools(
      modelId,
      systemContent,
      messages,
      toolList.length > 0 ? toolList : [],
      { maxTokens: 1024, temperature: 0.7 }
    );

    if (result.content !== null) {
      lastContent = result.content;
      break;
    }

    if (!result.toolCalls?.length) break;

    const assistantContent = round === 0 ? '' : (lastContent ?? '');
    messages.push({
      role: 'assistant',
      content: assistantContent,
      toolCalls: result.toolCalls,
    });

    for (const tc of result.toolCalls) {
      const actionId = actionIdFromToolName(tc.name);
      let toolResult: string;
      if (actionId === null) {
        toolResult = JSON.stringify({ error: 'Unknown tool.' });
      } else {
        try {
          let args: { inputs?: Record<string, unknown> } = {};
          try {
            args = JSON.parse(tc.arguments || '{}');
          } catch {
            args = {};
          }
          toolResult = await executeCustomApiAction(agentId, actionId, args);
        } catch (err: unknown) {
          toolResult = JSON.stringify({
            error: err instanceof Error ? err.message : 'Tool execution failed',
          });
        }
      }
      messages.push({ role: 'tool', content: toolResult, toolCallId: tc.id });
    }
  }

  return lastContent?.trim() ?? "I couldn't complete that. Please try again.";
}

const router = express.Router();

/** Run SSE stream for agent chat. Used by auth and public-embed routes. */
export async function runAgentChatStream(
  agent: { id: number; workspaceId: number; prePrompt: string | null; model: string | null; role?: string | null },
  body: { message?: string; history?: unknown; sessionId?: string },
  res: express.Response
): Promise<void> {
  const agentId = agent.id;
  const { message, history, sessionId: bodySessionId } = body;
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
    sessionState,
    isConversational,
  });

  const modelId = agent.model || 'gpt-4o-mini';

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
    const customApiActions = await getEnabledCustomApiActions(agentId);
    const useTools = customApiActions.length > 0;

    if (useTools) {
      fullReply = await runChatWithTools(
        agentId,
        modelId,
        systemContent,
        historyList,
        userMessage
      );
      if (fullReply) {
        res.write(`data: ${JSON.stringify({ content: fullReply })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
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
    const { sessionIdExternal, sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
    await appendMessage(sessionRowId, agentId, 'user', userMessage);
    await appendMessage(sessionRowId, agentId, 'assistant', replyText);
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
  body: { message?: string; history?: unknown; sessionId?: string },
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
    sessionState,
    isConversational,
  });

  const modelId = agent.model || 'gpt-4o-mini';

  const customApiActions = await getEnabledCustomApiActions(agentId);
  const reply =
    customApiActions.length > 0
      ? await runChatWithTools(agentId, modelId, systemContent, historyList, userMessage)
      : await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
          maxTokens: 1024,
          temperature: 0.7,
        });

  if (!isConversational && qaMatches.length > 0) {
    await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
  }

  const { sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
  await appendMessage(sessionRowId, agentId, 'user', userMessage);
  await appendMessage(sessionRowId, agentId, 'assistant', reply);

  return reply;
}

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
      sessionState,
      isConversational,
    });

    const modelId = agent.model || 'gpt-4o-mini';

    const customApiActions = await getEnabledCustomApiActions(agentId);
    const reply =
      customApiActions.length > 0
        ? await runChatWithTools(agentId, modelId, systemContent, historyList, userMessage)
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
