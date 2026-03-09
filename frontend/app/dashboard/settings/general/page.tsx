'use client'

import { useState } from 'react'

export default function SettingsGeneralPage() {
  const [name, setName] = useState('ConversaTree')
  const [description, setDescription] = useState('Support and product assistant for ConversaTree.')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">General</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Basic settings for this agent.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="agent-name" className="block text-sm font-medium text-slate-700">
              Agent name
            </label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="agent-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
            />
            <p className="mt-1 text-xs text-slate-500">Optional. Shown in the widget and deploy options.</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
