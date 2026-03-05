'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import v2Api from '@/lib/v2-api'

type Message = { id: string; role: 'user' | 'assistant'; content: string; at: string }

type Session = {
  id: string
  preview: string
  startedAt: string
  messageCount: number
  messages: Message[]
}

// Mock sessions with messages - replace with real API later
const MOCK_SESSIONS: Session[] = [
  {
    id: '1',
    preview: 'How do I reset my password for the portal?',
    startedAt: '2026-03-04T10:32:00Z',
    messageCount: 8,
    messages: [
      { id: 'm1', role: 'user', content: 'How do I reset my password for the portal?', at: '2026-03-04T10:32:00Z' },
      { id: 'm2', role: 'assistant', content: 'You can reset your password from the login page. Click "Forgot password?" and enter your email to receive a reset link.', at: '2026-03-04T10:32:15Z' },
      { id: 'm3', role: 'user', content: 'I didn\'t get the email.', at: '2026-03-04T10:33:00Z' },
      { id: 'm4', role: 'assistant', content: 'Check your spam folder first. If it\'s not there, make sure you’re using the same email you signed up with. I can resend the link if you’d like.', at: '2026-03-04T10:33:20Z' },
      { id: 'm5', role: 'user', content: 'Yes please, alex.j@company.com', at: '2026-03-04T10:34:00Z' },
      { id: 'm6', role: 'assistant', content: 'I’ve triggered a new reset email to alex.j@company.com. It should arrive within a few minutes.', at: '2026-03-04T10:34:10Z' },
      { id: 'm7', role: 'user', content: 'Got it, thanks!', at: '2026-03-04T10:35:00Z' },
      { id: 'm8', role: 'assistant', content: 'You’re welcome. If you need anything else, just ask.', at: '2026-03-04T10:35:05Z' },
    ],
  },
  {
    id: '2',
    preview: 'I need help with the dialog tree configuration...',
    startedAt: '2026-03-04T09:15:00Z',
    messageCount: 12,
    messages: [
      { id: 'm9', role: 'user', content: 'I need help with the dialog tree configuration.', at: '2026-03-04T09:15:00Z' },
      { id: 'm10', role: 'assistant', content: 'I can help with that. Are you setting up a new tree or editing an existing one?', at: '2026-03-04T09:15:12Z' },
      { id: 'm11', role: 'user', content: 'Editing. I added a new node but it’s not showing in the flow.', at: '2026-03-04T09:16:00Z' },
      { id: 'm12', role: 'assistant', content: 'Nodes need to be connected to the tree. In the editor, drag from the parent node’s handle to the new node. If it’s still missing, try saving and refreshing the page.', at: '2026-03-04T09:16:25Z' },
      { id: 'm13', role: 'user', content: 'That worked, thanks!', at: '2026-03-04T09:17:00Z' },
      { id: 'm14', role: 'assistant', content: 'Glad it’s working. Anything else?', at: '2026-03-04T09:17:08Z' },
    ],
  },
  {
    id: '3',
    preview: 'What are the different user roles?',
    startedAt: '2026-03-03T16:45:00Z',
    messageCount: 5,
    messages: [
      { id: 'm15', role: 'user', content: 'What are the different user roles?', at: '2026-03-03T16:45:00Z' },
      { id: 'm16', role: 'assistant', content: 'ConversaTree has three roles: System Administrator (full access), Manager (can manage agents and users in their workspace), and User (can use assigned agents and view their own activity).', at: '2026-03-03T16:45:10Z' },
      { id: 'm17', role: 'user', content: 'How do I change someone’s role?', at: '2026-03-03T16:46:00Z' },
      { id: 'm18', role: 'assistant', content: 'Only admins and managers can change roles. Go to Workspace settings → Members, find the user, and use the role dropdown to update it.', at: '2026-03-03T16:46:15Z' },
      { id: 'm19', role: 'user', content: 'Got it.', at: '2026-03-03T16:46:30Z' },
    ],
  },
  {
    id: '4',
    preview: 'Thanks, that fixed it!',
    startedAt: '2026-03-03T14:20:00Z',
    messageCount: 4,
    messages: [
      { id: 'm20', role: 'user', content: 'The embed widget isn’t loading on our site.', at: '2026-03-03T14:20:00Z' },
      { id: 'm21', role: 'assistant', content: 'Usually that’s a script or CSP issue. Can you confirm the embed script is in the page and that your CSP allows our domain?', at: '2026-03-03T14:20:20Z' },
      { id: 'm22', role: 'user', content: 'We added the script to the allowlist. Testing now.', at: '2026-03-03T14:22:00Z' },
      { id: 'm23', role: 'user', content: 'Thanks, that fixed it!', at: '2026-03-03T14:23:00Z' },
    ],
  },
  {
    id: '5',
    preview: 'Can the bot integrate with our CRM?',
    startedAt: '2026-03-02T11:00:00Z',
    messageCount: 6,
    messages: [
      { id: 'm24', role: 'user', content: 'Can the bot integrate with our CRM?', at: '2026-03-02T11:00:00Z' },
      { id: 'm25', role: 'assistant', content: 'We support integrations via Actions and webhooks. You can send conversation data to your CRM when certain events occur. Do you use a specific CRM?', at: '2026-03-02T11:00:15Z' },
      { id: 'm26', role: 'user', content: 'Salesforce.', at: '2026-03-02T11:01:00Z' },
      { id: 'm27', role: 'assistant', content: 'You can use our webhook action to POST to Salesforce’s API or a middleware like Zapier. I can walk you through setting up an Action if you’d like.', at: '2026-03-02T11:01:20Z' },
      { id: 'm28', role: 'user', content: 'I’ll check with our dev team and get back to you.', at: '2026-03-02T11:02:00Z' },
      { id: 'm29', role: 'assistant', content: 'Sounds good. We have docs on webhook payloads in the Deploy section.', at: '2026-03-02T11:02:10Z' },
    ],
  },
]

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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reviseMessage, setReviseMessage] = useState<{ question: string; answer: string } | null>(null)
  const [reviseAnswer, setReviseAnswer] = useState('')
  const [savingRevise, setSavingRevise] = useState(false)
  const [reviseError, setReviseError] = useState<string | null>(null)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
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
      setReviseError(msg || (e instanceof Error ? e.message : 'Failed to save as Q&A'))
    } finally {
      setSavingRevise(false)
    }
  }

  const filtered = MOCK_SESSIONS.filter((s) =>
    s.preview.toLowerCase().includes(search.toLowerCase())
  )
  const selectedSession = selectedSessionId
    ? MOCK_SESSIONS.find((s) => s.id === selectedSessionId)
    : null

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
            disabled={isRefreshing}
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
              {filtered.length === 0 ? (
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
                  {filtered.map((session) => (
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
                        <p className="text-sm">{msg.content}</p>
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
                })}
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
