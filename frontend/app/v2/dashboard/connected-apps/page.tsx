'use client'

import { Plug } from 'lucide-react'

const CONNECTED_APPS = [
  { id: 'slack', name: 'Slack', description: 'Manage your Slack conversations.' },
  { id: 'shopify', name: 'Shopify', description: 'Connect your Shopify store to Chatbase.' },
  { id: 'calendly', name: 'Calendly', description: 'Manage your Calendly events.' },
  { id: 'stripe', name: 'Stripe', description: 'Manage payments, billing, and automate financial operations.' },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description:
      'Connect Zendesk so that your AI agent can escalate tickets to humans, draft suggestions or auto-reply to tickets.',
  },
  {
    id: 'sunshine',
    name: 'Sunshine',
    description: 'Connect Sunshine to enable live chat inside Zendesk.',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description:
      'Connect Salesforce so that your AI agent can escalate cases to humans, draft suggestions, auto-reply to cases, or enable live chat.',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Connect Intercom so that your AI agent can escalate tickets to humans.',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Connect HubSpot so that your AI agent can escalate tickets to humans.',
  },
]

export default function ConnectedAppsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Connected Apps</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Connect your Agent to external services to use integration-specific actions.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="h-full w-full">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {CONNECTED_APPS.map((app) => (
              <div
                key={app.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex h-14 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                  <Plug className="h-7 w-7" />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{app.name}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{app.description}</p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  Upgrade to enable
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
