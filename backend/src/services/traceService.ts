/**
 * Event Tracing Service for AI Observability
 * Captures all internal steps of chatbot decision-making process
 */

import { pool } from '../db/connection.js';

export type TraceEventType =
  | 'user_input'
  | 'tokenization'
  | 'intent_detection'
  | 'dialog_tree_search'
  | 'vector_db_search'
  | 'rag_retrieval'
  | 'user_memory_retrieval'
  | 'prompt_construction'
  | 'llm_call'
  | 'slm_call'
  | 'api_call'
  | 'fallback'
  | 'backtracking'
  | 'final_response';

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: number; // milliseconds since start
  relativeTime: number; // relative to trace start
  data: Record<string, any>;
  metadata?: Record<string, any>;
  parentEventId?: string; // For tree structure
}

export interface Trace {
  traceId: string;
  sessionId: string;
  treeId: number;
  userId?: string | null;
  userMessage: string;
  startTime: number;
  endTime?: number;
  events: TraceEvent[];
  finalResponse?: string;
  correlationId: string;
}

class TraceService {
  private traces: Map<string, Trace> = new Map();
  private sessionTraces: Map<string, string[]> = new Map(); // sessionId -> traceIds

  /**
   * Create a new trace for a conversation
   */
  createTrace(
    sessionId: string,
    treeId: number,
    userMessage: string,
    userId?: string | null
  ): Trace {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const trace: Trace = {
      traceId,
      sessionId,
      treeId,
      userId: userId || null,
      userMessage,
      startTime,
      events: [],
      correlationId,
    };

    this.traces.set(traceId, trace);

    // Track traces by session
    if (!this.sessionTraces.has(sessionId)) {
      this.sessionTraces.set(sessionId, []);
    }
    this.sessionTraces.get(sessionId)!.push(traceId);

    return trace;
  }

  /**
   * Add an event to a trace
   */
  addEvent(
    traceId: string,
    type: TraceEventType,
    data: Record<string, any>,
    metadata?: Record<string, any>,
    parentEventId?: string
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[TraceService] Trace ${traceId} not found`);
      return;
    }

    const now = Date.now();
    const relativeTime = now - trace.startTime;

    const event: TraceEvent = {
      id: `event_${trace.events.length}_${Date.now()}`,
      type,
      timestamp: now,
      relativeTime,
      data,
      metadata,
      parentEventId,
    };

    trace.events.push(event);
  }

  /**
   * Complete a trace with final response and persist to database
   */
  async completeTrace(traceId: string, finalResponse: string): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[TraceService] Trace ${traceId} not found`);
      return;
    }

    trace.endTime = Date.now();
    trace.finalResponse = finalResponse;

    // Persist to database
    await this.persistTrace(trace);
  }

  /**
   * Persist a trace to the database
   */
  private async persistTrace(trace: Trace): Promise<void> {
    try {
      // Insert or update trace
      await pool.query(
        `INSERT INTO traces (
          trace_id, session_id, tree_id, user_id, user_message, 
          final_response, start_time, end_time, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (trace_id) DO UPDATE SET
          final_response = EXCLUDED.final_response,
          end_time = EXCLUDED.end_time,
          updated_at = NOW()`,
        [
          trace.traceId,
          trace.sessionId,
          trace.treeId,
          trace.userId || null,
          trace.userMessage,
          trace.finalResponse || null,
          new Date(trace.startTime),
          trace.endTime ? new Date(trace.endTime) : null,
          trace.correlationId,
        ]
      );

      // Delete existing events for this trace (in case of update)
      await pool.query('DELETE FROM trace_events WHERE trace_id = $1', [trace.traceId]);

      // Insert all events (using individual inserts for simplicity)
      if (trace.events.length > 0) {
        for (const event of trace.events) {
          await pool.query(
            `INSERT INTO trace_events (
              trace_id, event_id, event_type, timestamp_ms, relative_time_ms, 
              data, metadata, parent_event_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              trace.traceId,
              event.id,
              event.type,
              event.timestamp,
              event.relativeTime,
              JSON.stringify(event.data),
              JSON.stringify(event.metadata || {}),
              event.parentEventId || null,
            ]
          );
        }
      }
    } catch (error: any) {
      console.error(`[TraceService] Error persisting trace ${trace.traceId}:`, error.message);
      // Don't throw - tracing should not break the main flow
    }
  }

  /**
   * Get a trace by ID (from memory or database)
   */
  async getTrace(traceId: string): Promise<Trace | undefined> {
    // Check memory first
    const memoryTrace = this.traces.get(traceId);
    if (memoryTrace) {
      return memoryTrace;
    }

    // Load from database
    return await this.loadTraceFromDb(traceId);
  }

  /**
   * Load a trace from the database
   */
  private async loadTraceFromDb(traceId: string): Promise<Trace | undefined> {
    try {
      const traceResult = await pool.query(
        'SELECT * FROM traces WHERE trace_id = $1',
        [traceId]
      );

      if (traceResult.rows.length === 0) {
        return undefined;
      }

      const traceRow = traceResult.rows[0];

      // Load events
      const eventsResult = await pool.query(
        'SELECT * FROM trace_events WHERE trace_id = $1 ORDER BY relative_time_ms ASC',
        [traceId]
      );

      const events: TraceEvent[] = eventsResult.rows.map(row => ({
        id: row.event_id,
        type: row.event_type as TraceEventType,
        timestamp: parseInt(row.timestamp_ms),
        relativeTime: parseInt(row.relative_time_ms),
        data: row.data || {},
        metadata: row.metadata || {},
        parentEventId: row.parent_event_id || undefined,
      }));

      const trace: Trace = {
        traceId: traceRow.trace_id,
        sessionId: traceRow.session_id,
        treeId: traceRow.tree_id,
        userId: traceRow.user_id || null,
        userMessage: traceRow.user_message,
        startTime: new Date(traceRow.start_time).getTime(),
        endTime: traceRow.end_time ? new Date(traceRow.end_time).getTime() : undefined,
        events,
        finalResponse: traceRow.final_response || undefined,
        correlationId: traceRow.correlation_id,
      };

      // Cache in memory
      this.traces.set(traceId, trace);

      return trace;
    } catch (error: any) {
      console.error(`[TraceService] Error loading trace ${traceId}:`, error.message);
      return undefined;
    }
  }

  /**
   * Get all traces for a session (from memory and database)
   */
  async getSessionTraces(sessionId: string): Promise<Trace[]> {
    // Get from memory first
    const memoryTraceIds = this.sessionTraces.get(sessionId) || [];
    const memoryTraces = memoryTraceIds
      .map(id => this.traces.get(id))
      .filter((t): t is Trace => t !== undefined);

    // Also load from database
    try {
      const dbResult = await pool.query(
        'SELECT trace_id FROM traces WHERE session_id = $1 ORDER BY start_time ASC',
        [sessionId]
      );

      const dbTraceIds = dbResult.rows.map(row => row.trace_id);
      const dbTraces = await Promise.all(
        dbTraceIds.map(id => this.loadTraceFromDb(id))
      );

      const allTraces = [...memoryTraces, ...dbTraces.filter((t): t is Trace => t !== undefined)];
      
      // Deduplicate by traceId
      const uniqueTraces = new Map<string, Trace>();
      allTraces.forEach(trace => {
        if (!uniqueTraces.has(trace.traceId)) {
          uniqueTraces.set(trace.traceId, trace);
        }
      });

      return Array.from(uniqueTraces.values()).sort((a, b) => a.startTime - b.startTime);
    } catch (error: any) {
      console.error(`[TraceService] Error loading session traces:`, error.message);
      return memoryTraces.sort((a, b) => a.startTime - b.startTime);
    }
  }

  /**
   * Get the latest trace for a session
   */
  async getLatestTrace(sessionId: string): Promise<Trace | undefined> {
    const traces = await this.getSessionTraces(sessionId);
    return traces.length > 0 ? traces[traces.length - 1] : undefined;
  }

  /**
   * Get all traces (for admin/debugging) - from database
   */
  async getAllTraces(limit: number = 100): Promise<Trace[]> {
    try {
      const result = await pool.query(
        'SELECT trace_id FROM traces ORDER BY start_time DESC LIMIT $1',
        [limit]
      );

      const traces = await Promise.all(
        result.rows.map(row => this.loadTraceFromDb(row.trace_id))
      );

      return traces.filter((t): t is Trace => t !== undefined);
    } catch (error: any) {
      console.error('[TraceService] Error loading all traces:', error.message);
      // Fallback to memory
      return Array.from(this.traces.values()).sort(
        (a, b) => b.startTime - a.startTime
      );
    }
  }

  /**
   * Clean up old traces (optional, for memory management)
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.traces.forEach((trace, traceId) => {
      if (trace.endTime && now - trace.endTime > maxAge) {
        toDelete.push(traceId);
      }
    });

    toDelete.forEach(traceId => {
      this.traces.delete(traceId);
    });

    // Clean up session traces
    this.sessionTraces.forEach((traceIds, sessionId) => {
      const validTraceIds = traceIds.filter(id => this.traces.has(id));
      if (validTraceIds.length === 0) {
        this.sessionTraces.delete(sessionId);
      } else {
        this.sessionTraces.set(sessionId, validTraceIds);
      }
    });
  }
}

// Singleton instance
export const traceService = new TraceService();

// Cleanup old traces every hour
setInterval(() => {
  traceService.cleanup();
}, 60 * 60 * 1000);
