'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { Bot, FileText, Loader2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getApiBaseUrl } from '@/lib/api'
import SkinRenderer from '@/components/SkinRenderer'
import type { MergedSkinConfig } from '@/types/skinConfig'
import type { SkinConfig } from '@/types/skinConfig'
import api from '@/lib/api'
import { DEFAULT_WINDOW, DEFAULT_THEME, CHAT_WIDGET_PREVIEW_MIN_WIDTH, CHAT_WIDGET_PREVIEW_MAX_WIDTH } from '@/lib/chat-widget-layout'
import ChatWidgetPreviewSkeleton from '@/components/ChatWidgetPreviewSkeleton'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function buildPlaygroundConfig(agentName: string, agentLogoUrl?: string | null): MergedSkinConfig {
  return {
    theme: { ...DEFAULT_THEME },
    components: {
      window: { ...DEFAULT_WINDOW, shadow: 'large' },
      header: {
        show: true,
        showTitle: true,
        title: agentName,
        showAvatar: true,
        avatarIcon: agentLogoUrl || undefined,
        showMinimize: false,
        showClose: false,
      },
      messages: {
        layout: 'bubbles',
        bubbleStyle: 'rounded',
        showAvatars: true,
        showTimestamps: false,
        timestampFormat: 'relative',
        botAvatar: agentLogoUrl || undefined,
      },
      input: { placeholder: 'Message...', showSendButton: true },
    },
    states: { error: { message: "Something went wrong. Please try again." } },
  }
}

function toMergedConfig(c: SkinConfig): MergedSkinConfig {
  return { ...c } as MergedSkinConfig
}

const PLAYGROUND_WELCOME: { id: string; type: 'bot'; content: string; timestamp: Date }[] = [
  { id: 'welcome', type: 'bot', content: "Hi! Ask me anything. I use your trained data when available.", timestamp: new Date() },
]

const DEFAULT_LLM_MODEL = 'gpt-4o-mini'

interface LLMModel {
  id: string
  label: string
}

interface AgentDetails {
  id: number
  name: string
  workspaceId: number
  model: string | null
  prePrompt: string | null
  logoUrl: string | null
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
  const [prePrompt, setPrePrompt] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    sessionIdRef.current = null
  }, [currentAgent?.id, currentWorkspace?.id])

  // Fetch available LLM models (public)
  useEffect(() => {
    let cancelled = false
    fetch(`${getApiBaseUrl()}/models`)
      .then((res) => res.json())
      .then((data: { models?: LLMModel[] }) => {
        if (cancelled || !Array.isArray(data.models)) return
        setModels(data.models)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fetch agent details (model, prePrompt) for playground settings
  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id) {
      setAgentDetails(null)
      setAgentDetailsLoading(false)
      return
    }
    let cancelled = false
    setAgentDetailsLoading(true)
    api
      .get<{ agent: AgentDetails }>(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}`)
      .then(({ data }) => {
        if (cancelled) return
        setAgentDetails(data.agent)
        setSelectedModel(data.agent.model?.trim() || DEFAULT_LLM_MODEL)
        setPrePrompt(data.agent.prePrompt ?? '')
      })
      .catch(() => {
        if (!cancelled) {
          setAgentDetails(null)
          setSelectedModel(DEFAULT_LLM_MODEL)
          setPrePrompt('')
        }
      })
      .finally(() => {
        if (!cancelled) setAgentDetailsLoading(false)
      })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id])

  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id) {
      setConfig(null)
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    api
      .get<{ config: SkinConfig | null }>(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/widget-config`)
      .then(({ data }) => {
        if (cancelled) return
        if (data.config && typeof data.config === 'object') {
          setConfig(toMergedConfig(data.config as SkinConfig))
        } else {
          setConfig(buildPlaygroundConfig(currentAgent.name, (currentAgent as { logoUrl?: string | null }).logoUrl))
        }
      })
      .catch(() => {
        if (!cancelled) setConfig(buildPlaygroundConfig(currentAgent?.name ?? 'Agent', (currentAgent as { logoUrl?: string | null })?.logoUrl))
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id, currentAgent?.name, (currentAgent as { logoUrl?: string | null })?.logoUrl])

  const handleSaveLLM = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setSaveLoading(true)
    setSaveError(null)
    try {
      const { data } = await api.patch<{ agent: AgentDetails }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}`,
        { model: selectedModel, prePrompt: prePrompt.trim() }
      )
      setAgentDetails(data.agent)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setSaveError(msg || (e instanceof Error ? e.message : 'Failed to update'))
    } finally {
      setSaveLoading(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, selectedModel, prePrompt])

  const handleMessagesChange = useCallback((messages: { id: string; type: 'user' | 'bot'; content: string; timestamp: Date }[]) => {
    messagesRef.current = messages
  }, [])

  const handleMessage = useCallback(
    async (userMessage: string, ctx?: { onChunk: (chunk: string) => void; signal?: AbortSignal }): Promise<string> => {
      if (!currentAgent || !currentWorkspace) return "No agent selected."
      const prev = messagesRef.current || []
      const history = prev.filter((m) => m.type === 'user' || m.type === 'bot').map((m) => ({ role: m.type as 'user' | 'assistant', content: m.content }))
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
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_refresh_token')
          localStorage.removeItem('auth_user')
          window.location.href = '/signin'
          return ''
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || res.statusText || 'Request failed')
        }
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')
        const decoder = new TextDecoder()
        let full = ''
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') continue
              try {
                const data = JSON.parse(payload) as { content?: string; error?: string; sessionId?: string }
                if (data.error) throw new Error(data.error)
                if (typeof data.sessionId === 'string') sessionIdRef.current = data.sessionId
                if (typeof data.content === 'string') { full += data.content; ctx?.onChunk(data.content) }
              } catch (e) {
                if (e instanceof SyntaxError) continue
                throw e
              }
            }
          }
        }
        if (buffer.trim().startsWith('data: ')) {
          const payload = buffer.trim().slice(6).trim()
          if (payload !== '[DONE]') {
            try {
              const data = JSON.parse(payload) as { content?: string; error?: string; sessionId?: string }
              if (data.error) throw new Error(data.error)
              if (typeof data.sessionId === 'string') sessionIdRef.current = data.sessionId
              if (typeof data.content === 'string') { full += data.content; ctx?.onChunk(data.content) }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e
            }
          }
        }
        const reply = full.trim() || ''
        refreshUsage?.()
        return reply
      } catch (e: unknown) {
        if (ctx?.signal?.aborted) return ''
        return e instanceof Error ? e.message : 'Failed to get reply.'
      }
    },
    [currentWorkspace, currentAgent, refreshUsage]
  )

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select an agent from the header to use the playground.</p>
      </div>
    )
  }

  const effectiveConfig = config ?? buildPlaygroundConfig(currentAgent.name, (currentAgent as { logoUrl?: string | null }).logoUrl)
  const filesUrl = currentWorkspace?.id && currentAgent?.id ? buildDashboardUrl(currentWorkspace.id, { agentId: currentAgent.id, subPath: 'data-sources/files' }) : '#'

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 shrink-0 flex-col overflow-auto border-r border-slate-200 bg-white p-6 lg:w-[400px]">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Playground</h1>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Training data</h2>
          <p className="mt-1 text-xs text-slate-600">Upload files in Data sources → Files so the agent can answer from your documents.</p>
          <Link href={filesUrl} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/20">
            <FileText className="h-4 w-4" /> Go to Files
          </Link>
        </div>
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">AI model & system prompt</h2>
          <p className="mt-1 text-xs text-slate-500">Choose the LLM and instructions for this chatbot. Changes apply to the next message.</p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Model</label>
              {agentDetailsLoading ? (
                <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  Loading…
                </div>
              ) : (
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">System prompt (optional)</label>
              <textarea
                value={prePrompt}
                onChange={(e) => setPrePrompt(e.target.value)}
                placeholder="e.g. You are a helpful support assistant for Acme Corp. Be concise and friendly."
                rows={10}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              />
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <button
              type="button"
              onClick={handleSaveLLM}
              disabled={saveLoading || agentDetailsLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {saveLoading ? 'Saving…' : 'Update AI settings'}
            </button>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-slate-200 bg-slate-50">
        <div
          className="flex flex-1 min-h-0 flex-col overflow-hidden p-6 bg-slate-100/80"
          style={{ backgroundImage: 'linear-gradient(to right, rgb(148 163 184 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.4) 1px, transparent 1px)', backgroundSize: '64px 64px' }}
        >
          {configLoading ? (
            <div className="flex flex-1 min-h-0 flex-col"><ChatWidgetPreviewSkeleton /></div>
          ) : (
            <div
              className="flex flex-1 min-h-0 w-full flex-col overflow-visible m-auto"
              style={{ minWidth: CHAT_WIDGET_PREVIEW_MIN_WIDTH, maxWidth: CHAT_WIDGET_PREVIEW_MAX_WIDTH, borderRadius: `${effectiveConfig.components?.window?.borderRadius ?? 20}px` }}
            >
              <div className="flex-1 min-h-0 overflow-hidden rounded-2xl shadow-lg bg-white" style={{ borderRadius: effectiveConfig.components?.window?.borderRadius ?? 20 }}>
                <SkinRenderer config={effectiveConfig} apiUrl="" treeId={null} initialMessages={PLAYGROUND_WELCOME} previewMode onMessage={handleMessage} onMessagesChange={handleMessagesChange} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
