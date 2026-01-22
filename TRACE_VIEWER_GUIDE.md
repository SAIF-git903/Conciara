# AI Trace Viewer - Slow Motion Playback Guide

## Overview

The Trace Viewer is an AI observability tool that provides step-by-step visualization of the chatbot's internal decision-making process. Think of it as **Chrome DevTools + React DevTools + Debugger** — but for an AI system.

## Features

### 1. Event Tracing
Captures all internal steps with timestamps:
- **User Input** - Initial message received
- **Tokenization** - Embedding generation
- **Intent Detection** - Dialog tree matching
- **Vector DB Search** - Semantic similarity search
- **RAG Retrieval** - Knowledge base search (if applicable)
- **User Memory Retrieval** - Context from user history
- **Prompt Construction** - Building LLM prompts
- **LLM Call** - Model inference
- **Fallback** - Error handling and fallbacks
- **Backtracking** - Retry logic
- **Final Response** - Generated answer

### 2. Visualization Components

#### Pipeline Flow (Flowchart View)
- Visual representation of the processing pipeline
- Each step shown as a card with icon and label
- Active step highlighted during playback
- Past steps dimmed, future steps shown normally
- Click any step to jump to that event

#### Event Details Panel
- Shows detailed information for the selected event
- Specialized views for:
  - **Vector DB Search**: Query embedding, similarity scores, top results
  - **Dialog Tree Search**: Matching strategy, matched node, confidence scores
  - **LLM Call**: Model used, prompt type, response preview, errors
  - **User Memory**: Retrieved memories with similarity scores
- Raw JSON data for all events

#### Timeline View (Debugger Style)
- Chronological list of all events
- Timestamps in milliseconds/seconds
- Status indicators
- Click to jump to any event

### 3. Playback Controls

#### Speed Controls
- **0.25x** - Quarter speed (4x slower)
- **0.5x** - Half speed (2x slower)
- **1x** - Real-time speed
- **Step** - Manual step-by-step mode

#### Navigation
- **Reset** - Go back to start
- **Step Back** - Previous event
- **Play** - Start playback
- **Pause** - Pause playback
- **Step Forward** - Next event

## Usage

### 1. Enable Tracing

Tracing is enabled by default in the chat service. Every chat message automatically generates a trace.

### 2. Get Trace ID

After sending a chat message, the response includes a `trace_id` field:

```json
{
  "bot_response": "Hello! How can I help you?",
  "next_node_id": 1,
  "session_id": "session_123",
  "trace_id": "trace_1234567890_abc123"
}
```

### 3. View Trace

1. Navigate to `/trace-viewer` in the frontend
2. Enter the trace ID in the input field
3. Click "Load Trace"
4. Use playback controls to step through the process

### 4. API Endpoints

#### Get Trace by ID
```
GET /api/trace/:traceId
```

#### Get All Traces for Session
```
GET /api/trace/session/:sessionId
```

#### Get Latest Trace for Session
```
GET /api/trace/session/:sessionId/latest
```

#### Get All Traces (Admin)
```
GET /api/trace
```

## Example Trace Flow

```
00:00.000  👤 User Input: "I'm looking for a laptop"
00:00.120  🔤 Tokenization: Embedding generated (1536 dimensions)
00:00.300  🎯 Intent Detection: Started
00:00.480  🌳 Dialog Tree Search: Started
00:00.650  🔍 Vector DB Search: Started
00:01.020  🔍 Vector DB Search: Top result found (similarity: 87.3%)
00:01.200  🌳 Dialog Tree Search: Matched node (ID: 42, strategy: semantic_match)
00:01.300  🧠 User Memory Retrieval: 3 memories found
00:01.500  📝 Prompt Construction: Started
00:01.800  🤖 LLM Call: Started (model: gpt-4o-mini, type: hybrid_response)
00:02.900  🤖 LLM Call: Response generated (145 chars)
00:03.000  ✅ Final Response: "I'd be happy to help you find a laptop..."
```

## Use Cases

### For Developers
- Debug why a specific response was generated
- Understand which matching strategy was used
- See vector search results and similarity scores
- Identify bottlenecks in the pipeline
- Debug fallback scenarios

### For Stakeholders
- Understand how the AI makes decisions
- See transparency in RAG retrieval
- Verify that user context is being used
- Monitor system performance

## Technical Details

### Trace Storage
- Traces are stored in-memory (for now)
- Automatically cleaned up after 24 hours
- Each trace includes:
  - Correlation ID for tracking
  - Session ID
  - User ID (if available)
  - All events with timestamps
  - Final response

### Event Data Structure
```typescript
interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: number;        // Absolute timestamp
  relativeTime: number;     // Relative to trace start
  data: Record<string, any>; // Event-specific data
  metadata?: Record<string, any>;
}
```

### Performance
- Tracing adds minimal overhead (~1-5ms per event)
- Events are captured synchronously
- No impact on chat response time

## Future Enhancements

- [ ] Persistent trace storage (database)
- [ ] Trace comparison (A/B testing)
- [ ] Export traces as JSON/CSV
- [ ] Search/filter traces
- [ ] Real-time trace streaming
- [ ] Trace analytics dashboard
- [ ] Integration with external observability tools

## Troubleshooting

### Trace Not Found
- Verify the trace ID is correct
- Check if trace was created (tracing must be enabled)
- Traces older than 24 hours are automatically cleaned up

### No Events in Trace
- Ensure tracing is enabled in chat service
- Check that the chat message was processed successfully
- Verify API endpoints are accessible

### Playback Not Working
- Ensure trace is fully loaded
- Check browser console for errors
- Verify all events have valid timestamps
