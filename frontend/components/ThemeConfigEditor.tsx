'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Palette, Layout, Zap, Settings2 } from 'lucide-react'
import { SkinConfig, ThemeColors, ComponentsConfig, StatesConfig } from '@/types/skinConfig'

// Default values matching backend DEFAULT_SKIN_CONFIG
const DEFAULT_WINDOW_WIDTH = 384
const DEFAULT_WINDOW_HEIGHT = 600
const DEFAULT_WINDOW_MIN_WIDTH = 320
const DEFAULT_WINDOW_MIN_HEIGHT = 400
const DEFAULT_WINDOW_BORDER_RADIUS = 8
const DEFAULT_HEADER_HEIGHT = 48

interface ThemeConfigEditorProps {
  value: SkinConfig | null
  onChange: (config: SkinConfig) => void
}

type TabType = 'theme' | 'components' | 'states'

export default function ThemeConfigEditor({ value, onChange }: ThemeConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('theme')
  const [expandedSections, setExpandedSections] = useState({
    button: false,
    window: false,
    header: false,
    messages: false,
    input: false,
    quickReplies: false,
    loading: false,
    empty: false,
    error: false,
  })
  const [validationErrors, setValidationErrors] = useState<{
    width?: string
    height?: string
  }>({})

  const config = value || {
    theme: {},
    components: {},
    states: {},
  }


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }))
  }

  const updateTheme = (updates: Partial<ThemeColors>) => {
    onChange({
      ...config,
      theme: { ...config.theme, ...updates },
    })
  }

  const updateComponents = (component: keyof ComponentsConfig, updates: any) => {
    const newConfig = {
      ...config,
      components: {
        ...config.components,
        [component]: { ...config.components?.[component], ...updates },
      },
    }
    
    // Validate window dimensions if updating window config
    if (component === 'window') {
      const windowConfig = newConfig.components?.window || {}
      
      // Always ensure minWidth and minHeight are set (use defaults if not present)
      // These are required for validation but not shown as editable fields
      if (!windowConfig.minWidth) {
        newConfig.components!.window = {
          ...windowConfig,
          minWidth: DEFAULT_WINDOW_MIN_WIDTH
        }
      }
      if (!windowConfig.minHeight) {
        newConfig.components!.window = {
          ...newConfig.components!.window!,
          minHeight: DEFAULT_WINDOW_MIN_HEIGHT
        }
      }
      
      // Validate dimensions if width or height are being updated
      if (updates.width !== undefined || updates.height !== undefined) {
        const finalWindowConfig = newConfig.components!.window!
        const width = finalWindowConfig.width ?? DEFAULT_WINDOW_WIDTH
        const height = finalWindowConfig.height ?? DEFAULT_WINDOW_HEIGHT
        const minWidth = finalWindowConfig.minWidth ?? DEFAULT_WINDOW_MIN_WIDTH
        const minHeight = finalWindowConfig.minHeight ?? DEFAULT_WINDOW_MIN_HEIGHT
        
        const errors: { width?: string; height?: string } = {}
        if (width < minWidth) {
          errors.width = `Width must be at least ${minWidth}px`
        }
        if (height < minHeight) {
          errors.height = `Height must be at least ${minHeight}px`
        }
        setValidationErrors(errors)
      }
    }
    
    onChange(newConfig)
  }

  const updateStates = (state: keyof StatesConfig, updates: any) => {
    onChange({
      ...config,
      states: {
        ...config.states,
        [state]: { ...config.states?.[state], ...updates },
      },
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4">
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'theme'
              ? 'border-primary-600 text-primary-600 bg-primary-50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Palette className="w-4 h-4" />
          Theme
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'components'
              ? 'border-primary-600 text-primary-600 bg-primary-50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layout className="w-4 h-4" />
          Components
        </button>
        <button
          onClick={() => setActiveTab('states')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'states'
              ? 'border-primary-600 text-primary-600 bg-primary-50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Zap className="w-4 h-4" />
          States
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary-600" />
                Color Palette
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Primary"
                  value={config.theme?.primaryColor || ''}
                  onChange={(val) => updateTheme({ primaryColor: val })}
                />
                <ColorInput
                  label="Secondary"
                  value={config.theme?.secondaryColor || ''}
                  onChange={(val) => updateTheme({ secondaryColor: val })}
                />
                <ColorInput
                  label="Background"
                  value={config.theme?.backgroundColor || ''}
                  onChange={(val) => updateTheme({ backgroundColor: val })}
                />
                <ColorInput
                  label="Text"
                  value={config.theme?.textColor || ''}
                  onChange={(val) => updateTheme({ textColor: val })}
                />
                <ColorInput
                  label="Border"
                  value={config.theme?.borderColor || ''}
                  onChange={(val) => updateTheme({ borderColor: val })}
                />
                <ColorInput
                  label="Accent"
                  value={config.theme?.accentColor || ''}
                  onChange={(val) => updateTheme({ accentColor: val })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-3">
            {/* Button Config */}
            <ComponentSection
              title="Chat Button"
              icon={<Settings2 className="w-4 h-4" />}
              expanded={expandedSections.button}
              onToggle={() => toggleSection('button')}
            >
              <div className="grid grid-cols-2 gap-4">
                <SelectInput
                  label="Type"
                  value={config.components?.button?.type || 'circular'}
                  options={['circular', 'rounded', 'square']}
                  onChange={(val) => updateComponents('button', { type: val })}
                />
                <SelectInput
                  label="Size"
                  value={config.components?.button?.size || 'large'}
                  options={['small', 'medium', 'large']}
                  onChange={(val) => updateComponents('button', { size: val })}
                />
                <SelectInput
                  label="Icon"
                  value={config.components?.button?.icon || 'bot'}
                  options={['bot', 'chat', 'message', 'custom', null]}
                  onChange={(val) => updateComponents('button', { icon: val })}
                />
                <SelectInput
                  label="Position"
                  value={config.components?.button?.position || 'bottom-right'}
                  options={['bottom-right', 'bottom-left', 'top-right', 'top-left']}
                  onChange={(val) => updateComponents('button', { position: val })}
                />
                <div className="col-span-2">
                  <CheckboxInput
                    label="Show Label"
                    checked={config.components?.button?.showLabel || false}
                    onChange={(val) => updateComponents('button', { showLabel: val })}
                  />
                </div>
                {config.components?.button?.showLabel && (
                  <div className="col-span-2">
                    <TextInput
                      label="Label Text"
                      value={config.components?.button?.label || ''}
                      onChange={(val) => updateComponents('button', { label: val })}
                    />
                  </div>
                )}
              </div>
            </ComponentSection>

            {/* Window Config */}
            <ComponentSection
              title="Window"
              icon={<Layout className="w-4 h-4" />}
              expanded={expandedSections.window}
              onToggle={() => toggleSection('window')}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <NumberInput
                    label="Width"
                    value={config.components?.window?.width ?? DEFAULT_WINDOW_WIDTH}
                    onChange={(val) => updateComponents('window', { width: val })}
                  />
                  {validationErrors.width && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.width}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: {config.components?.window?.minWidth ?? DEFAULT_WINDOW_MIN_WIDTH}px
                  </p>
                </div>
                <div>
                  <NumberInput
                    label="Height"
                    value={config.components?.window?.height ?? DEFAULT_WINDOW_HEIGHT}
                    onChange={(val) => updateComponents('window', { height: val })}
                  />
                  {validationErrors.height && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.height}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: {config.components?.window?.minHeight ?? DEFAULT_WINDOW_MIN_HEIGHT}px
                  </p>
                </div>
                <NumberInput
                  label="Border Radius"
                  value={config.components?.window?.borderRadius ?? DEFAULT_WINDOW_BORDER_RADIUS}
                  onChange={(val) => updateComponents('window', { borderRadius: val })}
                />
                <SelectInput
                  label="Shadow"
                  value={config.components?.window?.shadow || 'large'}
                  options={['none', 'small', 'medium', 'large']}
                  onChange={(val) => updateComponents('window', { shadow: val })}
                />
                <div className="col-span-2">
                  <CheckboxInput
                    label="Resizable"
                    checked={config.components?.window?.resizable || false}
                    onChange={(val) => updateComponents('window', { resizable: val })}
                  />
                </div>
              </div>
            </ComponentSection>

            {/* Header Config */}
            <ComponentSection
              title="Header"
              icon={<Settings2 className="w-4 h-4" />}
              expanded={expandedSections.header}
              onToggle={() => toggleSection('header')}
            >
              <div className="space-y-4">
                <CheckboxInput
                  label="Show Header"
                  checked={config.components?.header?.show !== false}
                  onChange={(val) => updateComponents('header', { show: val })}
                />
                {config.components?.header?.show !== false && (
                  <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200">
                    <NumberInput
                      label="Height"
                      value={config.components?.header?.height ?? DEFAULT_HEADER_HEIGHT}
                      onChange={(val) => updateComponents('header', { height: val })}
                    />
                    <div className="col-span-2">
                      <CheckboxInput
                        label="Show Title"
                        checked={config.components?.header?.showTitle !== false}
                        onChange={(val) => updateComponents('header', { showTitle: val })}
                      />
                    </div>
                    {config.components?.header?.showTitle !== false && (
                      <div className="col-span-2">
                        <TextInput
                          label="Title"
                          value={config.components?.header?.title || 'Chat Assistant'}
                          onChange={(val) => updateComponents('header', { title: val })}
                        />
                      </div>
                    )}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <CheckboxInput
                        label="Show Minimize"
                        checked={config.components?.header?.showMinimize !== false}
                        onChange={(val) => updateComponents('header', { showMinimize: val })}
                      />
                      <CheckboxInput
                        label="Show Close"
                        checked={config.components?.header?.showClose !== false}
                        onChange={(val) => updateComponents('header', { showClose: val })}
                      />
                    </div>
                    <div className="col-span-2">
                      <CheckboxInput
                        label="Show Avatar"
                        checked={config.components?.header?.showAvatar || false}
                        onChange={(val) => updateComponents('header', { showAvatar: val })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ComponentSection>

            {/* Messages Config */}
            <ComponentSection
              title="Messages"
              icon={<Settings2 className="w-4 h-4" />}
              expanded={expandedSections.messages}
              onToggle={() => toggleSection('messages')}
            >
              <div className="grid grid-cols-2 gap-4">
                <SelectInput
                  label="Layout"
                  value={config.components?.messages?.layout || 'bubbles'}
                  options={['bubbles', 'list', 'cards']}
                  onChange={(val) => updateComponents('messages', { layout: val })}
                />
                <SelectInput
                  label="Bubble Style"
                  value={config.components?.messages?.bubbleStyle || 'rounded'}
                  options={['rounded', 'square', 'minimal']}
                  onChange={(val) => updateComponents('messages', { bubbleStyle: val })}
                />
                <SelectInput
                  label="User Alignment"
                  value={config.components?.messages?.userAlignment || 'right'}
                  options={['left', 'right']}
                  onChange={(val) => updateComponents('messages', { userAlignment: val })}
                />
                <SelectInput
                  label="Bot Alignment"
                  value={config.components?.messages?.botAlignment || 'left'}
                  options={['left', 'right']}
                  onChange={(val) => updateComponents('messages', { botAlignment: val })}
                />
                <div className="col-span-2">
                  <CheckboxInput
                    label="Show Avatars"
                    checked={config.components?.messages?.showAvatars !== false}
                    onChange={(val) => updateComponents('messages', { showAvatars: val })}
                  />
                </div>
                <div className="col-span-2">
                  <CheckboxInput
                    label="Show Timestamps"
                    checked={config.components?.messages?.showTimestamps || false}
                    onChange={(val) => updateComponents('messages', { showTimestamps: val })}
                  />
                </div>
                {config.components?.messages?.showTimestamps && (
                  <div className="col-span-2">
                    <SelectInput
                      label="Timestamp Format"
                      value={config.components?.messages?.timestampFormat || 'relative'}
                      options={['relative', 'absolute']}
                      onChange={(val) => updateComponents('messages', { timestampFormat: val })}
                    />
                  </div>
                )}
              </div>
            </ComponentSection>

            {/* Input Config */}
            <ComponentSection
              title="Input"
              icon={<Settings2 className="w-4 h-4" />}
              expanded={expandedSections.input}
              onToggle={() => toggleSection('input')}
            >
              <div className="space-y-4">
                <TextInput
                  label="Placeholder"
                  value={config.components?.input?.placeholder || 'Type your message...'}
                  onChange={(val) => updateComponents('input', { placeholder: val })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CheckboxInput
                    label="Show Send Button"
                    checked={config.components?.input?.showSendButton !== false}
                    onChange={(val) => updateComponents('input', { showSendButton: val })}
                  />
                  <CheckboxInput
                    label="Allow Multiline"
                    checked={config.components?.input?.allowMultiline || false}
                    onChange={(val) => updateComponents('input', { allowMultiline: val })}
                  />
                  <CheckboxInput
                    label="Show Character Count"
                    checked={config.components?.input?.showCharacterCount || false}
                    onChange={(val) => updateComponents('input', { showCharacterCount: val })}
                  />
                  <CheckboxInput
                    label="Auto Focus"
                    checked={config.components?.input?.autoFocus !== false}
                    onChange={(val) => updateComponents('input', { autoFocus: val })}
                  />
                </div>
                <NumberInput
                  label="Max Length"
                  value={config.components?.input?.maxLength || 0}
                  onChange={(val) => updateComponents('input', { maxLength: val || undefined })}
                />
              </div>
            </ComponentSection>

            {/* Quick Replies Config */}
            <ComponentSection
              title="Quick Replies"
              icon={<Settings2 className="w-4 h-4" />}
              expanded={expandedSections.quickReplies}
              onToggle={() => toggleSection('quickReplies')}
            >
              <div className="space-y-4">
                <CheckboxInput
                  label="Show Quick Replies"
                  checked={config.components?.quickReplies?.show !== false}
                  onChange={(val) => updateComponents('quickReplies', { show: val })}
                />
                {config.components?.quickReplies?.show !== false && (
                  <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200">
                    <SelectInput
                      label="Layout"
                      value={config.components?.quickReplies?.layout || 'horizontal'}
                      options={['horizontal', 'vertical', 'grid']}
                      onChange={(val) => updateComponents('quickReplies', { layout: val })}
                    />
                    <SelectInput
                      label="Style"
                      value={config.components?.quickReplies?.style || 'buttons'}
                      options={['buttons', 'chips', 'links']}
                      onChange={(val) => updateComponents('quickReplies', { style: val })}
                    />
                    <NumberInput
                      label="Max Visible"
                      value={config.components?.quickReplies?.maxVisible || 0}
                      onChange={(val) => updateComponents('quickReplies', { maxVisible: val || undefined })}
                    />
                  </div>
                )}
              </div>
            </ComponentSection>
          </div>
        )}

        {activeTab === 'states' && (
          <div className="space-y-3">
            {/* Loading State */}
            <ComponentSection
              title="Loading State"
              icon={<Zap className="w-4 h-4" />}
              expanded={expandedSections.loading}
              onToggle={() => toggleSection('loading')}
            >
              <div className="grid grid-cols-2 gap-4">
                <SelectInput
                  label="Type"
                  value={config.states?.loading?.type || 'dots'}
                  options={['dots', 'spinner', 'skeleton', 'pulse']}
                  onChange={(val) => updateStates('loading', { type: val })}
                />
                <SelectInput
                  label="Color"
                  value={config.states?.loading?.color || 'primary'}
                  options={['primary', 'secondary', 'custom']}
                  onChange={(val) => updateStates('loading', { color: val })}
                />
                {config.states?.loading?.color === 'custom' && (
                  <div className="col-span-2">
                    <ColorInput
                      label="Custom Color"
                      value={config.states?.loading?.customColor || ''}
                      onChange={(val) => updateStates('loading', { customColor: val })}
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <TextInput
                    label="Message"
                    value={config.states?.loading?.message || ''}
                    onChange={(val) => updateStates('loading', { message: val })}
                  />
                </div>
              </div>
            </ComponentSection>

            {/* Empty State */}
            <ComponentSection
              title="Empty State"
              icon={<Zap className="w-4 h-4" />}
              expanded={expandedSections.empty}
              onToggle={() => toggleSection('empty')}
            >
              <div className="space-y-4">
                <TextInput
                  label="Message"
                  value={config.states?.empty?.message || 'Starting conversation...'}
                  onChange={(val) => updateStates('empty', { message: val })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <CheckboxInput
                    label="Show Icon"
                    checked={config.states?.empty?.showIcon || false}
                    onChange={(val) => updateStates('empty', { showIcon: val })}
                  />
                  <CheckboxInput
                    label="Show Button"
                    checked={config.states?.empty?.showButton || false}
                    onChange={(val) => updateStates('empty', { showButton: val })}
                  />
                </div>
                {config.states?.empty?.showIcon && (
                  <TextInput
                    label="Icon"
                    value={config.states?.empty?.icon || ''}
                    onChange={(val) => updateStates('empty', { icon: val })}
                  />
                )}
                {config.states?.empty?.showButton && (
                  <TextInput
                    label="Button Text"
                    value={config.states?.empty?.buttonText || ''}
                    onChange={(val) => updateStates('empty', { buttonText: val })}
                  />
                )}
              </div>
            </ComponentSection>

            {/* Error State */}
            <ComponentSection
              title="Error State"
              icon={<Zap className="w-4 h-4" />}
              expanded={expandedSections.error}
              onToggle={() => toggleSection('error')}
            >
              <div className="space-y-4">
                <TextInput
                  label="Message"
                  value={config.states?.error?.message || "Sorry, I'm having trouble. Please try again."}
                  onChange={(val) => updateStates('error', { message: val })}
                />
                <CheckboxInput
                  label="Show Retry Button"
                  checked={config.states?.error?.showRetry !== false}
                  onChange={(val) => updateStates('error', { showRetry: val })}
                />
                {config.states?.error?.showRetry !== false && (
                  <TextInput
                    label="Retry Button Text"
                    value={config.states?.error?.retryText || 'Retry'}
                    onChange={(val) => updateStates('error', { retryText: val })}
                  />
                )}
              </div>
            </ComponentSection>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper Components
interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <input
            type="color"
            value={value || '#6366f1'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 transition-colors"
            style={{ backgroundColor: value || '#6366f1' }}
          />
        </div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
        />
      </div>
    </div>
  )
}

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextInput({ label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
      />
    </div>
  )
}

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function NumberInput({ label, value, onChange }: NumberInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type="number"
        value={value || 0}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
      />
    </div>
  )
}

interface SelectInputProps {
  label: string
  value: string | null
  options: (string | null)[]
  onChange: (value: string | null) => void
}

function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt || 'null'} value={opt || ''}>
            {opt || 'None'}
          </option>
        ))}
      </select>
    </div>
  )
}

interface CheckboxInputProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function CheckboxInput({ label, checked, onChange }: CheckboxInputProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
      />
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  )
}

interface ComponentSectionProps {
  title: string
  icon?: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ComponentSection({ title, icon, expanded, onToggle, children }: ComponentSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span className="font-semibold text-sm text-gray-900">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {expanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}
