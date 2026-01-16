'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { Tree } from 'react-d3-tree'
import { DialogNode, DialogTree } from '@/lib/api'
import { Edit2, Trash2, Plus, X, User, Bot, Info, Maximize2, Minimize2, Save } from 'lucide-react'

interface TreeVisualizationProps {
  nodes: DialogNode[]
  selectedTree: DialogTree
  onNodeClick?: (node: DialogNode) => void
  onNodeEdit?: (node: DialogNode) => void
  onNodeDelete?: (nodeId: number) => void
  onNodeAddChild?: (parentId: number) => void
  onNodeAddRoot?: () => void
  onNodeCreate?: (parentId: number | null, userInput: string, botResponse: string) => Promise<DialogNode>
  onNodeUpdate?: (id: number, userInput: string, botResponse: string) => Promise<DialogNode>
  onNodesUpdate?: (updatedNodes: DialogNode[]) => void
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
  onNodeAddRoot,
  onNodeCreate,
  onNodeUpdate,
  onNodesUpdate,
  selectedNodeId
}: TreeVisualizationProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [showNodeDetails, setShowNodeDetails] = useState<DialogNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState({ x: 200, y: 50 })
  const treeContainerRef = useRef<HTMLDivElement>(null)
  const [editingNode, setEditingNode] = useState<{ parentId: number | null; userInput: string; botResponse: string } | null>(null)
  const [editingExistingNode, setEditingExistingNode] = useState<{ id: number; userInput: string; botResponse: string } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: number | null }>({ nodeId: null })

  const nodeMap = useMemo(() => {
    const map = new Map<number, DialogNode>()
    nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes])

  const treeData = useMemo(() => {
    const buildTree = (parentId: number | null): TreeNode[] => {
      const children = nodes.filter(n => n.parent_id === parentId)
      const result: TreeNode[] = []
      
      // Add actual nodes
      children.forEach(node => {
        // Check if this node is being edited
        const isBeingEdited = editingExistingNode && editingExistingNode.id === node.id
        
        // Better node name formatting
        let nodeName = ''
        if (isBeingEdited) {
          nodeName = 'Editing Node...'
        } else if (node.user_input && node.bot_response) {
          nodeName = `${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`
        } else if (node.user_input) {
          nodeName = `👤 ${node.user_input.substring(0, 20)}${node.user_input.length > 20 ? '...' : ''}`
        } else if (node.bot_response) {
          nodeName = `🤖 ${node.bot_response.substring(0, 20)}${node.bot_response.length > 20 ? '...' : ''}`
        } else {
          nodeName = 'Empty Node'
        }

        result.push({
          name: nodeName,
          nodeId: node.id,
          attributes: {
            userInput: isBeingEdited ? editingExistingNode.userInput : (node.user_input || ''),
            botResponse: isBeingEdited ? editingExistingNode.botResponse : (node.bot_response || ''),
            nodeId: node.id,
            isEditingExisting: isBeingEdited,
          },
          children: buildTree(node.id),
        })
      })
      
      // Add editing node if it matches this parent (add it as the last child for proper alignment)
      if (editingNode && editingNode.parentId === parentId) {
        result.push({
          name: 'New Node (editing)',
          nodeId: -1, // Temporary ID for editing node
          attributes: {
            userInput: editingNode.userInput,
            botResponse: editingNode.botResponse,
            nodeId: -1,
            isEditing: true,
            parentId: parentId,
          },
          children: [],
        })
      }
      
      return result
    }

    const rootNodes = buildTree(null)
    
    if (rootNodes.length === 0 && !editingNode) {
      return {
        name: 'No nodes',
        attributes: {},
      }
    }

    // Always return root nodes directly without wrapping in tree name
    // If there's only one root node, return it directly
    if (rootNodes.length === 1) {
      return rootNodes[0]
    }

    // If multiple root nodes, create a wrapper without the tree name
    return {
      name: '',
      children: rootNodes,
    }
  }, [nodes, selectedTree, editingNode, editingExistingNode])

  const handleNodeClick = (nodeData: any) => {
    const nodeId = nodeData.attributes?.nodeId || nodeData.nodeId
    if (nodeId && nodeMap.has(nodeId)) {
      const node = nodeMap.get(nodeId)!
      setShowNodeDetails(node)
      onNodeClick?.(node)
    }
  }

  const handleNodeEdit = (node: DialogNode) => {
    if (onNodeUpdate) {
      // Start inline editing in tree view
      setEditingExistingNode({
        id: node.id,
        userInput: node.user_input || '',
        botResponse: node.bot_response || ''
      })
      setShowNodeDetails(null)
    } else {
      // Fallback to original behavior
      onNodeEdit?.(node)
      setShowNodeDetails(null)
    }
  }

  const handleNodeDelete = (nodeId: number) => {
    onNodeDelete?.(nodeId)
    setShowNodeDetails(null)
  }

  const handleAddChild = (parentId: number) => {
    if (onNodeCreate) {
      setEditingNode({ parentId, userInput: '', botResponse: '' })
      setShowNodeDetails(null)
      // Close any open node details to avoid confusion
    } else {
      onNodeAddChild?.(parentId)
      setShowNodeDetails(null)
    }
  }

  const handleAddRoot = () => {
    if (onNodeCreate) {
      setEditingNode({ parentId: null, userInput: '', botResponse: '' })
    } else {
      onNodeAddRoot?.()
    }
  }

  const handleSaveEditingNode = async () => {
    if (!onNodeCreate || !editingNode) return
    
    if (!editingNode.userInput.trim() && !editingNode.botResponse.trim()) {
      alert('Please provide at least user input or bot response')
      return
    }

    setIsCreating(true)
    try {
      const newNode = await onNodeCreate(
        editingNode.parentId, 
        editingNode.userInput, 
        editingNode.botResponse
      )
      if (onNodesUpdate) {
        onNodesUpdate([...nodes, newNode])
      }
      setEditingNode(null)
    } catch (error: any) {
      alert(error.message || 'Failed to create node')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelEditingNode = () => {
    setEditingNode(null)
  }

  const handleSaveExistingNode = async () => {
    if (!onNodeUpdate || !editingExistingNode) return
    
    if (!editingExistingNode.userInput.trim() && !editingExistingNode.botResponse.trim()) {
      alert('Please provide at least user input or bot response')
      return
    }

    setIsUpdating(true)
    try {
      const updated = await onNodeUpdate(
        editingExistingNode.id,
        editingExistingNode.userInput,
        editingExistingNode.botResponse
      )
      if (onNodesUpdate) {
        onNodesUpdate(nodes.map(n => n.id === editingExistingNode.id ? updated : n))
      }
      setEditingExistingNode(null)
    } catch (error: any) {
      alert(error.message || 'Failed to update node')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelExistingNode = () => {
    setEditingExistingNode(null)
  }

  const handleDeleteClick = (nodeId: number) => {
    setDeleteConfirm({ nodeId })
    setShowNodeDetails(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.nodeId || !onNodeDelete) return
    
    try {
      await onNodeDelete(deleteConfirm.nodeId)
      if (onNodesUpdate) {
        onNodesUpdate(nodes.filter(n => n.id !== deleteConfirm.nodeId))
      }
      setDeleteConfirm({ nodeId: null })
    } catch (error: any) {
      alert(error.message || 'Failed to delete node')
    }
  }

  const containerStyles = {
    width: '100%',
    height: '600px',
    backgroundColor: 'transparent',
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden h-full flex flex-col backdrop-blur-sm">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Tree Visualization</h2>
            <p className="text-xs text-gray-500 font-medium">{nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}</p>
          </div>
        </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
              title="Zoom out"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 font-semibold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
              title="Zoom in"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
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

      <div className="relative flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-6 shadow-xl border-2 border-white/50">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
                    <p className="text-base font-bold text-gray-700 mb-2">No nodes to visualize</p>
                    <p className="text-sm text-gray-500 mb-6">Create nodes in the editor to get started</p>
            </div>
          </div>
        ) : (
          <div ref={treeContainerRef} style={containerStyles} id="tree-container" className="rounded-lg overflow-hidden">
            <Tree
              data={treeData}
              orientation="vertical"
              pathFunc="straight"
              translate={translate}
              nodeSize={{ x: 320, y: 250 }}
              separation={{ siblings: 1.5, nonSiblings: 1.5 }}
              zoom={zoom}
              scaleExtent={{ min: 0.5, max: 2 }}
              onNodeClick={(nodeData) => {
                // Don't open details panel for editing nodes
                const nodeId = (nodeData.attributes as any)?.nodeId
                if (nodeId && nodeId > 0) {
                  handleNodeClick(nodeData)
                }
              }}
              pathClassFunc={() => 'tree-link'}
              enableLegacyTransitions={true}
              transitionDuration={300}
              renderCustomNodeElement={(rd3tProps) => {
                const { nodeDatum } = rd3tProps
                const nodeId = (nodeDatum.attributes as any)?.nodeId
                const isEditing = (nodeDatum.attributes as any)?.isEditing === true
                const isEditingExisting = (nodeDatum.attributes as any)?.isEditingExisting === true
                const isSelected = selectedNodeId === nodeId
                const isHovered = hoveredNodeId === nodeId
                const hasChildren = nodeDatum.children && nodeDatum.children.length > 0
                const hasUserInput = !!nodeDatum.attributes?.userInput
                const hasBotResponse = !!nodeDatum.attributes?.botResponse
                
                // Modern color scheme
                let nodeColor = '#10b981' // default green
                let nodeGradient = 'from-emerald-500 to-teal-500'
                if (hasUserInput && hasBotResponse) {
                  nodeColor = '#8b5cf6' // purple for both
                  nodeGradient = 'from-purple-500 to-indigo-500'
                } else if (hasUserInput) {
                  nodeColor = '#3b82f6' // blue for user input
                  nodeGradient = 'from-blue-500 to-cyan-500'
                } else if (hasBotResponse) {
                  nodeColor = '#10b981' // green for bot response
                  nodeGradient = 'from-emerald-500 to-teal-500'
                }
                
                // Render editing node with form (new node)
                if (isEditing) {
                  return (
                    <g transform={`translate(-130, -100)`}>
                      {/* Modern Editing Node Card - positioned to show buttons */}
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
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.2))' }}
                      />
                      <rect
                        x="0"
                        y="0"
                        width="5"
                        height="200"
                        rx="16"
                        fill="#f59e0b"
                        style={{ pointerEvents: 'none', opacity: 0.9 }}
                      />
                      
                      {/* Modern Form Content */}
                      <foreignObject x="12" y="12" width="236" height="176">
                        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', marginBottom: '10px', letterSpacing: '-0.01em' }}>
                            ✨ New Node
                          </div>
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
                              transition: 'all 0.2s',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#fbbf24'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                handleSaveEditingNode()
                              }
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
                              transition: 'all 0.2s',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                            onBlur={(e) => e.target.style.borderColor = '#fbbf24'}
                            rows={2}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={handleSaveEditingNode}
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
                                cursor: isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim()) ? 'not-allowed' : 'pointer',
                                opacity: isCreating || (!editingNode?.userInput.trim() && !editingNode?.botResponse.trim()) ? 0.5 : 1,
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform = 'scale(1.02)'
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              {isCreating ? 'Saving...' : '✓ Save'}
                            </button>
                            <button
                              onClick={handleCancelEditingNode}
                              style={{
                                padding: '8px 12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  )
                }

                // Render editing existing node with form
                if (isEditingExisting) {
                  return (
                    <g transform={`translate(-130, -100)`}>
                      {/* Modern Editing Existing Node Card */}
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
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.2))' }}
                      />
                      <rect
                        x="0"
                        y="0"
                        width="5"
                        height="200"
                        rx="16"
                        fill="#3b82f6"
                        style={{ pointerEvents: 'none', opacity: 0.9 }}
                      />
                      
                      {/* Modern Form Content */}
                      <foreignObject x="12" y="12" width="236" height="176">
                        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '10px', letterSpacing: '-0.01em' }}>
                            ✏️ Edit Node
                          </div>
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
                              transition: 'all 0.2s',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#93c5fd'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                handleSaveExistingNode()
                              }
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
                              transition: 'all 0.2s',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#93c5fd'}
                            rows={2}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={handleSaveExistingNode}
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
                                cursor: isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim()) ? 'not-allowed' : 'pointer',
                                opacity: isUpdating || (!editingExistingNode?.userInput.trim() && !editingExistingNode?.botResponse.trim()) ? 0.5 : 1,
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform = 'scale(1.02)'
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              {isUpdating ? 'Updating...' : '✓ Save'}
                            </button>
                            <button
                              onClick={handleCancelExistingNode}
                              style={{
                                padding: '8px 12px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  )
                }
                
                return (
                  <g 
                    transform={`translate(-130, -60)`}
                    onClick={(e) => {
                      // Handle clicks on the entire node group
                      if (nodeId && nodeId > 0 && !isEditingExisting) {
                        const target = e.target as SVGElement
                        // Don't trigger if clicking on action buttons
                        const isActionButton = target.closest('g[transform*="translate(200"]') && 
                          (target.getAttribute('fill') === '#10b981' || target.getAttribute('fill') === '#ef4444')
                        if (!isActionButton) {
                          handleNodeClick(nodeDatum)
                        }
                      }
                    }}
                    style={{ cursor: isEditingExisting ? 'default' : 'pointer' }}
                  >
                    {/* Enhanced Shadow Filters */}
                    <defs>
                      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                        <feOffset dx="0" dy="4" result="offsetblur"/>
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.4"/>
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      <linearGradient id={`gradient-${nodeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={nodeColor} stopOpacity="0.1"/>
                        <stop offset="100%" stopColor={nodeColor} stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Card Background with Gradient */}
                    <rect
                      x="0"
                      y="0"
                      width="260"
                      height="130"
                      rx="16"
                      fill={isSelected ? '#e0e7ff' : isHovered ? '#f8fafc' : '#ffffff'}
                      stroke={isSelected ? nodeColor : nodeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        filter: isSelected || isHovered ? 'url(#shadow)' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
                      }}
                      onMouseEnter={() => nodeId && nodeId > 0 && setHoveredNodeId(nodeId)}
                      onMouseLeave={() => {
                        setHoveredNodeId(null)
                      }}
                    />
                    
                    {/* Gradient Overlay */}
                    <rect
                      x="0"
                      y="0"
                      width="260"
                      height="130"
                      rx="16"
                      fill={`url(#gradient-${nodeId})`}
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Left Border Accent with Gradient */}
                    <rect
                      x="0"
                      y="0"
                      width="5"
                      height="130"
                      rx="16"
                      fill={nodeColor}
                      style={{ pointerEvents: 'none', opacity: 0.9 }}
                    />
                    
                    {/* Node Content with Modern Typography */}
                    <foreignObject x="18" y="38" width="224" height="84" style={{ pointerEvents: 'none' }}>
                      <div style={{ 
                        padding: '10px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        pointerEvents: 'none'
                      }}>
                        <div style={{ 
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
                          letterSpacing: '-0.01em'
                        }}>
                          {nodeDatum.name}
                        </div>
                        {hasChildren && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px'
                          }}>
                            <div style={{
                              padding: '4px 10px',
                              background: `linear-gradient(135deg, ${nodeColor}15, ${nodeColor}25)`,
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: nodeColor,
                              border: `1px solid ${nodeColor}30`,
                              boxShadow: `0 2px 4px ${nodeColor}20`
                            }}>
                              {nodeDatum.children?.length} {nodeDatum.children?.length === 1 ? 'child' : 'children'}
                            </div>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                    
                    {/* Modern Selection Indicator */}
                    {isSelected && (
                      <g>
                        <circle
                          r="10"
                          fill={nodeColor}
                          cx="250"
                          cy="18"
                          style={{ pointerEvents: 'none', opacity: 0.2 }}
                        />
                        <circle
                          r="6"
                          fill={nodeColor}
                          cx="250"
                          cy="18"
                          style={{ pointerEvents: 'none' }}
                        />
                      </g>
                    )}
                    
                    {/* Modern Hover Effect */}
                    {isHovered && !isSelected && (
                      <rect
                        x="0"
                        y="0"
                        width="260"
                        height="130"
                        rx="16"
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth="2.5"
                        strokeDasharray="6,4"
                        style={{ pointerEvents: 'none', opacity: 0.6 }}
                      />
                    )}
                  </g>
                )
              }}
            />
          </div>
        )}

        {/* Modern Node Details Panel */}
        {showNodeDetails && (
          <div className="absolute top-4 right-4 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-6 z-10 max-h-[500px] overflow-y-auto">
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
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200/50 shadow-sm mb-3">
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
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50 shadow-sm mb-3">
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
                    handleAddChild(showNodeDetails.id)
                    setShowNodeDetails(null)
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
  )
}

