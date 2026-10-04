'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import api from '@/lib/api'
import { ArrowRight, Check } from 'lucide-react'
import { SiWhatsapp, SiZendesk, SiShopify, SiIntercom, SiHubspot } from 'react-icons/si'

// Slack official multicolor logo
function SlackLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 127 127" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80z" fill="#E01E5A"/>
      <path d="M33.6 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
      <path d="M46.8 27c-7.3 0-13.2-5.9-13.2-13.2C33.6 6.5 39.5.6 46.8.6c7.3 0 13.2 5.9 13.2 13.2V27H46.8z" fill="#36C5F0"/>
      <path d="M46.8 33.4c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.8C6.5 59.8.6 53.9.6 46.6c0-7.3 5.9-13.2 13.2-13.2h33z" fill="#36C5F0"/>
      <path d="M99.8 46.6c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V46.6z" fill="#2EB67D"/>
      <path d="M93.4 46.6c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.6C66.9 6.3 72.9.4 80.2.4c7.3 0 13.2 5.9 13.2 13.2v33z" fill="#2EB67D"/>
      <path d="M80.2 100c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V100h13.2z" fill="#ECB22E"/>
      <path d="M80.2 93.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2h-33z" fill="#ECB22E"/>
    </svg>
  )
}

// Brand icon config: color used for the Si* icon and the tinted background
const BRAND_ICONS: Record<string, { Icon?: React.ElementType; color: string; bg: string; custom?: React.ElementType }> = {
  slack:    { color: '#000', bg: '#ffffff', custom: SlackLogo },
  whatsapp: { Icon: SiWhatsapp, color: '#25D366', bg: '#e9faf0' },
  zendesk:  { Icon: SiZendesk,  color: '#00363D', bg: '#e6f4f5' },
  shopify:  { Icon: SiShopify,  color: '#96BF48', bg: '#f2f7e8' },
  intercom: { Icon: SiIntercom, color: '#1F8DED', bg: '#e8f3fd' },
  hubspot:  { Icon: SiHubspot,  color: '#FF7A59', bg: '#fff1ee' },
}

const APPS = [
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Respond in channels and DMs. @mention your agent or message it directly.',
    available: true,
  },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Chat with customers over WhatsApp Business.', available: false },
  { id: 'zendesk',  name: 'Zendesk',  desc: 'Support tickets and help center in one place.', available: false },
  { id: 'shopify',  name: 'Shopify',  desc: 'Product and order context for your store.', available: false },
  { id: 'intercom', name: 'Intercom', desc: 'Hand off to humans inside Intercom.', available: false },
  { id: 'hubspot',  name: 'HubSpot',  desc: 'Sync CRM contacts and conversations.', available: false },
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
                {/* Card Top: brand icon + badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {(() => {
                    const brand = BRAND_ICONS[app.id]
                    const Custom = brand?.custom
                    const Icon = brand?.Icon
                    return (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: brand?.bg ?? '#f5f5f5',
                          border: '1px solid rgba(0,0,0,0.07)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {Custom ? <Custom size={26} /> : Icon ? <Icon size={24} color={brand?.color} /> : null}
                      </div>
                    )
                  })()}
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
