'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Layout, ChevronDown, ChevronRight, Monitor, Save, Copy, Check, Loader2 } from 'lucide-react'
import ChatWidgetPreviewSkeleton from '@/components/ChatWidgetPreviewSkeleton'
import type { SkinConfig, ThemeColors, ComponentsConfig, StatesConfig } from '@/types/skinConfig'
import SkinRenderer from '@/components/SkinRenderer'
import Select from '@/components/Select'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { getApiBaseUrl } from '@/lib/api'
import { DEFAULT_WINDOW, DEFAULT_THEME, CHAT_WIDGET_LEFT_WIDTH, CHAT_WIDGET_PREVIEW_MIN_WIDTH, CHAT_WIDGET_PREVIEW_MAX_WIDTH } from '@/lib/chat-widget-layout'

type TabType = 'theme' | 'components' | 'embed'

function buildEmbedSnippet(apiUrl: string, workspaceId: number, agentId: number | string): string {
  const baseUrl = apiUrl.replace(/\/+$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com'
  return `<!-- ConversaTree chat widget -->
<script
  src="${origin}/embed.js"
  data-api-url="${baseUrl}"
  data-workspace-id="${workspaceId}"
  data-agent-id="${agentId}"
  data-position="bottom-right"
></script>`
}

/** Default config that matches Theme and Components UI defaults so Live Preview is in sync on load */
function defaultConfig(): SkinConfig {
  return {
    theme: {
      ...DEFAULT_THEME,
    },
    components: {
      window: {
        ...DEFAULT_WINDOW,
        shadow: 'large',
      },
      header: {
        show: true,
        showTitle: true,
        title: 'Chat Assistant',
        showAvatar: true,
        showMinimize: true,
        showClose: true,
      },
      messages: {
        layout: 'bubbles',
        bubbleStyle: 'rounded',
        showAvatars: true,
        showTimestamps: false,
        timestampFormat: 'relative',
      },
      input: {
        placeholder: 'Message...',
        showSendButton: true,
      },
    },
    states: {},
  }
}

const PREVIEW_SAMPLE_MESSAGES = [
  { id: '1', type: 'bot' as const, content: "Hi! How can I help you today?", timestamp: new Date() },
  { id: '2', type: 'user' as const, content: "I'd like to see how the widget looks.", timestamp: new Date() },
  { id: '3', type: 'bot' as const, content: "Changes you make on the left will appear here in real time.", timestamp: new Date() },
]

/** Static messages for SkinRenderer preview – UI customizations only, no live chat */
const PREVIEW_INITIAL_MESSAGES = PREVIEW_SAMPLE_MESSAGES.map((msg) => ({
  id: msg.id,
  type: msg.type,
  content: msg.content,
  timestamp: msg.timestamp,
}))


// ----- Helpers (v2 styled) -----
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 items-center min-w-0">
        <input
          type="color"
          value={value || '#0f172a'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded-md border border-slate-200 cursor-pointer"
          style={{ backgroundColor: value || '#0f172a' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f172a"
          className="min-w-0 flex-1 h-9 rounded-md border border-slate-200 px-2.5 text-sm font-mono focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
        />
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-md border border-slate-200 px-2.5 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
      />
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const clamped = max !== undefined && value > max ? max : min !== undefined && value < min ? min : value
  const handleChange = (v: number) => {
    let next = v
    if (min !== undefined && next < min) next = min
    if (max !== undefined && next > max) next = max
    onChange(next)
  }
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type="number"
        value={clamped ?? 0}
        onChange={(e) => handleChange(parseInt(e.target.value, 10) || 0)}
        min={min}
        max={max}
        className="w-full h-9 rounded-md border border-slate-200 px-2.5 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
      />
    </div>
  )
}

/** Map string options to Select options with capitalized labels */
function selectOptions(values: string[]) {
  return values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300 text-[var(--v2-primary)] focus:ring-[var(--v2-primary)]"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )
}

function Section({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
          <span className="text-slate-400 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          <span>{title}</span>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      {expanded && <div className="px-3 py-3 border-t border-slate-100 bg-white text-sm">{children}</div>}
    </div>
  )
}

export default function ChatbotCustomizationsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const [config, setConfig] = useState<SkinConfig>(defaultConfig())
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('theme')
  const [embedCopied, setEmbedCopied] = useState(false)

  const fetchConfig = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ config: SkinConfig | null }>(
        `/workspaces/${workspaceId}/agents/${agentId}/widget-config`
      )
      if (data.config && typeof data.config === 'object') {
        setConfig(data.config as SkinConfig)
      } else {
        const base = defaultConfig()
        if (currentAgent) {
          setConfig({
            ...base,
            components: {
              ...base.components,
              header: {
                ...base.components?.header,
                title: currentAgent.name,
                avatarIcon: (currentAgent as { logoUrl?: string | null }).logoUrl ?? undefined,
              },
            },
          })
        } else {
          setConfig(base)
        }
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setError(msg || (e instanceof Error ? e.message : 'Failed to load widget config'))
      setConfig(defaultConfig())
    } finally {
      setLoading(false)
    }
  }, [workspaceId, agentId, currentAgent])

  useEffect(() => {
    if (!workspaceId || !agentId) {
      setLoading(false)
      setConfig(defaultConfig())
      return
    }
    fetchConfig()
  }, [fetchConfig, workspaceId, agentId])

  const handleSave = async () => {
    if (!workspaceId || !agentId) return
    setSaveLoading(true)
    setError(null)
    try {
      let configToSave = config
      if (pendingHeaderFile) {
        setHeaderImageUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', pendingHeaderFile)
          const { data } = await api.post<{ url: string; key: string; presignedUrl: string }>(
            `/workspaces/${workspaceId}/agents/${agentId}/widget-header-image`,
            formData
          )
          if (data?.presignedUrl && data?.key) {
            revokeHeaderPreviewUrl()
            setPendingHeaderFile(null)
            configToSave = {
              ...config,
              components: {
                ...config.components,
                header: {
                  ...config.components?.header,
                  avatarIcon: data.presignedUrl,
                  avatarIconKey: data.key,
                },
              },
            }
          }
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string } } }).response?.data?.error : null
          setError(msg || (err instanceof Error ? err.message : 'Failed to upload image'))
          setHeaderImageUploading(false)
          setSaveLoading(false)
          return
        }
        setHeaderImageUploading(false)
      }
      await api.patch(`/workspaces/${workspaceId}/agents/${agentId}/widget-config`, { config: configToSave })
      setConfig(configToSave)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setError(msg || (e instanceof Error ? e.message : 'Failed to save'))
    } finally {
      setSaveLoading(false)
    }
  }

  const embedSnippet = workspaceId && agentId ? buildEmbedSnippet(getApiBaseUrl(), workspaceId, agentId) : ''
  const handleCopyEmbed = async () => {
    if (embedSnippet) {
      await navigator.clipboard.writeText(embedSnippet)
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    }
  }
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    window: false,
    header: false,
    messages: false,
    input: false,
  })

  const headerImageInputRef = useRef<HTMLInputElement>(null)
  const headerPreviewObjectUrlRef = useRef<string | null>(null)
  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null)
  const [headerImageUploading, setHeaderImageUploading] = useState(false)
  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  // Revoke blob URL when replacing or unmounting
  const revokeHeaderPreviewUrl = useCallback(() => {
    if (headerPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(headerPreviewObjectUrlRef.current)
      headerPreviewObjectUrlRef.current = null
    }
  }, [])

  const handleHeaderImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setError(null)
    revokeHeaderPreviewUrl()
    const objectUrl = URL.createObjectURL(file)
    headerPreviewObjectUrlRef.current = objectUrl
    setPendingHeaderFile(file)
    updateComponents('header', { avatarIcon: objectUrl })
    e.target.value = ''
  }

  const updateTheme = (u: Partial<ThemeColors>) =>
    setConfig((c) => ({ ...c, theme: { ...c.theme, ...u } }))
  const updateComponents = (component: keyof ComponentsConfig, u: object) =>
    setConfig((c) => ({
      ...c,
      components: {
        ...c.components,
        [component]: { ...(c.components?.[component] || {}), ...u },
      },
    }))
  const updateStates = (state: keyof StatesConfig, u: object) =>
    setConfig((c) => ({
      ...c,
      states: { ...c.states, [state]: { ...(c.states?.[state] || {}), ...u } },
    }))

  const clearHeaderImage = useCallback(() => {
    revokeHeaderPreviewUrl()
    setPendingHeaderFile(null)
    updateComponents('header', { avatarIcon: '', avatarIconKey: '' })
  }, [revokeHeaderPreviewUrl, updateComponents])

  useEffect(() => () => revokeHeaderPreviewUrl(), [revokeHeaderPreviewUrl])

  const theme = config.theme || {}
  const comp = config.components || {}
  const states = config.states || {}

  const bg = theme.backgroundColor || '#ffffff'
  const text = theme.textColor || '#1f2937'
  const primary = theme.primaryColor || '#0f172a'
  const border = theme.borderColor || '#e5e7eb'
  const windowConfig = comp.window || {}
  const radius = windowConfig.borderRadius ?? 8
  const headerTitle = comp.header?.title || 'Chat Assistant'

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center text-slate-500">
        <Palette className="h-10 w-10 mb-2" />
        <p className="text-sm">Select an agent from the header to customize the chat widget.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Customization form – same width as Playground left column (400px) */}
        <div className="flex w-full flex-col border-r border-slate-200 lg:w-[400px] lg:shrink-0">
          {/* Sticky header */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Chat widget</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Customize how your widget looks and add it to your site. Changes appear in the live preview and in Playground.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading || loading}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save changes
              </button>
            </div>
          </div>
          {/* Scrollable form */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-slate-200">
                {[
                  { id: 'theme' as TabType, label: 'Theme' },
                  { id: 'components' as TabType, label: 'Components' },
                  { id: 'embed' as TabType, label: 'Embed' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center justify-center gap-1.5 px-1 py-2.5 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${activeTab === id
                        ? 'border-[var(--v2-primary)] text-[var(--v2-primary)]'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'theme' && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-800 mb-0.5 flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-slate-400" />
                    Color palette
                  </h2>
                  <p className="text-sm text-slate-500 mb-3">Set colors used across the widget.</p>
                  <div className="flex flex-col gap-3">
                    <ColorInput label="Primary" value={theme.primaryColor || ''} onChange={(v) => updateTheme({ primaryColor: v })} />
                    <ColorInput label="Background" value={theme.backgroundColor || ''} onChange={(v) => updateTheme({ backgroundColor: v })} />
                    <ColorInput label="Text" value={theme.textColor || ''} onChange={(v) => updateTheme({ textColor: v })} />
                  </div>
                </div>
              )}

              {activeTab === 'components' && (
                <div className="space-y-2">
                  <Section
                    title="Window"
                    icon={<Layout className="h-4 w-4" />}
                    expanded={expanded.window}
                    onToggle={() => toggle('window')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="Border radius"
                        value={comp.window?.borderRadius ?? DEFAULT_WINDOW.borderRadius}
                        onChange={(v) => updateComponents('window', { borderRadius: v })}
                        min={0}
                        max={30}
                      />
                      <Select
                        label="Shadow"
                        value={(comp.window?.shadow as string) || 'large'}
                        options={selectOptions(['none', 'small', 'medium', 'large'])}
                        onChange={(v) => updateComponents('window', { shadow: v })}
                        compact
                      />
                    </div>
                  </Section>

                  <Section
                    title="Header"
                    icon={<Layout className="h-4 w-4" />}
                    expanded={expanded.header}
                    onToggle={() => toggle('header')}
                  >
                    <div className="space-y-3">
                      <CheckboxInput
                        label="Show header"
                        checked={comp.header?.show !== false}
                        onChange={(v) => updateComponents('header', { show: v })}
                      />
                      {comp.header?.show !== false && (
                        <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-slate-200">
                          <div className="col-span-2">
                            <CheckboxInput
                              label="Show title"
                              checked={comp.header?.showTitle !== false}
                              onChange={(v) => updateComponents('header', { showTitle: v })}
                            />
                          </div>
                          {comp.header?.showTitle !== false && (
                            <div className="col-span-2">
                              <TextInput
                                label="Title"
                                value={comp.header?.title || 'Chat Assistant'}
                                onChange={(v) => updateComponents('header', { title: v })}
                              />
                            </div>
                          )}
                          <div className="col-span-2">
                            <CheckboxInput
                              label="Show image alongside title"
                              checked={comp.header?.showAvatar !== false}
                              onChange={(v) => updateComponents('header', { showAvatar: v })}
                            />
                          </div>
                          {comp.header?.showAvatar !== false && (
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">Header image</label>
                              <input
                                ref={headerImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleHeaderImageFile}
                              />
                              <button
                                type="button"
                                disabled={headerImageUploading}
                                onClick={() => headerImageInputRef.current?.click()}
                                className="flex items-center gap-3 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)] focus:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none"
                              >
                                {headerImageUploading ? (
                                  <>
                                    <Loader2 className="h-12 w-12 shrink-0 animate-spin text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                      <span className="text-sm font-medium text-slate-700">Uploading…</span>
                                    </div>
                                  </>
                                ) : comp.header?.avatarIcon ? (
                                  <>
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                                      <img
                                        src={comp.header.avatarIcon}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={() => clearHeaderImage()}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-sm font-medium text-slate-700">Change image</span>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {pendingHeaderFile ? 'Preview only — click Save to upload' : 'Shown in header next to title'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); clearHeaderImage() }}
                                      className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-600"
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-white text-slate-400">
                                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-sm font-medium text-slate-700">Upload image</span>
                                      <p className="text-xs text-slate-500 mt-0.5">Leave empty to use the default icon</p>
                                    </div>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          <CheckboxInput
                            label="Show minimize"
                            checked={comp.header?.showMinimize !== false}
                            onChange={(v) => updateComponents('header', { showMinimize: v })}
                          />
                          <CheckboxInput
                            label="Show close"
                            checked={comp.header?.showClose !== false}
                            onChange={(v) => updateComponents('header', { showClose: v })}
                          />
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section
                    title="Messages"
                    icon={<Layout className="h-4 w-4" />}
                    expanded={expanded.messages}
                    onToggle={() => toggle('messages')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Layout"
                        value={(comp.messages?.layout as string) || 'bubbles'}
                        options={selectOptions(['bubbles', 'list', 'cards'])}
                        onChange={(v) => updateComponents('messages', { layout: v })}
                        compact
                      />
                      <Select
                        label="Bubble style"
                        value={(comp.messages?.bubbleStyle as string) || 'rounded'}
                        options={selectOptions(['rounded', 'square', 'minimal'])}
                        onChange={(v) => updateComponents('messages', { bubbleStyle: v })}
                        compact
                      />
                      <div className="col-span-2">
                        <CheckboxInput
                          label="Show avatars"
                          checked={comp.messages?.showAvatars !== false}
                          onChange={(v) => updateComponents('messages', { showAvatars: v })}
                        />
                      </div>
                      {comp.messages?.showAvatars !== false && (
                        <div className="col-span-2 pl-3 border-l-2 border-slate-100 space-y-2">
                          <CheckboxInput
                            label="Show chatbot icon"
                            checked={comp.messages?.showBotAvatar !== false}
                            onChange={(v) => updateComponents('messages', { showBotAvatar: v })}
                          />
                          <CheckboxInput
                            label="Show user icon"
                            checked={comp.messages?.showUserAvatar !== false}
                            onChange={(v) => updateComponents('messages', { showUserAvatar: v })}
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <CheckboxInput
                          label="Show timestamps"
                          checked={!!comp.messages?.showTimestamps}
                          onChange={(v) => updateComponents('messages', { showTimestamps: v })}
                        />
                      </div>
                      {comp.messages?.showTimestamps && (
                        <div className="col-span-2">
                          <Select
                            label="Timestamp format"
                            value={(comp.messages?.timestampFormat as string) || 'relative'}
                            options={selectOptions(['relative', 'absolute'])}
                            onChange={(v) => updateComponents('messages', { timestampFormat: v })}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section
                    title="Input"
                    icon={<Layout className="h-4 w-4" />}
                    expanded={expanded.input}
                    onToggle={() => toggle('input')}
                  >
                    <div className="space-y-3">
                      <TextInput
                        label="Placeholder"
                        value={comp.input?.placeholder || 'Type your message...'}
                        onChange={(v) => updateComponents('input', { placeholder: v })}
                      />
                      <CheckboxInput
                        label="Show send button"
                        checked={comp.input?.showSendButton !== false}
                        onChange={(v) => updateComponents('input', { showSendButton: v })}
                      />
                    </div>
                  </Section>
                </div>
              )}

              {activeTab === 'embed' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <CheckboxInput
                      label="Allow public embed"
                      checked={!!(config as SkinConfig & { allowPublicEmbed?: boolean }).allowPublicEmbed}
                      onChange={(v) => setConfig((c) => ({ ...c, allowPublicEmbed: v }))}
                    />
                    <p className="text-xs text-slate-500 mt-1.5 ml-6">
                      Let visitors use the chat on your site without logging in. Disable to restrict chat to authenticated users only.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/80">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">HTML</span>
                      <button
                        type="button"
                        onClick={handleCopyEmbed}
                        disabled={!embedSnippet}
                        className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition disabled:opacity-50"
                      >
                        {embedCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 overflow-x-auto text-[11px] leading-[1.6] text-slate-300 font-mono">
                      <code>{embedSnippet || 'Select an agent to see embed code.'}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-slate-500">
                    Insert before <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-mono">&lt;/body&gt;</code>. The widget will use the same look you saved here and in Playground.
                  </p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Right: Live preview – SkinRenderer with static messages (UI customizations only) */}
        <div className="hidden lg:flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50">
          <div
            className="flex-1 min-h-0 overflow-hidden flex flex-col p-6 bg-slate-100/80"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(148 163 184 / 0.4) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(148 163 184 / 0.4) 1px, transparent 1px)
              `,
              backgroundSize: '64px 64px',
            }}
          >
            {loading ? (
              <div className="flex flex-1 min-h-0 flex-col">
                <ChatWidgetPreviewSkeleton />
              </div>
            ) : (
              <div
                className="flex-1 min-h-0 w-full overflow-visible m-auto"
                style={{
                  minWidth: CHAT_WIDGET_PREVIEW_MIN_WIDTH,
                  maxWidth: CHAT_WIDGET_PREVIEW_MAX_WIDTH,
                  borderRadius: `${Math.min(30, Math.max(0, config.components?.window?.borderRadius ?? 8))}px`,
                }}
              >
                <SkinRenderer
                  config={config}
                  apiUrl=""
                  treeId={null}
                  initialMessages={PREVIEW_INITIAL_MESSAGES}
                  previewMode
                  onMessage={async () => { }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
