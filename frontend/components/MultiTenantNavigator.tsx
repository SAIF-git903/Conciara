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
import ThemeConfigEditor from './ThemeConfigEditor'
import { SkinConfig } from '@/types/skinConfig'

interface MultiTenantNavigatorProps {
  onSelectTree: (tree: DialogTree | null) => void
  selectedTreeId: number | null
  onWebsiteChange?: (website: Website | null) => void
}

export default function MultiTenantNavigator({ onSelectTree, selectedTreeId, onWebsiteChange }: MultiTenantNavigatorProps) {
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

  // Create/Edit modals state
  const [showCreateModal, setShowCreateModal] = useState<{
    type: 'customerType' | 'website' | 'skin' | 'variation' | 'tree' | null
    data?: any
    isEdit?: boolean
  }>({ type: null })
  const [formData, setFormData] = useState<{ name: string; description: string; domain: string; theme_config: SkinConfig | null }>({ name: '', description: '', domain: '', theme_config: null })

  useEffect(() => {
    loadCustomerTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Reset selected tree when customer type changes
    // This ensures the tree page doesn't show data from previous customer type
    if (selectedTreeId) {
      onSelectTree(null)
    }
    
    // Reset all selections in the hierarchy when customer type changes
    setSelectedWebsite(null)
    setSelectedSkin(null)
    setSelectedVariation(null)
    
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
    // Notify parent of website change
    onWebsiteChange?.(selectedWebsite)
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
          if (showCreateModal.isEdit && showCreateModal.data) {
            // Edit mode
            newItem = await customerTypeApi.update(
              showCreateModal.data.id,
              formData.name,
              formData.description || undefined
            )
            setCustomerTypes(customerTypes.map(ct => ct.id === newItem.id ? newItem : ct))
            if (selectedCustomerType?.id === newItem.id) {
              setSelectedCustomerType(newItem)
            }
            showToast('Customer type updated successfully!', 'success')
          } else {
            // Create mode
            newItem = await customerTypeApi.create(formData.name, formData.description || undefined)
            setCustomerTypes([...customerTypes, newItem])
            showToast('Customer type created successfully!', 'success')
          }
          break
        case 'website':
          if (!selectedCustomerType) {
            showToast('Please select a customer type first', 'error')
            return
          }
          if (showCreateModal.isEdit && showCreateModal.data) {
            // Edit mode
            newItem = await websiteApi.update(
              showCreateModal.data.id,
              formData.name,
              formData.description || undefined,
              formData.domain || undefined
            )
            setWebsites(websites.map(w => w.id === newItem.id ? newItem : w))
            if (selectedWebsite?.id === newItem.id) {
              setSelectedWebsite(newItem)
            }
            showToast('Website updated successfully!', 'success')
          } else {
            // Create mode
            newItem = await websiteApi.create(
              selectedCustomerType.id, 
              formData.name, 
              formData.description || undefined,
              formData.domain || undefined
            )
            setWebsites([...websites, newItem])
            showToast('Website created successfully!', 'success')
          }
          break
        case 'skin':
          if (!selectedWebsite) {
            showToast('Please select a website first', 'error')
            return
          }
          const themeConfig = formData.theme_config || undefined
          if (showCreateModal.isEdit && showCreateModal.data) {
            // Edit mode
            newItem = await skinApi.update(
              showCreateModal.data.id,
              formData.name,
              formData.description || undefined,
              themeConfig
            )
            setSkins(skins.map(s => s.id === newItem.id ? newItem : s))
            if (selectedSkin?.id === newItem.id) {
              setSelectedSkin(newItem)
            }
            showToast('Skin updated successfully!', 'success')
          } else {
            // Create mode
            newItem = await skinApi.create(selectedWebsite.id, formData.name, formData.description || undefined, themeConfig)
            setSkins([...skins, newItem])
            showToast('Skin created successfully!', 'success')
          }
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
      setFormData({ name: '', description: '', domain: '', theme_config: null })
    } catch (err: any) {
      showToast(err.message || 'Failed to create item', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditCustomerType = (customerType: CustomerType, e: React.MouseEvent) => {
    e.stopPropagation()
    setFormData({
      name: customerType.name,
      description: customerType.description || '',
      domain: '',
      theme_config: null
    })
    setShowCreateModal({ type: 'customerType', data: customerType, isEdit: true })
  }

  const handleDeleteCustomerType = (customerType: CustomerType, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer Type',
      message: `Are you sure you want to delete "${customerType.name}"? This action cannot be undone and will permanently delete all associated data in the hierarchy:
      
• All Websites
• All Skins
• All A/B Variations
• All Dialog Trees
• All Dialog Nodes
• All Conversation History

This is a destructive operation that cannot be reversed.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true)
          await customerTypeApi.delete(customerType.id)
          setCustomerTypes(customerTypes.filter(ct => ct.id !== customerType.id))
          if (selectedCustomerType?.id === customerType.id) {
            setSelectedCustomerType(null)
            setWebsites([])
            setSkins([])
            setVariations([])
            setTrees([])
          }
          showToast('Customer type deleted successfully!', 'success')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        } catch (err: any) {
          showToast(err.message || 'Failed to delete customer type', 'error')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleEditWebsite = (website: Website, e: React.MouseEvent) => {
    e.stopPropagation()
    setFormData({
      name: website.name,
      description: website.description || '',
      domain: website.domain || '',
      theme_config: null
    })
    setShowCreateModal({ type: 'website', data: website, isEdit: true })
  }

  const handleDeleteWebsite = (website: Website, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Website',
      message: `Are you sure you want to delete "${website.name}"? This action cannot be undone and will also delete all associated skins, variations, and dialog trees.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true)
          await websiteApi.delete(website.id)
          setWebsites(websites.filter(w => w.id !== website.id))
          if (selectedWebsite?.id === website.id) {
            setSelectedWebsite(null)
            setSkins([])
            setVariations([])
            setTrees([])
          }
          showToast('Website deleted successfully!', 'success')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        } catch (err: any) {
          showToast(err.message || 'Failed to delete website', 'error')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleEditSkin = (skin: Skin, e: React.MouseEvent) => {
    e.stopPropagation()
    // Parse theme_config if it's a string
    let themeConfig: SkinConfig | null = null
    if (skin.theme_config) {
      if (typeof skin.theme_config === 'string') {
        try {
          themeConfig = JSON.parse(skin.theme_config)
        } catch (err) {
          console.error('Error parsing theme_config:', err)
          themeConfig = null
        }
      } else {
        themeConfig = skin.theme_config as SkinConfig
      }
    }
    setFormData({
      name: skin.name,
      description: skin.description || '',
      domain: '',
      theme_config: themeConfig
    })
    setShowCreateModal({ type: 'skin', data: skin, isEdit: true })
  }

  const handleDeleteSkin = (skin: Skin, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Skin',
      message: `Are you sure you want to delete "${skin.name}"? This action cannot be undone and will also delete all associated A/B variations and dialog trees.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true)
          await skinApi.delete(skin.id)
          setSkins(skins.filter(s => s.id !== skin.id))
          if (selectedSkin?.id === skin.id) {
            setSelectedSkin(null)
            setVariations([])
            setTrees([])
          }
          showToast('Skin deleted successfully!', 'success')
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        } catch (err: any) {
          showToast(err.message || 'Failed to delete skin', 'error')
        } finally {
          setLoading(false)
        }
      }
    })
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
                className={`p-2 rounded-lg cursor-pointer transition-all group ${
                  selectedCustomerType?.id === ct.id
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{ct.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditCustomerType(ct, e)}
                      className="p-1 hover:bg-primary-100 rounded text-gray-600 hover:text-primary-600"
                      title="Edit Customer Type"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCustomerType(ct, e)}
                      className="p-1 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                      title="Delete Customer Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                  className={`p-2 rounded-lg cursor-pointer transition-all group ${
                    selectedWebsite?.id === website.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{website.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditWebsite(website, e)}
                        className="p-1 hover:bg-primary-100 rounded text-gray-600 hover:text-primary-600"
                        title="Edit Website"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteWebsite(website, e)}
                        className="p-1 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                        title="Delete Website"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                  className={`p-2 rounded-lg cursor-pointer transition-all group ${
                    selectedSkin?.id === skin.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Palette className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{skin.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditSkin(skin, e)}
                        className="p-1 hover:bg-primary-100 rounded text-gray-600 hover:text-primary-600"
                        title="Edit Skin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSkin(skin, e)}
                        className="p-1 hover:bg-red-100 rounded text-gray-600 hover:text-red-600"
                        title="Delete Skin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
              setFormData({ name: '', description: '', domain: '', theme_config: null })
            }
          }}
        >
          <div className={`bg-white rounded-xl shadow-2xl p-6 w-full ${showCreateModal.type === 'skin' ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {showCreateModal.isEdit ? 'Edit' : 'New'} {showCreateModal.type === 'customerType' ? 'Customer Type' :
                      showCreateModal.type === 'website' ? 'Website' :
                      showCreateModal.type === 'skin' ? 'Skin' :
                      showCreateModal.type === 'variation' ? 'A/B Variation' : 'Dialog Tree'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal({ type: null })
                  setFormData({ name: '', description: '', domain: '', theme_config: null })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showCreateModal.type === 'skin' ? (
              // Two-column layout for skins
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Basic info */}
                <div className="lg:col-span-1 space-y-4">
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
                      rows={4}
                      placeholder="Enter description..."
                    />
                  </div>
                </div>

                {/* Right column - Theme config */}
                <div className="lg:col-span-2">
                  <div className="border border-gray-200 rounded-lg bg-white shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100/50">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary-600" />
                        Theme Configuration
                        <span className="text-xs font-normal text-gray-500">(optional)</span>
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Customize colors, components, and states. Leave empty to use defaults.
                      </p>
                    </div>
                    <div className="p-4 flex-1 overflow-hidden" style={{ minHeight: '500px', maxHeight: '600px' }}>
                      <ThemeConfigEditor
                        value={formData.theme_config}
                        onChange={(config) => setFormData({ ...formData, theme_config: config })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Single column layout for other types
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

                {/* Domain field - only for websites */}
                {showCreateModal.type === 'website' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Domain <span className="text-gray-400 text-xs font-normal">(optional)</span>
                      <span className="block text-xs text-gray-500 font-normal mt-1">
                        e.g., techstore.com (used for auto-detection in widget)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="techstore.com"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal({ type: null })
                  setFormData({ name: '', description: '', domain: '', theme_config: null })
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
                {showCreateModal.isEdit ? 'Update' : 'Create'}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}

