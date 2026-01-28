'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, MessageCircle, Bot, User, GitBranch, ChevronRight, ArrowDown, CornerDownRight, Image as ImageIcon, Video, Upload, XCircle } from 'lucide-react'
import { DialogNode, DialogTree, mediaApi, MediaItem } from '@/lib/api'

interface NodeEditorProps {
  nodes: DialogNode[]
  selectedTree: DialogTree
  onCreate: (parentId: number | null, userInput: string, botResponse: string) => void
  onUpdate: (id: number, userInput: string, botResponse: string) => void
  onDelete: (id: number) => void
  loading: boolean
}

interface EditingNode {
  id: number
  userInput: string
  botResponse: string
}

export default function NodeEditor({
  nodes,
  selectedTree,
  onCreate,
  onUpdate,
  onDelete,
  loading,
}: NodeEditorProps) {
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [parentId, setParentId] = useState<number | null>(null)
  const [newUserInput, setNewUserInput] = useState('')
  const [newBotResponse, setNewBotResponse] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [nodeMedia, setNodeMedia] = useState<Map<number, MediaItem[]>>(new Map())
  const [uploadingMedia, setUploadingMedia] = useState<Map<number, boolean>>(new Map())

  const rootNodes = nodes.filter(n => n.parent_id === null)
  const getChildNodes = (parentId: number) => nodes.filter(n => n.parent_id === parentId)

  const handleStartEdit = (node: DialogNode) => {
    setEditingNode({
      id: node.id,
      userInput: node.user_input || '',
      botResponse: node.bot_response || '',
    })
  }

  // Load media for all nodes
  useEffect(() => {
    const loadMedia = async () => {
      const mediaMap = new Map<number, MediaItem[]>()
      for (const node of nodes) {
        try {
          const media = await mediaApi.getByNodeId(node.id)
          mediaMap.set(node.id, media)
        } catch (error) {
          console.error(`Error loading media for node ${node.id}:`, error)
        }
      }
      setNodeMedia(mediaMap)
    }
    loadMedia()
  }, [nodes])

  // Listen for events from tree visualization
  useEffect(() => {
    const handleEditNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        handleStartEdit(node)
        setTimeout(() => {
          const element = document.getElementById(`node-${nodeId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }

    const handleAddChildNode = (event: CustomEvent) => {
      const parentId = event.detail.parentId
      setParentId(parentId)
      setShowCreateForm(true)
      setTimeout(() => {
        const element = document.getElementById('create-node-form')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }

    window.addEventListener('editNode', handleEditNode as EventListener)
    window.addEventListener('addChildNode', handleAddChildNode as EventListener)

    return () => {
      window.removeEventListener('editNode', handleEditNode as EventListener)
      window.removeEventListener('addChildNode', handleAddChildNode as EventListener)
    }
  }, [nodes])

  const handleFileUpload = async (nodeId: number, file: File) => {
    setUploadingMedia(prev => new Map(prev).set(nodeId, true))
    try {
      const media = await mediaApi.upload(nodeId, file)
      setNodeMedia(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(nodeId) || []
        newMap.set(nodeId, [...existing, media])
        return newMap
      })
    } catch (error: any) {
      setValidationError(error.message || 'Failed to upload file')
      setTimeout(() => setValidationError(null), 5000)
    } finally {
      setUploadingMedia(prev => {
        const newMap = new Map(prev)
        newMap.delete(nodeId)
        return newMap
      })
    }
  }

  const handleDeleteMedia = async (nodeId: number, mediaId: number) => {
    try {
      await mediaApi.delete(mediaId)
      setNodeMedia(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(nodeId) || []
        newMap.set(nodeId, existing.filter(m => m.id !== mediaId))
        return newMap
      })
    } catch (error: any) {
      setValidationError(error.message || 'Failed to delete file')
      setTimeout(() => setValidationError(null), 5000)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingNode) return

    if (!editingNode.userInput.trim() && !editingNode.botResponse.trim()) {
      setValidationError('At least one field (user input or bot response) must be filled')
      setTimeout(() => setValidationError(null), 3000)
      return
    }

    setValidationError(null)
    await onUpdate(editingNode.id, editingNode.userInput, editingNode.botResponse)
    setEditingNode(null)
  }

  const handleCreate = async () => {
    if (!newBotResponse.trim()) {
      setValidationError('Bot response is required')
      setTimeout(() => setValidationError(null), 3000)
      return
    }

    // For child nodes, user input is optional but can be provided
    // For root nodes, user input is not shown, so it will be empty
    setValidationError(null)
    await onCreate(parentId, newUserInput.trim(), newBotResponse)
    setNewUserInput('')
    setNewBotResponse('')
    setParentId(null)
    setShowCreateForm(false)
  }

  const renderNode = (node: DialogNode, level: number = 0, isLast: boolean = false) => {
    const children = getChildNodes(node.id)
    const isEditing = editingNode?.id === node.id

    return (
      <div key={node.id} id={`node-${node.id}`} className="relative">
        <div className="flex">
          {/* Tree Structure Connectors */}
          {level > 0 && (
            <div className="flex-shrink-0 w-8 relative">
              {/* Vertical line from parent */}
              <div className="absolute left-4 top-0 w-0.5 h-3 bg-primary-400"></div>
              {/* Horizontal line to node */}
              <div className="absolute left-4 top-3 w-4 h-0.5 bg-primary-400"></div>
              {/* Corner connector */}
              {!isLast && (
                <div className="absolute left-4 top-3 bottom-0 w-0.5 bg-gray-300"></div>
              )}
              {/* Arrow at the end */}
              <div className="absolute left-7 top-2.5">
                <ChevronRight className="w-3 h-3 text-primary-500" />
              </div>
            </div>
          )}

          {/* Node Content */}
          <div className="flex-1">
            <div
              className={`group relative p-3 rounded-lg border transition-all ${
                isEditing
                  ? 'bg-gradient-to-br from-primary-50 to-accent-50 border-primary-300 shadow-md ring-2 ring-primary-200'
                  : level > 0
                  ? 'bg-white border-l-4 border-l-primary-500 border-r border-t border-b border-gray-200 hover:border-primary-300 hover:shadow-sm'
                  : 'bg-gray-50 border-gray-200 hover:border-primary-300 hover:shadow-sm'
              }`}
            >
              {/* Level Badge */}
              {level > 0 && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary-500 text-white text-xs font-bold rounded-full shadow-sm">
                  L{level}
                </div>
              )}

              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Edit2 className="w-3.5 h-3.5 text-primary-600" />
                    <span className="text-xs font-semibold text-gray-700">Editing</span>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      User Input
                    </label>
                    <input
                      type="text"
                      value={editingNode.userInput}
                      onChange={(e) =>
                        setEditingNode({ ...editingNode, userInput: e.target.value })
                      }
                      className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 placeholder:text-gray-400 text-sm transition-all"
                      placeholder="User says..."
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                      <Bot className="w-3.5 h-3.5 text-green-500" />
                      Bot Response
                    </label>
                    <textarea
                      value={editingNode.botResponse}
                      onChange={(e) =>
                        setEditingNode({ ...editingNode, botResponse: e.target.value })
                      }
                      className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 placeholder:text-gray-400 resize-none text-sm transition-all"
                      rows={3}
                      placeholder="Bot responds..."
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 text-sm font-semibold transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingNode(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {node.user_input && (
                        <div className="p-2.5 bg-blue-50 rounded-lg border-l-2 border-blue-400">
                          <div className="flex items-center gap-1.5 mb-1">
                            <User className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-bold text-blue-700 uppercase">User</span>
                          </div>
                          <p className="text-gray-900 text-sm">{node.user_input}</p>
                        </div>
                      )}
                      {node.bot_response && (
                        <div className="p-2.5 bg-green-50 rounded-lg border-l-2 border-green-400">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-bold text-green-700 uppercase">Bot</span>
                          </div>
                          <p className="text-gray-900 text-sm">{node.bot_response}</p>
                        </div>
                      )}
                      {!node.user_input && !node.bot_response && (
                        <div className="p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-400 italic text-center text-xs">Empty node - Click edit to add content</p>
                        </div>
                      )}
                      
                      {/* Media Display */}
                      {nodeMedia.get(node.id) && nodeMedia.get(node.id)!.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Media ({nodeMedia.get(node.id)!.length})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {nodeMedia.get(node.id)!.map((media) => (
                              <div key={media.id} className="relative group">
                                {media.media_type === 'image' ? (
                                  <img
                                    src={media.s3_url}
                                    alt={media.file_name}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                  />
                                ) : (
                                  <video
                                    src={media.s3_url}
                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                    controls={false}
                                  />
                                )}
                                <button
                                  onClick={() => handleDeleteMedia(node.id, media.id)}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete media"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* File Upload */}
                      <div className="mt-2">
                        <label className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image/Video</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(node.id, file)
                              }
                            }}
                            disabled={uploadingMedia.get(node.id) || false}
                          />
                        </label>
                        {uploadingMedia.get(node.id) && (
                          <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(node)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit node"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(node.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setParentId(node.id)
                      setShowCreateForm(true)
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg font-semibold transition-all border border-dashed border-primary-200 hover:border-primary-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Child Node
                  </button>
                </div>
              )}
            </div>

            {/* Children Nodes */}
            {children.length > 0 && (
              <div className="mt-3 ml-0">
                {children.map((child, index) => (
                  <div key={child.id}>
                    {renderNode(child, level + 1, index === children.length - 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-accent-50 to-primary-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent-600" />
          <h2 className="text-sm font-bold text-gray-900">Dialog Nodes</h2>
          <span className="text-xs text-gray-500 ml-1">({rootNodes.length} root{rootNodes.length !== 1 ? 's' : ''})</span>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => {
              setParentId(null)
              setShowCreateForm(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 text-sm font-semibold shadow-sm hover:shadow-md transition-all transform hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Root Node
          </button>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {validationError && (
          <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg text-yellow-800 text-sm animate-slide-up">
            {validationError}
          </div>
        )}

        {showCreateForm ? (
          <div id="create-node-form" className="mb-4 p-5 bg-white rounded-lg border-2 border-primary-300 shadow-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 rounded-lg">
                  <Plus className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {parentId ? 'Add Child Node' : 'Create Root Node'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {parentId ? 'This will be a child of the selected node' : 'Start your conversation flow here'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUserInput('')
                  setNewBotResponse('')
                  setParentId(null)
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {parentId && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
                    <User className="w-4 h-4" />
                    User Input
                  </label>
                  <input
                    type="text"
                    value={newUserInput}
                    onChange={(e) => setNewUserInput(e.target.value)}
                    className="w-full p-2.5 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400 text-sm transition-all"
                    placeholder="What will the user say? (e.g., 'Hello', 'I need help', 'Tell me about...')"
                    autoFocus
                  />
                  <p className="text-xs text-blue-600 mt-1.5">This is what triggers this conversation path</p>
                </div>
              )}
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <label className="flex items-center gap-2 text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">
                  <Bot className="w-4 h-4" />
                  Chatbot Response
                </label>
                <textarea
                  value={newBotResponse}
                  onChange={(e) => setNewBotResponse(e.target.value)}
                  className="w-full p-2.5 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder:text-gray-400 resize-none text-sm transition-all"
                  rows={4}
                  placeholder="How should the bot respond? (e.g., &apos;Hello! How can I help you today?&apos;, &apos;I understand you need assistance...&apos;)"
                  autoFocus={!parentId}
                />
                <p className="text-xs text-green-600 mt-1.5">The bot&apos;s response message</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUserInput('')
                  setNewBotResponse('')
                  setParentId(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !newBotResponse.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 text-sm font-semibold shadow-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-green-700"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Node'}
              </button>
            </div>
          </div>
        ) : (
          !showCreateForm && rootNodes.length === 0 && (
            <div className="mb-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-3 shadow-sm">
                <MessageCircle className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">No Root Nodes Yet</h3>
              <p className="text-xs text-gray-500 mb-4">Start building your conversation flow by creating the first root node</p>
              <button
                onClick={() => {
                  setParentId(null)
                  setShowCreateForm(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 text-sm font-semibold shadow-medium transition-all transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Create First Root Node
              </button>
            </div>
          )
        )}

        <div className="space-y-4">
          {rootNodes.length === 0 && !showCreateForm ? null : (
            rootNodes.map((node, index) => (
              <div key={node.id}>
                {renderNode(node, 0, index === rootNodes.length - 1)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
