/**
 * Conversation Tree Builder Service
 * Converts traces into tree structures showing reasoning paths, tool calls, memory usage, etc.
 */

import { Trace, TraceEvent } from './traceService.js';
import { pool } from '../db/connection.js';

export interface TreeNode {
  id: string;
  type: 'root' | 'user_message' | 'reasoning' | 'tool_call' | 'memory' | 'decision' | 'response' | 'alternate_path';
  label: string;
  content?: string;
  timestamp: number;
  relativeTime: number;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  children: TreeNode[];
  isActive?: boolean; // For playback highlighting
  parentId?: string;
}

export interface ConversationTree {
  sessionId: string;
  treeId: number;
  userId: string | null;
  rootNode: TreeNode;
  totalNodes: number;
  totalToolCalls: number;
  totalMemoryAccesses: number;
  modelUsed?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Build a conversation tree from traces
 */
export function buildConversationTree(traces: Trace[]): ConversationTree | null {
  if (traces.length === 0) {
    return null;
  }

  // Sort traces by start time
  const sortedTraces = traces.sort((a, b) => a.startTime - b.startTime);
  const firstTrace = sortedTraces[0];
  const lastTrace = sortedTraces[sortedTraces.length - 1];

  // Create root node
  const rootNode: TreeNode = {
    id: `root_${firstTrace.sessionId}`,
    type: 'root',
    label: 'Conversation Start',
    timestamp: firstTrace.startTime,
    relativeTime: 0,
    children: [],
  };

  // Process each trace
  sortedTraces.forEach((trace, traceIndex) => {
    const traceStartOffset = trace.startTime - firstTrace.startTime;
    
    // Add user message node
    const userMessageNode: TreeNode = {
      id: `user_${trace.traceId}`,
      type: 'user_message',
      label: 'User Message',
      content: trace.userMessage,
      timestamp: trace.startTime,
      relativeTime: traceStartOffset,
      data: { traceId: trace.traceId },
      children: [],
      parentId: rootNode.id,
    };

    rootNode.children.push(userMessageNode);

    // Process events in this trace
    const reasoningNode = buildEventTree(trace.events, userMessageNode.id, trace.startTime, firstTrace.startTime);
    if (reasoningNode && reasoningNode.children.length > 0) {
      userMessageNode.children.push(reasoningNode);
    }

    // Add final response node
    if (trace.finalResponse) {
      // Response time is relative to trace start (when user message was sent)
      const responseTime = trace.endTime 
        ? trace.endTime - trace.startTime 
        : 0;
      
      const responseNode: TreeNode = {
        id: `response_${trace.traceId}`,
        type: 'response',
        label: 'AI Response',
        content: trace.finalResponse,
        timestamp: trace.endTime || trace.startTime,
        relativeTime: responseTime, // Relative to trace start, shows response time
        data: { traceId: trace.traceId },
        children: [],
        parentId: userMessageNode.id,
      };
      userMessageNode.children.push(responseNode);
    }
  });

  // Count statistics
  const stats = countTreeStats(rootNode);

  return {
    sessionId: firstTrace.sessionId,
    treeId: firstTrace.treeId,
    userId: firstTrace.userId || null,
    rootNode,
    totalNodes: stats.totalNodes,
    totalToolCalls: stats.totalToolCalls,
    totalMemoryAccesses: stats.totalMemoryAccesses,
    createdAt: new Date(firstTrace.startTime),
    updatedAt: new Date(lastTrace.endTime || lastTrace.startTime),
  };
}

/**
 * Build tree structure from trace events
 */
function buildEventTree(
  events: TraceEvent[],
  parentId: string,
  traceStartTime: number,
  conversationStartTime: number
): TreeNode | null {
  if (events.length === 0) {
    return null;
  }

  // Group events by type and create reasoning paths
  // Reasoning node starts at 0ms relative to the user message (trace start)
  const reasoningNode: TreeNode = {
    id: `reasoning_${parentId}`,
    type: 'reasoning',
    label: 'AI Reasoning Process',
    timestamp: events[0].timestamp,
    relativeTime: 0, // Always 0 relative to trace start
    children: [],
    parentId,
  };

  // Process events in order, building parent-child relationships
  const eventMap = new Map<string, TreeNode>();
  const rootEvents: TreeNode[] = [];

  events.forEach((event) => {
    const node = eventToTreeNode(event, traceStartTime, conversationStartTime);
    eventMap.set(event.id, node);

    if (event.parentEventId && eventMap.has(event.parentEventId)) {
      // Add as child of parent event
      const parentNode = eventMap.get(event.parentEventId)!;
      node.parentId = parentNode.id;
      parentNode.children.push(node);
    } else {
      // Root level event
      rootEvents.push(node);
    }
  });

  // Add root events to reasoning node
  reasoningNode.children = rootEvents;

  return reasoningNode;
}

/**
 * Convert a trace event to a tree node
 */
function eventToTreeNode(
  event: TraceEvent,
  traceStartTime: number,
  conversationStartTime: number
): TreeNode {
  const nodeType = getNodeTypeForEvent(event.type);
  const label = getLabelForEvent(event.type, event.data);
  
  // Use event.relativeTime directly - it's already relative to trace start
  // This shows how long each step took from when the user message was sent
  // NOT the absolute time from conversation start

  const node: TreeNode = {
    id: event.id,
    type: nodeType,
    label,
    timestamp: event.timestamp,
    relativeTime: event.relativeTime, // Relative to trace start, not conversation start
    data: event.data,
    metadata: event.metadata,
    children: [],
  };

  // Add content based on event type
  switch (event.type) {
    case 'llm_call':
    case 'slm_call':
      node.content = event.data.response || event.data.prompt?.substring(0, 100) || '';
      break;
    case 'user_memory_retrieval':
      node.content = `${event.data.memoriesFound || 0} memories retrieved`;
      break;
    case 'vector_db_search':
      node.content = event.data.topResult
        ? `Match: "${event.data.topResult.userInput?.substring(0, 50)}"`
        : 'No match found';
      break;
    case 'dialog_tree_search':
      node.content = event.data.matchedUserInput || 'No match';
      break;
    case 'api_call':
      node.content = event.data.toolName || event.data.endpoint || '';
      break;
  }

  return node;
}

/**
 * Map event type to tree node type
 */
function getNodeTypeForEvent(eventType: string): TreeNode['type'] {
  switch (eventType) {
    case 'user_input':
      return 'user_message';
    case 'llm_call':
    case 'slm_call':
    case 'prompt_construction':
      return 'reasoning';
    case 'tool_call':
    case 'api_call':
      return 'tool_call';
    case 'user_memory_retrieval':
      return 'memory';
    case 'final_response':
      return 'response';
    case 'backtracking':
    case 'fallback':
      return 'alternate_path';
    default:
      return 'reasoning';
  }
}

/**
 * Get human-readable label for event
 */
function getLabelForEvent(eventType: string, data: Record<string, any>): string {
  switch (eventType) {
    case 'user_input':
      return 'User Input';
    case 'tokenization':
      return 'Tokenization';
    case 'intent_detection':
      return 'Intent Detection';
    case 'dialog_tree_search':
      return 'Dialog Tree Search';
    case 'vector_db_search':
      return 'Vector Search';
    case 'rag_retrieval':
      return 'RAG Retrieval';
    case 'user_memory_retrieval':
      return `Memory Retrieval (${data.memoriesFound || 0})`;
    case 'prompt_construction':
      return 'Prompt Construction';
    case 'llm_call':
      return 'LLM Call';
    case 'slm_call':
      return 'SLM Call';
    case 'api_call':
      return `API Call: ${data.endpoint || 'Unknown'}`;
    case 'tool_call':
      return `Tool: ${data.toolName || 'Unknown'}`;
    case 'fallback':
      return 'Fallback Path';
    case 'backtracking':
      return 'Backtracking';
    case 'final_response':
      return 'Final Response';
    default:
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Count statistics in tree
 */
function countTreeStats(node: TreeNode): {
  totalNodes: number;
  totalToolCalls: number;
  totalMemoryAccesses: number;
} {
  let totalNodes = 1;
  let totalToolCalls = node.type === 'tool_call' ? 1 : 0;
  let totalMemoryAccesses = node.type === 'memory' ? 1 : 0;

  node.children.forEach((child) => {
    const childStats = countTreeStats(child);
    totalNodes += childStats.totalNodes;
    totalToolCalls += childStats.totalToolCalls;
    totalMemoryAccesses += childStats.totalMemoryAccesses;
  });

  return { totalNodes, totalToolCalls, totalMemoryAccesses };
}

/**
 * Save conversation tree to database
 */
export async function saveConversationTree(tree: ConversationTree): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO conversation_trees (
        session_id, tree_id, user_id, root_node_id, tree_structure,
        summary, tags, model_used, total_messages, total_tool_calls, total_memory_accesses
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (session_id) DO UPDATE SET
        tree_structure = EXCLUDED.tree_structure,
        summary = EXCLUDED.summary,
        tags = EXCLUDED.tags,
        model_used = EXCLUDED.model_used,
        total_messages = EXCLUDED.total_messages,
        total_tool_calls = EXCLUDED.total_tool_calls,
        total_memory_accesses = EXCLUDED.total_memory_accesses,
        updated_at = NOW()`,
      [
        tree.sessionId,
        tree.treeId,
        tree.userId || null,
        tree.rootNode.id,
        JSON.stringify(tree.rootNode),
        tree.rootNode.children.length > 0
          ? tree.rootNode.children[0].content?.substring(0, 200) || ''
          : '',
        tree.tags || [],
        tree.modelUsed || null,
        tree.rootNode.children.length,
        tree.totalToolCalls,
        tree.totalMemoryAccesses,
      ]
    );
  } catch (error: any) {
    console.error('[ConversationTreeService] Error saving tree:', error.message);
    throw error;
  }
}

/**
 * Load conversation tree from database
 */
export async function loadConversationTree(sessionId: string): Promise<ConversationTree | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM conversation_trees WHERE session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const rootNode = JSON.parse(row.tree_structure) as TreeNode;

    return {
      sessionId: row.session_id,
      treeId: row.tree_id,
      userId: row.user_id || null,
      rootNode,
      totalNodes: countTreeStats(rootNode).totalNodes,
      totalToolCalls: row.total_tool_calls || 0,
      totalMemoryAccesses: row.total_memory_accesses || 0,
      modelUsed: row.model_used || undefined,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    console.error('[ConversationTreeService] Error loading tree:', error.message);
    return null;
  }
}
<<<<<<< HEAD
=======

/**
 * Build a minimal conversation tree from conversation_history when no traces exist.
 * Used as fallback so sessions that have history but no traces still load in the debugger.
 */
export async function buildConversationTreeFromHistory(sessionId: string): Promise<ConversationTree | null> {
  try {
    const sessionResult = await pool.query(
      'SELECT session_id, tree_id, user_id, created_at, updated_at FROM conversation_sessions WHERE session_id = $1',
      [sessionId]
    );
    if (sessionResult.rows.length === 0) {
      return null;
    }
    const session = sessionResult.rows[0];

    const historyResult = await pool.query(
      'SELECT id, user_message, bot_response, created_at FROM conversation_history WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    const history = historyResult.rows;
    if (history.length === 0) {
      return null;
    }

    const rootNode: TreeNode = {
      id: `root_${sessionId}`,
      type: 'root',
      label: 'Conversation Start',
      timestamp: new Date(session.created_at).getTime(),
      relativeTime: 0,
      children: [],
    };

    const baseTime = new Date(session.created_at).getTime();
    history.forEach((row: any, index: number) => {
      const createdAt = new Date(row.created_at).getTime();
      const relativeTime = createdAt - baseTime;
      const userMessageNode: TreeNode = {
        id: `user_hist_${row.id}`,
        type: 'user_message',
        label: 'User Message',
        content: row.user_message || '',
        timestamp: createdAt,
        relativeTime,
        data: { historyId: row.id },
        children: [],
        parentId: rootNode.id,
      };
      rootNode.children.push(userMessageNode);

      if (row.bot_response != null && row.bot_response !== '') {
        const responseNode: TreeNode = {
          id: `response_hist_${row.id}`,
          type: 'response',
          label: 'AI Response',
          content: row.bot_response,
          timestamp: createdAt,
          relativeTime,
          data: { historyId: row.id },
          children: [],
          parentId: userMessageNode.id,
        };
        userMessageNode.children.push(responseNode);
      }
    });

    const stats = countTreeStats(rootNode);
    const lastUpdated = history.length > 0
      ? new Date(history[history.length - 1].created_at)
      : new Date(session.updated_at);

    return {
      sessionId: session.session_id,
      treeId: session.tree_id,
      userId: session.user_id || null,
      rootNode,
      totalNodes: stats.totalNodes,
      totalToolCalls: 0,
      totalMemoryAccesses: 0,
      createdAt: new Date(session.created_at),
      updatedAt: lastUpdated,
    };
  } catch (error: any) {
    console.error('[ConversationTreeService] Error building tree from history:', error.message);
    return null;
  }
}
>>>>>>> 524c85588a2547f6095220e8fd3dfffba7d9f7bd
