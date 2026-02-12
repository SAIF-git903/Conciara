'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import ConversationSidebar from '@/components/ConversationSidebar';
import ConversationTreeView, { TreeNode } from '@/components/ConversationTreeView';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import {
  SkipBack,
  StepBack,
  Play,
  Pause,
  StepForward,
  SkipForward,
  TreePine,
  Bug,
  Gauge,
  Keyboard,
  AlertCircle,
  Search,
  LayoutList,
  Network,
} from 'lucide-react';

interface ConversationTree {
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

type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 'step';
type PlaybackState = 'idle' | 'playing' | 'paused';

// Enhanced node structure for playback with trace grouping
interface PlaybackNode extends TreeNode {
  traceGroupId?: string | null; // ID of the user message this node belongs to
  isTraceStart?: boolean; // True if this is the start of a new trace (user message)
}

export default function ConversationDebuggerPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [conversationTree, setConversationTree] = useState<ConversationTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'accordion' | 'tree'>('tree'); // View mode toggle

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState<number>(0);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playbackSpeedRef = useRef<PlaybackSpeed>(1);
  const playbackIndexRef = useRef<number>(0);
  const allNodesRef = useRef<TreeNode[]>([]);
  const playbackNodesRef = useRef<PlaybackNode[]>([]); // Enhanced nodes with trace grouping
  const playbackStateRef = useRef<PlaybackState>('idle');
  const startPlaybackRef = useRef<() => void>();
  const pausePlaybackRef = useRef<() => void>();
  const stepForwardRef = useRef<() => void>();
  const stepBackwardRef = useRef<() => void>();
  const resetPlaybackRef = useRef<() => void>();
  const updateActiveNodeRef = useRef<(node: TreeNode) => void>();

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  // Define updateActiveNode first (before it's used in other functions)
  const updateActiveNode = useCallback((node: TreeNode) => {
    setActiveNodeIds([node.id]);
    setSelectedNode(node);

    // Highlight path to root
    if (conversationTree) {
      const pathToRoot: string[] = [];
      const findPath = (n: TreeNode, targetId: string, path: string[]): boolean => {
        if (n.id === targetId) {
          path.push(n.id);
          return true;
        }
        for (const child of n.children) {
          if (findPath(child, targetId, path)) {
            path.push(n.id);
            return true;
          }
        }
        return false;
      };
      findPath(conversationTree.rootNode, node.id, pathToRoot);
      setActiveNodeIds(pathToRoot);
    }
  }, [conversationTree]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault();
          if (playbackStateRef.current === 'playing') {
            pausePlaybackRef.current?.();
          } else {
            startPlaybackRef.current?.();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackwardRef.current?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForwardRef.current?.();
          break;
        case 'Home':
          e.preventDefault();
          resetPlaybackRef.current?.();
          break;
        case 'End':
          e.preventDefault();
          if (allNodesRef.current.length > 0) {
            playbackIndexRef.current = allNodesRef.current.length - 1;
            setCurrentPlaybackIndex(allNodesRef.current.length - 1);
            const last = allNodesRef.current[allNodesRef.current.length - 1];
            updateActiveNodeRef.current?.(last);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConversationTree = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiBaseUrl();

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/conversations/${sessionId}/tree`, {
        headers,
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to load conversation tree';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const tree: ConversationTree = await response.json();
      setConversationTree(tree);
      setSelectedNode(null);
      setActiveNodeIds([]);
      playbackIndexRef.current = 0;
      setCurrentPlaybackIndex(0);
      setError(null); // Clear any previous errors

      // Collect all nodes in order for playback with trace grouping
      // This groups nodes by user message (trace) so we can skip gaps between messages
      const collectNodesWithTraceGroups = (
        node: TreeNode,
        traceGroupId: string | null = null,
        isTraceStart: boolean = false
      ): PlaybackNode[] => {
        // User messages start a new trace group
        const currentTraceGroupId = node.type === 'user_message' ? node.id : traceGroupId;
        const isNewTraceStart = node.type === 'user_message';

        const playbackNode: PlaybackNode = {
          ...node,
          traceGroupId: currentTraceGroupId || null,
          isTraceStart: isNewTraceStart,
        };

        const nodes: PlaybackNode[] = [playbackNode];

        // Recursively collect children with the same trace group
        node.children.forEach(child => {
          nodes.push(...collectNodesWithTraceGroups(
            child,
            currentTraceGroupId || traceGroupId,
            false
          ));
        });

        return nodes;
      };

      // Collect nodes with trace grouping and sort by time
      const allPlaybackNodes = collectNodesWithTraceGroups(tree.rootNode);
      playbackNodesRef.current = allPlaybackNodes.sort((a, b) => a.relativeTime - b.relativeTime);
      allNodesRef.current = playbackNodesRef.current; // Keep for compatibility with existing code
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation tree');
      setConversationTree(null); // Clear tree on error
      console.error('Error loading conversation tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    resetPlayback();
    loadConversationTree(sessionId);
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
  };

  // Playback functions
  const startPlayback = () => {
    if (!conversationTree || allNodesRef.current.length === 0) return;

    if (playbackIndexRef.current >= allNodesRef.current.length - 1) {
      resetPlayback();
      setTimeout(() => startPlayback(), 100);
      return;
    }

    isPlayingRef.current = true;
    setPlaybackState('playing');

    if (playbackSpeed === 'step') {
      stepForward();
      isPlayingRef.current = false;
      setPlaybackState('idle');
    } else {
      scheduleNextNode();
    }
  };

  const scheduleNextNode = () => {
    if (!isPlayingRef.current || playbackIndexRef.current >= playbackNodesRef.current.length - 1) {
      isPlayingRef.current = false;
      setPlaybackState('idle');
      return;
    }

    const currentIndex = playbackIndexRef.current;
    const currentNode = playbackNodesRef.current[currentIndex];
    const nextNode = playbackNodesRef.current[currentIndex + 1];

    const speed = playbackSpeedRef.current === 'step' ? 1 : playbackSpeedRef.current;
    const baseDelay = speed === 0.25 ? 800 : speed === 0.5 ? 400 : speed === 1 ? 200 : 100;

    // IDEAL APPROACH: Use trace grouping to skip gaps between user messages
    // - Within the same trace group: use actual processing time (shows real AI response time)
    // - Between different trace groups: skip the gap (minimal delay)
    // - Root and user messages: appear instantly

    let delay: number;

    // Check if we're transitioning between different trace groups (different user messages)
    const isDifferentTraceGroup =
      currentNode.traceGroupId &&
      nextNode.traceGroupId &&
      currentNode.traceGroupId !== nextNode.traceGroupId;

    // Check if next node starts a new trace (new user message)
    const isNewTraceStart = nextNode.isTraceStart || nextNode.type === 'user_message';

    // Check if current node is root or user message (these should appear instantly)
    const isTransitionFromRootOrUser =
      currentNode.type === 'root' ||
      currentNode.type === 'user_message';

    if (isDifferentTraceGroup || isNewTraceStart || isTransitionFromRootOrUser) {
      // Skip gaps between user messages - they should appear instantly
      // This prevents long waits when there are gaps between user messages
      delay = baseDelay;
    } else {
      // Within the same trace group, use actual processing time
      // This shows the real AI response time for this specific message
      const timeDiff = nextNode.relativeTime - currentNode.relativeTime;
      delay = Math.max(timeDiff / speed, baseDelay);
    }

    playbackTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current && playbackIndexRef.current < playbackNodesRef.current.length - 1) {
        playbackIndexRef.current++;
        setCurrentPlaybackIndex(playbackIndexRef.current);
        const next = playbackNodesRef.current[playbackIndexRef.current];
        updateActiveNode(next);

        if (playbackIndexRef.current < playbackNodesRef.current.length - 1) {
          scheduleNextNode();
        } else {
          isPlayingRef.current = false;
          setPlaybackState('idle');
        }
      }
    }, delay);
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
    playbackIndexRef.current = 0;
    setCurrentPlaybackIndex(0);
    setActiveNodeIds([]);
    setSelectedNode(null);
    setPlaybackState('idle');
  };

  const stepForward = () => {
    if (playbackIndexRef.current >= allNodesRef.current.length - 1) return;
    playbackIndexRef.current++;
    setCurrentPlaybackIndex(playbackIndexRef.current);
    const next = allNodesRef.current[playbackIndexRef.current];
    updateActiveNode(next);
  };

  const stepBackward = () => {
    if (playbackIndexRef.current <= 0) return;
    playbackIndexRef.current--;
    setCurrentPlaybackIndex(playbackIndexRef.current);
    const next = allNodesRef.current[playbackIndexRef.current];
    updateActiveNode(next);
  };

  const handleTimelineChange = (value: number) => {
    const index = Math.min(Math.max(0, Math.floor(value)), allNodesRef.current.length - 1);
    playbackIndexRef.current = index;
    setCurrentPlaybackIndex(index);
    const node = allNodesRef.current[index];
    updateActiveNode(node);
    if (isPlayingRef.current) {
      pausePlayback();
    }
  };

  // Store function refs (after all functions are defined)
  useEffect(() => {
    startPlaybackRef.current = startPlayback;
    pausePlaybackRef.current = pausePlayback;
    stepForwardRef.current = stepForward;
    stepBackwardRef.current = stepBackward;
    resetPlaybackRef.current = resetPlayback;
    updateActiveNodeRef.current = updateActiveNode;
  }, [startPlayback, pausePlayback, stepForward, stepBackward, resetPlayback, updateActiveNode]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader />
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className='h-[92vh]'>
            <ConversationSidebar
              onSelectConversation={handleSelectConversation}
              selectedSessionId={selectedSessionId || undefined}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-gray-700" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">AI Conversation Debugger</h1>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Visualize and replay AI conversations
                    </p>
                  </div>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Keyboard className="w-4 h-4" />
                  <span>Space: Play/Pause | ← →: Step | Home/End: Jump</span>
                </div>
              </div>

              {/* Debugger Toolbar */}
              {conversationTree && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {/* Main Play/Pause Button - Large and Prominent */}
                    <div className="flex items-center gap-1.5">
                      {playbackState === 'playing' ? (
                        <button
                          onClick={pausePlayback}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-sm transition-all hover:shadow-md flex items-center gap-2 font-medium"
                          title="Pause (Space)"
                        >
                          <Pause className="w-5 h-5" />
                          <span className="text-base">Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={startPlayback}
                          disabled={currentPlaybackIndex >= allNodesRef.current.length - 1}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-all hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:shadow-sm flex items-center gap-2 font-medium"
                          title="Play (Space)"
                        >
                          <Play className="w-5 h-5" />
                          <span className="text-base">Play</span>
                        </button>
                      )}
                    </div>

                    {/* Step Controls */}
                    <div className="flex items-center gap-1 border-l border-gray-300 pl-3">
                      <button
                        onClick={resetPlayback}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                        title="Reset to Start (Home)"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={stepBackward}
                        disabled={currentPlaybackIndex <= 0}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Step Backward (←)"
                      >
                        <StepBack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={stepForward}
                        disabled={currentPlaybackIndex >= allNodesRef.current.length - 1}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Step Forward (→)"
                      >
                        <StepForward className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          playbackIndexRef.current = allNodesRef.current.length - 1;
                          setCurrentPlaybackIndex(allNodesRef.current.length - 1);
                          const last = allNodesRef.current[allNodesRef.current.length - 1];
                          updateActiveNode(last);
                        }}
                        disabled={currentPlaybackIndex >= allNodesRef.current.length - 1}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Skip to End (End)"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Timeline Scrubber */}
                    <div className="flex-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0, allNodesRef.current.length - 1)}
                          value={currentPlaybackIndex}
                          onChange={(e) => handleTimelineChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${allNodesRef.current.length > 1 ? (currentPlaybackIndex / (allNodesRef.current.length - 1)) * 100 : 0}%, #e5e7eb ${allNodesRef.current.length > 1 ? (currentPlaybackIndex / (allNodesRef.current.length - 1)) * 100 : 0}%, #e5e7eb 100%)`
                          }}
                        />
                        {playbackState === 'playing' && (
                          <div className="absolute top-0 left-0 w-full h-2 rounded-lg pointer-events-none">
                            <div
                              className="h-full bg-blue-400 opacity-30 rounded-lg transition-all duration-100"
                              style={{
                                width: `${allNodesRef.current.length > 1 ? (currentPlaybackIndex / (allNodesRef.current.length - 1)) * 100 : 0}%`
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 font-mono min-w-[80px] text-right font-semibold">
                        {currentPlaybackIndex + 1} / {allNodesRef.current.length}
                      </div>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
                      <span className="text-xs text-gray-600 uppercase tracking-wide mr-1 font-semibold">Speed:</span>
                      {([0.25, 0.5, 1, 2, 'step'] as PlaybackSpeed[]).map((speed) => (
                        <button
                          key={String(speed)}
                          onClick={() => {
                            const wasPlaying = isPlayingRef.current;
                            playbackSpeedRef.current = speed;
                            setPlaybackSpeed(speed);
                            if (wasPlaying) {
                              pausePlayback();
                              setTimeout(() => startPlayback(), 100);
                            }
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${playbackSpeed === speed
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                        >
                          {speed === 'step' ? 'Step' : `${speed}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Tree View */}
              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-base text-gray-600">Loading conversation tree...</div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-red-900 mb-2">Failed to Load Conversation Tree</h3>
                        <p className="text-sm text-red-700 mb-4">{error}</p>
                        {error.toLowerCase().includes('no traces') && (
                          <div className="bg-white border border-red-100 rounded p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <Search className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-gray-700">
                                <p className="font-semibold mb-1">No traces found for this session</p>
                                <p className="text-gray-600">
                                  This conversation doesn&apos;t have any trace data. Traces are created when the AI processes messages.
                                  Make sure the conversation has been used and tracing is enabled.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => loadConversationTree(selectedSessionId!)}
                          className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                ) : conversationTree ? (
                  <div className="h-full flex flex-col">
                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-end gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-600 font-medium">View:</span>
                      <div className="flex gap-1 bg-white border border-gray-300 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('accordion')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'accordion'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          title="Accordion View"
                        >
                          <LayoutList className="w-3.5 h-3.5" />
                          Accordion
                        </button>
                        <button
                          onClick={() => setViewMode('tree')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'tree'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          title="Tree View with Branches"
                        >
                          <Network className="w-3.5 h-3.5" />
                          Tree
                        </button>
                      </div>
                    </div>
                    <ConversationTreeView
                      rootNode={conversationTree.rootNode}
                      onNodeClick={handleNodeClick}
                      selectedNodeId={selectedNode?.id}
                      activeNodeIds={activeNodeIds}
                      viewMode={viewMode}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <TreePine className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-sm font-semibold mb-1 text-gray-600">No Conversation Selected</h3>
                      <p className="text-xs">Select a conversation from the sidebar to view its tree structure</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Panel */}
              {selectedNode && (
                <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
                    <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Node Details</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Type</div>
                      <div className="text-sm font-medium text-gray-900">{selectedNode.type}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Label</div>
                      <div className="text-sm font-medium text-gray-900">{selectedNode.label}</div>
                    </div>

                    {selectedNode.content && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Content</div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap border border-gray-200">
                          {selectedNode.content}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Time</div>
                      <div className="text-sm text-gray-700 font-mono font-semibold">
                        {formatTime(selectedNode.relativeTime)}
                      </div>
                    </div>

                    {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Data</div>
                        <div className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48 border border-gray-200">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedNode.data, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Metadata</div>
                        <div className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48 border border-gray-200">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedNode.metadata, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
