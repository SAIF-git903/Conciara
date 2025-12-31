'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Edit2, X, MessageSquare, Sparkles, Layers, Zap, Menu, ChevronRight, Settings } from 'lucide-react'
import { dialogTreeApi, dialogNodeApi, prepromptApi, DialogTree, DialogNode, Preprompt } from '@/lib/api'
import TreeSelector from './TreeSelector'
import PrepromptEditor from './PrepromptEditor'
import NodeEditor from './NodeEditor'
import TreeVisualization from './TreeVisualization'
import Toast, { ToastType } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import LoadingSpinner from './LoadingSpinner'

interface DialogTreeManagerProps {
  initialTree?: DialogTree | null
}

export default function DialogTreeManager({ initialTree }: DialogTreeManagerProps = {}) {
  const [trees, setTrees] = useState<DialogTree[]>([])
  const [selectedTree, setSelectedTree] = useState<DialogTree | null>(initialTree || null)
  const [preprompt, setPreprompt] = useState<Preprompt | null>(null)
  const [nodes, setNodes] = useState<DialogNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: 'danger' | 'warning'
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'visualization'>('editor')

  useEffect(() => {
    if (initialTree) {
      setSelectedTree(initialTree)
    }
  }, [initialTree])

  // Don't load trees independently - they come from MultiTenantNavigator
  // Removed: useEffect(() => { loadTrees() }, [])

  useEffect(() => {
    if (selectedTree) {
      loadTreeData(selectedTree.id)
    }
  }, [selectedTree])

  const loadTrees = async () => {
    try {
      setLoading(true)
      const data = await dialogTreeApi.getAll()
      setTrees(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load trees')
    } finally {
      setLoading(false)
    }
  }

  const loadTreeData = async (treeId: number) => {
    try {
      setLoading(true)
      const [prepromptData, nodesData] = await Promise.all([
        prepromptApi.getByTreeId(treeId),
        dialogNodeApi.getByTreeId(treeId),
      ])
      setPreprompt(prepromptData)
      setNodes(nodesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load tree data')
    } finally {
      setLoading(false)
    }
  }

  const [showCreateTreeModal, setShowCreateTreeModal] = useState(false)
  const [newTreeName, setNewTreeName] = useState('')
  const [newTreeDescription, setNewTreeDescription] = useState('')

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
  }

  const handleCreateTree = async () => {
    // Trees should be created through MultiTenantNavigator to ensure proper linking to A/B variations
    // This modal should not be accessible anymore
    setShowCreateTreeModal(false)
    setNewTreeName('')
    setNewTreeDescription('')
  }

  const handleSelectTree = (tree: DialogTree) => {
    setSelectedTree(tree)
  }

  const handleDeleteTree = (treeId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Dialog Tree',
      message: 'Are you sure you want to delete this tree? This will permanently delete all nodes and preprompts associated with it.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await dialogTreeApi.delete(treeId)
          setTrees(trees.filter(t => t.id !== treeId))
          if (selectedTree?.id === treeId) {
            setSelectedTree(null)
            setPreprompt(null)
            setNodes([])
          }
          showToast('Dialog tree deleted successfully', 'success')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to delete tree'
          setError(errorMsg)
          showToast(errorMsg, 'error')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      },
    })
  }

  const handlePrepromptSave = async (content: string) => {
    if (!selectedTree) return

    try {
      const updated = await prepromptApi.createOrUpdate(selectedTree.id, content)
      setPreprompt(updated)
      showToast('Preprompt saved successfully!', 'success')
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to save preprompt'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    }
  }

  const handleNodeCreate = async (parentId: number | null, userInput: string, botResponse: string) => {
    if (!selectedTree) return

    try {
      const newNode = await dialogNodeApi.create(
        selectedTree.id,
        parentId,
        userInput,
        botResponse
      )
      setNodes([...nodes, newNode])
      showToast('Node created successfully!', 'success')
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create node'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    }
  }

  const handleNodeUpdate = async (id: number, userInput: string, botResponse: string) => {
    try {
      const updated = await dialogNodeApi.update(id, userInput, botResponse)
      setNodes(nodes.map(n => n.id === id ? updated : n))
      showToast('Node updated successfully!', 'success')
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update node'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    }
  }

  const handleNodeDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Node',
      message: 'Are you sure you want to delete this node? All child nodes will also be permanently deleted.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await dialogNodeApi.delete(id)
          setNodes(nodes.filter(n => n.id !== id))
          showToast('Node deleted successfully', 'success')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to delete node'
          setError(errorMsg)
          showToast(errorMsg, 'error')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      },
    })
  }

  const stats = {
    totalTrees: trees.length,
    totalNodes: nodes.length,
    hasPreprompt: !!preprompt,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Compact Sidebar - Hidden since we use MultiTenantNavigator now */}
      {false && (
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Dialog Trees</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-2">
          {trees.length === 0 ? (
            <div className="text-center py-8 px-2">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              {sidebarOpen && <p className="text-xs text-gray-400">No trees</p>}
            </div>
          ) : (
            <div className="space-y-1">
              {trees.map((tree) => (
                <div
                  key={tree.id}
                  onClick={() => handleSelectTree(tree)}
                  className={`p-2 rounded-lg cursor-pointer transition-all group ${
                    selectedTree?.id === tree.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {sidebarOpen ? (
                    <div>
                      <div className="font-semibold text-sm text-gray-900 truncate">{tree.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{tree.description || 'No description'}</div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <MessageSquare className={`w-5 h-5 ${selectedTree?.id === tree.id ? 'text-primary-600' : 'text-gray-400'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer - Removed "New Tree" button since trees are created via MultiTenantNavigator */}
        {/* Trees should be created through the multi-tenant structure to ensure proper linking */}
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedTree ? (
              <>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{selectedTree.name}</h1>
                  <p className="text-xs text-gray-500">{selectedTree.description || 'No description'}</p>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">{stats.totalNodes} nodes</span>
                  </div>
                  {stats.hasPreprompt && (
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-gray-600">Preprompt</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Select a tree to get started</h1>
                <p className="text-xs text-gray-500">Choose from the sidebar or create a new one</p>
              </div>
            )}
          </div>

          {selectedTree && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'editor'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('visualization')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'visualization'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tree View
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 text-sm animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded p-1 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedTree ? (
            activeTab === 'editor' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                {/* Left: Preprompt (1 column) */}
                <div className="lg:col-span-1">
                  <PrepromptEditor
                    preprompt={preprompt}
                    onSave={handlePrepromptSave}
                    loading={loading}
                  />
                </div>

                {/* Right: Nodes (2 columns) */}
                <div className="lg:col-span-2">
                  <NodeEditor
                    nodes={nodes}
                    selectedTree={selectedTree}
                    onCreate={handleNodeCreate}
                    onUpdate={handleNodeUpdate}
                    onDelete={handleNodeDelete}
                    loading={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto">
                <TreeVisualization
                  nodes={nodes}
                  selectedTree={selectedTree}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(node) => {
                    setSelectedNodeId(node.id)
                    setActiveTab('editor')
                    const nodeElement = document.getElementById(`node-${node.id}`)
                    if (nodeElement) {
                      nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      nodeElement.classList.add('ring-4', 'ring-primary-300')
                      setTimeout(() => {
                        nodeElement.classList.remove('ring-4', 'ring-primary-300')
                      }, 2000)
                    }
                  }}
                  onNodeEdit={(node) => {
                    setSelectedNodeId(node.id)
                    setActiveTab('editor')
                    const event = new CustomEvent('editNode', { detail: { nodeId: node.id } })
                    window.dispatchEvent(event)
                  }}
                  onNodeDelete={handleNodeDelete}
                  onNodeAddChild={(parentId) => {
                    setSelectedNodeId(null)
                    setActiveTab('editor')
                    const event = new CustomEvent('addChildNode', { detail: { parentId } })
                    window.dispatchEvent(event)
                  }}
                />
              </div>
            )
          ) : (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Tree Selected</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Select a tree from the sidebar or create a new one to start building
              </p>
              <button
                onClick={() => setShowCreateTreeModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Create New Tree
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Tree Modal */}
      {showCreateTreeModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateTreeModal(false)
              setNewTreeName('')
              setNewTreeDescription('')
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-scale-in border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 rounded-lg">
                  <Plus className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">New Tree</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateTreeModal(false)
                  setNewTreeName('')
                  setNewTreeDescription('')
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 placeholder:text-gray-400 text-sm transition-all"
                  placeholder="Tree name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTree()
                    } else if (e.key === 'Escape') {
                      setShowCreateTreeModal(false)
                      setNewTreeName('')
                      setNewTreeDescription('')
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={newTreeDescription}
                  onChange={(e) => setNewTreeDescription(e.target.value)}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 placeholder:text-gray-400 resize-none text-sm transition-all"
                  rows={2}
                  placeholder="Brief description..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowCreateTreeModal(false)
                      setNewTreeName('')
                      setNewTreeDescription('')
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateTreeModal(false)
                  setNewTreeName('')
                  setNewTreeDescription('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTree}
                disabled={!newTreeName.trim() || loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 font-semibold shadow-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        variant={confirmDialog.variant}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3 animate-scale-in">
            <LoadingSpinner size="lg" />
            <span className="text-gray-700 font-semibold text-sm">Loading...</span>
          </div>
        </div>
      )}
    </div>
  )
}
