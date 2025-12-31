'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { Tree } from 'react-d3-tree'
import { DialogNode, DialogTree } from '@/lib/api'
import { Edit2, Trash2, Plus, X, User, Bot, Info, Maximize2, Minimize2 } from 'lucide-react'

interface TreeVisualizationProps {
  nodes: DialogNode[]
  selectedTree: DialogTree
  onNodeClick?: (node: DialogNode) => void
  onNodeEdit?: (node: DialogNode) => void
  onNodeDelete?: (nodeId: number) => void
  onNodeAddChild?: (parentId: number) => void
  selectedNodeId?: number | null
}

interface TreeNode {
  name: string
  nodeId?: number
  attributes?: {
    userInput?: string
    botResponse?: string
    nodeId?: number
  }
  children?: TreeNode[]
}

export default function TreeVisualization({ 
  nodes, 
  selectedTree,
  onNodeClick,
  onNodeEdit,
  onNodeDelete,
  onNodeAddChild,
  selectedNodeId
}: TreeVisualizationProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [showNodeDetails, setShowNodeDetails] = useState<DialogNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState({ x: 200, y: 50 })
  const treeContainerRef = useRef<HTMLDivElement>(null)

  const nodeMap = useMemo(() => {
    const map = new Map<number, DialogNode>()
    nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes])

  const treeData = useMemo(() => {
    if (nodes.length === 0) {
      return {
        name: 'No nodes',
        attributes: {},
      }
    }

    const buildTree = (parentId: number | null): TreeNode[] => {
      const children = nodes.filter(n => n.parent_id === parentId)
      
      return children.map(node => {
        // Better node name formatting
        let nodeName = ''
        if (node.user_input && node.bot_response) {
          nodeName = `${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`
        } else if (node.user_input) {
          nodeName = `👤 ${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`
        } else if (node.bot_response) {
          nodeName = `🤖 ${node.bot_response.substring(0, 20)}${node.bot_response.length > 20 ? '...' : ''}`
        } else {
          nodeName = 'Empty Node'
        }

        return {
          name: nodeName,
          nodeId: node.id,
          attributes: {
            userInput: node.user_input || '',
            botResponse: node.bot_response || '',
            nodeId: node.id,
          },
          children: buildTree(node.id),
        }
      })
    }

    const rootNodes = buildTree(null)
    
    if (rootNodes.length === 0) {
      return {
        name: 'No root nodes',
        attributes: {},
      }
    }

    if (rootNodes.length === 1) {
      return rootNodes[0]
    }

    return {
      name: selectedTree.name,
      children: rootNodes,
    }
  }, [nodes, selectedTree])

  const handleNodeClick = (nodeData: any) => {
    const nodeId = nodeData.attributes?.nodeId || nodeData.nodeId
    if (nodeId && nodeMap.has(nodeId)) {
      const node = nodeMap.get(nodeId)!
      setShowNodeDetails(node)
      onNodeClick?.(node)
    }
  }

  const handleNodeEdit = (node: DialogNode) => {
    onNodeEdit?.(node)
    setShowNodeDetails(null)
  }

  const handleNodeDelete = (nodeId: number) => {
    onNodeDelete?.(nodeId)
    setShowNodeDetails(null)
  }

  const handleAddChild = (parentId: number) => {
    onNodeAddChild?.(parentId)
    setShowNodeDetails(null)
  }

  const containerStyles = {
    width: '100%',
    height: '600px',
    backgroundColor: '#f8fafc',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h2 className="text-sm font-bold text-gray-900">Tree View</h2>
          <span className="text-xs text-gray-500 ml-1">({nodes.length} nodes)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-all"
            title="Zoom out"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-all"
            title="Zoom in"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {showNodeDetails && (
            <button
              onClick={() => setShowNodeDetails(null)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-sm">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">No nodes to visualize</p>
              <p className="text-xs text-gray-400">Create nodes in the editor to see them here</p>
            </div>
          </div>
        ) : (
          <div ref={treeContainerRef} style={containerStyles} id="tree-container" className="rounded-lg overflow-hidden">
            <Tree
              data={treeData}
              orientation="vertical"
              pathFunc="straight"
              translate={translate}
              nodeSize={{ x: 280, y: 160 }}
              separation={{ siblings: 1.5, nonSiblings: 1.5 }}
              zoom={zoom}
              scaleExtent={{ min: 0.5, max: 2 }}
              onNodeClick={handleNodeClick}
              pathClassFunc={() => 'tree-link'}
              enableLegacyTransitions={true}
              transitionDuration={300}
              renderCustomNodeElement={(rd3tProps) => {
                const { nodeDatum } = rd3tProps
                const nodeId = (nodeDatum.attributes as any)?.nodeId
                const isSelected = selectedNodeId === nodeId
                const isHovered = hoveredNodeId === nodeId
                const hasChildren = nodeDatum.children && nodeDatum.children.length > 0
                const hasUserInput = !!nodeDatum.attributes?.userInput
                const hasBotResponse = !!nodeDatum.attributes?.botResponse
                
                // Determine node type color
                let nodeColor = '#10b981' // default green
                if (hasUserInput && hasBotResponse) {
                  nodeColor = '#6366f1' // purple for both
                } else if (hasUserInput) {
                  nodeColor = '#3b82f6' // blue for user input
                } else if (hasBotResponse) {
                  nodeColor = '#10b981' // green for bot response
                }
                
                return (
                  <g transform={`translate(-110, -60)`}>
                    {/* Node Card with Shadow */}
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Card Background */}
                    <rect
                      x="0"
                      y="0"
                      width="220"
                      height="120"
                      rx="12"
                      fill={isSelected ? '#dbeafe' : isHovered ? '#f8fafc' : '#ffffff'}
                      stroke={isSelected ? '#3b82f6' : nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        filter: isSelected || isHovered ? 'url(#shadow)' : 'none'
                      }}
                      onMouseEnter={() => nodeId && setHoveredNodeId(nodeId)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => handleNodeClick(nodeDatum)}
                    />
                    
                    {/* Left Border Accent */}
                    <rect
                      x="0"
                      y="0"
                      width="4"
                      height="120"
                      rx="12"
                      fill={nodeColor}
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Node Type Icons */}
                    <g style={{ pointerEvents: 'none' }}>
                      {hasUserInput && (
                        <circle r="6" fill="#3b82f6" cx="20" cy="20" />
                      )}
                      {hasBotResponse && (
                        <circle r="6" fill="#10b981" cx={hasUserInput ? "40" : "20"} cy="20" />
                      )}
                    </g>
                    
                    {/* Node Content */}
                    <foreignObject x="15" y="35" width="190" height="75">
                      <div style={{ 
                        padding: '8px',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        <div style={{ 
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isSelected ? '#1e40af' : '#1f2937',
                          marginBottom: '6px',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {nodeDatum.name}
                        </div>
                        {hasChildren && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px'
                          }}>
                            <div style={{
                              padding: '2px 8px',
                              backgroundColor: '#dbeafe',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '700',
                              color: '#1e40af'
                            }}>
                              {nodeDatum.children?.length} child{nodeDatum.children?.length !== 1 ? 'ren' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <circle
                        r="8"
                        fill="#3b82f6"
                        cx="210"
                        cy="15"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    
                    {/* Hover Effect */}
                    {isHovered && !isSelected && (
                      <rect
                        x="0"
                        y="0"
                        width="220"
                        height="120"
                        rx="12"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        style={{ pointerEvents: 'none', opacity: 0.5 }}
                      />
                    )}
                  </g>
                )
              }}
            />
          </div>
        )}

        {/* Enhanced Node Details Panel */}
        {showNodeDetails && (
          <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-2xl border-2 border-primary-200 p-5 z-10 animate-scale-in max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 rounded-lg">
                  <Info className="w-4 h-4 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Node Details</h3>
              </div>
              <button
                onClick={() => setShowNodeDetails(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {showNodeDetails.user_input && (
                <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">User Input</span>
                  </div>
                  <p className="text-gray-900 text-sm leading-relaxed">{showNodeDetails.user_input}</p>
                </div>
              )}

              {showNodeDetails.bot_response && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Bot Response</span>
                  </div>
                  <p className="text-gray-900 text-sm leading-relaxed">{showNodeDetails.bot_response}</p>
                </div>
              )}

              {!showNodeDetails.user_input && !showNodeDetails.bot_response && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <p className="text-gray-400 text-sm italic">Empty node - no content yet</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => handleNodeEdit(showNodeDetails)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-medium transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Node
                </button>
                
                <button
                  onClick={() => handleAddChild(showNodeDetails.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Child Node
                </button>
                
                <button
                  onClick={() => handleNodeDelete(showNodeDetails.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold shadow-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Node
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span className="font-medium">Node ID:</span>
                  <span className="font-mono">{showNodeDetails.id}</span>
                </div>
                {showNodeDetails.parent_id && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Info className="w-3.5 h-3.5" />
                    <span className="font-medium">Parent ID:</span>
                    <span className="font-mono">{showNodeDetails.parent_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
