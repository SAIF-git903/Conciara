'use client'

import { useState } from 'react'
import { Key, Plus, Copy, Trash2 } from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  prefix: string
  lastUsed: string | null
  createdAt: string
}

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production', prefix: 'ct_live_••••••••••••abc1', lastUsed: '2 hours ago', createdAt: 'Mar 1, 2026' },
  { id: '2', name: 'Development', prefix: 'ct_test_••••••••••••def2', lastUsed: null, createdAt: 'Feb 28, 2026' },
]

export default function SettingsApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS)

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">API keys</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Create and manage API keys for this agent. Keys are used to authenticate API and embed requests.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create key
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-4 px-4 py-3 first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{key.name}</p>
                    <p className="font-mono text-sm text-slate-500">{key.prefix}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Created {key.createdAt}
                      {key.lastUsed ? ` · Last used ${key.lastUsed}` : ' · Never used'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Copy key"
                    title="Copy (full key shown only at creation)"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id)}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Revoke"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {keys.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
              <Key className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No API keys yet</p>
              <p className="mt-1 text-xs text-slate-500">Create a key to use the API or embed this agent.</p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Create key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
