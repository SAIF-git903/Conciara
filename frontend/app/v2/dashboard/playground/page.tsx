'use client'

import { useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, Bot, FileText } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getApiBaseUrl } from '@/lib/api'
import SkinRenderer from '@/components/SkinRenderer'
import type { MergedSkinConfig } from '@/types/skinConfig'

const DEFAULT_WINDOW = { width: 384, height: 600, minWidth: 320, minHeight: 400, borderRadius: 20 }

function buildPlaygroundConfig(agentName: string, agentLogoUrl?: string | null): MergedSkinConfig {
  return {
    theme: {
      primaryColor: 'var(--v2-primary)',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      borderColor: '#e2e8f0',
    },
    components: {
      window: {
        ...DEFAULT_WINDOW,
        shadow: 'large',
      },
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
      input: {
        placeholder: 'Message...',
        showSendButton: true,
      },
    },
    states: {
      error: { message: "Something went wrong. Please try again." },
    },
  }
}

const PLAYGROUND_WELCOME: { id: string; type: 'bot'; content: string; timestamp: Date }[] = [
  { id: 'welcome', type: 'bot', content: "Hi! Ask me anything. I use your trained data when available.", timestamp: new Date() },
]

export default function PlaygroundPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const messagesRef = useRef<{ id: string; type: 'user' | 'bot'; content: string; timestamp: Date }[]>([])

  const handleMessagesChange = useCallback((messages: { id: string; type: 'user' | 'bot'; content: string; timestamp: Date }[]) => {
    messagesRef.current = messages
  }, [])

  const handleMessage = useCallback(
    async (
      userMessage: string,
      ctx?: { onChunk: (chunk: string) => void }
    ): Promise<string> => {
      if (!currentAgent || !currentWorkspace) return "No agent selected."

      const prev = messagesRef.current || []
      const history = prev
        .filter((m) => m.type === 'user' || m.type === 'bot')
        .map((m) => ({ role: m.type as 'user' | 'assistant', content: m.content }))

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const url = `${getApiBaseUrl()}/v2/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat/stream`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: userMessage.trim(), history }),
        })
        if (res.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_refresh_token')
          localStorage.removeItem('auth_user')
          window.location.href = '/v2/signin'
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
                const data = JSON.parse(payload) as { content?: string; error?: string }
                if (data.error) throw new Error(data.error)
                if (typeof data.content === 'string') {
                  full += data.content
                  ctx?.onChunk(data.content)
                }
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
              const data = JSON.parse(payload) as { content?: string; error?: string }
              if (data.error) throw new Error(data.error)
              if (typeof data.content === 'string') {
                full += data.content
                ctx?.onChunk(data.content)
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e
            }
          }
        }
        return full.trim() || ''
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to get reply.'
        return msg
      }
    },
    [currentWorkspace, currentAgent]
  )

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select an agent from the header to use the playground.</p>
      </div>
    )
  }

  const config = buildPlaygroundConfig(currentAgent.name, (currentAgent as { logoUrl?: string | null }).logoUrl)

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left: agent info + training CTA */}
      <div className="flex-1 min-w-0 overflow-auto p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Playground</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chat with <span className="font-medium text-slate-700">{currentAgent.name}</span>. Answers use the agent&apos;s instructions and trained data.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Training data</h2>
          <p className="mt-1 text-xs text-slate-600">
            Upload files in Data sources → Files so the agent can answer from your documents.
          </p>
          <Link
            href="/v2/dashboard/data-sources/files"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/20"
          >
            <FileText className="h-4 w-4" />
            Go to Files
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Model</h2>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50">
                <Bot className="h-5 w-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900">Agent model</span>
            </div>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600" aria-label="Expand">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Skin Renderer – chat UI with configured data */}
      <div className="flex min-h-0 w-[420px] shrink-0 flex-col border-l border-slate-200 bg-slate-100/80">
        <div
          className="flex-1 min-h-0 flex flex-col p-4"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        >
          <div className="flex-1 min-h-0 w-full min-w-[320px] max-w-[400px] mx-auto flex flex-col overflow-hidden rounded-2xl shadow-lg bg-white" style={{ borderRadius: config.components?.window?.borderRadius ?? 20 }}>
            <SkinRenderer
              config={config}
              apiUrl=""
              treeId={null}
              initialMessages={PLAYGROUND_WELCOME}
              previewMode
              onMessage={handleMessage}
              onMessagesChange={handleMessagesChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
