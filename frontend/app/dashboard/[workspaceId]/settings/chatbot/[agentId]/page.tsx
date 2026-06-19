'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, Layout, ChevronDown, ChevronRight, Copy, Check, Loader2, MessageCircle } from 'lucide-react'
import ChatWidgetPreviewSkeleton from '@/components/ChatWidgetPreviewSkeleton'
import type { SkinConfig, ThemeColors, ComponentsConfig, StatesConfig, MergedSkinConfig } from '@/types/skinConfig'
import SkinRenderer from '@/components/SkinRenderer'
import Select from '@/components/Select'
import { Select as UISelect, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { getApiBaseUrl } from '@/lib/api'
import { DEFAULT_WINDOW, DEFAULT_THEME, CHAT_WIDGET_LEFT_WIDTH, CHAT_WIDGET_PREVIEW_MIN_WIDTH, CHAT_WIDGET_PREVIEW_MAX_WIDTH } from '@/lib/chat-widget-layout'

type TabType = 'theme' | 'components' | 'embed'
type EmbedFramework = 'html' | 'react' | 'nextjs' | 'vue' | 'nuxt' | 'angular' | 'svelte' | 'wordpress'

const EMBED_FRAMEWORKS: { value: EmbedFramework; label: string; lang: string }[] = [
  { value: 'html',      label: 'HTML',      lang: 'HTML' },
  { value: 'react',     label: 'React',     lang: 'JSX' },
  { value: 'nextjs',    label: 'Next.js',   lang: 'JSX' },
  { value: 'vue',       label: 'Vue',       lang: 'Vue' },
  { value: 'nuxt',      label: 'Nuxt',      lang: 'TypeScript' },
  { value: 'angular',   label: 'Angular',   lang: 'TypeScript' },
  { value: 'svelte',    label: 'Svelte',    lang: 'Svelte' },
  { value: 'wordpress', label: 'WordPress', lang: 'PHP' },
]

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-2)', color: 'var(--ink-2)' } as const

const EMBED_FRAMEWORK_NOTE: Record<EmbedFramework, React.ReactNode> = {
  html:      <>Insert before <code style={mono}>&lt;/body&gt;</code>. The widget will use the look you saved here.</>,
  react:     <>Add the component to your root layout. The widget will use the look you saved here.</>,
  nextjs:    <>Add the component to <code style={mono}>app/layout.tsx</code>. The widget will use the look you saved here.</>,
  vue:       <>Add the component to your <code style={mono}>App.vue</code> or root layout. The widget will use the look you saved here.</>,
  nuxt:      <>Save as <code style={mono}>plugins/conciara.client.ts</code> — Nuxt will load it only on the client. The widget will use the look you saved here.</>,
  angular:   <>Register the component in your <code style={mono}>AppModule</code> and add it to your root template. The widget will use the look you saved here.</>,
  svelte:    <>Add to your root <code style={mono}>+layout.svelte</code>. The widget will use the look you saved here.</>,
  wordpress: <>Paste into your theme&apos;s <code style={mono}>functions.php</code>. The widget will appear on every page. The widget will use the look you saved here.</>,
}

function buildEmbedSnippet(
  apiUrl: string,
  workspaceId: number,
  agentId: number | string,
  position: string = 'bottom-right',
  framework: EmbedFramework = 'html',
): string {
  const baseUrl = apiUrl.replace(/\/+$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com'

  if (framework === 'react') {
    return `import { useEffect } from 'react'

export function ConciaraWidget() {
  useEffect(() => {
    const s = document.createElement('script')
    s.src = '${origin}/embed.js'
    s.setAttribute('data-api-url', '${baseUrl}')
    s.setAttribute('data-workspace-id', '${workspaceId}')
    s.setAttribute('data-agent-id', '${agentId}')
    s.setAttribute('data-position', '${position}')
    s.async = true
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [])
  return null
}`
  }

  if (framework === 'nextjs') {
    return `import Script from 'next/script'

export function ConciaraWidget() {
  return (
    <Script
      src="${origin}/embed.js"
      data-api-url="${baseUrl}"
      data-workspace-id="${workspaceId}"
      data-agent-id="${agentId}"
      data-position="${position}"
      strategy="afterInteractive"
    />
  )
}`
  }

  if (framework === 'vue') {
    return `<script setup>
import { onMounted, onUnmounted } from 'vue'

let script
onMounted(() => {
  script = document.createElement('script')
  script.src = '${origin}/embed.js'
  script.setAttribute('data-api-url', '${baseUrl}')
  script.setAttribute('data-workspace-id', '${workspaceId}')
  script.setAttribute('data-agent-id', '${agentId}')
  script.setAttribute('data-position', '${position}')
  script.async = true
  document.body.appendChild(script)
})
onUnmounted(() => { if (script) document.body.removeChild(script) })
</script>`
  }

  if (framework === 'nuxt') {
    return `// plugins/conciara.client.ts
export default defineNuxtPlugin(() => {
  const s = document.createElement('script')
  s.src = '${origin}/embed.js'
  s.setAttribute('data-api-url', '${baseUrl}')
  s.setAttribute('data-workspace-id', '${workspaceId}')
  s.setAttribute('data-agent-id', '${agentId}')
  s.setAttribute('data-position', '${position}')
  s.async = true
  document.body.appendChild(s)
})`
  }

  if (framework === 'angular') {
    return `import { Component, OnInit, Renderer2, Inject } from '@angular/core'
import { DOCUMENT } from '@angular/common'

@Component({ selector: 'app-conciara-widget', template: '' })
export class ConciaraWidgetComponent implements OnInit {
  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    const s = this.renderer.createElement('script')
    this.renderer.setAttribute(s, 'src', '${origin}/embed.js')
    this.renderer.setAttribute(s, 'data-api-url', '${baseUrl}')
    this.renderer.setAttribute(s, 'data-workspace-id', '${workspaceId}')
    this.renderer.setAttribute(s, 'data-agent-id', '${agentId}')
    this.renderer.setAttribute(s, 'data-position', '${position}')
    this.renderer.appendChild(this.document.body, s)
  }
}`
  }

  if (framework === 'svelte') {
    return `<script>
  import { onMount, onDestroy } from 'svelte'

  let script

  onMount(() => {
    script = document.createElement('script')
    script.src = '${origin}/embed.js'
    script.setAttribute('data-api-url', '${baseUrl}')
    script.setAttribute('data-workspace-id', '${workspaceId}')
    script.setAttribute('data-agent-id', '${agentId}')
    script.setAttribute('data-position', '${position}')
    script.async = true
    document.body.appendChild(script)
  })

  onDestroy(() => { if (script) document.body.removeChild(script) })
</script>`
  }

  if (framework === 'wordpress') {
    return `<?php
// Add to your theme's functions.php

function conciara_chat_widget() {
    echo '<script
  src="${origin}/embed.js"
  data-api-url="${baseUrl}"
  data-workspace-id="${workspaceId}"
  data-agent-id="${agentId}"
  data-position="${position}"
></script>';
}
add_action( 'wp_footer', 'conciara_chat_widget' );`
  }

  return `<!-- Conciara chat widget -->
<script
  src="${origin}/embed.js"
  data-api-url="${baseUrl}"
  data-workspace-id="${workspaceId}"
  data-agent-id="${agentId}"
  data-position="${position}"
></script>`
}

/** Default config that matches Theme and Components UI defaults so Live Preview is in sync on load */
function defaultConfig(): SkinConfig {
  return {
    theme: {
      ...DEFAULT_THEME,
    },
    components: {
      button: {
        type: 'circular',
        size: 'large',
        icon: 'chat',
        position: 'bottom-right',
      },
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
        layout: 'list',
        bubbleStyle: 'minimal',
        showAvatars: true,
        showTimestamps: false,
        timestampFormat: 'relative',
      },
      input: {
        placeholder: 'Message...',
        showSendButton: true,
        enableDictation: true,
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


// ----- Helpers (design-system styled) -----
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 88, fontSize: 12.5, color: 'var(--ink-2)', flexShrink: 0 }}>{label}</span>
      <label style={{
        width: 28, height: 28, borderRadius: 'var(--r-sm)',
        border: '1px solid var(--line-strong)',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        background: value || '#0f172a', overflow: 'hidden',
      }}>
        <input
          type="color"
          value={value || '#0f172a'}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#0f172a"
        style={{
          flex: 1, height: 34, padding: '0 10px',
          border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
          background: 'var(--surface)', fontSize: 12.5,
          fontFamily: 'var(--font-mono)', color: 'var(--ink)',
        }}
      />
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
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          display: 'block', width: '100%', height: 34, padding: '0 10px',
          border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
          background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
        }}
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
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>{label}</label>
      <input
        type="number"
        value={clamped ?? 0}
        onChange={(e) => handleChange(parseInt(e.target.value, 10) || 0)}
        min={min}
        max={max}
        style={{
          display: 'block', width: '100%', height: 34, padding: '0 10px',
          border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
          background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
        }}
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12.5, cursor: 'pointer' }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `1px solid ${checked ? 'var(--accent)' : 'var(--line-strong)'}`,
          background: checked ? 'var(--accent)' : 'var(--bg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
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
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-[var(--bg-2)]"
        style={{
          display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
          background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--ink-3)', display: 'inline-flex' }}>{icon}</span>
          {title}
        </span>
        {expanded
          ? <ChevronDown style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
          : <ChevronRight style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
        }
      </button>
      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px dashed var(--line)', fontSize: 13 }}>
          {children}
        </div>
      )}
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
  const [embedFramework, setEmbedFramework] = useState<EmbedFramework>('html')
  const [chatOpen, setChatOpen] = useState(true)

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
      if (pendingButtonFile) {
        setButtonImageUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', pendingButtonFile)
          const { data } = await api.post<{ url: string; key: string; presignedUrl: string }>(
            `/workspaces/${workspaceId}/agents/${agentId}/widget-button-image`,
            formData
          )
          if (data?.presignedUrl && data?.key) {
            revokeButtonPreviewUrl()
            setPendingButtonFile(null)
            configToSave = {
              ...configToSave,
              components: {
                ...configToSave.components,
                button: {
                  ...configToSave.components?.button,
                  icon: 'custom',
                  customIconUrl: data.presignedUrl,
                  customIconKey: data.key,
                },
              },
            }
          }
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string } } }).response?.data?.error : null
          setError(msg || (err instanceof Error ? err.message : 'Failed to upload launcher icon'))
          setButtonImageUploading(false)
          setSaveLoading(false)
          return
        }
        setButtonImageUploading(false)
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

  const embedSnippet = workspaceId && agentId ? buildEmbedSnippet(getApiBaseUrl(), workspaceId, agentId, config.components?.button?.position || 'bottom-right', embedFramework) : ''
  const handleCopyEmbed = async () => {
    if (embedSnippet) {
      await navigator.clipboard.writeText(embedSnippet)
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    }
  }
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    button: true,
    window: false,
    header: false,
    messages: false,
    input: false,
  })

  const headerImageInputRef = useRef<HTMLInputElement>(null)
  const headerPreviewObjectUrlRef = useRef<string | null>(null)
  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null)
  const [headerImageUploading, setHeaderImageUploading] = useState(false)

  const buttonImageInputRef = useRef<HTMLInputElement>(null)
  const buttonPreviewObjectUrlRef = useRef<string | null>(null)
  const [pendingButtonFile, setPendingButtonFile] = useState<File | null>(null)
  const [buttonImageUploading, setButtonImageUploading] = useState(false)
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
    setConfig((c) => ({
      ...c,
      components: {
        ...c.components,
        header: { ...c.components?.header, avatarIcon: '', avatarIconKey: '' },
      },
    }))
  }, [revokeHeaderPreviewUrl])

  const revokeButtonPreviewUrl = useCallback(() => {
    if (buttonPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(buttonPreviewObjectUrlRef.current)
      buttonPreviewObjectUrlRef.current = null
    }
  }, [])

  const handleButtonImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setError(null)
    revokeButtonPreviewUrl()
    const objectUrl = URL.createObjectURL(file)
    buttonPreviewObjectUrlRef.current = objectUrl
    setPendingButtonFile(file)
    updateComponents('button', { icon: 'custom', customIconUrl: objectUrl })
    e.target.value = ''
  }

  const clearButtonImage = useCallback(() => {
    revokeButtonPreviewUrl()
    setPendingButtonFile(null)
    setConfig((c) => ({
      ...c,
      components: {
        ...c.components,
        button: {
          ...c.components?.button,
          icon: 'chat',
          customIconUrl: '',
          customIconKey: '',
        },
      },
    }))
  }, [revokeButtonPreviewUrl])

  useEffect(() => () => {
    revokeHeaderPreviewUrl()
    revokeButtonPreviewUrl()
  }, [revokeHeaderPreviewUrl, revokeButtonPreviewUrl])

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Customization form */}
        <div className="flex w-full flex-col lg:w-[400px] lg:shrink-0" style={{ borderRight: '1px solid var(--line)' }}>
          {/* Sticky header */}
          <div className="shrink-0 px-4 py-4 sm:px-5" style={{ borderBottom: '1px solid var(--line)' }}>
            {error && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--danger-soft)', color: 'var(--danger)',
                fontSize: 13, border: '1px solid rgba(195,54,101,0.2)',
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>Chat widget</h1>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>
                  Customize how your widget looks and add it to your site.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveLoading || loading}
                  className="btn btn--primary btn--sm"
                >
                  {saveLoading ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <Check className="h-[11px] w-[11px]" />}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  disabled={saveLoading || loading}
                  className="btn btn--ghost btn--sm"
                >
                  Reset
                </button>
              </div>
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
              <div style={{ display: 'flex', marginTop: 16, borderBottom: '1px solid var(--line)' }}>
                {(['theme', 'components', 'embed'] as TabType[]).map((id) => {
                  const labels: Record<TabType, string> = { theme: 'Theme', components: 'Components', embed: 'Embed' }
                  const isActive = activeTab === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      style={{
                        flex: 1, padding: '10px 0', background: 'transparent', cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 500,
                        color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                        borderBottom: `2px solid ${isActive ? 'var(--ink)' : 'transparent'}`,
                        marginBottom: -1,
                        border: 0,
                        borderBottomStyle: 'solid' as const,
                        borderBottomWidth: 2,
                        borderBottomColor: isActive ? 'var(--ink)' : 'transparent',
                      }}
                    >
                      {labels[id]}
                    </button>
                  )
                })}
              </div>

              {activeTab === 'theme' && (
                <>
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    padding: 14,
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
                      <Palette style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
                      Color palette
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 10px' }}>Set colors used across the widget.</p>
                    <ColorInput label="Primary" value={theme.primaryColor || ''} onChange={(v) => updateTheme({ primaryColor: v })} />
                    <ColorInput label="Background" value={theme.backgroundColor || ''} onChange={(v) => updateTheme({ backgroundColor: v })} />
                    <ColorInput label="Text" value={theme.textColor || ''} onChange={(v) => updateTheme({ textColor: v })} />
                  </div>

                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    padding: 14,
                    marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--ink-3)' }}>
                        <path d="M2 3h9M6.5 3v8M4 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      Typography
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 12px' }}>Controls the typeface and base text size.</p>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <span className="field-label">Font family</span>
                      <UISelect value={theme.fontFamily || 'Inter, system-ui, sans-serif'} onValueChange={(v) => updateTheme({ fontFamily: v })}>
                        <SelectTrigger compact><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter, system-ui, sans-serif">Inter</SelectItem>
                          <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                          <SelectItem value='"Geist", sans-serif'>Geist</SelectItem>
                        </SelectContent>
                      </UISelect>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <span className="field-label">Base size</span>
                      <UISelect value={String(theme.fontSize ?? 14)} onValueChange={(v) => updateTheme({ fontSize: parseInt(v, 10) })}>
                        <SelectTrigger compact><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13">13 px</SelectItem>
                          <SelectItem value="14">14 px</SelectItem>
                          <SelectItem value="15">15 px</SelectItem>
                          <SelectItem value="16">16 px</SelectItem>
                        </SelectContent>
                      </UISelect>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'components' && (
                <div className="space-y-2">
                  <Section
                    title="Launcher button"
                    icon={<MessageCircle className="h-4 w-4" />}
                    expanded={expanded.button}
                    onToggle={() => toggle('button')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Icon"
                        value={(comp.button?.icon as string) || 'chat'}
                        options={selectOptions(['bot', 'chat', 'message', 'custom'])}
                        onChange={(v) => updateComponents('button', { icon: v })}
                        compact
                      />
                      <Select
                        label="Size"
                        value={(comp.button?.size as string) || 'large'}
                        options={selectOptions(['small', 'medium', 'large'])}
                        onChange={(v) => updateComponents('button', { size: v })}
                        compact
                      />
                      <Select
                        label="Shape"
                        value={(comp.button?.type as string) || 'circular'}
                        options={selectOptions(['circular', 'rounded', 'square'])}
                        onChange={(v) => updateComponents('button', { type: v })}
                        compact
                      />
                      <div className="field">
                        <span className="field-label">Position</span>
                        <UISelect
                          value={comp.button?.position || 'bottom-right'}
                          onValueChange={(v) => updateComponents('button', { position: v })}
                        >
                          <SelectTrigger compact><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom right</SelectItem>
                            <SelectItem value="bottom-left">Bottom left</SelectItem>
                            <SelectItem value="top-right">Top right</SelectItem>
                            <SelectItem value="top-left">Top left</SelectItem>
                          </SelectContent>
                        </UISelect>
                      </div>
                      {comp.button?.icon === 'custom' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom icon</label>
                          <input
                            ref={buttonImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleButtonImageFile}
                          />
                          <button
                            type="button"
                            disabled={buttonImageUploading}
                            onClick={() => buttonImageInputRef.current?.click()}
                            className="flex items-center gap-3 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)] focus:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none"
                          >
                            {buttonImageUploading ? (
                              <>
                                <Loader2 className="h-12 w-12 shrink-0 animate-spin text-slate-400" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-slate-700">Uploading…</span>
                                </div>
                              </>
                            ) : comp.button?.customIconUrl ? (
                              <>
                                <div
                                  className="h-12 w-12 shrink-0 overflow-hidden border border-slate-200 bg-white flex items-center justify-center"
                                  style={{
                                    borderRadius: comp.button?.type === 'square' ? 0 : comp.button?.type === 'rounded' ? 8 : '50%',
                                    backgroundColor: theme.primaryColor || DEFAULT_THEME.primaryColor,
                                  }}
                                >
                                  <img
                                    src={comp.button.customIconUrl}
                                    alt=""
                                    className="h-6 w-6 object-contain"
                                    onError={() => clearButtonImage()}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-slate-700">Change icon</span>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {pendingButtonFile ? 'Preview only — click Save to upload' : 'Shown on the floating launcher'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); clearButtonImage() }}
                                  className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-600"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-white text-slate-400">
                                  <MessageCircle className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-slate-700">Upload icon</span>
                                  <p className="text-xs text-slate-500 mt-0.5">PNG or SVG recommended, square works best</p>
                                </div>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </Section>

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
                        <div className="grid grid-cols-2 gap-3 pl-3" style={{ borderLeft: '2px solid var(--line)' }}>
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
                        value={(comp.messages?.layout as string) || 'list'}
                        options={selectOptions(['bubbles', 'list', 'cards'])}
                        onChange={(v) => updateComponents('messages', { layout: v })}
                        compact
                      />
                      <Select
                        label="Bubble style"
                        value={(comp.messages?.bubbleStyle as string) || 'minimal'}
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
                        <div className="col-span-2 pl-3 space-y-2" style={{ borderLeft: '2px solid var(--line)' }}>
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
                      <CheckboxInput
                        label="Enable dictation (microphone)"
                        checked={comp.input?.enableDictation !== false}
                        onChange={(v) => updateComponents('input', { enableDictation: v })}
                      />
                      <p style={{ fontSize: 11.5, color: 'var(--ink-3)', paddingLeft: 24, marginTop: -4 }}>
                        Allow users to speak into the chat using the microphone. Not supported in all browsers.
                      </p>
                    </div>
                  </Section>
                </div>
              )}

              {activeTab === 'embed' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-900 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/80">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          {EMBED_FRAMEWORKS.find((f) => f.value === embedFramework)?.lang}
                        </span>
                        <select
                          value={embedFramework}
                          onChange={(e) => setEmbedFramework(e.target.value as EmbedFramework)}
                          style={{
                            background: '#1e293b',
                            color: '#94a3b8',
                            border: '1px solid #334155',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          {EMBED_FRAMEWORKS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
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
                  <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {EMBED_FRAMEWORK_NOTE[embedFramework]}
                  </p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="hidden lg:flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--line)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
              Live preview
            </span>
          </div>
          <div
            className="flex-1 min-h-0 overflow-hidden flex flex-col p-6"
            style={{
              backgroundImage: `linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundColor: 'var(--bg)',
            }}
          >
            {loading ? (
              <div className="flex flex-1 min-h-0 flex-col">
                <ChatWidgetPreviewSkeleton />
              </div>
            ) : (
              <div
                className="flex flex-1 min-h-0 w-full m-auto"
                style={{
                  minWidth: CHAT_WIDGET_PREVIEW_MIN_WIDTH,
                  maxWidth: CHAT_WIDGET_PREVIEW_MAX_WIDTH,
                }}
              >
                <SkinRenderer
                  config={config as MergedSkinConfig}
                  apiUrl=""
                  treeId={null}
                  initialMessages={PREVIEW_INITIAL_MESSAGES}
                  previewMode
                  open={chatOpen}
                  onOpenChange={setChatOpen}
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
