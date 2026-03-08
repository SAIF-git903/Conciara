'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { Plug, Check, ChevronRight, MessageCircle, HeadphonesIcon, ShoppingBag } from 'lucide-react'

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.521-2.523 2.526 2.526 0 0 1 2.521-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
)

const INTEGRATIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Respond in channels and DMs. @mention your agent or message it directly.',
    icon: SlackLogo,
    available: true,
    href: '/dashboard/connected-apps/slack',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Chat with customers over WhatsApp Business.',
    icon: MessageCircle,
    available: false,
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Support tickets and help center in one place.',
    icon: HeadphonesIcon,
    available: false,
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Product and order context for your store.',
    icon: ShoppingBag,
    available: false,
  },
] as const

export default function ConnectedAppsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; teamName?: string } | null>(null)
  const [slackLoading, setSlackLoading] = useState(true)
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

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
          <p className="text-sm">Select an agent to manage Connected Apps.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Connected Apps</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Connect your agent to external services. Choose an integration to set up or manage.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon
            const isSlack = integration.id === 'slack'
            const connected = isSlack && !slackLoading && slackStatus?.connected

            return integration.available ? (
              <Link
                key={integration.id}
                href={integration.href!}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#4A154B] text-white">
                    <Icon />
                  </div>
                  <div className="flex items-center gap-2">
                    {connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <Check className="h-3 w-3" />
                        Connected
                      </span>
                    )}
                    {!connected && isSlack && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Available
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600" />
                  </div>
                </div>
                <h2 className="mt-3 font-semibold text-slate-900">{integration.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
                {connected && slackStatus?.teamName && (
                  <p className="mt-2 text-xs text-slate-500">Workspace: {slackStatus.teamName}</p>
                )}
              </Link>
            ) : (
              <div
                key={integration.id}
                className="flex flex-col rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 opacity-80"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-3 font-semibold text-slate-600">{integration.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
                <span className="mt-3 inline-flex w-fit rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Coming soon
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
