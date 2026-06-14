'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import PermissionGate from '@/components/PermissionGate'
import api from '@/lib/api'
import { Key, Plus, Trash2, Loader2, Copy, Check } from 'lucide-react'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export default function SettingsApiKeysPage() {
  const params = useParams()
  const workspaceId =
    typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id

  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createName, setCreateName] = useState('')
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = useCallback(async () => {
    if (!effectiveWorkspaceId) return
    setLoading(true)
    try {
      const { data } = await api.get<ApiKeyRow[]>(`/workspaces/${effectiveWorkspaceId}/api-keys`)
      setKeys(Array.isArray(data) ? data : [])
    } catch {
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [effectiveWorkspaceId])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleCreate = async () => {
    if (!effectiveWorkspaceId) return
    setError(null)
    setCreateLoading(true)
    try {
      const { data } = await api.post<{ id: string; key: string; keyPrefix: string; name: string; createdAt: string }>(
        `/workspaces/${effectiveWorkspaceId}/api-keys`,
        { name: createName.trim() || 'API Key' }
      )
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
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (effectiveWorkspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Select a workspace to manage API keys.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div
          className="mb-7 pb-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h1
            className="text-[22px] font-semibold leading-tight tracking-[-0.015em]"
            style={{ color: 'var(--ink)', marginBottom: 4 }}
          >
            API keys
          </h1>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
            Create keys to authenticate requests. Use{' '}
            <code
              className="rounded px-1.5 py-0.5 text-[12px]"
              style={{ background: 'var(--bg-2)', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}
            >
              Authorization: Bearer &lt;key&gt;
            </code>
          </p>
        </div>

        {/* Settings split layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56 }}>
          {/* Side label */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>
              Authentication
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-4)' }}>
              API keys grant programmatic access to your workspace. Keep them secret.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* New key reveal */}
            {newKey ? (
              <div
                className="overflow-hidden rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
              >
                <div
                  className="px-5 py-3.5"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Key created — copy it now</p>
                  <p className="mt-0.5 text-[12px]" style={{ color: 'var(--ink-4)' }}>
                    This key will not be shown again. Store it somewhere safe.
                  </p>
                </div>
                <div className="p-5">
                  <div
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ background: 'var(--bg-2)' }}
                  >
                    <span
                      className="flex-1 break-all text-[13px]"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}
                    >
                      {newKey.key}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyKey(newKey.key)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                      style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewKey(null)}
                    className="mt-4 text-[13px] font-medium"
                    style={{ color: 'var(--accent)' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <PermissionGate
                feature="apiAccess"
                showUpgradeButton
                upgradeButtonText="Upgrade for API Access"
                upgradeButtonClassName="w-full px-4 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                fallback={
                  <div
                    className="rounded-xl border p-8 text-center"
                    style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                  >
                    <div
                      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: 'var(--bg-2)' }}
                    >
                      <Key className="h-5 w-5" style={{ color: 'var(--ink-4)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>API access not included</p>
                    <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ink-4)' }}>
                      Upgrade to Standard or above to use the API.
                    </p>
                  </div>
                }
              >
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                >
                  <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Create a new key</p>
                  </div>
                  <div className="p-5">
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Key name (e.g. Production)"
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                      style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    {error && (
                      <p className="mt-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>{error}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={createLoading}
                      className="mt-3.5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: 'var(--accent)' }}
                    >
                      {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create key
                    </button>
                  </div>
                </div>
              </PermissionGate>
            )}

            {/* Keys list */}
            <div
              className="overflow-hidden rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            >
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>
                  {keys.length > 0 ? `${keys.length} key${keys.length !== 1 ? 's' : ''}` : 'Keys'}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--ink-4)' }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : keys.length === 0 ? (
                <div className="py-12 text-center">
                  <div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: 'var(--bg-2)' }}
                  >
                    <Key className="h-4 w-4" style={{ color: 'var(--ink-4)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No API keys yet</p>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--ink-4)' }}>
                    Create a key above to get started.
                  </p>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {keys.map((key, i) => (
                    <li
                      key={key.id}
                      className="flex items-center gap-4 px-5"
                      style={{
                        paddingTop: 12,
                        paddingBottom: 12,
                        borderBottom: i < keys.length - 1 ? '1px solid var(--line)' : undefined,
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        <Key className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{key.name}</p>
                        <p
                          className="text-[12px]"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-4)' }}
                        >
                          {key.keyPrefix}…
                        </p>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-4)' }}>
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
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: 'var(--ink-4)' }}
                        aria-label="Revoke key"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-4)' }}
                      >
                        {revokingId === key.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
