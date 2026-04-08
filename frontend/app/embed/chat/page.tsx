'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SkinRenderer from '@/components/SkinRenderer'
import type { MergedSkinConfig, SkinConfig } from '@/types/skinConfig'
import { DEFAULT_WINDOW, DEFAULT_THEME } from '@/lib/chat-widget-layout'

/** Same default shape as dashboard Chat widget so embed matches Live Preview. */
const EMBED_DEFAULT_CONFIG: MergedSkinConfig = {
  theme: { ...DEFAULT_THEME },
  components: {
    window: { ...DEFAULT_WINDOW, shadow: 'large' },
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
    input: { placeholder: 'Message...', showSendButton: true },
  },
  states: { error: { message: 'Something went wrong.' } },
}

function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (overrides == null || typeof overrides !== 'object') return base
  const out = { ...base }
  for (const key of Object.keys(overrides)) {
    const b = base[key]
    const o = overrides[key]
    if (o != null && typeof o === 'object' && !Array.isArray(o) && typeof b === 'object' && b != null && !Array.isArray(b)) {
      out[key] = deepMerge(b as Record<string, unknown>, o as Record<string, unknown>)
    } else if (o !== undefined) {
      out[key] = o
    }
  }
  return out
}

function toMergedConfig(c: SkinConfig | null): MergedSkinConfig {
  const base = EMBED_DEFAULT_CONFIG as unknown as Record<string, unknown>
  const overrides = c && typeof c === 'object' ? (c as unknown as Record<string, unknown>) : undefined
  return deepMerge(base, overrides) as unknown as MergedSkinConfig
}

function EmbedChatContent() {
  const searchParams = useSearchParams()
  const workspaceId = searchParams.get('workspaceId') ?? ''
  const agentId = searchParams.get('agentId') ?? ''
  const apiUrl = (searchParams.get('apiUrl') ?? '').replace(/\/+$/, '')
  const sessionIdRef = useRef<string | null>(null)
  const [config, setConfig] = useState<MergedSkinConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)
  const [availableActions, setAvailableActions] = useState<{
    customButtons: Array<{
      id: string
      name: string
      triggerInstructions: string
      buttons: Array<{ id: string; label: string; url: string; openInNewTab: boolean }>
    }>
    customActions: Array<{
      id: string
      name: string
      actionFunctionName: string
      triggerInstructions: string
      executionMode: string
      inputFields: Array<{ name: string; description: string; required: boolean; type: string }>
    }>
  }>({ customButtons: [], customActions: [] })

  useEffect(() => {
    if (!apiUrl || !workspaceId || !agentId) {
      setConfigError('Missing workspaceId, agentId, or apiUrl')
      return
    }
    const url = `${apiUrl}/public/widget-config?workspaceId=${workspaceId}&agentId=${agentId}`
    fetch(url)
      .then((r) => r.json())
      .then((data: { config?: SkinConfig | null }) => {
        setConfig(toMergedConfig(data.config ?? null))
        setConfigError(null)
      })
      .catch(() => setConfigError('Failed to load chat config'))

    const actionsUrl = `${apiUrl}/public/workspaces/${workspaceId}/agents/${agentId}/active-actions`
    fetch(actionsUrl)
      .then((r) => r.json())
      .then((data) => {
        setAvailableActions({
          customButtons: Array.isArray(data.customButtons) ? data.customButtons : [],
          customActions: Array.isArray(data.customActions) ? data.customActions : [],
        })
      })
      .catch(() => {
        setAvailableActions({ customButtons: [], customActions: [] })
      })
  }, [apiUrl, workspaceId, agentId])

  const handleMessage = useCallback(
    async (userMessage: string, ctx?: { onChunk: (chunk: string) => void; signal?: AbortSignal }): Promise<string> => {
      if (!apiUrl || !workspaceId || !agentId) return 'Missing configuration.'
      setAuthError(false)
      const url = `${apiUrl}/public/workspaces/${workspaceId}/agents/${agentId}/chat/stream`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctx?.signal,
          body: JSON.stringify({
            message: userMessage.trim(),
            history: [],
            ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
          }),
        })
        if (res.status === 401) {
          setAuthError(true)
          return 'Chat is not available for public embed. The site owner can enable it in Conciara settings.'
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return (data?.error as string) || 'Request failed'
        }
        const reader = res.body?.getReader()
        if (!reader) return 'No response'
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
                if (data.error) return data.error
                if (typeof data.sessionId === 'string') sessionIdRef.current = data.sessionId
                if (typeof data.content === 'string') {
                  full += data.content
                  ctx?.onChunk(data.content)
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        }
        return full.trim() || ''
      } catch (e) {
        if (ctx?.signal?.aborted) return ''
        return e instanceof Error ? e.message : 'Network error'
      }
    },
    [apiUrl, workspaceId, agentId]
  )

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: DEFAULT_THEME.backgroundColor }}>
        <p className="text-center text-sm text-slate-600">{configError}</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: DEFAULT_THEME.backgroundColor }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
      </div>
    )
  }

  const theme = config.theme ?? {}
  const bgColor = theme.backgroundColor ?? DEFAULT_THEME.backgroundColor
  const primaryColor = theme.primaryColor ?? DEFAULT_THEME.primaryColor
  const textColor = theme.textColor ?? DEFAULT_THEME.textColor
  const borderColor = theme.borderColor ?? DEFAULT_THEME.borderColor

  const embedRootStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    ['--v2-primary' as string]: primaryColor,
    ['--v2-primary-foreground' as string]: '#ffffff',
    ['--v2-primary-hover' as string]: primaryColor,
    ['--v2-primary-soft' as string]: primaryColor + '20',
    ['--v2-text' as string]: textColor,
    ['--v2-border' as string]: borderColor,
  }

  return (
    <div className="flex h-screen flex-col min-h-0" style={embedRootStyle}>
      {authError && (
        <div className="shrink-0 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
          Chat may require the site owner to enable public embed.
        </div>
      )}
      {availableActions.customActions.some((action) => action.executionMode === 'client_side') && (
        <div className="shrink-0 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
          Client-side actions only run on your live website, not in this preview.
        </div>
      )}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <SkinRenderer
          config={config}
          apiUrl={apiUrl}
          treeId={null}
          previewMode
          onMessage={handleMessage}
          availableActions={availableActions}
          onEmbedClose={() => {
            if (typeof window !== 'undefined' && window.parent !== window) {
              window.parent.postMessage({ type: 'conciara-embed-close' }, '*')
            }
          }}
        />
      </div>
    </div>
  )
}

export default function EmbedChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
        </div>
      }
    >
      <EmbedChatContent />
    </Suspense>
  )
}
