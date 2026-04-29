'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DateRangePicker } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import {
  Search,
  MessageSquare,
  User,
  Bot,
  ArrowLeft,
  RefreshCw,
  Pencil,
  X,
  Loader2,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

type Message = { id: string; role: 'user' | 'assistant'; content: string; at: string }

const chatLogMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-[15px] leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5 text-[15px]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5 text-[15px]">{children}</ol>,
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

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getDefaultCustomRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return { start: toDateString(start), end: toDateString(end) }
}

function formatRangeLabel(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

const SESSIONS_PAGE_SIZE = 20

/** Skeleton for loading chat thread (ChatGPT-style alternating blocks) */
function ChatThreadSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
          <div className={`min-w-0 flex-1 space-y-2 ${i % 2 === 0 ? 'items-end' : ''}`}>
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="space-y-1">
              <div className="h-3 w-full max-w-md rounded bg-slate-100" />
              <div className="h-3 w-4/5 max-w-sm rounded bg-slate-100" />
              {i % 2 === 0 && <div className="h-3 w-2/3 max-w-xs rounded bg-slate-100" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
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
  const [customRange, setCustomRange] = useState(getDefaultCustomRange)
  const [pendingRange, setPendingRange] = useState(getDefaultCustomRange)
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [hasMoreSessions, setHasMoreSessions] = useState(true)
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false)
  const dateFilterRef = useRef<HTMLDivElement>(null)
  const sessionsScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  const rangeLabel = useMemo(
    () => formatRangeLabel(customRange.start, customRange.end),
    [customRange.start, customRange.end]
  )

  const selectionRange = useMemo(
    () => ({
      startDate: new Date(pendingRange.start),
      endDate: new Date(pendingRange.end),
      key: 'selection',
    }),
    [pendingRange.start, pendingRange.end]
  )

  const fetchSessions = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setLoadingSessions(true)
    setLogsError(null)
    try {
      const params = new URLSearchParams({ limit: String(SESSIONS_PAGE_SIZE), offset: '0' })
      if (search.trim()) params.set('search', search.trim())
      if (customRange.start) params.set('fromDate', new Date(customRange.start).toISOString())
      if (customRange.end) params.set('toDate', new Date(customRange.end + 'T23:59:59.999Z').toISOString())
      const { data } = await api.get<{ sessions: SessionSummary[] }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs?${params}`
      )
      const list = data.sessions ?? []
      setSessions(list)
      setHasMoreSessions(list.length >= SESSIONS_PAGE_SIZE)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      setLogsError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to load chat logs'))
      setSessions([])
      setHasMoreSessions(false)
    } finally {
      setLoadingSessions(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, search, customRange.start, customRange.end])

  const fetchMoreSessions = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id || loadingMoreSessions || !hasMoreSessions || loadingSessions) return
    setLoadingMoreSessions(true)
    try {
      const offset = sessions.length
      const params = new URLSearchParams({ limit: String(SESSIONS_PAGE_SIZE), offset: String(offset) })
      if (search.trim()) params.set('search', search.trim())
      if (customRange.start) params.set('fromDate', new Date(customRange.start).toISOString())
      if (customRange.end) params.set('toDate', new Date(customRange.end + 'T23:59:59.999Z').toISOString())
      const { data } = await api.get<{ sessions: SessionSummary[] }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs?${params}`
      )
      const list = data.sessions ?? []
      setSessions((prev) => [...prev, ...list])
      setHasMoreSessions(list.length >= SESSIONS_PAGE_SIZE)
    } catch {
      setHasMoreSessions(false)
    } finally {
      setLoadingMoreSessions(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, search, customRange.start, customRange.end, sessions.length, loadingMoreSessions, hasMoreSessions, loadingSessions])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRangeSelect = (ranges: Record<string, { startDate: Date; endDate: Date }>) => {
    const sel = ranges.selection
    if (!sel?.startDate) return
    setPendingRange({
      start: toDateString(sel.startDate),
      end: sel.endDate ? toDateString(sel.endDate) : toDateString(sel.startDate),
    })
  }

  const handleApplyRange = () => {
    setCustomRange(pendingRange)
    setDateFilterOpen(false)
  }

  const handleOpenDateFilter = () => {
    setPendingRange(customRange)
    setDateFilterOpen((v) => !v)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateFilterRef.current?.contains(e.target as Node)) return
      setDateFilterOpen(false)
    }
    if (dateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dateFilterOpen])

  useEffect(() => {
    const scrollEl = sessionsScrollRef.current
    const sentinelEl = loadMoreSentinelRef.current
    if (!scrollEl || !sentinelEl || !hasMoreSessions || loadingSessions) return
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasMoreSessions && !loadingMoreSessions && !loadingSessions) {
          fetchMoreSessions()
        }
      },
      { root: scrollEl, rootMargin: '100px', threshold: 0 }
    )
    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [hasMoreSessions, loadingMoreSessions, loadingSessions, fetchMoreSessions])

  useEffect(() => {
    if (!selectedSessionId || !currentWorkspace?.id || !currentAgent?.id) {
      setSessionMessages([])
      return
    }
    setLoadingMessages(true)
    api
      .get<{ messages: Message[] }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs/${encodeURIComponent(selectedSessionId)}`
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
      await api.post(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/qa`,
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
  const showThreadSkeleton = selectedSessionId && loadingMessages

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center text-slate-500">
        <MessageSquare className="h-10 w-10 mb-2" />
        <p className="text-sm">Select an agent from the header to view chat logs.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* Top bar: title + filters */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Chat logs
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
          </div>
          <div className="relative" ref={dateFilterRef}>
            <button
              type="button"
              onClick={handleOpenDateFilter}
              className="flex min-w-[240px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              aria-expanded={dateFilterOpen}
              aria-haspopup="dialog"
            >
              <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="flex-1 truncate">{rangeLabel}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${dateFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {dateFilterOpen && (
              <div
                className="absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg"
                role="dialog"
                aria-label="Date range filter"
              >
                <div className="analytics-date-range-picker p-4 pb-0">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date range
                  </p>
                  <DateRangePicker
                    ranges={[selectionRange]}
                    onChange={handleRangeSelect}
                    months={2}
                    direction="horizontal"
                    rangeColors={['var(--v2-primary, #0f172a)']}
                    showMonthAndYearPickers={false}
                  />
                </div>
                <div className="flex justify-end border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-[var(--v2-primary-foreground)] transition hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
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
        {/* Left sidebar – sessions list */}
        <div
          className={`flex shrink-0 flex-col border-r border-slate-200 bg-white ${
            selectedSessionId ? 'hidden w-full max-w-[280px] sm:max-w-[320px] md:flex' : 'min-w-0 flex-1 md:max-w-[320px]'
          }`}
        >
          <div ref={sessionsScrollRef} className="flex-1 overflow-auto">
            <div className="p-3">
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
                      ? 'Try adjusting search or date range.'
                      : 'Sessions appear here once users chat with this agent.'}
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-0.5">
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                            selectedSessionId === session.id
                              ? 'bg-slate-200 text-slate-900'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {session.preview || 'New chat'}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              {formatRelativeTime(session.startedAt)} · {session.messageCount} msg
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div ref={loadMoreSentinelRef} className="h-4 shrink-0" aria-hidden />
                  {loadingMoreSessions && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main area – thread or empty state */}
        {selectedSessionId ? (
          <div className="flex min-w-0 flex-1 flex-col border-l border-slate-200 bg-slate-50/50">
            {/* Thread header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
                aria-label="Back to sessions"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                {selectedSummary ? (
                  <>
                    <p className="text-sm font-medium text-slate-900">
                      {formatRelativeTime(selectedSummary.startedAt)} · {selectedSummary.messageCount} messages
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {selectedSummary.preview}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Loading…</p>
                )}
              </div>
            </div>
            {/* Messages or skeleton */}
            <div className="flex-1 overflow-auto">
              {showThreadSkeleton ? (
                <ChatThreadSkeleton />
              ) : selectedSession ? (
                <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
                  {selectedSession.messages.map((msg, idx) => {
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
                              ? 'bg-slate-600 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'rounded-tr-md bg-slate-800 text-white'
                              : 'rounded-tl-md bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="text-[15px]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatLogMarkdownComponents}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={`text-xs ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                              {formatMessageTime(msg.at)}
                            </span>
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
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 md:flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-400">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-medium text-slate-600">
              Select a conversation
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Choose a session from the list to view the full thread.
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
