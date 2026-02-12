/**
 * Migration 0005: Tracing System
 * Creates traces, trace_events, and conversation_trees tables
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Create traces table for persistent trace storage
  await pool.query(`
    CREATE TABLE IF NOT EXISTS traces (
      id SERIAL PRIMARY KEY,
      trace_id VARCHAR(255) NOT NULL UNIQUE,
      session_id VARCHAR(255) NOT NULL,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      user_id VARCHAR(255),
      user_message TEXT NOT NULL,
      final_response TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      correlation_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create trace_events table for storing individual trace events
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trace_events (
      id SERIAL PRIMARY KEY,
      trace_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      timestamp_ms BIGINT NOT NULL,
      relative_time_ms BIGINT NOT NULL,
      data JSONB DEFAULT '{}'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      parent_event_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
    );
  `);

  // Create conversation_trees table for storing full conversation tree structures
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_trees (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      user_id VARCHAR(255),
      root_node_id VARCHAR(255) NOT NULL,
      tree_structure JSONB NOT NULL,
      summary TEXT,
      tags TEXT[],
      model_used VARCHAR(100),
      total_messages INT DEFAULT 0,
      total_tool_calls INT DEFAULT 0,
      total_memory_accesses INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(session_id)
    );
  `);

  // Create indexes for traces
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_traces_session_id ON traces(session_id);
    CREATE INDEX IF NOT EXISTS idx_traces_tree_id ON traces(tree_id);
    CREATE INDEX IF NOT EXISTS idx_traces_user_id ON traces(user_id);
    CREATE INDEX IF NOT EXISTS idx_traces_start_time ON traces(start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id ON trace_events(trace_id);
    CREATE INDEX IF NOT EXISTS idx_trace_events_type ON trace_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_trace_events_parent ON trace_events(parent_event_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_trees_session_id ON conversation_trees(session_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_trees_tree_id ON conversation_trees(tree_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_trees_user_id ON conversation_trees(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_trees_created_at ON conversation_trees(created_at DESC);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS conversation_trees CASCADE;');
  await pool.query('DROP TABLE IF EXISTS trace_events CASCADE;');
  await pool.query('DROP TABLE IF EXISTS traces CASCADE;');
}
