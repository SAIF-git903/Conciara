/**
 * Event Tracing Service for AI Observability
 * Captures all internal steps of chatbot decision-making process
 */

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
    metadata?: Record<string, any>
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
    };

    trace.events.push(event);
  }

  /**
   * Complete a trace with final response
   */
  completeTrace(traceId: string, finalResponse: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[TraceService] Trace ${traceId} not found`);
      return;
    }

    trace.endTime = Date.now();
    trace.finalResponse = finalResponse;
  }

  /**
   * Get a trace by ID
   */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces for a session
   */
  getSessionTraces(sessionId: string): Trace[] {
    const traceIds = this.sessionTraces.get(sessionId) || [];
    return traceIds
      .map(id => this.traces.get(id))
      .filter((t): t is Trace => t !== undefined)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get the latest trace for a session
   */
  getLatestTrace(sessionId: string): Trace | undefined {
    const traces = this.getSessionTraces(sessionId);
    return traces.length > 0 ? traces[traces.length - 1] : undefined;
  }

  /**
   * Get all traces (for admin/debugging)
   */
  getAllTraces(): Trace[] {
    return Array.from(this.traces.values()).sort(
      (a, b) => b.startTime - a.startTime
    );
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
