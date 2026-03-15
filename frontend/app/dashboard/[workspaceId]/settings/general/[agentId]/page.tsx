'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { Trash2, AlertTriangle } from 'lucide-react'

export default function AgentSettingsGeneralPage() {
  const { currentAgent, setAgentToDelete } = useDashboard()

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select an agent from the header to edit settings.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">General</h1>
        <p className="mt-1 text-sm text-slate-500">
          General settings and danger zone for this agent.
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Delete agent */}
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Delete agent
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Permanently delete this agent and all its data. This includes training files, Q&A pairs, website crawls, chat logs, and widget settings. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setAgentToDelete({ id: currentAgent.id, name: currentAgent.name })}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete agent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
