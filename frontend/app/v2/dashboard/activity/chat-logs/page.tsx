'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Search,
  MessageSquare,
  ChevronRight,
  User,
  Calendar,
  Filter,
  Bot,
  ArrowLeft,
  RefreshCw,
  Pencil,
  X,
  Loader2,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import v2Api from '@/lib/v2-api'

type Message = { id: string; role: 'user' | 'assistant'; content: string; at: string }

const chatLogMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5 text-sm">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5 text-sm">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href ?? '#'} target="_blank" rel="noopener noreferrer" className="underline font-medium text-[var(--v2-primary)] hover:opacity-80">
      {children}
    </a>
  ),
}

type SessionSummary = {
  id: string
  sessionId: string
  preview: string
  startedAt: string
  messageCount: number
}


function formatRelativeTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function ChatLogsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [search, setSearch] = useState('')
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionMessages, setSessionMessages] = useState<Message[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reviseMessage, setReviseMessage] = useState<{ question: string; answer: string } | null>(null)
  const [reviseAnswer, setReviseAnswer] = useState('')
  const [savingRevise, setSavingRevise] = useState(false)
  const [reviseError, setReviseError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setLoadingSessions(true)
    setLogsError(null)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (search.trim()) params.set('search', search.trim())
      const { data } = await v2Api.get<{ sessions: SessionSummary[] }>(
        `/v2/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs?${params}`
      )
      setSessions(data.sessions ?? [])
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      setLogsError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to load chat logs'))
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, search])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (!selectedSessionId || !currentWorkspace?.id || !currentAgent?.id) {
      setSessionMessages([])
      return
    }
    setLoadingMessages(true)
    v2Api
      .get<{ messages: Message[] }>(
        `/v2/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs/${encodeURIComponent(selectedSessionId)}`
      )
      .then(({ data }) => setSessionMessages(data.messages ?? []))
      .catch(() => setSessionMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [selectedSessionId, currentWorkspace?.id, currentAgent?.id])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchSessions().finally(() => setIsRefreshing(false))
  }

  const handleRevise = (question: string, answer: string) => {
    setReviseMessage({ question, answer })
    setReviseAnswer(answer)
    setReviseError(null)
  }

  const handleSaveAsQa = async () => {
    if (!currentWorkspace?.id || !currentAgent?.id || !reviseMessage) return
    const answer = reviseAnswer.trim()
    if (!answer) return
    setSavingRevise(true)
    setReviseError(null)
    try {
      await v2Api.post(
        `/v2/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/qa`,
        { question: reviseMessage.question.trim(), answer }
      )
      setReviseMessage(null)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      const errorStr: string = typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to save as Q&A')
      setReviseError(errorStr)
    } finally {
      setSavingRevise(false)
    }
  }

  const selectedSummary = selectedSessionId ? sessions.find((s) => s.id === selectedSessionId) : null
  const selectedSession = selectedSummary
    ? { ...selectedSummary, messages: sessionMessages }
    : null

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center text-slate-500">
        <MessageSquare className="h-10 w-10 mb-2" />
        <p className="text-sm">Select an agent from the header to view chat logs.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Chat logs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sessions and conversations with this agent.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions by message..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4 text-slate-500" />
            Filters
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || loadingSessions}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            aria-label="Refresh chat logs"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sessions list - side by side on lg+, full width when no session; hidden on small when thread open */}
        <div
          className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50/30 ${
            selectedSessionId ? 'hidden w-[320px] lg:flex' : 'min-w-0 flex-1'
          }`}
        >
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              {loadingSessions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Loading sessions…</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No sessions found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {search
                      ? 'Try a different search term.'
                      : 'Sessions will appear here once users chat with this agent.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          selectedSessionId === session.id
                            ? 'bg-slate-200 ring-1 ring-slate-300/80'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {session.preview}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {formatRelativeTime(session.startedAt)} · {session.messageCount} messages
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Message thread - only when a session is selected */}
        {selectedSession ? (
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
                aria-label="Back to sessions"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Started {formatRelativeTime(selectedSession.startedAt)} · {selectedSession.messageCount} messages
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {selectedSession.preview}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="mx-auto max-w-2xl space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : (
                selectedSession.messages.map((msg, idx) => {
                  const prevUser = msg.role === 'assistant'
                    ? selectedSession.messages[idx - 1]
                    : null
                  const canRevise = msg.role === 'assistant' && prevUser?.role === 'user' && currentAgent && currentWorkspace
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === 'user'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-[var(--v2-primary)]/10 text-[var(--v2-primary)]'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`min-w-0 flex-1 rounded-2xl px-4 py-2.5 ${
                          msg.role === 'user'
                            ? 'rounded-tr-md bg-slate-100 text-slate-900'
                            : 'rounded-tl-md bg-[var(--v2-primary)]/5 text-slate-900'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatLogMarkdownComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400">
                            {formatMessageTime(msg.at)}
                          </p>
                          {canRevise && (
                            <button
                              type="button"
                              onClick={() => handleRevise(prevUser!.content, msg.content)}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10"
                            >
                              <Pencil className="h-3 w-3" />
                              Revise
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 lg:flex">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-400">
              <MessageSquare className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">
              Select a session to view messages
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click a session in the list to see the full conversation.
            </p>
          </div>
        )}
      </div>

      {/* Revise → Save as Q&A modal */}
      {reviseMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReviseMessage(null)}>
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Save as Q&A</h3>
              <button type="button" onClick={() => setReviseMessage(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              The edited answer will be saved as a Q&A entry so the agent uses it next time someone asks something similar.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Question (from user)</label>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900">
                  {reviseMessage.question}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Answer (edit if needed)</label>
                <textarea
                  value={reviseAnswer}
                  onChange={(e) => setReviseAnswer(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              {reviseError && (
                <p className="text-sm text-red-600">{reviseError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReviseMessage(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsQa}
                  disabled={!reviseAnswer.trim() || savingRevise}
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingRevise ? 'Saving…' : 'Save as Q&A'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
