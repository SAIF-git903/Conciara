/**
 * Conversation Management Service
 * Handles listing, searching, and retrieving conversation sessions with metadata
 */

import { pool } from '../db/connection.js';
import { traceService } from './traceService.js';

export interface ConversationSummary {
  sessionId: string;
  treeId: number;
  userId: string | null;
  firstMessage: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  traceCount: number;
  tags?: string[];
  modelUsed?: string;
}

export interface ConversationDetails extends ConversationSummary {
  history: Array<{
    id: number;
    userMessage: string | null;
    botResponse: string | null;
    nodeId: number | null;
    createdAt: Date;
  }>;
  traces: Array<{
    traceId: string;
    userMessage: string;
    finalResponse: string | null;
    startTime: number;
    endTime: number | null;
    eventCount: number;
  }>;
}

/**
 * Get all conversation sessions with summary information
 */
export async function getAllConversations(
  limit: number = 50,
  offset: number = 0,
  treeId?: number,
  userId?: string
): Promise<ConversationSummary[]> {
  try {
    let query = `
      SELECT 
        cs.session_id,
        cs.tree_id,
        cs.user_id,
        cs.created_at,
        cs.updated_at,
        COUNT(DISTINCT ch.id) as message_count,
        MIN(CASE WHEN ch.user_message IS NOT NULL THEN ch.user_message END) as first_message,
        MAX(CASE WHEN ch.user_message IS NOT NULL THEN ch.user_message END) as last_message,
        COUNT(DISTINCT t.trace_id) as trace_count
      FROM conversation_sessions cs
      LEFT JOIN conversation_history ch ON cs.session_id = ch.session_id
      LEFT JOIN traces t ON cs.session_id = t.session_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (treeId) {
      conditions.push(`cs.tree_id = $${paramIndex++}`);
      params.push(treeId);
    }

    if (userId) {
      conditions.push(`cs.user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY cs.session_id, cs.tree_id, cs.user_id, cs.created_at, cs.updated_at
      ORDER BY cs.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      sessionId: row.session_id,
      treeId: row.tree_id,
      userId: row.user_id || null,
      firstMessage: row.first_message || null,
      lastMessage: row.last_message || null,
      messageCount: parseInt(row.message_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      traceCount: parseInt(row.trace_count) || 0,
    }));
  } catch (error: any) {
    console.error('[ConversationService] Error fetching conversations:', error.message);
    throw error;
  }
}

/**
 * Get detailed conversation information including history and traces
 */
export async function getConversationDetails(sessionId: string): Promise<ConversationDetails | null> {
  try {
    // Get session info
    const sessionResult = await pool.query(
      `SELECT * FROM conversation_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const session = sessionResult.rows[0];

    // Get conversation history
    const historyResult = await pool.query(
      `SELECT * FROM conversation_history 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    // Get traces for this session
    const traces = await traceService.getSessionTraces(sessionId);

    // Get summary stats
    const summaryResult = await pool.query(
      `SELECT 
        COUNT(*) as message_count,
        MIN(CASE WHEN user_message IS NOT NULL THEN user_message END) as first_message,
        MAX(CASE WHEN user_message IS NOT NULL THEN user_message END) as last_message
       FROM conversation_history
       WHERE session_id = $1`,
      [sessionId]
    );

    const summary = summaryResult.rows[0];

    // Get conversation tree if exists
    const treeResult = await pool.query(
      `SELECT tags, model_used FROM conversation_trees WHERE session_id = $1`,
      [sessionId]
    );

    const treeInfo = treeResult.rows[0];

    return {
      sessionId: session.session_id,
      treeId: session.tree_id,
      userId: session.user_id || null,
      firstMessage: summary.first_message || null,
      lastMessage: summary.last_message || null,
      messageCount: parseInt(summary.message_count) || 0,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      traceCount: traces.length,
      tags: treeInfo?.tags || [],
      modelUsed: treeInfo?.model_used || undefined,
      history: historyResult.rows.map(row => ({
        id: row.id,
        userMessage: row.user_message,
        botResponse: row.bot_response,
        nodeId: row.node_id,
        createdAt: row.created_at,
      })),
      traces: traces.map(trace => ({
        traceId: trace.traceId,
        userMessage: trace.userMessage,
        finalResponse: trace.finalResponse || null,
        startTime: trace.startTime,
        endTime: trace.endTime || null,
        eventCount: trace.events.length,
      })),
    };
  } catch (error: any) {
    console.error('[ConversationService] Error fetching conversation details:', error.message);
    throw error;
  }
}

/**
 * Search conversations by message content
 */
export async function searchConversations(
  searchTerm: string,
  limit: number = 50
): Promise<ConversationSummary[]> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
        cs.session_id,
        cs.tree_id,
        cs.user_id,
        cs.created_at,
        cs.updated_at,
        COUNT(DISTINCT ch.id) as message_count,
        MIN(CASE WHEN ch.user_message IS NOT NULL THEN ch.user_message END) as first_message,
        MAX(CASE WHEN ch.user_message IS NOT NULL THEN ch.user_message END) as last_message,
        COUNT(DISTINCT t.trace_id) as trace_count
      FROM conversation_sessions cs
      LEFT JOIN conversation_history ch ON cs.session_id = ch.session_id
      LEFT JOIN traces t ON cs.session_id = t.session_id
      WHERE ch.user_message ILIKE $1 OR ch.bot_response ILIKE $1
      GROUP BY cs.session_id, cs.tree_id, cs.user_id, cs.created_at, cs.updated_at
      ORDER BY cs.updated_at DESC
      LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );

    return result.rows.map(row => ({
      sessionId: row.session_id,
      treeId: row.tree_id,
      userId: row.user_id || null,
      firstMessage: row.first_message || null,
      lastMessage: row.last_message || null,
      messageCount: parseInt(row.message_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      traceCount: parseInt(row.trace_count) || 0,
    }));
  } catch (error: any) {
    console.error('[ConversationService] Error searching conversations:', error.message);
    throw error;
  }
}
