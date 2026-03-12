'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import PermissionGate from '@/components/PermissionGate'
import api from '@/lib/api'
import { Key, Plus, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

const PLANS_WITH_API_ACCESS = ['standard', 'pro', 'enterprise']

export default function SettingsApiKeysPage() {
  const params = useParams()
  const workspaceId =
    typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id
  const plan = currentWorkspace?.id === effectiveWorkspaceId
    ? (currentWorkspace?.plan ?? 'free')
    : 'free'
  const hasApiAccess = PLANS_WITH_API_ACCESS.includes(plan)

  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createName, setCreateName] = useState('')
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    if (!effectiveWorkspaceId) return
    setLoading(true)
    try {
      const { data } = await api.get<ApiKeyRow[]>(
        `/workspaces/${effectiveWorkspaceId}/api-keys`
      )
      setKeys(Array.isArray(data) ? data : [])
    } catch {
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [effectiveWorkspaceId])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async () => {
    if (!effectiveWorkspaceId) return
    setError(null)
    setCreateLoading(true)
    try {
      const { data } = await api.post<{
        id: string
        key: string
        keyPrefix: string
        name: string
        createdAt: string
        message?: string
      }>(`/workspaces/${effectiveWorkspaceId}/api-keys`, {
        name: createName.trim() || 'API Key',
      })
      setNewKey({ key: data.key, name: data.name })
      setCreateName('')
      await fetchKeys()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err &&
        (err as { response?: { data?: { error?: string } } }).response?.data?.error
          ? String((err as { response: { data: { error: string } } }).response.data.error)
          : 'Failed to create API key'
      setError(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!effectiveWorkspaceId) return
    setRevokingId(id)
    try {
      await api.delete(`/workspaces/${effectiveWorkspaceId}/api-keys/${id}`)
      await fetchKeys()
    } catch {
      // ignore
    } finally {
      setRevokingId(null)
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  if (effectiveWorkspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Select a workspace to manage API keys.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">API keys</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Create and manage workspace API keys. Use <code className="rounded bg-slate-100 px-1 text-xs">Authorization: Bearer &lt;key&gt;</code> to authenticate requests.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {!hasApiAccess && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">API access is not included in your plan</p>
              <p className="mt-1 text-xs text-amber-700">
                Upgrade to Standard or above to create API keys for programmatic access.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                View plans
              </Link>
            </div>
          )}

          {newKey ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Key created</h2>
              <p className="mt-1 text-xs text-slate-500">
                Store this key now. It will not be shown again.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm">
                <span className="flex-1 break-all text-slate-800">{newKey.key}</span>
                <button
                  type="button"
                  onClick={() => copyKey(newKey.key)}
                  className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-200"
                  title="Copy"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNewKey(null)}
                className="mt-4 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Done
              </button>
            </div>
          ) : (
            <PermissionGate 
              feature="apiAccess" 
              showUpgradeButton 
              upgradeButtonText="Upgrade for API Access"
              upgradeButtonClassName="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              fallback={
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <Key className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">API Access Required</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    API access is available on Standard and Pro plans. Upgrade to create and manage API keys.
                  </p>
                </div>
              }
            >
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Create API key</h2>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Key name (e.g. Production)"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create key
              </button>
            </div>
            </PermissionGate>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center gap-4 px-4 py-3 first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/80"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Key className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{key.name}</p>
                      <p className="font-mono text-sm text-slate-500">{key.keyPrefix}…</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt
                          ? ` · Last used ${new Date(key.lastUsedAt).toLocaleString()}`
                          : ' · Never used'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokingId === key.id}
                      className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Revoke"
                    >
                      {revokingId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {!loading && keys.length === 0 && hasApiAccess && !newKey && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
              <Key className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No API keys yet</p>
              <p className="mt-1 text-xs text-slate-500">Create a key to authenticate API requests for this workspace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
