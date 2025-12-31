'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Building2, Globe, Palette, GitBranch, MessageSquare, Plus, X, Edit2, Trash2 } from 'lucide-react'
import { 
  customerTypeApi, websiteApi, skinApi, abVariationApi, dialogTreeApi,
  CustomerType, Website, Skin, ABVariation, DialogTree 
} from '@/lib/api'
import Toast, { ToastType } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import LoadingSpinner from './LoadingSpinner'

interface MultiTenantNavigatorProps {
  onSelectTree: (tree: DialogTree) => void
  selectedTreeId: number | null
}

export default function MultiTenantNavigator({ onSelectTree, selectedTreeId }: MultiTenantNavigatorProps) {
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [skins, setSkins] = useState<Skin[]>([])
  const [variations, setVariations] = useState<ABVariation[]>([])
  const [trees, setTrees] = useState<DialogTree[]>([])
  
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerType | null>(null)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<ABVariation | null>(null)
  
  const [loading, setLoading] = useState(false)
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

  // Create modals state
  const [showCreateModal, setShowCreateModal] = useState<{
    type: 'customerType' | 'website' | 'skin' | 'variation' | 'tree' | null
    data?: any
  }>({ type: null })
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadCustomerTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedCustomerType) {
      loadWebsites(selectedCustomerType.id)
    } else {
      setWebsites([])
      setSkins([])
      setVariations([])
      setTrees([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerType])

  useEffect(() => {
    if (selectedWebsite) {
      loadSkins(selectedWebsite.id)
    } else {
      setSkins([])
      setVariations([])
      setTrees([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWebsite])

  useEffect(() => {
    if (selectedSkin) {
      loadVariations(selectedSkin.id)
    } else {
      setVariations([])
      setTrees([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkin])

  useEffect(() => {
    if (selectedVariation) {
      loadTrees(selectedVariation.id)
    } else {
      setTrees([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariation])

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
  }

  const loadCustomerTypes = async () => {
    try {
      setLoading(true)
      const data = await customerTypeApi.getAll()
      setCustomerTypes(data)
      // Auto-select first customer type if available
      if (data.length > 0 && !selectedCustomerType) {
        setSelectedCustomerType(data[0])
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer types', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadWebsites = async (customerTypeId: number) => {
    try {
      setLoading(true)
      const data = await websiteApi.getByCustomerType(customerTypeId)
      setWebsites(data)
      if (data.length > 0 && !selectedWebsite) {
        setSelectedWebsite(data[0])
      } else {
        setSelectedWebsite(null)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load websites', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSkins = async (websiteId: number) => {
    try {
      setLoading(true)
      const data = await skinApi.getByWebsite(websiteId)
      setSkins(data)
      if (data.length > 0 && !selectedSkin) {
        setSelectedSkin(data[0])
      } else {
        setSelectedSkin(null)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load skins', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadVariations = async (skinId: number) => {
    try {
      setLoading(true)
      const data = await abVariationApi.getBySkin(skinId)
      setVariations(data)
      if (data.length > 0 && !selectedVariation) {
        setSelectedVariation(data[0])
      } else {
        setSelectedVariation(null)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load A/B variations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTrees = async (variationId: number) => {
    try {
      setLoading(true)
      const data = await dialogTreeApi.getAll(variationId)
      setTrees(data || [])
    } catch (err: any) {
      console.error('Error loading dialog trees:', err)
      showToast(err.message || 'Failed to load dialog trees', 'error')
      setTrees([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('Name is required', 'error')
      return
    }

    try {
      setLoading(true)
      let newItem: any

      switch (showCreateModal.type) {
        case 'customerType':
          newItem = await customerTypeApi.create(formData.name, formData.description || undefined)
          setCustomerTypes([...customerTypes, newItem])
          showToast('Customer type created successfully!', 'success')
          break
        case 'website':
          if (!selectedCustomerType) {
            showToast('Please select a customer type first', 'error')
            return
          }
          newItem = await websiteApi.create(selectedCustomerType.id, formData.name, formData.description || undefined)
          setWebsites([...websites, newItem])
          showToast('Website created successfully!', 'success')
          break
        case 'skin':
          if (!selectedWebsite) {
            showToast('Please select a website first', 'error')
            return
          }
          newItem = await skinApi.create(selectedWebsite.id, formData.name, formData.description || undefined)
          setSkins([...skins, newItem])
          showToast('Skin created successfully!', 'success')
          break
        case 'variation':
          if (!selectedSkin) {
            showToast('Please select a skin first', 'error')
            return
          }
          newItem = await abVariationApi.create(selectedSkin.id, formData.name, formData.description || undefined)
          setVariations([...variations, newItem])
          showToast('A/B variation created successfully!', 'success')
          break
        case 'tree':
          if (!selectedVariation) {
            showToast('Please select an A/B variation first', 'error')
            return
          }
          newItem = await dialogTreeApi.create(formData.name, formData.description || undefined, selectedVariation.id)
          setTrees([...trees, newItem])
          showToast('Dialog tree created successfully!', 'success')
          break
      }

      setShowCreateModal({ type: null })
      setFormData({ name: '', description: '' })
    } catch (err: any) {
      showToast(err.message || 'Failed to create item', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-600" />
          Multi-Tenant Structure
        </h2>
        <p className="text-xs text-gray-500 mt-1">Navigate through the hierarchy</p>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Customer Types */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Customer Types</h3>
            <button
              onClick={() => setShowCreateModal({ type: 'customerType' })}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Add Customer Type"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {customerTypes.map((ct) => (
              <div
                key={ct.id}
                onClick={() => setSelectedCustomerType(ct)}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  selectedCustomerType?.id === ct.id
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{ct.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Websites */}
        {selectedCustomerType && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                Websites
              </h3>
              <button
                onClick={() => setShowCreateModal({ type: 'website' })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Add Website"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 ml-4">
              {websites.map((website) => (
                <div
                  key={website.id}
                  onClick={() => setSelectedWebsite(website)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    selectedWebsite?.id === website.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{website.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skins */}
        {selectedWebsite && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                Skins
              </h3>
              <button
                onClick={() => setShowCreateModal({ type: 'skin' })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Add Skin"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 ml-4">
              {skins.map((skin) => (
                <div
                  key={skin.id}
                  onClick={() => setSelectedSkin(skin)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    selectedSkin?.id === skin.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{skin.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A/B Variations */}
        {selectedSkin && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                A/B Variations
              </h3>
              <button
                onClick={() => setShowCreateModal({ type: 'variation' })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Add A/B Variation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 ml-4">
              {variations.map((variation) => (
                <div
                  key={variation.id}
                  onClick={() => setSelectedVariation(variation)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    selectedVariation?.id === variation.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{variation.name}</span>
                    {variation.is_active && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dialog Trees */}
        {selectedVariation && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                Dialog Trees
              </h3>
              <button
                onClick={() => setShowCreateModal({ type: 'tree' })}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Add Dialog Tree"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 ml-4">
              {!trees || trees.length === 0 ? (
                <div className="p-2 text-xs text-gray-400 text-center">
                  No trees yet
                </div>
              ) : (
                trees.map((tree) => (
                  <div
                    key={`tree-${tree.id}`}
                    onClick={() => onSelectTree(tree)}
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      selectedTreeId === tree.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{tree.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal.type && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal({ type: null })
              setFormData({ name: '', description: '' })
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                New {showCreateModal.type === 'customerType' ? 'Customer Type' :
                      showCreateModal.type === 'website' ? 'Website' :
                      showCreateModal.type === 'skin' ? 'Skin' :
                      showCreateModal.type === 'variation' ? 'A/B Variation' : 'Dialog Tree'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal({ type: null })
                  setFormData({ name: '', description: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter name..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={2}
                  placeholder="Enter description..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal({ type: null })
                  setFormData({ name: '', description: '' })
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name.trim() || loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}

