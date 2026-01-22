'use client';

import { useState, useEffect, useRef } from 'react';

interface TraceEvent {
  id: string;
  type: string;
  timestamp: number;
  relativeTime: number;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

interface Trace {
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

type PlaybackSpeed = 0.25 | 0.5 | 1 | 'step';
type PlaybackState = 'idle' | 'playing' | 'paused';

const EVENT_TYPES = {
  user_input: { label: 'Input', color: 'bg-blue-500', icon: '👤' },
  tokenization: { label: 'Tokenize', color: 'bg-purple-500', icon: '🔤' },
  intent_detection: { label: 'Intent', color: 'bg-yellow-500', icon: '🎯' },
  dialog_tree_search: { label: 'Tree', color: 'bg-green-500', icon: '🌳' },
  vector_db_search: { label: 'Vector', color: 'bg-indigo-500', icon: '🔍' },
  rag_retrieval: { label: 'RAG', color: 'bg-pink-500', icon: '📚' },
  user_memory_retrieval: { label: 'Memory', color: 'bg-cyan-500', icon: '🧠' },
  prompt_construction: { label: 'Prompt', color: 'bg-orange-500', icon: '📝' },
  llm_call: { label: 'AI', color: 'bg-red-500', icon: '🤖' },
  slm_call: { label: 'SLM', color: 'bg-rose-500', icon: '🧠' },
  api_call: { label: 'API', color: 'bg-teal-500', icon: '🔌' },
  fallback: { label: 'Fallback', color: 'bg-gray-500', icon: '⚠️' },
  backtracking: { label: 'Retry', color: 'bg-amber-500', icon: '↩️' },
  final_response: { label: 'Done', color: 'bg-emerald-500', icon: '✅' },
};

export default function TraceViewerPage() {
  const [traceId, setTraceId] = useState<string>('');
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(-1);
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent | null>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playbackSpeedRef = useRef<PlaybackSpeed>(1);

  const loadTrace = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBaseUrl = isLocalhost 
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
        : '/api/proxy';
      
      const response = await fetch(`${apiBaseUrl}/trace/${id}`);
      if (!response.ok) throw new Error('Trace not found');
      
      const data = await response.json();
      setTrace(data);
      setCurrentEventIndex(-1);
      setSelectedEvent(null);
      setPlaybackState('idle');
    } catch (err: any) {
      setError(err.message || 'Failed to load trace');
    } finally {
      setLoading(false);
    }
  };

  const startPlayback = () => {
    if (!trace || trace.events.length === 0) return;
    
    // If we're at the end, reset first
    if (currentEventIndex >= trace.events.length - 1) {
      resetPlayback();
      setTimeout(() => startPlayback(), 100);
      return;
    }
    
    isPlayingRef.current = true;
    setPlaybackState('playing');
    
    // Ensure ref is synced with current state
    playbackSpeedRef.current = playbackSpeed;
    
    if (playbackSpeed === 'step') {
      // Step mode: just advance one step
      stepForward();
      isPlayingRef.current = false;
      setPlaybackState('idle'); // Step mode stops after one step
    } else {
      // Time-based playback: start from current position
      // If at -1, start from first event (index 0)
      const startIndex = currentEventIndex < 0 ? 0 : currentEventIndex;
      
      if (startIndex < trace.events.length) {
        // Show first event immediately
        setCurrentEventIndex(startIndex);
        setSelectedEvent(trace.events[startIndex]);
        
        // Then schedule next events
        if (startIndex < trace.events.length - 1) {
          scheduleNextEvent(startIndex);
        } else {
          isPlayingRef.current = false;
          setPlaybackState('idle');
        }
      }
    }
  };

  const scheduleNextEvent = (currentIndex: number) => {
    if (!trace || currentIndex >= trace.events.length - 1) {
      isPlayingRef.current = false;
      setPlaybackState('idle');
      return;
    }

    const nextIndex = currentIndex + 1;
    const currentEvent = trace.events[currentIndex];
    const nextEvent = trace.events[nextIndex];
    
    // Read speed from ref to get latest value (avoids stale closure)
    const currentSpeed = playbackSpeedRef.current;
    const speed = currentSpeed === 'step' ? 1 : currentSpeed;
    
    // Calculate the actual time difference between events
    const timeDiff = nextEvent.relativeTime - currentEvent.relativeTime;
    
    // Apply speed multiplier to the time difference
    // 0.25x = 4x slower, 0.5x = 2x slower, 1x = normal speed
    let delay = timeDiff / speed;
    
    // Add a base delay that's speed-dependent to ensure visible differences
    // This ensures even very fast events (with small timeDiff) show speed differences
    const baseDelay = speed === 0.25 ? 800 : speed === 0.5 ? 400 : 200;
    
    // Combine time-based delay with base delay
    // For slow speeds, the base delay dominates; for fast speeds, timeDiff dominates
    const actualDelay = Math.max(delay, baseDelay);
    
    console.log(`[Playback] Event ${nextIndex}: timeDiff=${timeDiff.toFixed(0)}ms, speed=${speed}x, calculated=${delay.toFixed(0)}ms, base=${baseDelay}ms, final=${actualDelay.toFixed(0)}ms`);
    
    // Schedule the next event
    playbackTimeoutRef.current = setTimeout(() => {
      // Check if still playing using ref (avoids stale closure)
      if (isPlayingRef.current && nextIndex < trace.events.length) {
        setCurrentEventIndex(nextIndex);
        setSelectedEvent(nextEvent);
        if (nextIndex < trace.events.length - 1) {
          scheduleNextEvent(nextIndex);
        } else {
          isPlayingRef.current = false;
          setPlaybackState('idle');
        }
      }
    }, actualDelay);
  };

  const pausePlayback = () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    isPlayingRef.current = false;
    setPlaybackState('paused');
  };

  const resetPlayback = () => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    isPlayingRef.current = false;
    setCurrentEventIndex(-1);
    setSelectedEvent(null);
    setPlaybackState('idle');
  };

  const stepForward = () => {
    if (!trace || currentEventIndex >= trace.events.length - 1) return;
    const nextIndex = currentEventIndex + 1;
    setCurrentEventIndex(nextIndex);
    setSelectedEvent(trace.events[nextIndex]);
  };

  const stepBackward = () => {
    if (currentEventIndex <= 0) return;
    if (!trace) return;
    const prevIndex = currentEventIndex - 1;
    setCurrentEventIndex(prevIndex);
    setSelectedEvent(trace.events[prevIndex]);
  };

  // Sync ref with state
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  // Stop playback when state changes to paused or idle
  useEffect(() => {
    if (playbackState !== 'playing' && playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, [playbackState]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES[type as keyof typeof EVENT_TYPES] || {
      label: type,
      color: 'bg-gray-400',
      icon: '⚙️',
    };
  };

  const getEventSummary = (event: TraceEvent) => {
    switch (event.type) {
      case 'vector_db_search':
        return event.data.topResult 
          ? `Match: "${event.data.topResult.userInput.substring(0, 30)}" (${(event.data.topResult.similarity * 100).toFixed(0)}%)`
          : 'No match';
      case 'dialog_tree_search':
        return event.data.matchedNodeId 
          ? `Matched: "${event.data.matchedUserInput?.substring(0, 30) || 'node'}"`
          : 'No match';
      case 'llm_call':
        return event.data.response 
          ? event.data.response.substring(0, 60) + (event.data.response.length > 60 ? '...' : '')
          : event.data.error ? `Error: ${event.data.error.substring(0, 30)}` : 'Processing';
      case 'user_memory_retrieval':
        return `${event.data.memoriesFound || 0} memories`;
      default:
        return event.data.status || '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">AI Trace Viewer</h1>
            {trace && (
              <div className="text-xs text-gray-500">
                {trace.events.length} steps • {trace.endTime ? formatTime(trace.endTime - trace.startTime) : '...'}
              </div>
            )}
          </div>
          
          {/* Compact Loader */}
          <div className="flex gap-2">
            <input
              type="text"
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              placeholder="Paste trace ID..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && !loading && traceId && loadTrace(traceId)}
            />
            <button
              onClick={() => loadTrace(traceId)}
              disabled={loading || !traceId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '...' : 'Load'}
            </button>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}
        </div>

        {trace && (
          <>
            {/* Compact Info & Controls */}
            <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">User: &quot;{trace.userMessage}&quot;</div>
                  {trace.finalResponse && (
                    <div className="text-xs text-gray-500">AI: &quot;{trace.finalResponse.substring(0, 60)}...&quot;</div>
                  )}
                </div>
                
                {/* Compact Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={resetPlayback}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm"
                    title="Reset"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={stepBackward}
                    disabled={currentEventIndex <= 0}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 text-sm"
                  >
                    ⏪
                  </button>
                  {playbackState === 'playing' ? (
                    <button
                      onClick={pausePlayback}
                      className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                    >
                      ⏸
                    </button>
                  ) : (
                    <button
                      onClick={startPlayback}
                      disabled={currentEventIndex >= trace.events.length - 1}
                      className="px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-400"
                    >
                      ▶
                    </button>
                  )}
                  <button
                    onClick={stepForward}
                    disabled={currentEventIndex >= trace.events.length - 1}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 text-sm"
                  >
                    ⏩
                  </button>
                  
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                  
                  {([0.25, 0.5, 1, 'step'] as PlaybackSpeed[]).map((speed) => (
                    <button
                      key={String(speed)}
                      onClick={() => {
                        const wasPlaying = isPlayingRef.current;
                        const savedIndex = currentEventIndex;
                        
                        console.log(`[Speed] Changing to ${speed}x, wasPlaying: ${wasPlaying}, currentIndex: ${savedIndex}`);
                        
                        // Update speed ref FIRST (before any async operations)
                        playbackSpeedRef.current = speed;
                        setPlaybackSpeed(speed);
                        
                        // If currently playing, restart from current position with new speed
                        if (wasPlaying && trace) {
                          // Clear current timeout immediately
                          if (playbackTimeoutRef.current) {
                            clearTimeout(playbackTimeoutRef.current);
                            playbackTimeoutRef.current = null;
                          }
                          
                          // Restart playback from current position with new speed
                          // Use the saved index (from closure) to avoid stale state
                          if (savedIndex >= 0 && savedIndex < trace.events.length - 1) {
                            // Immediately reschedule with new speed
                            // The ref is already updated above, so scheduleNextEvent will use it
                            scheduleNextEvent(savedIndex);
                          } else if (savedIndex === -1) {
                            // If at start, begin from first event
                            scheduleNextEvent(-1);
                          }
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        playbackSpeed === speed
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {speed === 'step' ? 'S' : `${speed}x`}
                    </button>
                  ))}
                  
                  <div className="text-xs text-gray-500 ml-2">
                    {currentEventIndex + 1}/{trace.events.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Compact Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Compact Timeline */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                  <div className="space-y-2">
                    {trace.events.map((event, index) => {
                      const eventInfo = getEventTypeInfo(event.type);
                      const isActive = index === currentEventIndex;
                      const isPast = index < currentEventIndex;
                      const summary = getEventSummary(event);
                      
                      return (
                        <div key={event.id}>
                          <div
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer text-sm ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : isPast
                                ? 'border-gray-200 bg-gray-50 opacity-70'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setCurrentEventIndex(index);
                              setSelectedEvent(event);
                            }}
                          >
                            <div className={`w-8 h-8 rounded-full ${eventInfo.color} flex items-center justify-center text-base flex-shrink-0`}>
                              {eventInfo.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {eventInfo.label}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {formatTime(event.relativeTime)}
                                </span>
                              </div>
                              {summary && (
                                <div className="text-xs text-gray-600 mt-0.5 truncate">
                                  {summary}
                                </div>
                              )}
                            </div>
                            {isActive && (
                              <div className="text-blue-600 text-sm">▶</div>
                            )}
                          </div>
                          {index < trace.events.length - 1 && (
                            <div className="flex justify-center -my-1">
                              <div className={`w-0.5 h-2 ${isPast ? 'bg-gray-300' : 'bg-gray-200'}`}></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Compact Details Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 sticky top-3 max-h-[calc(100vh-1rem)] overflow-y-auto">
                  {selectedEvent ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Step</div>
                        <div className="font-semibold text-sm text-gray-900">
                          {getEventTypeInfo(selectedEvent.type).label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatTime(selectedEvent.relativeTime)}
                        </div>
                      </div>

                      {/* Compact Event-Specific Info */}
                      {selectedEvent.type === 'vector_db_search' && selectedEvent.data.topResult && (
                        <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
                          <div className="text-xs font-semibold text-indigo-900 mb-1">Match</div>
                          <div className="text-xs text-gray-700 mb-1">
                            &quot;{selectedEvent.data.topResult.userInput}&quot;
                          </div>
                          <div className="text-xs text-gray-600">
                            {(selectedEvent.data.topResult.similarity * 100).toFixed(0)}% similar
                          </div>
                        </div>
                      )}

                      {selectedEvent.type === 'dialog_tree_search' && selectedEvent.data.matchedNodeId && (
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <div className="text-xs font-semibold text-green-900 mb-1">Matched</div>
                          <div className="text-xs text-gray-700">
                            &quot;{selectedEvent.data.matchedUserInput}&quot;
                          </div>
                        </div>
                      )}

                      {selectedEvent.type === 'llm_call' && selectedEvent.data.response && (
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <div className="text-xs font-semibold text-red-900 mb-1">Response</div>
                          <div className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {selectedEvent.data.response}
                          </div>
                        </div>
                      )}

                      {selectedEvent.type === 'user_memory_retrieval' && selectedEvent.data.memories && (
                        <div className="p-2 bg-cyan-50 rounded border border-cyan-200">
                          <div className="text-xs font-semibold text-cyan-900 mb-1">
                            {selectedEvent.data.memoriesFound} Memories
                          </div>
                          <div className="space-y-1 mt-1">
                            {selectedEvent.data.memories.slice(0, 2).map((memory: any, idx: number) => (
                              <div key={idx} className="text-xs text-gray-700 bg-white p-1.5 rounded">
                                {memory.content.substring(0, 60)}...
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compact Raw Data */}
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
                          Technical Details
                        </summary>
                        <div className="mt-1.5 p-2 bg-gray-50 rounded border border-gray-200">
                          <pre className="text-xs overflow-auto max-h-48">
                            {JSON.stringify(selectedEvent.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-2xl mb-1">👆</div>
                      <div className="text-xs">Click a step</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!trace && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trace Loaded</h3>
            <p className="text-sm text-gray-600 mb-3">
              Enter a trace ID to view AI processing steps
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded inline-block">
              <div className="font-semibold mb-1">How to get Trace ID:</div>
              <div>1. Send a chat message</div>
              <div>2. Copy &quot;trace_id&quot; from response</div>
              <div>3. Paste it above</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
