'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Sphere, Box, Cylinder, Cone, Text3D, Sparkles, Stars, Cloud } from '@react-three/drei';
import * as THREE from 'three';
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
  Expand,
  Minimize2,
  Maximize,
  Minimize,
  Rotate3d,
  List,
  Move,
  Hand,
  Sparkle,
  Activity,
  Cpu,
  Network,
  CloudLightning,
  Waves,
  Wind,
  Leaf,
  Flower,
  Droplets,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  Box as BoxIcon,
} from 'lucide-react';

// ============== Types ==============
export interface TreeNode {
  data: boolean;
  metadata(metadata: any): unknown;
  id: string;
  type: 'root' | 'user_message' | 'reasoning' | 'tool_call' | 'memory' | 'decision' | 'response' | 'alternate_path';
  label: string;
  content?: string;
  timestamp: number;
  relativeTime: number;
  children: TreeNode[];
  status?: 'thinking' | 'processing' | 'complete' | 'error';
  confidence?: number;
  tokens?: number;
  latency?: number;
}

interface ConversationTreeViewProps {
  rootNode: TreeNode;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string;
  activeNodeIds?: string[];
  viewMode?: 'accordion' | 'tree' | '2d' | '3d';
  isLive?: boolean;
  onNodeProcess?: (node: TreeNode) => void;
}

// ============== Config ==============
const NODE_COLORS = {
  root: '#8B5A2B',
  user_message: '#3B82F6',
  reasoning: '#A855F7',
  tool_call: '#F97316',
  memory: '#06B6D4',
  decision: '#EAB308',
  response: '#22C55E',
  alternate_path: '#EF4444',
};

const NODE_ICONS = {
  root: TreePine,
  user_message: User,
  reasoning: Brain,
  tool_call: Wrench,
  memory: Database,
  decision: Zap,
  response: Bot,
  alternate_path: RotateCcw,
};

// Node type configuration for 2D tree
const NODE_TYPE_CONFIG = {
  root: { color: '#8B5A2B', bgColor: 'bg-amber-50', borderColor: 'border-amber-500', Icon: TreePine },
  user_message: { color: '#3B82F6', bgColor: 'bg-blue-50', borderColor: 'border-blue-500', Icon: User },
  reasoning: { color: '#A855F7', bgColor: 'bg-purple-50', borderColor: 'border-purple-500', Icon: Brain },
  tool_call: { color: '#F97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-500', Icon: Wrench },
  memory: { color: '#06B6D4', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-500', Icon: Database },
  decision: { color: '#EAB308', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500', Icon: Zap },
  response: { color: '#22C55E', bgColor: 'bg-green-50', borderColor: 'border-green-500', Icon: Bot },
  alternate_path: { color: '#EF4444', bgColor: 'bg-red-50', borderColor: 'border-red-500', Icon: RotateCcw },
};

// ============== Utils ==============
const formatTime = (ms: number): string => (ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`);
const countNodes = (node: TreeNode): number => 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);

// ============== ACCORDION VIEW (Compact) ==============
const AccordionView = ({ rootNode, onNodeClick, selectedNodeId, activeNodeIds = [] }: any) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootNode.id]));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const renderNode = (node: TreeNode, depth = 0): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const isActive = activeNodeIds.includes(node.id);
    const Icon = NODE_ICONS[node.type];

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'bg-blue-100 border-2 border-blue-300' : 'hover:bg-gray-100 border border-transparent'}
            ${isActive ? 'ring-2 ring-blue-400 animate-pulse' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (hasChildren) toggle(node.id);
            onNodeClick?.(node);
          }}
        >
          {hasChildren ? (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-5 h-5" />
          )}
          <Icon className="w-4 h-4" style={{ color: NODE_COLORS[node.type] }} />
          <span className="text-sm font-medium flex-1 truncate" style={{ color: NODE_COLORS[node.type] }}>
            {node.label}
          </span>
          {node.confidence && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{Math.round(node.confidence * 100)}%</span>
          )}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{formatTime(node.relativeTime)}</span>
          {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
        </div>
        {node.content && isExpanded && (
          <div className="text-xs text-gray-600 p-2 ml-8 mt-1 bg-gray-50 rounded border border-gray-200">
            {node.content.slice(0, 100)}
            {node.content.length > 100 ? '...' : ''}
          </div>
        )}
        {hasChildren && isExpanded && <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
      <div className="flex justify-between items-center p-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Live Conversation
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const all = new Set<string>();
              const add = (n: TreeNode) => {
                all.add(n.id);
                n.children.forEach(add);
              };
              add(rootNode);
              setExpanded(all);
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          >
            <Expand className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(new Set([rootNode.id]))} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-3 max-h-[600px] overflow-auto">{renderNode(rootNode)}</div>
    </div>
  );
};

// ============== 2D TREE VIEW ==============
const TwoDTreeView = ({ rootNode, onNodeClick, selectedNodeId, activeNodeIds = [] }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootNode.id]));
  const [zoom, setZoom] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const isExpanded = (id: string) => expanded.has(id);
  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const add = (n: TreeNode) => {
      all.add(n.id);
      n.children.forEach(add);
    };
    add(rootNode);
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded(new Set([rootNode.id]));
  };

  const isSelected = (id: string) => selectedNodeId === id;
  const isActive = (id: string) => activeNodeIds.includes(id);

  // Zoom handlers
  const zoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const zoomOut = () => setZoom(Math.max(zoom - 0.1, 0.3));
  const resetZoom = () => setZoom(1);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left click for panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
          setPanPosition({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  const renderTreeNode = (node: TreeNode, depth: number = 0, isLast: boolean = false, parentPath: boolean[] = []): JSX.Element => {
    const config = NODE_TYPE_CONFIG[node.type as keyof typeof NODE_TYPE_CONFIG] || NODE_TYPE_CONFIG.root;
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
                  {expanded ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronRight className="w-3 h-3 text-gray-600" />}
                </button>
              )}

              {/* Node Icon */}
              <IconComponent className={`w-6 h-6 ${config.color} mb-1`} />

              {/* Node Label */}
              <span className={`font-semibold ${config.color} text-xs text-center mb-1 leading-tight`}>{node.label}</span>

              {/* Time Badge */}
              <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{formatTime(node.relativeTime)}</span>

              {/* Active Indicator */}
              {active && <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border-2 border-white" />}
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
    <div
      ref={containerRef}
      className="bg-white rounded-lg border border-gray-200 shadow-lg relative overflow-hidden"
      style={{ height: '700px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/90 backdrop-blur-sm">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TreePine className="w-4 h-4 text-amber-600" />
          Conversation Tree - 2D View
        </h3>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              onClick={zoomOut}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Zoom Out (Ctrl/Cmd + -)"
              disabled={zoom <= 0.3}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 font-mono min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Zoom In (Ctrl/Cmd + +)"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                resetZoom();
                setPanPosition({ x: 0, y: 0 });
              }}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors text-xs"
              title="Reset Zoom & Pan (Ctrl/Cmd + 0)"
            >
              Reset
            </button>
          </div>

          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Expand All"
            >
              <Expand className="w-4 h-4" />
            </button>
            <button
              onClick={collapseAll}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Collapse All"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-gray-500 ml-2">{isDragging ? 'Dragging...' : 'Drag to pan | Scroll to zoom'}</div>
        </div>
      </div>

      {/* Tree Container with Zoom and Pan */}
      <div
        className="w-full h-full overflow-hidden"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            top: '100px',
            left: '50px',
          }}
        >
          {renderTreeNode(rootNode, 0, true, [])}
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gray-100/90 backdrop-blur-sm border-t border-gray-200 px-4 py-2 text-xs text-gray-600 flex justify-between">
        <span>Total Nodes: {countNodes(rootNode)}</span>
        <span>Active: {activeNodeIds.length}</span>
        {selectedNodeId && <span>Selected: {findNode(rootNode, selectedNodeId)?.label}</span>}
      </div>
    </div>
  );
};

// ============== 3D VIEW COMPONENTS ==============

// Particle System for Thinking State
function ThinkingParticles({ position, color }: { position: [number, number, number]; color: string }) {
  return <Sparkles position={position} count={20} speed={0.5} opacity={0.5} color={color} size={0.2} />;
}

// Energy Waves for Processing
function EnergyWaves({ position, color, active }: { position: [number, number, number]; color: string; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && active) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.2);
    }
  });

  return active ? (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.6, 0.65, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  ) : null;
}

// Floating Orbs for Memory Nodes
function MemoryOrbs({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[...Array(3)].map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 2) * 0.3, Math.cos(i * 2) * 0.3, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#06B6D4" emissive="#06B6D4" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Data Flow Lines
function DataFlow({ start, end, active }: { start: [number, number, number]; end: [number, number, number]; active: boolean }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const [progress, setProgress] = useState(0);

  useFrame(({ clock }) => {
    if (active) {
      setProgress((Math.sin(clock.elapsedTime * 5) + 1) / 2);
    }
  });

  return (
    <group>
      <Line points={points} color={active ? '#60A5FA' : '#6B7280'} lineWidth={active ? 3 : 1} opacity={0.4} transparent />
      {active && (
        <mesh
          position={[
            start[0] + (end[0] - start[0]) * progress,
            start[1] + (end[1] - start[1]) * progress,
            start[2] + (end[2] - start[2]) * progress,
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#60A5FA" />
        </mesh>
      )}
    </group>
  );
}

// Confidence Ring
function ConfidenceRing({ position, confidence }: { position: [number, number, number]; confidence: number }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.55, 32]} />
      <meshBasicMaterial
        color={confidence > 0.7 ? '#22C55E' : confidence > 0.4 ? '#EAB308' : '#EF4444'}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Live Node with Real-time Effects
function LiveNode3D({
  node,
  pos,
  selected,
  active,
  onClick,
  isLive,
}: {
  node: TreeNode;
  pos: [number, number, number];
  selected: boolean;
  active: boolean;
  onClick: () => void;
  isLive: boolean;
}) {
  const color = NODE_COLORS[node.type as keyof typeof NODE_COLORS];
  const [hover, setHover] = useState(false);
  const [pulse, setPulse] = useState(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      if (active) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.15);
        setPulse(Math.sin(state.clock.elapsedTime * 10) * 0.2 + 0.8);
      } else if (hover) {
        meshRef.current.scale.setScalar(1.2);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group position={pos}>
      {/* Main Node */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        {node.type === 'root' ? (
          <coneGeometry args={[0.5, 0.8, 8]} />
        ) : node.type === 'memory' ? (
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        ) : node.type === 'decision' ? (
          <octahedronGeometry args={[0.4]} />
        ) : (
          <sphereGeometry args={[0.4, 32, 16]} />
        )}

        <meshStandardMaterial
          color={color}
          emissive={active ? color : '#000'}
          emissiveIntensity={active ? 0.8 : 0.2}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={hover ? 1 : 0.9}
        />
      </mesh>

      {/* Real-time Effects */}
      {isLive && active && node.status === 'thinking' && <ThinkingParticles position={[0, 0.5, 0]} color={color} />}

      {isLive && active && node.status === 'processing' && <EnergyWaves position={[0, 0, 0]} color={color} active={true} />}

      {node.type === 'memory' && <MemoryOrbs position={[0, 0, 0]} />}

      {node.confidence && <ConfidenceRing position={[0, -0.3, 0]} confidence={node.confidence} />}

      {/* Glow Effect */}
      {(hover || selected || active) && (
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} wireframe />
        </mesh>
      )}

      {/* Token Counter */}
      {node.tokens && (
        <Html position={[0, 0.9, 0]} center>
          <div className="px-2 py-0.5 bg-purple-600 text-white text-[8px] rounded-full">{node.tokens}t</div>
        </Html>
      )}

      {/* Label */}
      <Html position={[0, 1.2, 0]} center>
        <div
          className="px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap backdrop-blur-sm"
          style={{
            backgroundColor: `${color}dd`,
            transform: hover ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          {node.label}
          {node.latency && <span className="ml-1 text-[8px] opacity-80">({node.latency}ms)</span>}
        </div>
      </Html>

      {/* Time Badge */}
      <Html position={[0, -0.9, 0]} center>
        <div className="px-1.5 py-0.5 text-[8px] bg-gray-900/80 text-gray-300 rounded border border-gray-700">
          {formatTime(node.relativeTime)}
        </div>
      </Html>
    </group>
  );
}

// Live Tree with Real-time Updates
function LiveTree3D({
  node,
  expanded,
  setExpanded,
  onNodeClick,
  selected,
  active,
  pos = [0, 3, 0],
  parentPos = null,
  depth = 0,
  isLive = false,
}: any) {
  const isExpanded = expanded.has(node.id);

  return (
    <group key={node.id}>
      {/* Data Flow Connection */}
      {parentPos && <DataFlow start={parentPos} end={pos} active={active?.includes(node.id) && isLive} />}

      {/* Current Node */}
      <LiveNode3D
        node={node}
        pos={pos}
        selected={selected === node.id}
        active={active?.includes(node.id)}
        onClick={() => {
          if (node.children.length) {
            setExpanded((prev: Iterable<unknown> | null | undefined) => {
              const next = new Set(prev);
              next.has(node.id) ? next.delete(node.id) : next.add(node.id);
              return next;
            });
          }
          onNodeClick?.(node);
        }}
        isLive={isLive}
      />

      {/* Children */}
      {isExpanded &&
        node.children.map((child: TreeNode, i: number) => {
          const angle = (i / node.children.length) * Math.PI * 2;
          const radius = 2.5;
          const childPos: [number, number, number] = [pos[0] + Math.cos(angle) * radius, pos[1] - 1.3, pos[2] + Math.sin(angle) * radius];

          return (
            <LiveTree3D
              key={child.id}
              node={child}
              expanded={expanded}
              setExpanded={setExpanded}
              onNodeClick={onNodeClick}
              selected={selected}
              active={active}
              pos={childPos}
              parentPos={pos}
              depth={depth + 1}
              isLive={isLive}
            />
          );
        })}
    </group>
  );
}

// Environment Effects
function DynamicEnvironment({ isLive }: { isLive: boolean }) {
  const [timeOfDay, setTimeOfDay] = useState(0);

  useFrame(({ clock }) => {
    if (isLive) {
      setTimeOfDay(Math.sin(clock.elapsedTime * 0.1) * 0.5 + 0.5);
    }
  });

  return (
    <group>
      {/* Dynamic Sky */}
      <color attach="background" args={[`hsl(220, 50%, ${20 + timeOfDay * 20}%)`]} />

      {/* Stars at night */}
      {timeOfDay < 0.3 && <Stars radius={50} depth={50} count={2000} factor={4} />}

      {/* Clouds */}
      <Cloud position={[-5, 8, -10]} speed={0.2} opacity={0.3} />
      <Cloud position={[5, 7, -8]} speed={0.1} opacity={0.2} />

      {/* Ambient Particles */}
      <Sparkles count={50} scale={20} size={0.5} speed={0.2} opacity={0.1} color="#88aaff" />
    </group>
  );
}

// Status Panel for 3D
function StatusPanel({ activeNodes, totalNodes, isLive }: { activeNodes: number; totalNodes: number; isLive: boolean }) {
  return (
    <div className="absolute top-20 left-4 z-30 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-800 p-3 text-white">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-xs font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
        <Cpu className="w-3 h-3 text-blue-400" />
      </div>
      <div className="text-xs text-gray-400">
        <div>Active: {activeNodes}</div>
        <div>Total: {totalNodes}</div>
        <div>Thinking: {activeNodes > 0 ? '⚡' : '💤'}</div>
      </div>
    </div>
  );
}

// ============== 3D VIEW ==============
const ThreeDView = ({ rootNode, onNodeClick, selectedNodeId, activeNodeIds = [], isLive = false }: any) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootNode.id]));
  const [autoRotate, setAutoRotate] = useState(!isLive);
  const [controls, setControls] = useState<any>(null);
  const [viewPreset, setViewPreset] = useState<'overview' | 'focus' | 'free'>('free');

  // Auto-expand live nodes
  useEffect(() => {
    if (isLive && activeNodeIds.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        activeNodeIds.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }, [isLive, activeNodeIds]);

  return (
    <div className="bg-gradient-to-b from-gray-950 to-gray-900 rounded-lg border border-gray-800 h-[700px] relative overflow-hidden shadow-2xl">
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-3 bg-gray-900/90 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">Neural Tree - 3D View</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full border border-green-500/30">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-400">REAL-TIME</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Presets */}
          <div className="flex gap-1 mr-2 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => {
                setViewPreset('overview');
                if (controls) {
                  controls.target.set(0, 2, 0);
                  controls.object.position.set(15, 10, 20);
                  controls.update();
                }
              }}
              className={`px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-1
                ${viewPreset === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <TreePine className="w-3 h-3" /> Overview
            </button>
            <button
              onClick={() => {
                setViewPreset('focus');
                setAutoRotate(false);
                if (controls && selectedNodeId) {
                  const node = findNode(rootNode, selectedNodeId);
                  if (node) {
                    controls.target.set(0, 2, 0);
                    controls.object.position.set(5, 4, 8);
                    controls.update();
                  }
                }
              }}
              className={`px-2 py-1.5 rounded-md text-xs transition-all flex items-center gap-1
                ${viewPreset === 'focus' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Zap className="w-3 h-3" /> Focus
            </button>
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-md transition-colors flex items-center gap-1
              ${autoRotate ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title={autoRotate ? 'Auto Rotate ON' : 'Free Movement'}
          >
            {autoRotate ? <Rotate3d className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              const all = new Set<string>();
              const add = (n: TreeNode) => {
                all.add(n.id);
                n.children.forEach(add);
              };
              add(rootNode);
              setExpanded(all);
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
          >
            <Expand className="w-4 h-4" />
          </button>

          <button
            onClick={() => setExpanded(new Set([rootNode.id]))}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Panel */}
      <StatusPanel activeNodes={activeNodeIds.length} totalNodes={countNodes(rootNode)} isLive={isLive} />

      {/* Canvas */}
      <Canvas camera={{ position: [12, 8, 16], fov: 50 }}>
        {/* Dynamic Environment */}
        <DynamicEnvironment isLive={isLive} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-10, 5, -5]} intensity={0.6} color="#88aaff" />
        <pointLight position={[0, 5, 5]} intensity={0.4} color="#ffaa88" />

        {/* Controls */}
        <OrbitControls
          ref={setControls}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.8}
          zoomSpeed={1.2}
          panSpeed={1.0}
          minDistance={5}
          maxDistance={40}
        />

        {/* Ground with glow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#1a1e2a" emissive="#0a0e1a" roughness={0.8} metalness={0.2} />
        </mesh>

        <gridHelper args={[40, 20, '#4a5a7a', '#2a3a4a']} position={[0, -1.2, 0]} />

        {/* Live Tree */}
        <LiveTree3D
          node={rootNode}
          expanded={expanded}
          setExpanded={setExpanded}
          onNodeClick={onNodeClick}
          selected={selectedNodeId}
          active={activeNodeIds}
          pos={[0, 3, 0]}
          isLive={isLive}
        />
      </Canvas>

      {/* Live Activity Feed */}
      {isLive && activeNodeIds.length > 0 && (
        <div className="absolute bottom-20 left-4 z-30 max-w-xs">
          <div className="bg-gray-900/90 backdrop-blur-md rounded-lg border border-blue-800/50 p-3">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-semibold">Live Activity</span>
            </div>
            <div className="space-y-1.5">
              {activeNodeIds.slice(0, 3).map((id: string) => {
                const node = findNode(rootNode, id);
                return node ? (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-gray-300">{node.label}</span>
                    <span className="text-gray-500 text-[10px]">
                      {node.status === 'thinking' ? '🤔' : node.status === 'processing' ? '⚙️' : '✅'}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-800 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-blue-400">
            <Hand className="w-3.5 h-3.5" />
            <span>{autoRotate ? 'Auto' : 'Free'}</span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-gray-400">🖱️ Drag = Rotate</span>
          <span className="text-gray-400">🖱️ Right = Move</span>
          <span className="text-gray-400">🖱️ Scroll = Zoom</span>
          {isLive && <span className="text-green-400">⚡ Live Updates</span>}
        </div>
      </div>

      {selectedNodeId && (
        <div className="absolute bottom-4 right-4 z-20">
          <div className="bg-blue-600/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-800 shadow-lg">
            <span className="text-xs text-white font-medium">{findNode(rootNode, selectedNodeId)?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to find node
const findNode = (node: TreeNode, id: string): TreeNode | null => {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
};

// ============== MAIN ==============
export default function ConversationTreeView(props: ConversationTreeViewProps) {
  const [currentView, setCurrentView] = useState<'accordion' | '2d' | '3d'>(
    props.viewMode === 'tree' ? '2d' : props.viewMode === '3d' ? '3d' : 'accordion',
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [isLive, setIsLive] = useState(props.isLive || false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!ref.current) return;
    try {
      !document.fullscreenElement ? await ref.current.requestFullscreen() : await document.exitFullscreen();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div ref={ref} className={`transition-all ${fullscreen ? 'fixed inset-0 z-50' : 'w-full'}`}>
      <div className="flex justify-end items-center mb-3">
        <div className="flex  items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('accordion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${
                  currentView === 'accordion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              Accordion
            </button>
            <button
              onClick={() => setCurrentView('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${currentView === '2d' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              2D Tree
            </button>
            <button
              onClick={() => setCurrentView('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${currentView === '3d' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            >
              <BoxIcon className="w-3.5 h-3.5" />
              3D View
            </button>
          </div>

          {/* Live Toggle - Only for 3D view */}
          {currentView === '3d' && (
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${
                  isLive
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
              {isLive ? 'LIVE' : 'PAUSED'}
            </button>
          )}

          {/* Fullscreen Toggle */}
          {(currentView === '2d' || currentView === '3d') && (
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
              title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Render based on current view */}
      {currentView === 'accordion' && <AccordionView {...props} />}
      {currentView === '2d' && <TwoDTreeView {...props} />}
      {currentView === '3d' && <ThreeDView {...props} isLive={isLive} />}
    </div>
  );
}
// 'use client';

// import { useState, useEffect, useRef, useCallback } from 'react';
// import {
//   ChevronRight,
//   ChevronDown,
//   User,
//   Brain,
//   Wrench,
//   Database,
//   Zap,
//   Bot,
//   RotateCcw,
//   TreePine,
//   MessageSquare,
//   Expand,
//   Minimize2,
//   ZoomIn,
//   ZoomOut,
//   Maximize,
//   Minimize,
// } from 'lucide-react';

// export interface TreeNode {
//   id: string;
//   type: 'root' | 'user_message' | 'reasoning' | 'tool_call' | 'memory' | 'decision' | 'response' | 'alternate_path';
//   label: string;
//   content?: string;
//   timestamp: number;
//   relativeTime: number;
//   data?: Record<string, any>;
//   metadata?: Record<string, any>;
//   children: TreeNode[];
//   isActive?: boolean;
//   parentId?: string;
// }

// interface ConversationTreeViewProps {
//   rootNode: TreeNode;
//   onNodeClick?: (node: TreeNode) => void;
//   selectedNodeId?: string;
//   activeNodeIds?: string[]; // For playback highlighting
//   viewMode?: 'accordion' | 'tree'; // View mode: accordion or tree with branches
// }

// const NODE_TYPE_CONFIG = {
//   root: { Icon: TreePine, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' },
//   user_message: { Icon: User, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
//   reasoning: { Icon: Brain, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
//   tool_call: { Icon: Wrench, color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
//   memory: { Icon: Database, color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' },
//   decision: { Icon: Zap, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
//   response: { Icon: Bot, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
//   alternate_path: { Icon: RotateCcw, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
// };

// export default function ConversationTreeView({
//   rootNode,
//   onNodeClick,
//   selectedNodeId,
//   activeNodeIds = [],
//   viewMode = 'tree',
// }: ConversationTreeViewProps) {
//   const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]));
//   const [zoom, setZoom] = useState(1);
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
//   const containerRef = useRef<HTMLDivElement>(null);
//   const treeContainerRef = useRef<HTMLDivElement>(null);
//   const panStartRef = useRef({ x: 0, y: 0 });

//   // Handle fullscreen changes
//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       setIsFullscreen(!!document.fullscreenElement);
//     };

//     document.addEventListener('fullscreenchange', handleFullscreenChange);
//     return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
//   }, []);

//   const zoomIn = () => {
//     setZoom((prev) => Math.min(prev + 0.1, 3)); // Max zoom 3x
//   };

//   const zoomOut = () => {
//     setZoom((prev) => Math.max(prev - 0.1, 0.3)); // Min zoom 0.3x
//   };

//   const resetZoom = () => {
//     setZoom(1);
//     setPanPosition({ x: 0, y: 0 });
//   };

//   // Handle drag/pan functionality
//   const handleMouseDown = (e: React.MouseEvent) => {
//     if (viewMode !== 'tree') return;

//     // Don't start drag if clicking on buttons, interactive elements, or nodes
//     const target = e.target as HTMLElement;
//     if (
//       target.closest('button') ||
//       target.closest('[role="button"]') ||
//       target.closest('[class*="cursor-pointer"]') ||
//       target.closest('[onclick]')
//     ) {
//       return;
//     }

//     // Only start drag with left mouse button
//     if (e.button !== 0) return;

//     setIsDragging(true);
//     setDragStart({ x: e.clientX, y: e.clientY });
//     panStartRef.current = { ...panPosition };
//     e.preventDefault();
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!isDragging || viewMode !== 'tree') return;
//     e.preventDefault();
//     e.stopPropagation();

//     const deltaX = e.clientX - dragStart.x;
//     const deltaY = e.clientY - dragStart.y;

//     // Only update if there's significant movement (prevents accidental drags)
//     if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
//       setPanPosition({
//         x: panStartRef.current.x + deltaX,
//         y: panStartRef.current.y + deltaY,
//       });
//     }
//   };

//   const handleMouseUp = (e: React.MouseEvent) => {
//     if (isDragging) {
//       e.preventDefault();
//       e.stopPropagation();
//     }
//     setIsDragging(false);
//   };

//   // Handle mouse leave to stop dragging
//   const handleMouseLeave = () => {
//     setIsDragging(false);
//   };

//   // Prevent text selection while dragging
//   useEffect(() => {
//     if (isDragging) {
//       document.body.style.userSelect = 'none';
//       document.body.style.cursor = 'grabbing';
//     } else {
//       document.body.style.userSelect = '';
//       document.body.style.cursor = '';
//     }
//     return () => {
//       document.body.style.userSelect = '';
//       document.body.style.cursor = '';
//     };
//   }, [isDragging]);

//   const toggleFullscreen = useCallback(async () => {
//     if (!containerRef.current) return;

//     try {
//       if (!document.fullscreenElement) {
//         await containerRef.current.requestFullscreen();
//         setIsFullscreen(true);
//       } else {
//         await document.exitFullscreen();
//         setIsFullscreen(false);
//       }
//     } catch (error) {
//       console.error('Error toggling fullscreen:', error);
//     }
//   }, []);

//   // Handle keyboard shortcuts for zoom
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
//         return;
//       }

//       if ((e.ctrlKey || e.metaKey) && e.key === '=') {
//         e.preventDefault();
//         zoomIn();
//       } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
//         e.preventDefault();
//         zoomOut();
//       } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
//         e.preventDefault();
//         resetZoom();
//       } else if (e.key === 'F11') {
//         e.preventDefault();
//         toggleFullscreen();
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [toggleFullscreen]);

//   // Handle mouse wheel zoom (Ctrl/Cmd + Scroll) - Reduced sensitivity
//   useEffect(() => {
//     if (viewMode !== 'tree' || !treeContainerRef.current) return;

//     const handleWheel = (e: WheelEvent) => {
//       if (e.ctrlKey || e.metaKey) {
//         e.preventDefault();

//         // Reduced zoom sensitivity: 1.5% per scroll tick (slower, more controlled)
//         const zoomSensitivity = 0.015;

//         if (e.deltaY < 0) {
//           setZoom((prev) => Math.min(prev + zoomSensitivity, 3));
//         } else {
//           setZoom((prev) => Math.max(prev - zoomSensitivity, 0.3));
//         }
//       }
//     };

//     const container = treeContainerRef.current;
//     container.addEventListener('wheel', handleWheel, { passive: false });
//     return () => container.removeEventListener('wheel', handleWheel);
//   }, [viewMode]);

//   const toggleNode = (nodeId: string) => {
//     const newExpanded = new Set(expandedNodes);
//     if (newExpanded.has(nodeId)) {
//       newExpanded.delete(nodeId);
//     } else {
//       newExpanded.add(nodeId);
//     }
//     setExpandedNodes(newExpanded);
//   };

//   const expandAll = () => {
//     const allIds = new Set<string>();
//     const collectIds = (node: TreeNode) => {
//       allIds.add(node.id);
//       node.children.forEach(collectIds);
//     };
//     collectIds(rootNode);
//     setExpandedNodes(allIds);
//   };

//   const collapseAll = () => {
//     setExpandedNodes(new Set([rootNode.id]));
//   };

//   const isExpanded = (nodeId: string) => expandedNodes.has(nodeId);
//   const isSelected = (nodeId: string) => selectedNodeId === nodeId;
//   const isActive = (nodeId: string) => activeNodeIds.includes(nodeId);

//   const formatTime = (ms: number) => {
//     if (ms < 1000) return `${ms.toFixed(0)}ms`;
//     return `${(ms / 1000).toFixed(2)}s`;
//   };

//   // Accordion view renderer (simpler, nested style)
//   const renderAccordionNode = (node: TreeNode, depth: number = 0): JSX.Element => {
//     const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.root;
//     const IconComponent = config.Icon;
//     const hasChildren = node.children.length > 0;
//     const expanded = isExpanded(node.id);
//     const selected = isSelected(node.id);
//     const active = isActive(node.id);

//     return (
//       <div key={node.id} className="select-none">
//         <div
//           className={`
//             flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all
//             ${selected ? `${config.bgColor} ${config.borderColor} border-2` : 'hover:bg-gray-50 border border-transparent'}
//             ${active ? 'ring-2 ring-blue-400 shadow-md' : ''}
//           `}
//           style={{ paddingLeft: `${depth * 20 + 12}px` }}
//           onClick={() => {
//             if (hasChildren) {
//               toggleNode(node.id);
//             }
//             onNodeClick?.(node);
//           }}
//         >
//           {/* Expand/Collapse Icon */}
//           {hasChildren ? (
//             <button
//               className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0 transition-colors"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 toggleNode(node.id);
//               }}
//             >
//               {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
//             </button>
//           ) : (
//             <div className="w-5 h-5" />
//           )}

//           {/* Node Icon */}
//           <IconComponent className={`w-5 h-5 ${config.color} flex-shrink-0`} />

//           {/* Node Label */}
//           <span className={`font-semibold ${config.color} flex-1 truncate text-sm`}>{node.label}</span>

//           {/* Time Badge */}
//           <span className="text-xs text-gray-500 font-mono flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded">
//             {formatTime(node.relativeTime)}
//           </span>

//           {/* Active Indicator */}
//           {active && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />}
//         </div>

//         {/* Node Content Preview */}
//         {node.content && expanded && (
//           <div
//             className="text-sm text-gray-600 px-3 py-2 mt-1 mb-2 rounded bg-gray-50 border border-gray-200"
//             style={{ paddingLeft: `${depth * 20 + 44}px` }}
//           >
//             {node.content.length > 150 ? `${node.content.substring(0, 150)}...` : node.content}
//           </div>
//         )}

//         {/* Children */}
//         {hasChildren && expanded && <div className="ml-2">{node.children.map((child) => renderAccordionNode(child, depth + 1))}</div>}
//       </div>
//     );
//   };

//   // Tree view renderer (classic tree structure with branches)
//   const renderTreeNode = (node: TreeNode, depth: number = 0, isLast: boolean = false, parentPath: boolean[] = []): JSX.Element => {
//     const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.root;
//     const IconComponent = config.Icon;
//     const hasChildren = node.children.length > 0;
//     const expanded = isExpanded(node.id);
//     const selected = isSelected(node.id);
//     const active = isActive(node.id);
//     const isLeaf = !hasChildren || !expanded;

//     return (
//       <div key={node.id} className="select-none relative flex flex-col items-center">
//         {/* Branch connector from parent (vertical line) */}
//         {depth > 0 && (
//           <div
//             className="absolute border-l-2 border-gray-400"
//             style={{
//               top: '-24px',
//               height: '24px',
//               width: '2px',
//             }}
//           />
//         )}

//         {/* Node Container */}
//         <div className="relative flex items-center">
//           {/* Node Circle/Box */}
//           <div className="relative z-10">
//             <div
//               className={`
//                 flex flex-col items-center justify-center min-w-[140px] px-3 py-2 rounded-lg cursor-pointer transition-all
//                 ${selected ? `${config.bgColor} ${config.borderColor} border-2` : 'hover:bg-gray-50 border-2 border-transparent'}
//                 ${active ? 'ring-2 ring-blue-400 shadow-lg' : ''}
//                 ${isLeaf ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-300'}
//               `}
//               onClick={() => {
//                 if (hasChildren) {
//                   toggleNode(node.id);
//                 }
//                 onNodeClick?.(node);
//               }}
//             >
//               {/* Expand/Collapse Indicator */}
//               {hasChildren && (
//                 <button
//                   className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white border-2 border-gray-400 rounded-full shadow-sm hover:bg-gray-100 transition-colors z-20"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     toggleNode(node.id);
//                   }}
//                 >
//                   {expanded ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronRight className="w-3 h-3 text-gray-600" />}
//                 </button>
//               )}

//               {/* Node Icon */}
//               <IconComponent className={`w-6 h-6 ${config.color} mb-1`} />

//               {/* Node Label */}
//               <span className={`font-semibold ${config.color} text-xs text-center mb-1 leading-tight`}>{node.label}</span>

//               {/* Time Badge */}
//               <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{formatTime(node.relativeTime)}</span>

//               {/* Active Indicator */}
//               {active && <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border-2 border-white" />}
//             </div>

//             {/* Node Content Preview */}
//             {node.content && expanded && (
//               <div className="text-xs text-gray-600 px-2 py-1.5 mt-2 rounded bg-gray-50 border border-gray-200 max-w-[200px] text-center">
//                 {node.content.length > 80 ? `${node.content.substring(0, 80)}...` : node.content}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Children Container */}
//         {hasChildren && expanded && (
//           <div className="relative mt-6 flex items-start justify-center gap-6">
//             {/* Vertical line from parent down to children level */}
//             <div
//               className="absolute border-l-2 border-gray-400"
//               style={{
//                 left: '50%',
//                 transform: 'translateX(-50%)',
//                 top: '-24px',
//                 height: '24px',
//                 width: '2px',
//               }}
//             />

//             {/* Horizontal line connecting all children */}
//             {node.children.length > 1 && (
//               <div
//                 className="absolute border-t-2 border-gray-400"
//                 style={{
//                   left: '0',
//                   right: '0',
//                   top: '-24px',
//                   height: '2px',
//                 }}
//               />
//             )}

//             {/* Vertical lines from horizontal line to each child */}
//             {node.children.map((child, index) => {
//               const totalChildren = node.children.length;
//               const position = totalChildren > 1 ? (index / (totalChildren - 1)) * 100 : 50;
//               return (
//                 <div
//                   key={`connector-${child.id}`}
//                   className="absolute border-l-2 border-gray-400"
//                   style={{
//                     left: `${position}%`,
//                     transform: 'translateX(-50%)',
//                     top: '-24px',
//                     height: '24px',
//                     width: '2px',
//                   }}
//                 />
//               );
//             })}

//             {/* Render Children */}
//             {node.children.map((child, index) => {
//               const isChildLast = index === node.children.length - 1;
//               const newPath = [...parentPath, isLast];
//               return (
//                 <div key={child.id} className="relative">
//                   {renderTreeNode(child, depth + 1, isChildLast, newPath)}
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div ref={containerRef} className={`bg-white rounded border border-gray-200 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
//       {/* Controls */}
//       <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
//         <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">Conversation Tree</h3>
//         <div className="flex items-center gap-2">
//           {/* Zoom Controls - Only show for tree view */}
//           {viewMode === 'tree' && (
//             <>
//               <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
//                 <button
//                   onClick={zoomOut}
//                   className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
//                   title="Zoom Out (Ctrl/Cmd + -)"
//                   disabled={zoom <= 0.3}
//                 >
//                   <ZoomOut className="w-5 h-5" />
//                 </button>
//                 <span className="text-xs text-gray-600 font-mono min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
//                 <button
//                   onClick={zoomIn}
//                   className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
//                   title="Zoom In (Ctrl/Cmd + +)"
//                   disabled={zoom >= 3}
//                 >
//                   <ZoomIn className="w-5 h-5" />
//                 </button>
//                 <button
//                   onClick={resetZoom}
//                   className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors text-xs font-medium"
//                   title="Reset Zoom & Pan (Ctrl/Cmd + 0)"
//                 >
//                   Reset
//                 </button>
//                 <button
//                   onClick={() => setPanPosition({ x: 0, y: 0 })}
//                   className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors text-xs font-medium"
//                   title="Reset Pan Position"
//                   disabled={panPosition.x === 0 && panPosition.y === 0}
//                 >
//                   Reset Pan
//                 </button>
//               </div>
//               <button
//                 onClick={toggleFullscreen}
//                 className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
//                 title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'}
//               >
//                 {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
//               </button>
//             </>
//           )}
//           <div className="flex gap-2 border-l border-gray-300 pl-2">
//             <button
//               onClick={expandAll}
//               className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
//               title="Expand All"
//             >
//               <Expand className="w-5 h-5" />
//             </button>
//             <button
//               onClick={collapseAll}
//               className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
//               title="Collapse All"
//             >
//               <Minimize2 className="w-5 h-5" />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Tree or Accordion */}
//       <div
//         ref={treeContainerRef}
//         className={`${isFullscreen ? 'h-[calc(100vh-60px)]' : 'max-h-[calc(100vh-200px)]'} ${viewMode === 'tree' ? 'overflow-hidden p-6' : 'overflow-auto p-4'}`}
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//         onMouseLeave={handleMouseLeave}
//         style={{
//           cursor: viewMode === 'tree' && !isDragging ? 'grab' : isDragging ? 'grabbing' : 'default',
//         }}
//       >
//         {viewMode === 'accordion' ? (
//           renderAccordionNode(rootNode)
//         ) : (
//           <div
//             className="flex justify-center transition-transform duration-200 ease-out"
//             style={{
//               transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
//               transformOrigin: 'top center',
//               minHeight: '100%',
//               paddingBottom: `${(zoom - 1) * 50}px`,
//               userSelect: isDragging ? 'none' : 'auto',
//             }}
//           >
//             {renderTreeNode(rootNode, 0, true, [])}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
