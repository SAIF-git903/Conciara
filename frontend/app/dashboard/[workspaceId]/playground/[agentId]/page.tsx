'use client'

import ChatWidgetPreviewSkeleton from '@/components/ChatWidgetPreviewSkeleton'
import SkinRenderer from '@/components/SkinRenderer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboard } from '@/contexts/DashboardContext'
import api, { getApiBaseUrl } from '@/lib/api'
import { CHAT_WIDGET_PREVIEW_MAX_WIDTH, CHAT_WIDGET_PREVIEW_MIN_WIDTH, DEFAULT_THEME, DEFAULT_WINDOW } from '@/lib/chat-widget-layout'
import type { MergedSkinConfig, SkinConfig } from '@/types/skinConfig'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function formatRelative(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function buildPlaygroundConfig(agentName: string, agentLogoUrl?: string | null): MergedSkinConfig {
  return {
    theme: { ...DEFAULT_THEME },
    components: {
      button: {
        type: 'circular',
        size: 'large',
        icon: 'chat',
        position: 'bottom-right',
      },
      window: { ...DEFAULT_WINDOW, shadow: 'large' },
      header: {
        show: true,
        showTitle: true,
        title: agentName,
        showAvatar: true,
        avatarIcon: agentLogoUrl || undefined,
        showMinimize: true,
        showClose: true,
      },
      messages: {
        layout: 'list',
        bubbleStyle: 'minimal',
        showAvatars: true,
        showTimestamps: false,
        timestampFormat: 'relative',
        botAvatar: agentLogoUrl || undefined,
      },
      input: { placeholder: 'Message...', showSendButton: true, enableDictation: true },
    },
    states: { error: { message: 'Something went wrong. Please try again.' } },
  }
}

function toMergedConfig(c: SkinConfig): MergedSkinConfig {
  return { ...c } as MergedSkinConfig
}

const PLAYGROUND_WELCOME: { id: string; type: 'bot'; content: string; timestamp: Date }[] = [
  { id: 'welcome', type: 'bot', content: 'Hi! Ask me anything. I use your trained data when available.', timestamp: new Date() },
]

const DEFAULT_LLM_MODEL = 'gpt-4o-mini'

interface LLMModel { id: string; label: string }

interface AgentDetails {
  id: number; name: string; workspaceId: number
  model: string | null; prePrompt: string | null; logoUrl: string | null; temperature: number
}

interface PlaygroundAvailableActions {
  customButtons: Array<{
    id: string; name: string; triggerInstructions: string
    buttons: Array<{ id: string; label: string; url: string; openInNewTab: boolean }>
  }>
  customActions: Array<{
    id: string; name: string; actionFunctionName: string; triggerInstructions: string
    executionMode: string
    inputFields: Array<{ name: string; description: string; required: boolean; type: string }>
  }>
}

/* ─── shared micro-styles ─────────────────────────────────── */
const EYEBROW: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 10,
}
const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6,
}
const CARD: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 12, overflow: 'hidden',
}
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', height: 34, padding: '0 10px',
  border: '1px solid var(--line-2)', borderRadius: 6,
  background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
  outline: 'none', cursor: 'pointer',
}
const SELECT_TRIGGER: React.CSSProperties = {
  ...INPUT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: 'none',
}
const BTN_SM_PRIMARY: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 28, padding: '0 10px', fontSize: 12.5, fontWeight: 500,
  background: 'var(--ink)', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer',
}
const BTN_SM_GHOST: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 28, padding: '0 10px', fontSize: 12.5, fontWeight: 500,
  background: 'transparent', color: 'var(--ink-2)',
  border: 'none', borderRadius: 6, cursor: 'pointer',
}

export default function PlaygroundAgentPage() {
  const { currentWorkspace, currentAgent, refreshUsage } = useDashboard()
  const messagesRef = useRef<{ id: string; type: 'user' | 'bot'; content: string; timestamp: Date }[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const [config, setConfig] = useState<MergedSkinConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [models, setModels] = useState<LLMModel[]>([])
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null)
  const [agentDetailsLoading, setAgentDetailsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_LLM_MODEL)
  const [temperature, setTemperature] = useState(0.7)
  const [prePrompt, setPrePrompt] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [clearKey, setClearKey] = useState(0)
  const [chatOpen, setChatOpen] = useState(true)
  const [availableActions, setAvailableActions] = useState<PlaygroundAvailableActions>({ customButtons: [], customActions: [] })

  useEffect(() => { sessionIdRef.current = null }, [currentAgent?.id, currentWorkspace?.id])

  useEffect(() => {
    let cancelled = false
    fetch(`${getApiBaseUrl()}/models`)
      .then((r) => r.json())
      .then((d: { models?: LLMModel[] }) => { if (!cancelled && Array.isArray(d.models)) setModels(d.models) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id) { setAgentDetails(null); setAgentDetailsLoading(false); return }
    let cancelled = false
    setAgentDetailsLoading(true)
    api.get<{ agent: AgentDetails }>(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}`)
      .then(({ data }) => {
        if (cancelled) return
        setAgentDetails(data.agent)
        setSelectedModel(data.agent.model?.trim() || DEFAULT_LLM_MODEL)
        setTemperature(data.agent.temperature ?? 0.7)
        setPrePrompt(data.agent.prePrompt ?? '')
      })
      .catch(() => { if (!cancelled) { setAgentDetails(null); setSelectedModel(DEFAULT_LLM_MODEL); setPrePrompt('') } })
      .finally(() => { if (!cancelled) setAgentDetailsLoading(false) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id])

  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id) { setConfig(null); setConfigLoading(false); return }
    let cancelled = false
    setConfigLoading(true)
    api.get<{ config: SkinConfig | null }>(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/widget-config`)
      .then(({ data }) => {
        if (cancelled) return
        setConfig(data.config && typeof data.config === 'object'
          ? toMergedConfig(data.config as SkinConfig)
          : buildPlaygroundConfig(currentAgent.name, (currentAgent as { logoUrl?: string | null }).logoUrl))
      })
      .catch(() => { if (!cancelled) setConfig(buildPlaygroundConfig(currentAgent?.name ?? 'Agent', (currentAgent as { logoUrl?: string | null })?.logoUrl)) })
      .finally(() => { if (!cancelled) setConfigLoading(false) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id, currentAgent?.name, (currentAgent as { logoUrl?: string | null })?.logoUrl])

  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id) { setAvailableActions({ customButtons: [], customActions: [] }); return }
    let cancelled = false
    api.get<PlaygroundAvailableActions>(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/active-actions`)
      .then(({ data }) => {
        if (cancelled) return
        setAvailableActions({
          customButtons: Array.isArray(data.customButtons) ? data.customButtons : [],
          customActions: Array.isArray(data.customActions) ? data.customActions : [],
        })
      })
      .catch(() => { if (!cancelled) setAvailableActions({ customButtons: [], customActions: [] }) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id])

  const handleSaveLLM = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setSaveLoading(true); setSaveError(null)
    try {
      const { data } = await api.patch<{ agent: AgentDetails }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}`,
        { model: selectedModel, prePrompt: prePrompt.trim(), temperature }
      )
      setAgentDetails(data.agent)
      setLastSaved(new Date())
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setSaveError(msg || (e instanceof Error ? e.message : 'Failed to update'))
    } finally {
      setSaveLoading(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, selectedModel, prePrompt, temperature])

  const handleMessagesChange = useCallback((messages: { id: string; type: 'user' | 'bot'; content: string; timestamp: Date }[]) => {
    messagesRef.current = messages
  }, [])

  const handleMessage = useCallback(
    async (userMessage: string, ctx?: { onChunk: (chunk: string) => void; signal?: AbortSignal }): Promise<string> => {
      if (!currentAgent || !currentWorkspace) return 'No agent selected.'
      const history = (messagesRef.current || [])
        .filter((m) => m.type === 'user' || m.type === 'bot')
        .map((m) => ({ role: m.type as 'user' | 'assistant', content: m.content }))
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const url = `${getApiBaseUrl()}/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat/stream`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: ctx?.signal,
          body: JSON.stringify({ message: userMessage.trim(), history, ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}) }),
        })
        if (res.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('auth_token'); localStorage.removeItem('auth_refresh_token'); localStorage.removeItem('auth_user')
          window.location.href = '/signin'; return ''
        }
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || res.statusText || 'Request failed') }
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')
        const decoder = new TextDecoder(); let full = '', buffer = ''
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim(); if (payload === '[DONE]') continue
            try {
              const d = JSON.parse(payload) as { content?: string; error?: string; sessionId?: string }
              if (d.error) throw new Error(d.error)
              if (typeof d.sessionId === 'string') sessionIdRef.current = d.sessionId
              if (typeof d.content === 'string') { full += d.content; ctx?.onChunk(d.content) }
            } catch (e) { if (e instanceof SyntaxError) continue; throw e }
          }
        }
        if (buffer.trim().startsWith('data: ')) {
          const payload = buffer.trim().slice(6).trim()
          if (payload !== '[DONE]') {
            try {
              const d = JSON.parse(payload) as { content?: string; error?: string; sessionId?: string }
              if (d.error) throw new Error(d.error)
              if (typeof d.sessionId === 'string') sessionIdRef.current = d.sessionId
              if (typeof d.content === 'string') { full += d.content; ctx?.onChunk(d.content) }
            } catch (e) { if (!(e instanceof SyntaxError)) throw e }
          }
        }
        refreshUsage?.()
        return full.trim() || ''
      } catch (e: unknown) {
        if (ctx?.signal?.aborted) return ''
        return e instanceof Error ? e.message : 'Failed to get reply.'
      }
    },
    [currentWorkspace, currentAgent, refreshUsage]
  )

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <p style={{ fontSize: 13.5, color: 'var(--ink-4)' }}>Select an agent from the header to use the playground.</p>
      </div>
    )
  }

  const effectiveConfig = config ?? buildPlaygroundConfig(currentAgent.name, (currentAgent as { logoUrl?: string | null }).logoUrl)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Left: config panel ───────────────────────────────── */}
      <div style={{ padding: '22px 22px 40px', borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--bg)' }}>

        {/* Page header */}
        <div style={{ paddingBottom: 14, marginBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 4px', color: 'var(--ink)', lineHeight: 1.2 }}>
            Playground
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
            Test changes before deploying. Updates apply to the live agent on save.
          </p>
        </div>

        {/* AI model & system prompt card */}
        <div style={CARD}>
          <div style={{ padding: 14 }}>
            <div style={EYEBROW}>AI model &amp; system prompt</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Choose the LLM and instructions. Changes apply to the next message.
            </p>

            {/* Model */}
            <div style={{ marginBottom: 14 }}>
              <span style={FIELD_LABEL}>Model</span>
              {agentDetailsLoading ? (
                <div style={{ ...INPUT, display: 'flex', alignItems: 'center', color: 'var(--ink-4)' }}>Loading…</div>
              ) : (
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger compact className="ring-0 shadow-none" style={SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Temperature */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...FIELD_LABEL, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span>Temperature</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', fontWeight: 400 }}>
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="pg-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                <span>Precise</span><span>Balanced</span><span>Creative</span>
              </div>
            </div>

            {/* System prompt */}
            <div style={{ marginBottom: 12 }}>
              <span style={FIELD_LABEL}>
                System prompt{' '}
                <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span>
              </span>
              <textarea
                value={prePrompt}
                onChange={(e) => setPrePrompt(e.target.value)}
                placeholder="e.g. You are a helpful support assistant for Acme Corp. Be concise and friendly."
                rows={8}
                style={{
                  display: 'block', width: '100%', padding: '8px 10px',
                  border: '1px solid var(--line-2)', borderRadius: 6,
                  background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
                  resize: 'vertical', lineHeight: 1.5, minHeight: 80,
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {saveError && (
              <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 10px' }}>{saveError}</p>
            )}

            {/* Save row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
                {lastSaved
                  ? <>Last saved <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRelative(lastSaved)}</span></>
                  : agentDetails ? 'Unsaved changes' : ''}
              </span>
              <button
                type="button"
                onClick={handleSaveLLM}
                disabled={saveLoading || agentDetailsLoading}
                style={{ ...BTN_SM_PRIMARY, opacity: saveLoading || agentDetailsLoading ? 0.6 : 1, cursor: saveLoading || agentDetailsLoading ? 'not-allowed' : 'pointer' }}
              >
                {saveLoading
                  ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                  : <Check style={{ width: 12, height: 12 }} />}
                {saveLoading ? 'Saving…' : 'Update AI settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: live canvas ───────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
            Live preview
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={() => { setClearKey((k) => k + 1); setChatOpen(true) }} style={BTN_SM_GHOST}>
              Clear <Trash2 style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex flex-1 min-h-0 flex-col overflow-hidden p-6"
          style={{
            backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundColor: 'var(--bg)',
          }}
        >
          {configLoading ? (
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
                key={clearKey}
                config={effectiveConfig}
                apiUrl=""
                treeId={null}
                initialMessages={PLAYGROUND_WELCOME}
                previewMode
                open={chatOpen}
                onOpenChange={setChatOpen}
                onMessage={handleMessage}
                onMessagesChange={handleMessagesChange}
                availableActions={availableActions}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
