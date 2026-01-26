'use client';

import { useState } from 'react';
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
}: ConversationTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]));

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

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
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
            flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer transition-all text-xs
            ${selected ? `${config.bgColor} ${config.borderColor} border` : 'hover:bg-gray-50'}
            ${active ? 'ring-1 ring-blue-400' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
              className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-3.5 h-3.5" />
          )}

          {/* Node Icon */}
          <IconComponent className={`w-3.5 h-3.5 ${config.color} flex-shrink-0`} />

          {/* Node Label */}
          <span className={`font-medium ${config.color} flex-1 truncate`}>{node.label}</span>

          {/* Time Badge */}
          <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
            {formatTime(node.relativeTime)}
          </span>

          {/* Active Indicator */}
          {active && (
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>

        {/* Node Content Preview */}
        {node.content && expanded && (
          <div
            className="text-[11px] text-gray-600 px-2 py-0.5 mb-0.5 rounded bg-gray-50"
            style={{ paddingLeft: `${depth * 16 + 40}px` }}
          >
            {node.content.length > 80 ? `${node.content.substring(0, 80)}...` : node.content}
          </div>
        )}

        {/* Children */}
        {hasChildren && expanded && (
          <div className="ml-2 border-l border-gray-200">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded border border-gray-200">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Conversation Tree</h3>
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Expand All"
          >
            <Expand className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Collapse All"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
        {renderNode(rootNode)}
      </div>
    </div>
  );
}
