'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, Sphere, Box, Cylinder, Cone, Text } from '@react-three/drei';
import { Tree } from 'react-d3-tree';
import * as THREE from 'three';
import { DialogNode, DialogTree } from '@/lib/api';
import { Edit2, Trash2, Plus, X, User, Bot, Info, Maximize2, Minimize2, Save, ChevronDown, ChevronRight } from 'lucide-react';

interface TreeVisualizationProps {
  nodes: DialogNode[];
  selectedTree: DialogTree;
  onNodeClick?: (node: DialogNode) => void;
  onNodeEdit?: (node: DialogNode) => void;
  onNodeDelete?: (nodeId: number) => void;
  onNodeAddChild?: (parentId: number) => void;
  onNodeAddRoot?: () => void;
  onNodeCreate?: (parentId: number | null, userInput: string, botResponse: string) => Promise<DialogNode>;
  onNodeUpdate?: (id: number, userInput: string, botResponse: string) => Promise<DialogNode>;
  onNodesUpdate?: (updatedNodes: DialogNode[]) => void;
  selectedNodeId?: number | null;
}

interface TreeNode {
  name: string;
  nodeId?: number;
  attributes?: {
    userInput?: string;
    botResponse?: string;
    nodeId?: number;
    isEditingExisting?: boolean | null;
    isEditing?: boolean;
    parentId?: number | null;
  };
  children?: TreeNode[];
}

// ============== 2D VIEW COMPONENT WITH FIXED HOVER ==============
function Tree2DView({
  nodes,
  onNodeClick,
  selectedNodeId,
  onNodeEdit,
  onNodeDelete,
  onNodeAddChild,
  editingNode,
  editingExistingNode,
  isCreating,
  isUpdating,
  onSaveNewNode,
  onSaveExistingNode,
  onCancelNewNode,
  onCancelExistingNode,
  setEditingNode,
  setEditingExistingNode,
}: {
  nodes: DialogNode[];
  onNodeClick?: (node: DialogNode) => void;
  selectedNodeId?: number | null;
  onNodeEdit?: (node: DialogNode) => void;
  onNodeDelete?: (nodeId: number) => void;
  onNodeAddChild?: (parentId: number) => void;
  editingNode: { parentId: number | null; userInput: string; botResponse: string } | null;
  editingExistingNode: { id: number; userInput: string; botResponse: string } | null;
  isCreating: boolean;
  isUpdating: boolean;
  onSaveNewNode: () => void;
  onSaveExistingNode: () => void;
  onCancelNewNode: () => void;
  onCancelExistingNode: () => void;
  setEditingNode: (node: any) => void;
  setEditingExistingNode: (node: any) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 200, y: 50 });
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const nodeMap = useMemo(() => {
    const map = new Map<number, DialogNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Handle hover with delay to prevent flicker
  const handleMouseEnter = (nodeId: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredNodeId(nodeId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNodeId(null);
    }, 300); // 300ms delay before hiding
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const treeData: any = useMemo(() => {
    const buildTree = (parentId: number | null): TreeNode[] => {
      const children = nodes.filter((n) => n.parent_id === parentId);
      const result: TreeNode[] = [];

      children.forEach((node) => {
        const isBeingEdited = editingExistingNode && editingExistingNode.id === node.id;

        let nodeName = '';
        if (isBeingEdited) {
          nodeName = 'Editing Node...';
        } else if (node.user_input && node.bot_response) {
          nodeName = `${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`;
        } else if (node.user_input) {
          nodeName = `👤 ${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`;
        } else if (node.bot_response) {
          nodeName = `🤖 ${node.bot_response.substring(0, 20)}${node.bot_response.length > 20 ? '...' : ''}`;
        } else {
          nodeName = 'Empty Node';
        }

        result.push({
          name: nodeName,
          nodeId: node.id,
          attributes: {
            userInput: isBeingEdited ? editingExistingNode.userInput : node.user_input || '',
            botResponse: isBeingEdited ? editingExistingNode.botResponse : node.bot_response || '',
            nodeId: node.id,
            isEditingExisting: isBeingEdited,
          },
          children: buildTree(node.id),
        });
      });

      if (editingNode && editingNode.parentId === parentId) {
        result.push({
          name: 'New Node (editing)',
          nodeId: -1,
          attributes: {
            userInput: editingNode.userInput,
            botResponse: editingNode.botResponse,
            nodeId: -1,
            isEditing: true,
            parentId: parentId,
          },
          children: [],
        });
      }

      return result;
    };

    const rootNodes = buildTree(null);

    if (rootNodes.length === 0 && !editingNode) {
      return {
        name: 'No nodes',
        attributes: {},
      };
    }

    if (rootNodes.length === 1) {
      return rootNodes[0];
    }

    return {
      name: '',
      children: rootNodes,
    };
  }, [nodes, editingNode, editingExistingNode]);

  const handleNodeClick = (nodeData: any) => {
    const nodeId = nodeData.attributes?.nodeId || nodeData.nodeId;
    if (nodeId && nodeId > 0 && nodeMap.has(nodeId)) {
      const node = nodeMap.get(nodeId)!;
      onNodeClick?.(node);
    }
  };

  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 rounded-lg overflow-hidden relative">
      {/* 2D Controls */}
      dfgasdf asf asdfasdf asfdasfasdfsadf asfd
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-2 py-1 shadow-sm">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Zoom out"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-semibold w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Zoom in"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-600 text-xs rounded-lg border border-gray-200 shadow-sm">
          {nodes.length} nodes
        </div>
      </div>
      <div ref={treeContainerRef} className="w-full h-full">
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="straight"
          translate={translate}
          nodeSize={{ x: 320, y: 250 }}
          separation={{ siblings: 1.5, nonSiblings: 1.5 }}
          zoom={zoom}
          scaleExtent={{ min: 0.5, max: 2 }}
          onNodeClick={handleNodeClick}
          pathClassFunc={() => 'tree-link'}
          enableLegacyTransitions={true}
          transitionDuration={300}
          renderCustomNodeElement={(rd3tProps) => {
            const { nodeDatum } = rd3tProps;
            const nodeId = (nodeDatum.attributes as any)?.nodeId;
            const isEditing = (nodeDatum.attributes as any)?.isEditing === true;
            const isEditingExisting = (nodeDatum.attributes as any)?.isEditingExisting === true;
            const isSelected = selectedNodeId === nodeId;
            const isHovered = hoveredNodeId === nodeId;
            const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
            const hasUserInput = !!nodeDatum.attributes?.userInput;
            const hasBotResponse = !!nodeDatum.attributes?.botResponse;

            let nodeColor = '#10b981';
            if (hasUserInput && hasBotResponse) {
              nodeColor = '#8b5cf6';
            } else if (hasUserInput) {
              nodeColor = '#3b82f6';
            } else if (hasBotResponse) {
              nodeColor = '#10b981';
            }

            if (isEditing) {
              return (
                <g transform={`translate(-130, -100)`}>
                  <rect
                    x="0"
                    y="0"
                    width="260"
                    height="200"
                    rx="16"
                    fill="#fff7ed"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  <rect x="0" y="0" width="5" height="200" rx="16" fill="#f59e0b" opacity={0.9} />

                  <foreignObject x="12" y="12" width="236" height="176">
                    <div style={{ fontFamily: 'inherit' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', marginBottom: '10px' }}>✨ New Node</div>
                      <input
                        type="text"
                        placeholder="User Input (optional)"
                        value={editingNode?.userInput || ''}
                        onChange={(e) => setEditingNode({ ...editingNode!, userInput: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginBottom: '8px',
                          fontSize: '12px',
                          border: '2px solid #fbbf24',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#fffbeb',
                        }}
                      />
                      <textarea
                        placeholder="Bot Response (optional)"
                        value={editingNode?.botResponse || ''}
                        onChange={(e) => setEditingNode({ ...editingNode!, botResponse: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginBottom: '10px',
                          fontSize: '12px',
                          border: '2px solid #fbbf24',
                          borderRadius: '10px',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: '50px',
                          backgroundColor: '#fffbeb',
                        }}
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={onSaveNewNode}
                          disabled={isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim())}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: isCreating ? 'not-allowed' : 'pointer',
                            opacity: isCreating ? 0.5 : 1,
                          }}
                        >
                          {isCreating ? 'Saving...' : '✓ Save'}
                        </button>
                        <button
                          onClick={onCancelNewNode}
                          style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }

            if (isEditingExisting) {
              return (
                <g transform={`translate(-130, -100)`}>
                  <rect
                    x="0"
                    y="0"
                    width="260"
                    height="200"
                    rx="16"
                    fill="#eff6ff"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                  />
                  <rect x="0" y="0" width="5" height="200" rx="16" fill="#3b82f6" opacity={0.9} />

                  <foreignObject x="12" y="12" width="236" height="176">
                    <div style={{ fontFamily: 'inherit' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '10px' }}>✏️ Edit Node</div>
                      <input
                        type="text"
                        placeholder="User Input (optional)"
                        value={editingExistingNode?.userInput || ''}
                        onChange={(e) => setEditingExistingNode({ ...editingExistingNode!, userInput: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginBottom: '8px',
                          fontSize: '12px',
                          border: '2px solid #93c5fd',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#eff6ff',
                        }}
                      />
                      <textarea
                        placeholder="Bot Response (optional)"
                        value={editingExistingNode?.botResponse || ''}
                        onChange={(e) => setEditingExistingNode({ ...editingExistingNode!, botResponse: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginBottom: '10px',
                          fontSize: '12px',
                          border: '2px solid #93c5fd',
                          borderRadius: '10px',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: '50px',
                          backgroundColor: '#eff6ff',
                        }}
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={onSaveExistingNode}
                          disabled={isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim())}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.5 : 1,
                          }}
                        >
                          {isUpdating ? 'Updating...' : '✓ Save'}
                        </button>
                        <button
                          onClick={onCancelExistingNode}
                          style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }

            return (
              <g
                transform={`translate(-130, -60)`}
                onClick={() => {
                  if (nodeId && nodeId > 0) {
                    handleNodeClick(nodeDatum);
                  }
                }}
                onMouseEnter={() => handleMouseEnter(nodeId)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Card Background */}
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="130"
                  rx="16"
                  fill={isSelected ? '#e0e7ff' : isHovered ? '#f8fafc' : '#ffffff'}
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{
                    filter: isSelected || isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
                  }}
                />

                {/* Left Border Accent */}
                <rect x="0" y="0" width="5" height="130" rx="16" fill={nodeColor} opacity={0.9} />

                {/* Node Content */}
                <foreignObject x="18" y="38" width="224" height="84">
                  <div style={{ padding: '10px', fontFamily: 'inherit' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: isSelected ? nodeColor : '#111827',
                        marginBottom: '8px',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {nodeDatum.name}
                    </div>
                    {hasChildren && (
                      <div
                        style={{
                          padding: '4px 10px',
                          background: `linear-gradient(135deg, ${nodeColor}15, ${nodeColor}25)`,
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: nodeColor,
                          border: `1px solid ${nodeColor}30`,
                          display: 'inline-block',
                        }}
                      >
                        {nodeDatum.children?.length} {nodeDatum.children?.length === 1 ? 'child' : 'children'}
                      </div>
                    )}
                  </div>
                </foreignObject>

                {/* Action Buttons - FIXED HOVER */}
                {isHovered && !isEditing && !isEditingExisting && (
                  <g transform="translate(200, 90)">
                    {/* Edit Button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        const node = nodeMap.get(nodeId);
                        if (node) onNodeEdit?.(node);
                      }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                      }}
                    >
                      <circle cx="0" cy="0" r="16" fill="#3b82f6" stroke="white" strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                        ✏️
                      </text>
                    </g>

                    {/* Add Button */}
                    <g
                      transform="translate(40, 0)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeAddChild?.(nodeId);
                      }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                      }}
                    >
                      <circle cx="0" cy="0" r="16" fill="#10b981" stroke="white" strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                        ➕
                      </text>
                    </g>

                    {/* Delete Button */}
                    <g
                      transform="translate(80, 0)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeDelete?.(nodeId);
                      }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                      }}
                    >
                      <circle cx="0" cy="0" r="16" fill="#ef4444" stroke="white" strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                        🗑️
                      </text>
                    </g>
                  </g>
                )}

                {/* Selection Indicator */}
                {isSelected && <circle r="6" fill={nodeColor} cx="250" cy="18" />}
              </g>
            );
          }}
        />
      </div>
    </div>
  );
}

// ============== 3D Node Component WITH FIXED HOVER ==============
function DialogNode3D({
  node,
  position,
  isSelected,
  isHovered,
  isEditing,
  onClick,
  onMouseEnter,
  onMouseLeave,
  hasChildren,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: DialogNode;
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  isEditing?: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  hasChildren: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onEdit?: (node: DialogNode) => void;
  onDelete?: (nodeId: number) => void;
  onAddChild?: (parentId: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [showActions, setShowActions] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const hasUserInput = !!node.user_input?.trim();
  const hasBotResponse = !!node.bot_response?.trim();

  let nodeColor = '#10b981';
  if (hasUserInput && hasBotResponse) {
    nodeColor = '#8b5cf6';
  } else if (hasUserInput) {
    nodeColor = '#3b82f6';
  } else if (hasBotResponse) {
    nodeColor = '#10b981';
  }

  let shapeType: 'sphere' | 'box' | 'cylinder' | 'octahedron' = 'sphere';
  let args: any = [0.5, 32, 16];
  if (hasUserInput && hasBotResponse) {
    shapeType = 'octahedron';
    args = [0.5];
  } else if (hasUserInput) {
    shapeType = 'box';
    args = [0.8, 0.8, 0.8];
  } else if (hasBotResponse) {
    shapeType = 'sphere';
    args = [0.5, 32, 16];
  } else {
    shapeType = 'cylinder';
    args = [0.4, 0.4, 0.3, 8];
  }

  // FIXED: Handle mouse enter with delay management
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowActions(true);
    onMouseEnter();
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowActions(false);
      onMouseLeave();
    }, 300); // 300ms delay before hiding
  };

  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        meshRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 5) * 0.05);
      } else if (isHovered || showActions) {
        meshRef.current.scale.setScalar(1.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <group position={position} onPointerOver={handleMouseEnter} onPointerOut={handleMouseLeave}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {shapeType === 'sphere' && <sphereGeometry args={args} />}
        {shapeType === 'box' && <boxGeometry args={args} />}
        {shapeType === 'cylinder' && <cylinderGeometry args={args} />}
        {shapeType === 'octahedron' && <octahedronGeometry args={args} />}
        <meshStandardMaterial
          color={nodeColor}
          emissive={isSelected || isHovered || showActions ? nodeColor : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : isHovered || showActions ? 0.4 : 0}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={isEditing ? 0.7 : 1}
        />
      </mesh>

      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshBasicMaterial color={nodeColor} transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {hasChildren && (
        <Html position={[0.8, 0.8, 0]} center>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-300"
            onPointerOver={(e) => e.stopPropagation()}
            onPointerOut={(e) => e.stopPropagation()}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-700" /> : <ChevronRight className="w-4 h-4 text-gray-700" />}
          </button>
        </Html>
      )}

      <Html position={[0, 1, 0]} center>
        <div
          className="px-2 py-1 bg-gray-900/90 text-white text-xs rounded-lg shadow-lg border border-gray-700 whitespace-nowrap"
          onPointerOver={(e) => e.stopPropagation()}
          onPointerOut={(e) => e.stopPropagation()}
        >
          ID: {node.id}
        </div>
      </Html>

      <Html position={[0, -0.8, 0]} center>
        <div
          className="px-2 py-1 bg-gray-800/90 text-gray-200 text-[10px] rounded-lg border border-gray-700 max-w-[150px] truncate"
          onPointerOver={(e) => e.stopPropagation()}
          onPointerOut={(e) => e.stopPropagation()}
        >
          {node.user_input?.substring(0, 20) || node.bot_response?.substring(0, 20) || 'Empty Node'}
        </div>
      </Html>

      {/* FIXED: Action Buttons - Now clickable with hover delay */}
      {showActions && onEdit && onDelete && onAddChild && (
        <Html position={[0, -1.8, 0]} center>
          <div
            className="flex gap-1.5 bg-gray-900/95 p-2 rounded-lg border border-gray-700 shadow-xl backdrop-blur-sm"
            onPointerOver={(e) => {
              e.stopPropagation();
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              setShowActions(true);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              handleMouseLeave();
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
              title="Edit Node"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all"
              title="Add Child"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all"
              title="Delete Node"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

function Octahedron({ args }: { args: [number] }) {
  return (
    <mesh>
      <octahedronGeometry args={args} />
      <meshStandardMaterial color="#8b5cf6" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

// ============== Edit Node Form 3D ==============
function EditNodeForm3D({
  position,
  node,
  onSave,
  onCancel,
  isCreating = false,
  setEditingNode,
  setEditingExistingNode,
}: {
  position: [number, number, number];
  node: { id?: number; parentId?: number | null; userInput: string; botResponse: string };
  onSave: () => void;
  onCancel: () => void;
  isCreating?: boolean;
  setEditingNode?: (node: any) => void;
  setEditingExistingNode?: (node: any) => void;
}) {
  return (
    <group position={position}>
      <Html center>
        <div
          className="bg-white rounded-xl shadow-2xl p-5 w-80 border border-gray-200"
          style={{ transform: 'translateY(-50px)' }}
          onPointerOver={(e) => e.stopPropagation()}
          onPointerOut={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${isCreating ? 'bg-orange-100' : 'bg-blue-100'}`}>
              {isCreating ? <Plus className="w-4 h-4 text-orange-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
            </div>
            <h3 className="text-sm font-bold text-gray-900">{isCreating ? 'Create New Node' : 'Edit Node'}</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">User Input</label>
              <input
                type="text"
                value={node.userInput}
                onChange={(e) => {
                  if (isCreating && setEditingNode) {
                    setEditingNode((prev: any) => ({ ...prev, userInput: e.target.value }));
                  } else if (!isCreating && setEditingExistingNode) {
                    setEditingExistingNode((prev: any) => ({ ...prev, userInput: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter user input..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bot Response</label>
              <textarea
                value={node.botResponse}
                onChange={(e) => {
                  if (isCreating && setEditingNode) {
                    setEditingNode((prev: any) => ({ ...prev, botResponse: e.target.value }));
                  } else if (!isCreating && setEditingExistingNode) {
                    setEditingExistingNode((prev: any) => ({ ...prev, botResponse: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter bot response..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onSave}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
              >
                <Save className="w-3.5 h-3.5 inline mr-1.5" />
                Save
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============== 3D Tree Renderer ==============
function Tree3DRenderer({
  nodes,
  parentId = null,
  position = [0, 3, 0],
  onNodeClick,
  selectedNodeId,
  hoveredNodeId,
  setHoveredNodeId,
  expandedNodes,
  onToggleNode,
  onNodeEdit,
  onNodeDelete,
  onNodeAddChild,
  editingNode,
  editingExistingNode,
  setEditingNode,
  setEditingExistingNode,
  depth = 0,
}: {
  nodes: DialogNode[];
  parentId?: number | null;
  position?: [number, number, number];
  onNodeClick?: (node: DialogNode) => void;
  selectedNodeId?: number | null;
  hoveredNodeId?: number | null;
  setHoveredNodeId: (id: number | null) => void;
  expandedNodes: Set<number>;
  onToggleNode: (nodeId: number) => void;
  onNodeEdit?: (node: DialogNode) => void;
  onNodeDelete?: (nodeId: number) => void;
  onNodeAddChild?: (parentId: number) => void;
  editingNode: { parentId: number | null; userInput: string; botResponse: string } | null;
  editingExistingNode: { id: number; userInput: string; botResponse: string } | null;
  setEditingNode: (node: any) => void;
  setEditingExistingNode: (node: any) => void;
  depth?: number;
}) {
  const childNodes = nodes.filter((n) => n.parent_id === parentId);
  const isExpanded = parentId === null ? true : expandedNodes.has(parentId as number);

  if (childNodes.length === 0 && !(editingNode && editingNode.parentId === parentId)) return null;

  return (
    <group position={position}>
      {isExpanded &&
        childNodes.map((node, index) => {
          const angle = (index / Math.max(childNodes.length, 1)) * Math.PI * 2;
          const radius = 2.5;
          const yOffset = -1.5;

          const nodePosition: [number, number, number] =
            depth === 0 ? [0, 0, 0] : [Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius];

          const isEditingThisNode = editingExistingNode?.id === node.id;

          return (
            <group key={node.id}>
              {depth > 0 && (
                <Line
                  points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(...nodePosition)]}
                  color="#94a3b8"
                  lineWidth={1}
                  opacity={0.5}
                  transparent
                />
              )}

              <DialogNode3D
                node={node}
                position={nodePosition}
                isSelected={selectedNodeId === node.id}
                isHovered={hoveredNodeId === node.id}
                isEditing={isEditingThisNode}
                onClick={() => onNodeClick?.(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                hasChildren={nodes.some((n) => n.parent_id === node.id)}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={() => onToggleNode(node.id)}
                onEdit={onNodeEdit}
                onDelete={onNodeDelete}
                onAddChild={onNodeAddChild}
              />

              {isEditingThisNode && (
                <EditNodeForm3D
                  position={[nodePosition[0], nodePosition[1] - 2, nodePosition[2]]}
                  node={{
                    id: node.id,
                    userInput: editingExistingNode.userInput,
                    botResponse: editingExistingNode.botResponse,
                  }}
                  onSave={() => {
                    const event = new CustomEvent('saveExistingNode');
                    window.dispatchEvent(event);
                  }}
                  onCancel={() => {
                    const event = new CustomEvent('cancelExistingNode');
                    window.dispatchEvent(event);
                  }}
                  isCreating={false}
                  setEditingExistingNode={setEditingExistingNode}
                />
              )}

              <Tree3DRenderer
                nodes={nodes}
                parentId={node.id}
                position={nodePosition}
                onNodeClick={onNodeClick}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                setHoveredNodeId={setHoveredNodeId}
                expandedNodes={expandedNodes}
                onToggleNode={onToggleNode}
                onNodeEdit={onNodeEdit}
                onNodeDelete={onNodeDelete}
                onNodeAddChild={onNodeAddChild}
                editingNode={editingNode}
                editingExistingNode={editingExistingNode}
                setEditingNode={setEditingNode}
                setEditingExistingNode={setEditingExistingNode}
                depth={depth + 1}
              />
            </group>
          );
        })}

      {editingNode && editingNode.parentId === parentId && (
        <group position={depth === 0 ? [0, -1.5, 0] : [0, -1.5, 0]}>
          <Line
            points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)]}
            color="#f59e0b"
            lineWidth={2}
            opacity={0.8}
            transparent
          />
          <EditNodeForm3D
            position={[0, -2.5, 0]}
            node={{
              parentId: editingNode.parentId,
              userInput: editingNode.userInput,
              botResponse: editingNode.botResponse,
            }}
            onSave={() => {
              const event = new CustomEvent('saveNewNode');
              window.dispatchEvent(event);
            }}
            onCancel={() => {
              const event = new CustomEvent('cancelNewNode');
              window.dispatchEvent(event);
            }}
            isCreating={true}
            setEditingNode={setEditingNode}
          />
        </group>
      )}
    </group>
  );
}

// ============== 3D View Component ==============
function Tree3DView({
  nodes,
  onNodeClick,
  selectedNodeId,
  onNodeEdit,
  onNodeDelete,
  onNodeAddChild,
  editingNode,
  editingExistingNode,
  setEditingNode,
  setEditingExistingNode,
  isCreating,
  isUpdating,
  onSaveNewNode,
  onSaveExistingNode,
  onCancelNewNode,
  onCancelExistingNode,
}: {
  nodes: DialogNode[];
  onNodeClick?: (node: DialogNode) => void;
  selectedNodeId?: number | null;
  onNodeEdit?: (node: DialogNode) => void;
  onNodeDelete?: (nodeId: number) => void;
  onNodeAddChild?: (parentId: number) => void;
  editingNode: { parentId: number | null; userInput: string; botResponse: string } | null;
  editingExistingNode: { id: number; userInput: string; botResponse: string } | null;
  setEditingNode: (node: any) => void;
  setEditingExistingNode: (node: any) => void;
  isCreating: boolean;
  isUpdating: boolean;
  onSaveNewNode: () => void;
  onSaveExistingNode: () => void;
  onCancelNewNode: () => void;
  onCancelExistingNode: () => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const rootNodes = nodes.filter((n) => n.parent_id === null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const handleToggleNode = (nodeId: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<number>();
    nodes.forEach((node) => all.add(node.id));
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // FIXED: Hover delay management
  const handleMouseEnter = (nodeId: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredNodeId(nodeId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNodeId(null);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleSaveNew = () => onSaveNewNode();
    const handleSaveExisting = () => onSaveExistingNode();
    const handleCancelNew = () => onCancelNewNode();
    const handleCancelExisting = () => onCancelExistingNode();

    window.addEventListener('saveNewNode', handleSaveNew);
    window.addEventListener('saveExistingNode', handleSaveExisting);
    window.addEventListener('cancelNewNode', handleCancelNew);
    window.addEventListener('cancelExistingNode', handleCancelExisting);

    return () => {
      window.removeEventListener('saveNewNode', handleSaveNew);
      window.removeEventListener('saveExistingNode', handleSaveExisting);
      window.removeEventListener('cancelNewNode', handleCancelNew);
      window.removeEventListener('cancelExistingNode', handleCancelExisting);
    };
  }, [onSaveNewNode, onSaveExistingNode, onCancelNewNode, onCancelExistingNode]);

  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-gray-950 to-gray-900 rounded-lg overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="px-3 py-1.5 bg-gray-800/90 text-white text-xs rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors flex items-center gap-1.5"
        >
          {autoRotate ? '🔒 Auto Rotate' : '🖐️ Free Move'}
        </button>
        <button
          onClick={expandAll}
          className="px-3 py-1.5 bg-gray-800/90 text-white text-xs rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 bg-gray-800/90 text-white text-xs rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          Collapse All
        </button>
        <div className="px-3 py-1.5 bg-gray-800/90 text-gray-300 text-xs rounded-lg border border-gray-700">{nodes.length} nodes</div>
      </div>

      <Canvas camera={{ position: [10, 8, 15], fov: 45 }} style={{ background: '#0a0f1a' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, 5, -5]} intensity={0.6} color="#88aaff" />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          enableDamping={true}
          dampingFactor={0.05}
        />

        <gridHelper args={[25, 20, '#4a5a7a', '#2a3a4a']} position={[0, -1, 0]} />

        {rootNodes.length > 0 ? (
          rootNodes.map((root, index) => (
            <Tree3DRenderer
              key={root.id}
              nodes={nodes}
              parentId={null}
              position={[index * 3 - (rootNodes.length - 1) * 1.5, 3, 0]}
              onNodeClick={onNodeClick}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              setHoveredNodeId={setHoveredNodeId}
              expandedNodes={expandedNodes}
              onToggleNode={handleToggleNode}
              onNodeEdit={onNodeEdit}
              onNodeDelete={onNodeDelete}
              onNodeAddChild={onNodeAddChild}
              editingNode={editingNode}
              editingExistingNode={editingExistingNode}
              setEditingNode={setEditingNode}
              setEditingExistingNode={setEditingExistingNode}
            />
          ))
        ) : (
          <Html position={[0, 0, 0]} center>
            <div className="bg-gray-900/90 px-6 py-4 rounded-lg border border-gray-800 text-white text-sm">No nodes to display</div>
          </Html>
        )}
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-300 flex gap-3">
          <span>🖱️ Drag = Rotate</span>
          <span>🖱️ Right Drag = Move</span>
          <span>🖱️ Scroll = Zoom</span>
          <span>✨ Hover = Actions</span>
        </div>
      </div>

      {hoveredNodeId && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-blue-600/90 px-4 py-2 rounded-lg border border-blue-800 text-white text-xs">Node ID: {hoveredNodeId}</div>
        </div>
      )}
    </div>
  );
}

// ============== MAIN COMPONENT ==============
export default function TreeVisualization({
  nodes,
  selectedTree,
  onNodeClick,
  onNodeEdit,
  onNodeDelete,
  onNodeAddChild,
  onNodeAddRoot,
  onNodeCreate,
  onNodeUpdate,
  onNodesUpdate,
  selectedNodeId,
}: TreeVisualizationProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [showNodeDetails, setShowNodeDetails] = useState<DialogNode | null>(null);
  const [editingNode, setEditingNode] = useState<{ parentId: number | null; userInput: string; botResponse: string } | null>(null);
  const [editingExistingNode, setEditingExistingNode] = useState<{ id: number; userInput: string; botResponse: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: number | null }>({ nodeId: null });
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');

  const nodeMap = useMemo(() => {
    const map = new Map<number, DialogNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // ============== CRUD Operations ==============
  const handleNodeClick = (node: DialogNode) => {
    setShowNodeDetails(node);
    onNodeClick?.(node);
  };

  const handleNodeEdit = (node: DialogNode) => {
    if (onNodeUpdate) {
      setEditingExistingNode({
        id: node.id,
        userInput: node.user_input || '',
        botResponse: node.bot_response || '',
      });
      setShowNodeDetails(null);
    } else {
      onNodeEdit?.(node);
      setShowNodeDetails(null);
    }
  };

  const handleNodeDelete = (nodeId: number) => {
    setDeleteConfirm({ nodeId });
    setShowNodeDetails(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.nodeId || !onNodeDelete) return;
    try {
      await onNodeDelete(deleteConfirm.nodeId);
      if (onNodesUpdate) {
        onNodesUpdate(nodes.filter((n) => n.id !== deleteConfirm.nodeId));
      }
      setDeleteConfirm({ nodeId: null });
    } catch (error: any) {
      alert(error.message || 'Failed to delete node');
    }
  };

  const handleAddChild = (parentId: number) => {
    if (onNodeCreate) {
      setEditingNode({ parentId, userInput: '', botResponse: '' });
      setShowNodeDetails(null);
    } else {
      onNodeAddChild?.(parentId);
      setShowNodeDetails(null);
    }
  };

  const handleAddRoot = () => {
    if (onNodeCreate) {
      setEditingNode({ parentId: null, userInput: '', botResponse: '' });
    } else {
      onNodeAddRoot?.();
    }
  };

  // ============== Save Operations ==============
  const handleSaveNewNode = async () => {
    if (!onNodeCreate || !editingNode) return;
    if (!editingNode.userInput.trim() && !editingNode.botResponse.trim()) {
      alert('Please provide at least user input or bot response');
      return;
    }
    setIsCreating(true);
    try {
      const newNode = await onNodeCreate(editingNode.parentId, editingNode.userInput, editingNode.botResponse);
      if (onNodesUpdate) {
        onNodesUpdate([...nodes, newNode]);
      }
      setEditingNode(null);
    } catch (error: any) {
      alert(error.message || 'Failed to create node');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveExistingNode = async () => {
    if (!onNodeUpdate || !editingExistingNode) return;
    if (!editingExistingNode.userInput.trim() && !editingExistingNode.botResponse.trim()) {
      alert('Please provide at least user input or bot response');
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await onNodeUpdate(editingExistingNode.id, editingExistingNode.userInput, editingExistingNode.botResponse);
      if (onNodesUpdate) {
        onNodesUpdate(nodes.map((n) => (n.id === editingExistingNode.id ? updated : n)));
      }
      setEditingExistingNode(null);
    } catch (error: any) {
      alert(error.message || 'Failed to update node');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelNewNode = () => {
    setEditingNode(null);
  };

  const handleCancelExistingNode = () => {
    setEditingExistingNode(null);
  };

  const handleDeleteClick = (nodeId: number) => {
    setDeleteConfirm({ nodeId });
    setShowNodeDetails(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden h-full flex flex-col backdrop-blur-sm">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Tree Visualization</h2>
            <p className="text-xs text-gray-500 font-medium">
              {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === '2d' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === '3d' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              3D
            </button>
          </div>

          {nodes.length === 0 && !editingNode && (
            <button
              onClick={handleAddRoot}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Root Node
            </button>
          )}

          {showNodeDetails && (
            <button
              onClick={() => setShowNodeDetails(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        {nodes.length === 0 && !editingNode ? (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-6 shadow-xl border-2 border-white/50">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-700 mb-2">No nodes to visualize</p>
              <p className="text-sm text-gray-500 mb-6">Create nodes in the editor to get started</p>
              <button
                onClick={handleAddRoot}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Root Node
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === '2d' ? (
              <Tree2DView
                nodes={nodes}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNodeId}
                onNodeEdit={handleNodeEdit}
                onNodeDelete={handleNodeDelete}
                onNodeAddChild={handleAddChild}
                editingNode={editingNode}
                editingExistingNode={editingExistingNode}
                setEditingNode={setEditingNode}
                setEditingExistingNode={setEditingExistingNode}
                isCreating={isCreating}
                isUpdating={isUpdating}
                onSaveNewNode={handleSaveNewNode}
                onSaveExistingNode={handleSaveExistingNode}
                onCancelNewNode={handleCancelNewNode}
                onCancelExistingNode={handleCancelExistingNode}
              />
            ) : (
              <Tree3DView
                nodes={nodes}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNodeId}
                onNodeEdit={handleNodeEdit}
                onNodeDelete={handleNodeDelete}
                onNodeAddChild={handleAddChild}
                editingNode={editingNode}
                editingExistingNode={editingExistingNode}
                setEditingNode={setEditingNode}
                setEditingExistingNode={setEditingExistingNode}
                isCreating={isCreating}
                isUpdating={isUpdating}
                onSaveNewNode={handleSaveNewNode}
                onSaveExistingNode={handleSaveExistingNode}
                onCancelNewNode={handleCancelNewNode}
                onCancelExistingNode={handleCancelExistingNode}
              />
            )}
          </>
        )}

        {/* Node Details Panel */}
        {showNodeDetails && (
          <div className="absolute top-4 right-4 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-6 z-20 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Node Details</h3>
                  <p className="text-xs text-gray-500 font-medium">ID: {showNodeDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNodeDetails(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {showNodeDetails.user_input && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">User Input</span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed font-medium">{showNodeDetails.user_input}</p>
                </div>
              )}

              {showNodeDetails.bot_response && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500 rounded-lg">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bot Response</span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed font-medium">{showNodeDetails.bot_response}</p>
                </div>
              )}

              {!showNodeDetails.user_input && !showNodeDetails.bot_response && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <p className="text-gray-400 text-sm italic">Empty node - no content yet</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200/50 space-y-2.5">
                <button
                  onClick={() => handleNodeEdit(showNodeDetails)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Node
                </button>

                <button
                  onClick={() => {
                    handleAddChild(showNodeDetails.id);
                    setShowNodeDetails(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4" />
                  Add Child Node
                </button>

                <button
                  onClick={() => handleDeleteClick(showNodeDetails.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Node
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.nodeId && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Node</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this node? All child nodes will also be permanently deleted.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm({ nodeId: null })}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// 'use client';

// import { useMemo, useState, useRef, useEffect } from 'react';
// import { Tree } from 'react-d3-tree';
// import { DialogNode, DialogTree } from '@/lib/api';
// import { Edit2, Trash2, Plus, X, User, Bot, Info, Maximize2, Minimize2, Save } from 'lucide-react';

// interface TreeVisualizationProps {
//   nodes: DialogNode[];
//   selectedTree: DialogTree;
//   onNodeClick?: (node: DialogNode) => void;
//   onNodeEdit?: (node: DialogNode) => void;
//   onNodeDelete?: (nodeId: number) => void;
//   onNodeAddChild?: (parentId: number) => void;
//   onNodeAddRoot?: () => void;
//   onNodeCreate?: (parentId: number | null, userInput: string, botResponse: string) => Promise<DialogNode>;
//   onNodeUpdate?: (id: number, userInput: string, botResponse: string) => Promise<DialogNode>;
//   onNodesUpdate?: (updatedNodes: DialogNode[]) => void;
//   selectedNodeId?: number | null;
// }

// interface TreeNode {
//   name: string;
//   nodeId?: number;
//   attributes?: {
//     userInput?: string;
//     botResponse?: string;
//     nodeId?: number;
//     isEditingExisting?: boolean | null;
//   };
//   children?: TreeNode[];
// }

// export default function TreeVisualization({
//   nodes,
//   selectedTree,
//   onNodeClick,
//   onNodeEdit,
//   onNodeDelete,
//   onNodeAddChild,
//   onNodeAddRoot,
//   onNodeCreate,
//   onNodeUpdate,
//   onNodesUpdate,
//   selectedNodeId,
// }: TreeVisualizationProps) {
//   const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
//   const [showNodeDetails, setShowNodeDetails] = useState<DialogNode | null>(null);
//   const [zoom, setZoom] = useState(1);
//   const [translate, setTranslate] = useState({ x: 200, y: 50 });
//   const treeContainerRef = useRef<HTMLDivElement>(null);
//   const [editingNode, setEditingNode] = useState<{ parentId: number | null; userInput: string; botResponse: string } | null>(null);
//   const [editingExistingNode, setEditingExistingNode] = useState<{ id: number; userInput: string; botResponse: string } | null>(null);
//   const [isCreating, setIsCreating] = useState(false);
//   const [isUpdating, setIsUpdating] = useState(false);
//   const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: number | null }>({ nodeId: null });

//   const nodeMap = useMemo(() => {
//     const map = new Map<number, DialogNode>();
//     nodes.forEach((node) => map.set(node.id, node));
//     return map;
//   }, [nodes]);

//   const treeData: any = useMemo(() => {
//     const buildTree = (parentId: number | null): TreeNode[] => {
//       const children = nodes.filter((n) => n.parent_id === parentId);
//       const result: any[] = [];

//       // Add actual nodes
//       children.forEach((node) => {
//         // Check if this node is being edited
//         const isBeingEdited = editingExistingNode && editingExistingNode.id === node.id;

//         // Better node name formatting
//         let nodeName = '';
//         if (isBeingEdited) {
//           nodeName = 'Editing Node...';
//         } else if (node.user_input && node.bot_response) {
//           nodeName = `${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`;
//         } else if (node.user_input) {
//           nodeName = `👤 ${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`;
//         } else if (node.bot_response) {
//           nodeName = `🤖 ${node.bot_response.substring(0, 20)}${node.bot_response.length > 20 ? '...' : ''}`;
//         } else {
//           nodeName = 'Empty Node';
//         }

//         result.push({
//           name: nodeName,
//           nodeId: node.id,
//           attributes: {
//             userInput: isBeingEdited ? editingExistingNode.userInput : node.user_input || '',
//             botResponse: isBeingEdited ? editingExistingNode.botResponse : node.bot_response || '',
//             nodeId: node.id,
//             isEditingExisting: isBeingEdited,
//           },
//           children: buildTree(node.id),
//         });
//       });

//       // Add editing node if it matches this parent (add it as the last child for proper alignment)
//       if (editingNode && editingNode.parentId === parentId) {
//         result.push({
//           name: 'New Node (editing)',
//           nodeId: -1, // Temporary ID for editing node
//           attributes: {
//             userInput: editingNode.userInput,
//             botResponse: editingNode.botResponse,
//             nodeId: -1,
//             isEditing: true,
//             parentId: parentId,
//           },
//           children: [],
//         });
//       }

//       return result;
//     };

//     const rootNodes = buildTree(null);

//     if (rootNodes.length === 0 && !editingNode) {
//       return {
//         name: 'No nodes',
//         attributes: {},
//       };
//     }

//     // Always return root nodes directly without wrapping in tree name
//     // If there's only one root node, return it directly
//     if (rootNodes.length === 1) {
//       return rootNodes[0];
//     }

//     // If multiple root nodes, create a wrapper without the tree name
//     return {
//       name: '',
//       children: rootNodes,
//     };
//   }, [nodes, editingNode, editingExistingNode]);

//   const handleNodeClick = (nodeData: any) => {
//     const nodeId = nodeData.attributes?.nodeId || nodeData.nodeId;
//     if (nodeId && nodeMap.has(nodeId)) {
//       const node = nodeMap.get(nodeId)!;
//       setShowNodeDetails(node);
//       onNodeClick?.(node);
//     }
//   };

//   const handleNodeEdit = (node: DialogNode) => {
//     if (onNodeUpdate) {
//       // Start inline editing in tree view
//       setEditingExistingNode({
//         id: node.id,
//         userInput: node.user_input || '',
//         botResponse: node.bot_response || '',
//       });
//       setShowNodeDetails(null);
//     } else {
//       // Fallback to original behavior
//       onNodeEdit?.(node);
//       setShowNodeDetails(null);
//     }
//   };

//   const handleNodeDelete = (nodeId: number) => {
//     onNodeDelete?.(nodeId);
//     setShowNodeDetails(null);
//   };

//   const handleAddChild = (parentId: number) => {
//     if (onNodeCreate) {
//       setEditingNode({ parentId, userInput: '', botResponse: '' });
//       setShowNodeDetails(null);
//       // Close any open node details to avoid confusion
//     } else {
//       onNodeAddChild?.(parentId);
//       setShowNodeDetails(null);
//     }
//   };

//   const handleAddRoot = () => {
//     if (onNodeCreate) {
//       setEditingNode({ parentId: null, userInput: '', botResponse: '' });
//     } else {
//       onNodeAddRoot?.();
//     }
//   };

//   const handleSaveEditingNode = async () => {
//     if (!onNodeCreate || !editingNode) return;

//     if (!editingNode.userInput.trim() && !editingNode.botResponse.trim()) {
//       alert('Please provide at least user input or bot response');
//       return;
//     }

//     setIsCreating(true);
//     try {
//       const newNode = await onNodeCreate(editingNode.parentId, editingNode.userInput, editingNode.botResponse);
//       if (onNodesUpdate) {
//         onNodesUpdate([...nodes, newNode]);
//       }
//       setEditingNode(null);
//     } catch (error: any) {
//       alert(error.message || 'Failed to create node');
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   const handleCancelEditingNode = () => {
//     setEditingNode(null);
//   };

//   const handleSaveExistingNode = async () => {
//     if (!onNodeUpdate || !editingExistingNode) return;

//     if (!editingExistingNode.userInput.trim() && !editingExistingNode.botResponse.trim()) {
//       alert('Please provide at least user input or bot response');
//       return;
//     }

//     setIsUpdating(true);
//     try {
//       const updated = await onNodeUpdate(editingExistingNode.id, editingExistingNode.userInput, editingExistingNode.botResponse);
//       if (onNodesUpdate) {
//         onNodesUpdate(nodes.map((n) => (n.id === editingExistingNode.id ? updated : n)));
//       }
//       setEditingExistingNode(null);
//     } catch (error: any) {
//       alert(error.message || 'Failed to update node');
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   const handleCancelExistingNode = () => {
//     setEditingExistingNode(null);
//   };

//   const handleDeleteClick = (nodeId: number) => {
//     setDeleteConfirm({ nodeId });
//     setShowNodeDetails(null);
//   };

//   const handleDeleteConfirm = async () => {
//     if (!deleteConfirm.nodeId || !onNodeDelete) return;

//     try {
//       await onNodeDelete(deleteConfirm.nodeId);
//       if (onNodesUpdate) {
//         onNodesUpdate(nodes.filter((n) => n.id !== deleteConfirm.nodeId));
//       }
//       setDeleteConfirm({ nodeId: null });
//     } catch (error: any) {
//       alert(error.message || 'Failed to delete node');
//     }
//   };

//   const containerStyles = {
//     width: '100%',
//     height: '600px',
//     backgroundColor: 'transparent',
//   };

//   return (
//     <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden h-full flex flex-col backdrop-blur-sm">
//       {/* Header */}
//       <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <div className="p-2 bg-gray-100 rounded-lg">
//             <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
//               />
//             </svg>
//           </div>
//           <div>
//             <h2 className="text-base font-bold text-gray-900">Tree Visualization</h2>
//             <p className="text-xs text-gray-500 font-medium">
//               {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
//             </p>
//           </div>
//         </div>
//         <div className="flex items-center gap-3">
//           <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
//             <button
//               onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
//               className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
//               title="Zoom out"
//             >
//               <Minimize2 className="w-4 h-4" />
//             </button>
//             <span className="text-xs text-gray-600 font-semibold w-10 text-center">{Math.round(zoom * 100)}%</span>
//             <button
//               onClick={() => setZoom(Math.min(2, zoom + 0.1))}
//               className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
//               title="Zoom in"
//             >
//               <Maximize2 className="w-4 h-4" />
//             </button>
//           </div>
//           {showNodeDetails && (
//             <button
//               onClick={() => setShowNodeDetails(null)}
//               className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
//             >
//               <X className="w-4 h-4" />
//             </button>
//           )}
//         </div>
//       </div>

//       <div className="relative flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
//         {nodes.length === 0 ? (
//           <div className="flex items-center justify-center h-full">
//             <div className="text-center">
//               <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-6 shadow-xl border-2 border-white/50">
//                 <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
//                   />
//                 </svg>
//               </div>
//               <p className="text-base font-bold text-gray-700 mb-2">No nodes to visualize</p>
//               <p className="text-sm text-gray-500 mb-6">Create nodes in the editor to get started</p>
//             </div>
//           </div>
//         ) : (
//           <div ref={treeContainerRef} style={containerStyles} id="tree-container" className="rounded-lg overflow-hidden">
//             <Tree
//               data={treeData}
//               orientation="vertical"
//               pathFunc="straight"
//               translate={translate}
//               nodeSize={{ x: 320, y: 250 }}
//               separation={{ siblings: 1.5, nonSiblings: 1.5 }}
//               zoom={zoom}
//               scaleExtent={{ min: 0.5, max: 2 }}
//               onNodeClick={(nodeData: any) => {
//                 // Don't open details panel for editing nodes
//                 const nodeId = (nodeData.attributes as any)?.nodeId;
//                 if (nodeId && nodeId > 0) {
//                   handleNodeClick(nodeData);
//                 }
//               }}
//               pathClassFunc={() => 'tree-link'}
//               enableLegacyTransitions={true}
//               transitionDuration={300}
//               renderCustomNodeElement={(rd3tProps) => {
//                 const { nodeDatum } = rd3tProps;
//                 const nodeId = (nodeDatum.attributes as any)?.nodeId;
//                 const isEditing = (nodeDatum.attributes as any)?.isEditing === true;
//                 const isEditingExisting = (nodeDatum.attributes as any)?.isEditingExisting === true;
//                 const isSelected = selectedNodeId === nodeId;
//                 const isHovered = hoveredNodeId === nodeId;
//                 const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
//                 const hasUserInput = !!nodeDatum.attributes?.userInput;
//                 const hasBotResponse = !!nodeDatum.attributes?.botResponse;

//                 // Modern color scheme
//                 let nodeColor = '#10b981'; // default green
//                 let nodeGradient = 'from-emerald-500 to-teal-500';
//                 if (hasUserInput && hasBotResponse) {
//                   nodeColor = '#8b5cf6'; // purple for both
//                   nodeGradient = 'from-purple-500 to-indigo-500';
//                 } else if (hasUserInput) {
//                   nodeColor = '#3b82f6'; // blue for user input
//                   nodeGradient = 'from-blue-500 to-cyan-500';
//                 } else if (hasBotResponse) {
//                   nodeColor = '#10b981'; // green for bot response
//                   nodeGradient = 'from-emerald-500 to-teal-500';
//                 }

//                 // Render editing node with form (new node)
//                 if (isEditing) {
//                   return (
//                     <g transform={`translate(-130, -100)`}>
//                       {/* Modern Editing Node Card - positioned to show buttons */}
//                       <rect
//                         x="0"
//                         y="0"
//                         width="260"
//                         height="200"
//                         rx="16"
//                         fill="#fff7ed"
//                         stroke="#f59e0b"
//                         strokeWidth="3"
//                         strokeDasharray="6,4"
//                         style={{ pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.2))' }}
//                       />
//                       <rect x="0" y="0" width="5" height="200" rx="16" fill="#f59e0b" style={{ pointerEvents: 'none', opacity: 0.9 }} />

//                       {/* Modern Form Content */}
//                       <foreignObject x="12" y="12" width="236" height="176">
//                         <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
//                           <div
//                             style={{
//                               fontSize: '12px',
//                               fontWeight: '800',
//                               color: '#92400e',
//                               marginBottom: '10px',
//                               letterSpacing: '-0.01em',
//                             }}
//                           >
//                             ✨ New Node
//                           </div>
//                           <input
//                             type="text"
//                             placeholder="User Input (optional)"
//                             value={editingNode?.userInput || ''}
//                             onChange={(e) => setEditingNode({ ...editingNode!, userInput: e.target.value })}
//                             style={{
//                               width: '100%',
//                               padding: '8px 12px',
//                               marginBottom: '8px',
//                               fontSize: '12px',
//                               border: '2px solid #fbbf24',
//                               borderRadius: '10px',
//                               outline: 'none',
//                               backgroundColor: '#fffbeb',
//                               transition: 'all 0.2s',
//                               fontFamily: 'inherit',
//                             }}
//                             onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
//                             onBlur={(e) => (e.target.style.borderColor = '#fbbf24')}
//                             onKeyDown={(e) => {
//                               if (e.key === 'Enter' && e.ctrlKey) {
//                                 handleSaveEditingNode();
//                               }
//                             }}
//                           />
//                           <textarea
//                             placeholder="Bot Response (optional)"
//                             value={editingNode?.botResponse || ''}
//                             onChange={(e) => setEditingNode({ ...editingNode!, botResponse: e.target.value })}
//                             style={{
//                               width: '100%',
//                               padding: '8px 12px',
//                               marginBottom: '10px',
//                               fontSize: '12px',
//                               border: '2px solid #fbbf24',
//                               borderRadius: '10px',
//                               outline: 'none',
//                               resize: 'vertical',
//                               minHeight: '50px',
//                               backgroundColor: '#fffbeb',
//                               transition: 'all 0.2s',
//                               fontFamily: 'inherit',
//                             }}
//                             onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
//                             onBlur={(e) => (e.target.style.borderColor = '#fbbf24')}
//                             rows={2}
//                           />
//                           <div style={{ display: 'flex', gap: '6px' }}>
//                             <button
//                               onClick={handleSaveEditingNode}
//                               disabled={isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim())}
//                               style={{
//                                 flex: 1,
//                                 padding: '8px 12px',
//                                 fontSize: '11px',
//                                 fontWeight: '700',
//                                 background: 'linear-gradient(135deg, #10b981, #059669)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '10px',
//                                 cursor:
//                                   isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim())
//                                     ? 'not-allowed'
//                                     : 'pointer',
//                                 opacity: isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim()) ? 0.5 : 1,
//                                 boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
//                                 transition: 'all 0.2s',
//                               }}
//                               onMouseEnter={(e) => {
//                                 if (!e.currentTarget.disabled) {
//                                   e.currentTarget.style.transform = 'scale(1.02)';
//                                   e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
//                                 }
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1)';
//                                 e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
//                               }}
//                             >
//                               {isCreating ? 'Saving...' : '✓ Save'}
//                             </button>
//                             <button
//                               onClick={handleCancelEditingNode}
//                               style={{
//                                 padding: '8px 12px',
//                                 fontSize: '11px',
//                                 fontWeight: '700',
//                                 background: 'linear-gradient(135deg, #ef4444, #dc2626)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '10px',
//                                 cursor: 'pointer',
//                                 boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
//                                 transition: 'all 0.2s',
//                               }}
//                               onMouseEnter={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1.02)';
//                                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1)';
//                                 e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
//                               }}
//                             >
//                               ✕
//                             </button>
//                           </div>
//                         </div>
//                       </foreignObject>
//                     </g>
//                   );
//                 }

//                 // Render editing existing node with form
//                 if (isEditingExisting) {
//                   return (
//                     <g transform={`translate(-130, -100)`}>
//                       {/* Modern Editing Existing Node Card */}
//                       <rect
//                         x="0"
//                         y="0"
//                         width="260"
//                         height="200"
//                         rx="16"
//                         fill="#eff6ff"
//                         stroke="#3b82f6"
//                         strokeWidth="3"
//                         strokeDasharray="6,4"
//                         style={{ pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.2))' }}
//                       />
//                       <rect x="0" y="0" width="5" height="200" rx="16" fill="#3b82f6" style={{ pointerEvents: 'none', opacity: 0.9 }} />

//                       {/* Modern Form Content */}
//                       <foreignObject x="12" y="12" width="236" height="176">
//                         <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
//                           <div
//                             style={{
//                               fontSize: '12px',
//                               fontWeight: '800',
//                               color: '#1e40af',
//                               marginBottom: '10px',
//                               letterSpacing: '-0.01em',
//                             }}
//                           >
//                             ✏️ Edit Node
//                           </div>
//                           <input
//                             type="text"
//                             placeholder="User Input (optional)"
//                             value={editingExistingNode?.userInput || ''}
//                             onChange={(e) => setEditingExistingNode({ ...editingExistingNode!, userInput: e.target.value })}
//                             style={{
//                               width: '100%',
//                               padding: '8px 12px',
//                               marginBottom: '8px',
//                               fontSize: '12px',
//                               border: '2px solid #93c5fd',
//                               borderRadius: '10px',
//                               outline: 'none',
//                               backgroundColor: '#eff6ff',
//                               transition: 'all 0.2s',
//                               fontFamily: 'inherit',
//                             }}
//                             onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
//                             onBlur={(e) => (e.target.style.borderColor = '#93c5fd')}
//                             onKeyDown={(e) => {
//                               if (e.key === 'Enter' && e.ctrlKey) {
//                                 handleSaveExistingNode();
//                               }
//                             }}
//                           />
//                           <textarea
//                             placeholder="Bot Response (optional)"
//                             value={editingExistingNode?.botResponse || ''}
//                             onChange={(e) => setEditingExistingNode({ ...editingExistingNode!, botResponse: e.target.value })}
//                             style={{
//                               width: '100%',
//                               padding: '8px 12px',
//                               marginBottom: '10px',
//                               fontSize: '12px',
//                               border: '2px solid #93c5fd',
//                               borderRadius: '10px',
//                               outline: 'none',
//                               resize: 'vertical',
//                               minHeight: '50px',
//                               backgroundColor: '#eff6ff',
//                               transition: 'all 0.2s',
//                               fontFamily: 'inherit',
//                             }}
//                             onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
//                             onBlur={(e) => (e.target.style.borderColor = '#93c5fd')}
//                             rows={2}
//                           />
//                           <div style={{ display: 'flex', gap: '6px' }}>
//                             <button
//                               onClick={handleSaveExistingNode}
//                               disabled={isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim())}
//                               style={{
//                                 flex: 1,
//                                 padding: '8px 12px',
//                                 fontSize: '11px',
//                                 fontWeight: '700',
//                                 background: 'linear-gradient(135deg, #10b981, #059669)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '10px',
//                                 cursor:
//                                   isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim())
//                                     ? 'not-allowed'
//                                     : 'pointer',
//                                 opacity:
//                                   isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim())
//                                     ? 0.5
//                                     : 1,
//                                 boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
//                                 transition: 'all 0.2s',
//                               }}
//                               onMouseEnter={(e) => {
//                                 if (!e.currentTarget.disabled) {
//                                   e.currentTarget.style.transform = 'scale(1.02)';
//                                   e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
//                                 }
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1)';
//                                 e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
//                               }}
//                             >
//                               {isUpdating ? 'Updating...' : '✓ Save'}
//                             </button>
//                             <button
//                               onClick={handleCancelExistingNode}
//                               style={{
//                                 padding: '8px 12px',
//                                 fontSize: '11px',
//                                 fontWeight: '700',
//                                 background: 'linear-gradient(135deg, #ef4444, #dc2626)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '10px',
//                                 cursor: 'pointer',
//                                 boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
//                                 transition: 'all 0.2s',
//                               }}
//                               onMouseEnter={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1.02)';
//                                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.transform = 'scale(1)';
//                                 e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
//                               }}
//                             >
//                               ✕
//                             </button>
//                           </div>
//                         </div>
//                       </foreignObject>
//                     </g>
//                   );
//                 }

//                 return (
//                   <g
//                     transform={`translate(-130, -60)`}
//                     onClick={(e) => {
//                       // Handle clicks on the entire node group
//                       if (nodeId && nodeId > 0 && !isEditingExisting) {
//                         const target = e.target as SVGElement;
//                         // Don't trigger if clicking on action buttons
//                         const isActionButton =
//                           target.closest('g[transform*="translate(200"]') &&
//                           (target.getAttribute('fill') === '#10b981' || target.getAttribute('fill') === '#ef4444');
//                         if (!isActionButton) {
//                           handleNodeClick(nodeDatum);
//                         }
//                       }
//                     }}
//                     style={{ cursor: isEditingExisting ? 'default' : 'pointer' }}
//                   >
//                     {/* Enhanced Shadow Filters */}
//                     <defs>
//                       <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
//                         <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
//                         <feOffset dx="0" dy="4" result="offsetblur" />
//                         <feComponentTransfer>
//                           <feFuncA type="linear" slope="0.4" />
//                         </feComponentTransfer>
//                         <feMerge>
//                           <feMergeNode />
//                           <feMergeNode in="SourceGraphic" />
//                         </feMerge>
//                       </filter>
//                       <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
//                         <feGaussianBlur stdDeviation="3" result="coloredBlur" />
//                         <feMerge>
//                           <feMergeNode in="coloredBlur" />
//                           <feMergeNode in="SourceGraphic" />
//                         </feMerge>
//                       </filter>
//                       <linearGradient id={`gradient-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
//                         <stop offset="0%" stopColor={nodeColor} stopOpacity="0.1" />
//                         <stop offset="100%" stopColor={nodeColor} stopOpacity="0.05" />
//                       </linearGradient>
//                     </defs>

//                     {/* Card Background with Gradient */}
//                     <rect
//                       x="0"
//                       y="0"
//                       width="260"
//                       height="130"
//                       rx="16"
//                       fill={isSelected ? '#e0e7ff' : isHovered ? '#f8fafc' : '#ffffff'}
//                       stroke={isSelected ? nodeColor : nodeColor}
//                       strokeWidth={isSelected ? 3 : 2}
//                       style={{
//                         cursor: 'pointer',
//                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
//                         filter: isSelected || isHovered ? 'url(#shadow)' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
//                       }}
//                       onMouseEnter={() => nodeId && nodeId > 0 && setHoveredNodeId(nodeId)}
//                       onMouseLeave={() => {
//                         setHoveredNodeId(null);
//                       }}
//                     />

//                     {/* Gradient Overlay */}
//                     <rect
//                       x="0"
//                       y="0"
//                       width="260"
//                       height="130"
//                       rx="16"
//                       fill={`url(#gradient-${nodeId})`}
//                       style={{ pointerEvents: 'none' }}
//                     />

//                     {/* Left Border Accent with Gradient */}
//                     <rect x="0" y="0" width="5" height="130" rx="16" fill={nodeColor} style={{ pointerEvents: 'none', opacity: 0.9 }} />

//                     {/* Node Content with Modern Typography */}
//                     <foreignObject x="18" y="38" width="224" height="84" style={{ pointerEvents: 'none' }}>
//                       <div
//                         style={{
//                           padding: '10px',
//                           fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
//                           pointerEvents: 'none',
//                         }}
//                       >
//                         <div
//                           style={{
//                             fontSize: '13px',
//                             fontWeight: '700',
//                             color: isSelected ? nodeColor : '#111827',
//                             marginBottom: '8px',
//                             lineHeight: '1.5',
//                             overflow: 'hidden',
//                             textOverflow: 'ellipsis',
//                             display: '-webkit-box',
//                             WebkitLineClamp: 2,
//                             WebkitBoxOrient: 'vertical',
//                             letterSpacing: '-0.01em',
//                           }}
//                         >
//                           {nodeDatum.name}
//                         </div>
//                         {hasChildren && (
//                           <div
//                             style={{
//                               display: 'flex',
//                               alignItems: 'center',
//                               gap: '6px',
//                               marginTop: '6px',
//                             }}
//                           >
//                             <div
//                               style={{
//                                 padding: '4px 10px',
//                                 background: `linear-gradient(135deg, ${nodeColor}15, ${nodeColor}25)`,
//                                 borderRadius: '12px',
//                                 fontSize: '11px',
//                                 fontWeight: '700',
//                                 color: nodeColor,
//                                 border: `1px solid ${nodeColor}30`,
//                                 boxShadow: `0 2px 4px ${nodeColor}20`,
//                               }}
//                             >
//                               {nodeDatum.children?.length} {nodeDatum.children?.length === 1 ? 'child' : 'children'}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     </foreignObject>

//                     {/* Modern Selection Indicator */}
//                     {isSelected && (
//                       <g>
//                         <circle r="10" fill={nodeColor} cx="250" cy="18" style={{ pointerEvents: 'none', opacity: 0.2 }} />
//                         <circle r="6" fill={nodeColor} cx="250" cy="18" style={{ pointerEvents: 'none' }} />
//                       </g>
//                     )}

//                     {/* Modern Hover Effect */}
//                     {isHovered && !isSelected && (
//                       <rect
//                         x="0"
//                         y="0"
//                         width="260"
//                         height="130"
//                         rx="16"
//                         fill="none"
//                         stroke={nodeColor}
//                         strokeWidth="2.5"
//                         strokeDasharray="6,4"
//                         style={{ pointerEvents: 'none', opacity: 0.6 }}
//                       />
//                     )}
//                   </g>
//                 );
//               }}
//             />
//           </div>
//         )}

//         {/* Modern Node Details Panel */}
//         {showNodeDetails && (
//           <div className="absolute top-4 right-4 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-6 z-10 max-h-[500px] overflow-y-auto">
//             <div className="flex items-center justify-between mb-5">
//               <div className="flex items-center gap-3">
//                 <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
//                   <Info className="w-5 h-5 text-white" />
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-bold text-gray-900">Node Details</h3>
//                   <p className="text-xs text-gray-500 font-medium">ID: {showNodeDetails.id}</p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowNodeDetails(null)}
//                 className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
//               >
//                 <X className="w-5 h-5" />
//               </button>
//             </div>

//             <div className="space-y-4">
//               {showNodeDetails.user_input && (
//                 <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200/50 shadow-sm mb-3">
//                   <div className="flex items-center gap-2 mb-3">
//                     <div className="p-1.5 bg-blue-500 rounded-lg">
//                       <User className="w-4 h-4 text-white" />
//                     </div>
//                     <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">User Input</span>
//                   </div>
//                   <p className="text-gray-800 text-sm leading-relaxed font-medium">{showNodeDetails.user_input}</p>
//                 </div>
//               )}

//               {showNodeDetails.bot_response && (
//                 <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50 shadow-sm mb-3">
//                   <div className="flex items-center gap-2 mb-3">
//                     <div className="p-1.5 bg-emerald-500 rounded-lg">
//                       <Bot className="w-4 h-4 text-white" />
//                     </div>
//                     <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bot Response</span>
//                   </div>
//                   <p className="text-gray-800 text-sm leading-relaxed font-medium">{showNodeDetails.bot_response}</p>
//                 </div>
//               )}

//               {!showNodeDetails.user_input && !showNodeDetails.bot_response && (
//                 <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
//                   <p className="text-gray-400 text-sm italic">Empty node - no content yet</p>
//                 </div>
//               )}

//               <div className="pt-4 border-t border-gray-200/50 space-y-2.5">
//                 <button
//                   onClick={() => handleNodeEdit(showNodeDetails)}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
//                 >
//                   <Edit2 className="w-4 h-4" />
//                   Edit Node
//                 </button>

//                 <button
//                   onClick={() => {
//                     handleAddChild(showNodeDetails.id);
//                     setShowNodeDetails(null);
//                   }}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
//                 >
//                   <Plus className="w-4 h-4" />
//                   Add Child Node
//                 </button>

//                 <button
//                   onClick={() => handleDeleteClick(showNodeDetails.id)}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
//                 >
//                   <Trash2 className="w-4 h-4" />
//                   Delete Node
//                 </button>
//               </div>

//               <div className="pt-3 border-t border-gray-200">
//                 <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
//                   <Info className="w-3.5 h-3.5" />
//                   <span className="font-medium">Node ID:</span>
//                   <span className="font-mono">{showNodeDetails.id}</span>
//                 </div>
//                 {showNodeDetails.parent_id && (
//                   <div className="flex items-center gap-2 text-xs text-gray-500">
//                     <Info className="w-3.5 h-3.5" />
//                     <span className="font-medium">Parent ID:</span>
//                     <span className="font-mono">{showNodeDetails.parent_id}</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Delete Confirmation Modal */}
//         {deleteConfirm.nodeId && (
//           <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
//               <div className="flex items-center gap-3 mb-4">
//                 <div className="p-2 bg-red-100 rounded-lg">
//                   <Trash2 className="w-5 h-5 text-red-600" />
//                 </div>
//                 <h3 className="text-lg font-bold text-gray-900">Delete Node</h3>
//               </div>

//               <p className="text-gray-600 mb-6">
//                 Are you sure you want to delete this node? All child nodes will also be permanently deleted.
//               </p>

//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={handleDeleteConfirm}
//                   className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
//                 >
//                   Delete
//                 </button>
//                 <button
//                   onClick={() => setDeleteConfirm({ nodeId: null })}
//                   className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-all"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
