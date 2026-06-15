'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import api from '@/lib/api'
import { ArrowRight, Check } from 'lucide-react'

const APPS = [
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Respond in channels and DMs. @mention your agent or message it directly.',
    color: '#611f69',
    letter: '#',
    available: true,
  },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Chat with customers over WhatsApp Business.', color: '#25d366', letter: 'W', available: false },
  { id: 'zendesk', name: 'Zendesk', desc: 'Support tickets and help center in one place.', color: '#03363d', letter: 'Z', available: false },
  { id: 'shopify', name: 'Shopify', desc: 'Product and order context for your store.', color: '#7ab55c', letter: 'S', available: false },
  { id: 'intercom', name: 'Intercom', desc: 'Hand off to humans inside Intercom.', color: '#1f8ded', letter: 'I', available: false },
  { id: 'hubspot', name: 'HubSpot', desc: 'Sync CRM contacts and conversations.', color: '#ff7a59', letter: 'H', available: false },
] as const

function getSlackHref(workspaceId: number | undefined, agentId: string | undefined): string {
  if (workspaceId && agentId) return buildDashboardUrl(workspaceId, { agentId, subPath: 'connected-apps' }) + '/slack'
  return '#'
}

export default function ConnectedAppsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; teamName?: string } | null>(null)
  const [slackLoading, setSlackLoading] = useState(true)

  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id
  const slackHref = getSlackHref(workspaceId, agentId)

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

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Select an agent to manage integrations.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Page Header */}
      <div className="shrink-0 px-6 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Connected Apps</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-3)' }}>
          Connect your agent to external services. Set up an integration to deploy beyond the embedded widget.
        </p>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {APPS.map((app) => {
            const isSlack = app.id === 'slack'
            const connected = isSlack && !slackLoading && slackStatus?.connected

            return (
              <article
                key={app.id}
                className={app.available ? 'hover:border-[var(--accent)]' : ''}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'border-color .12s ease',
                }}
              >
                {/* Card Top: mark + badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--r-md)',
                      background: app.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {app.letter}
                  </div>
                  {connected ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 999,
                        background: 'var(--success-soft)',
                        color: 'var(--success)',
                        padding: '2px 8px',
                        fontSize: 11.5,
                        fontWeight: 500,
                      }}
                    >
                      <Check style={{ width: 11, height: 11 }} />
                      Connected
                    </span>
                  ) : app.available ? (
                    <span
                      style={{
                        borderRadius: 999,
                        background: 'var(--success-soft)',
                        color: 'var(--success)',
                        padding: '2px 8px',
                        fontSize: 11.5,
                        fontWeight: 500,
                      }}
                    >
                      Available
                    </span>
                  ) : (
                    <span
                      style={{
                        borderRadius: 999,
                        background: 'var(--bg-2)',
                        color: 'var(--ink-3)',
                        padding: '2px 8px',
                        fontSize: 11.5,
                        fontWeight: 500,
                      }}
                    >
                      Coming soon
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{app.name}</h3>

                {/* Description */}
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)', flex: 1 }}>{app.desc}</p>

                {/* Action */}
                {app.available ? (
                  <Link href={isSlack ? slackHref : '#'} className="btn btn--secondary btn--sm" style={{ width: '100%' }}>
                    {connected ? 'Manage' : 'Set up'}
                    <ArrowRight style={{ width: 12, height: 12 }} />
                  </Link>
                ) : (
                  <button className="btn btn--ghost btn--sm" style={{ width: '100%' }} disabled>
                    Notify me
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
