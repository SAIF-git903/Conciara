'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  User,
  Brain,
  Wrench,
  Database,
  Zap,
  Bot,
  RotateCcw,
  TreePine,
  MessageSquare,
  Expand,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
} from 'lucide-react';

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
  isActive?: boolean;
  parentId?: string;
}

interface ConversationTreeViewProps {
  rootNode: TreeNode;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string;
  activeNodeIds?: string[]; // For playback highlighting
  viewMode?: 'accordion' | 'tree'; // View mode: accordion or tree with branches
}

const NODE_TYPE_CONFIG = {
  root: { Icon: TreePine, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' },
  user_message: { Icon: User, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  reasoning: { Icon: Brain, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  tool_call: { Icon: Wrench, color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  memory: { Icon: Database, color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' },
  decision: { Icon: Zap, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  response: { Icon: Bot, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  alternate_path: { Icon: RotateCcw, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
};

export default function ConversationTreeView({
  rootNode,
  onNodeClick,
  selectedNodeId,
  activeNodeIds = [],
  viewMode = 'tree',
}: ConversationTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]));
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3)); // Max zoom 3x
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3)); // Min zoom 0.3x
  };

  const resetZoom = () => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Handle drag/pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'tree') return;
    
    // Don't start drag if clicking on buttons, interactive elements, or nodes
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="button"]') ||
      target.closest('[class*="cursor-pointer"]') ||
      target.closest('[onclick]')
    ) {
      return;
    }
    
    // Only start drag with left mouse button
    if (e.button !== 0) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    panStartRef.current = { ...panPosition };
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== 'tree') return;
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Only update if there's significant movement (prevents accidental drags)
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setPanPosition({
        x: panStartRef.current.x + deltaX,
        y: panStartRef.current.y + deltaY,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDragging(false);
  };

  // Handle mouse leave to stop dragging
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, []);

  // Handle keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Handle mouse wheel zoom (Ctrl/Cmd + Scroll) - Reduced sensitivity
  useEffect(() => {
    if (viewMode !== 'tree' || !treeContainerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Reduced zoom sensitivity: 1.5% per scroll tick (slower, more controlled)
        const zoomSensitivity = 0.015;
        
        if (e.deltaY < 0) {
          setZoom((prev) => Math.min(prev + zoomSensitivity, 3));
        } else {
          setZoom((prev) => Math.max(prev - zoomSensitivity, 0.3));
        }
      }
    };

    const container = treeContainerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [viewMode]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (node: TreeNode) => {
      allIds.add(node.id);
      node.children.forEach(collectIds);
    };
    collectIds(rootNode);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([rootNode.id]));
  };

  const isExpanded = (nodeId: string) => expandedNodes.has(nodeId);
  const isSelected = (nodeId: string) => selectedNodeId === nodeId;
  const isActive = (nodeId: string) => activeNodeIds.includes(nodeId);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Accordion view renderer (simpler, nested style)
  const renderAccordionNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.root;
    const IconComponent = config.Icon;
    const hasChildren = node.children.length > 0;
    const expanded = isExpanded(node.id);
    const selected = isSelected(node.id);
    const active = isActive(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all
            ${selected ? `${config.bgColor} ${config.borderColor} border-2` : 'hover:bg-gray-50 border border-transparent'}
            ${active ? 'ring-2 ring-blue-400 shadow-md' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            onNodeClick?.(node);
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5 h-5" />
          )}

          {/* Node Icon */}
          <IconComponent className={`w-5 h-5 ${config.color} flex-shrink-0`} />

          {/* Node Label */}
          <span className={`font-semibold ${config.color} flex-1 truncate text-sm`}>{node.label}</span>

          {/* Time Badge */}
          <span className="text-xs text-gray-500 font-mono flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded">
            {formatTime(node.relativeTime)}
          </span>

          {/* Active Indicator */}
          {active && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>

        {/* Node Content Preview */}
        {node.content && expanded && (
          <div
            className="text-sm text-gray-600 px-3 py-2 mt-1 mb-2 rounded bg-gray-50 border border-gray-200"
            style={{ paddingLeft: `${depth * 20 + 44}px` }}
          >
            {node.content.length > 150 ? `${node.content.substring(0, 150)}...` : node.content}
          </div>
        )}

        {/* Children */}
        {hasChildren && expanded && (
          <div className="ml-2">
            {node.children.map((child) => renderAccordionNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Tree view renderer (classic tree structure with branches)
  const renderTreeNode = (node: TreeNode, depth: number = 0, isLast: boolean = false, parentPath: boolean[] = []): JSX.Element => {
    const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.root;
    const IconComponent = config.Icon;
    const hasChildren = node.children.length > 0;
    const expanded = isExpanded(node.id);
    const selected = isSelected(node.id);
    const active = isActive(node.id);
    const isLeaf = !hasChildren || !expanded;

    return (
      <div key={node.id} className="select-none relative flex flex-col items-center">
        {/* Branch connector from parent (vertical line) */}
        {depth > 0 && (
          <div
            className="absolute border-l-2 border-gray-400"
            style={{
              top: '-24px',
              height: '24px',
              width: '2px',
            }}
          />
        )}

        {/* Node Container */}
        <div className="relative flex items-center">

          {/* Node Circle/Box */}
          <div className="relative z-10">
            <div
              className={`
                flex flex-col items-center justify-center min-w-[140px] px-3 py-2 rounded-lg cursor-pointer transition-all
                ${selected ? `${config.bgColor} ${config.borderColor} border-2` : 'hover:bg-gray-50 border-2 border-transparent'}
                ${active ? 'ring-2 ring-blue-400 shadow-lg' : ''}
                ${isLeaf ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}
              `}
              onClick={() => {
                if (hasChildren) {
                  toggleNode(node.id);
                }
                onNodeClick?.(node);
              }}
            >
              {/* Expand/Collapse Indicator */}
              {hasChildren && (
                <button
                  className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white border-2 border-gray-400 rounded-full shadow-sm hover:bg-gray-100 transition-colors z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                >
                  {expanded ? (
                    <ChevronDown className="w-3 h-3 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  )}
                </button>
              )}

              {/* Node Icon */}
              <IconComponent className={`w-6 h-6 ${config.color} mb-1`} />

              {/* Node Label */}
              <span className={`font-semibold ${config.color} text-xs text-center mb-1 leading-tight`}>
                {node.label}
              </span>

              {/* Time Badge */}
              <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {formatTime(node.relativeTime)}
              </span>

              {/* Active Indicator */}
              {active && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </div>

            {/* Node Content Preview */}
            {node.content && expanded && (
              <div className="text-xs text-gray-600 px-2 py-1.5 mt-2 rounded bg-gray-50 border border-gray-200 max-w-[200px] text-center">
                {node.content.length > 80 ? `${node.content.substring(0, 80)}...` : node.content}
              </div>
            )}
          </div>
        </div>

        {/* Children Container */}
        {hasChildren && expanded && (
          <div className="relative mt-6 flex items-start justify-center gap-6">
            {/* Vertical line from parent down to children level */}
            <div
              className="absolute border-l-2 border-gray-400"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-24px',
                height: '24px',
                width: '2px',
              }}
            />
            
            {/* Horizontal line connecting all children */}
            {node.children.length > 1 && (
              <div
                className="absolute border-t-2 border-gray-400"
                style={{
                  left: '0',
                  right: '0',
                  top: '-24px',
                  height: '2px',
                }}
              />
            )}

            {/* Vertical lines from horizontal line to each child */}
            {node.children.map((child, index) => {
              const totalChildren = node.children.length;
              const position = totalChildren > 1 ? (index / (totalChildren - 1)) * 100 : 50;
              return (
                <div
                  key={`connector-${child.id}`}
                  className="absolute border-l-2 border-gray-400"
                  style={{
                    left: `${position}%`,
                    transform: 'translateX(-50%)',
                    top: '-24px',
                    height: '24px',
                    width: '2px',
                  }}
                />
              );
            })}

            {/* Render Children */}
            {node.children.map((child, index) => {
              const isChildLast = index === node.children.length - 1;
              const newPath = [...parentPath, isLast];
              return (
                <div key={child.id} className="relative">
                  {renderTreeNode(child, depth + 1, isChildLast, newPath)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`bg-white rounded border border-gray-200 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">Conversation Tree</h3>
        <div className="flex items-center gap-2">
          {/* Zoom Controls - Only show for tree view */}
          {viewMode === 'tree' && (
            <>
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
                <button
                  onClick={zoomOut}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom Out (Ctrl/Cmd + -)"
                  disabled={zoom <= 0.3}
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-xs text-gray-600 font-mono min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom In (Ctrl/Cmd + +)"
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors text-xs font-medium"
                  title="Reset Zoom & Pan (Ctrl/Cmd + 0)"
                >
                  Reset
                </button>
                <button
                  onClick={() => setPanPosition({ x: 0, y: 0 })}
                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors text-xs font-medium"
                  title="Reset Pan Position"
                  disabled={panPosition.x === 0 && panPosition.y === 0}
                >
                  Reset Pan
                </button>
              </div>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </>
          )}
          <div className="flex gap-2 border-l border-gray-300 pl-2">
            <button
              onClick={expandAll}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Expand All"
            >
              <Expand className="w-5 h-5" />
            </button>
            <button
              onClick={collapseAll}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Collapse All"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree or Accordion */}
      <div 
        ref={treeContainerRef}
        className={`${isFullscreen ? 'h-[calc(100vh-60px)]' : 'max-h-[calc(100vh-200px)]'} ${viewMode === 'tree' ? 'overflow-hidden p-6' : 'overflow-auto p-4'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: viewMode === 'tree' && !isDragging ? 'grab' : isDragging ? 'grabbing' : 'default',
        }}
      >
        {viewMode === 'accordion' ? (
          renderAccordionNode(rootNode)
        ) : (
          <div 
            className="flex justify-center transition-transform duration-200 ease-out"
            style={{ 
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              minHeight: '100%',
              paddingBottom: `${(zoom - 1) * 50}px`,
              userSelect: isDragging ? 'none' : 'auto',
            }}
          >
            {renderTreeNode(rootNode, 0, true, [])}
          </div>
        )}
      </div>
    </div>
  );
}
