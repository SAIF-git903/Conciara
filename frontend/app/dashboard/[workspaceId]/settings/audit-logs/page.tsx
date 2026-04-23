'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'

type AuditItem = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata?: Record<string, unknown> | null
  outcome: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  actor?: {
    id: number
    email: string
    fullName: string | null
  } | null
}

export default function WorkspaceAuditLogsPage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? Number.parseInt(params.workspaceId, 10) : null
  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const fetchLogs = async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ items: AuditItem[] }>(`/workspaces/${workspaceId}/audit-logs`, {
        params: { limit: 100, offset: 0, action: actionFilter || undefined },
      })
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setError(msg || 'Failed to fetch audit logs')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [workspaceId, actionFilter])

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-slate-500">
        Invalid workspace.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit logs</h1>
        <p className="mt-1 text-sm text-slate-500">Track who changed what and when inside this workspace.</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Filter by action</label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. workspace.member.invited"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading audit logs...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">No audit events found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />
                        <p className="truncate text-sm font-medium text-slate-900">{item.action}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.outcome === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.outcome}
                        </span>
                      </div>
                      <p className="shrink-0 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Actor: {item.actor?.fullName || item.actor?.email || 'System'} • Entity: {item.entityType}
                      {item.entityId ? ` (${item.entityId})` : ''}
                    </p>
                    {item.ipAddress && <p className="mt-1 text-xs text-slate-400">IP: {item.ipAddress}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

