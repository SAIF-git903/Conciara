'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { Loader2, Check, Link2, ArrowLeft } from 'lucide-react'

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.521-2.523 2.526 2.526 0 0 1 2.521-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
)

export default function SlackIntegrationPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; teamName?: string } | null>(null)
  const [slackLoading, setSlackLoading] = useState(true)
  const [slackConnectLoading, setSlackConnectLoading] = useState(false)
  const [slackDisconnectLoading, setSlackDisconnectLoading] = useState(false)
  const [slackMessage, setSlackMessage] = useState<{ type: 'success' | 'error' | 'denied'; text: string } | null>(null)

  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const fetchSlack = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setSlackLoading(true)
    try {
      const { data } = await api.get<{ connected: boolean; teamName?: string }>(
        `/workspaces/${workspaceId}/agents/${agentId}/integrations/slack`
      )
      setSlackStatus({ connected: data.connected, teamName: data.teamName })
    } catch {
      setSlackStatus({ connected: false })
    } finally {
      setSlackLoading(false)
    }
  }, [workspaceId, agentId])

  useEffect(() => {
    fetchSlack()
  }, [fetchSlack])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const slack = params.get('slack')
    if (slack === 'success') {
      setSlackMessage({ type: 'success', text: 'Slack connected successfully.' })
      window.history.replaceState({}, '', window.location.pathname)
      fetchSlack()
    } else if (slack === 'denied') {
      setSlackMessage({ type: 'denied', text: 'Slack authorization was cancelled or denied.' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (slack === 'error') {
      setSlackMessage({ type: 'error', text: 'Something went wrong connecting Slack. Please try again.' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchSlack])

  async function handleSlackConnect() {
    if (!workspaceId || !agentId) return
    setSlackMessage(null)
    setSlackConnectLoading(true)
    try {
      const { data } = await api.get<{ redirectUrl: string }>(
        `/workspaces/${workspaceId}/agents/${agentId}/integrations/slack/oauth-url`
      )
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      setSlackMessage({ type: 'error', text: 'Slack is not configured. Please contact support.' })
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data
          ? String((err.response.data as { error?: string }).error)
          : 'Failed to start Slack connection'
      setSlackMessage({ type: 'error', text: msg })
    } finally {
      setSlackConnectLoading(false)
    }
  }

  async function handleSlackDisconnect() {
    if (!workspaceId || !agentId) return
    setSlackDisconnectLoading(true)
    try {
      await api.delete(`/workspaces/${workspaceId}/agents/${agentId}/integrations/slack`)
      await fetchSlack()
    } catch {
      // ignore
    } finally {
      setSlackDisconnectLoading(false)
    }
  }

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
          <p className="text-sm">Select an agent to manage integrations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <Link
          href="/dashboard/connected-apps"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Connected Apps
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-xl">
          {slackMessage && (
            <div
              className={`mb-5 rounded-lg px-4 py-3 text-sm ${
                slackMessage.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : slackMessage.type === 'denied'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-700'
              }`}
              role="alert"
            >
              {slackMessage.text}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#4A154B] text-white">
                  <SlackLogo />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Slack Integration</h1>
                  <p className="text-xs text-slate-500">Respond in channels and DMs</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  Connect this agent to your Slack workspace so it can reply when users @mention it in channels or send it a direct message.
                </p>
                <ul className="list-inside list-disc space-y-1 text-slate-500">
                  <li>One-click authorization—no tokens to copy</li>
                  <li>Invite the bot to any channel with <code className="rounded bg-slate-100 px-1 font-mono text-xs">/invite @BotName</code></li>
                  <li>Replies use your agent’s knowledge and tone</li>
                </ul>
              </div>

              {slackLoading ? (
                <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : slackStatus?.connected ? (
                <div className="mt-6 space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Connected workspace</p>
                      <p className="text-sm text-slate-600">{slackStatus.teamName ?? 'Slack workspace'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSlackDisconnect}
                      disabled={slackDisconnectLoading}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {slackDisconnectLoading ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-600">How to use</p>
                    <p className="mt-1 text-xs text-slate-500">
                      In Slack, invite the bot to a channel with <code className="rounded bg-white px-1 font-mono text-slate-600">/invite @YourBotName</code>, then @mention it or DM it to chat with your agent.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4A154B]/10 text-[#4A154B]">
                      <SlackLogo />
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-300">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--v2-primary)]/10 text-[var(--v2-primary)]">
                      <span className="text-lg font-semibold">{currentAgent.name?.charAt(0) ?? 'A'}</span>
                    </div>
                  </div>
                  <h2 className="mt-5 text-base font-semibold text-slate-900">Connect your Slack account</h2>
                  <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                    Clicking Connect will open the Slack connection page so you can authorize this agent to respond in your workspace.
                  </p>
                  <button
                    type="button"
                    onClick={handleSlackConnect}
                    disabled={slackConnectLoading}
                    className="mt-5 rounded-lg bg-[var(--v2-primary)] px-5 py-2.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:opacity-90 disabled:opacity-50"
                  >
                    {slackConnectLoading ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Opening Slack…
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
