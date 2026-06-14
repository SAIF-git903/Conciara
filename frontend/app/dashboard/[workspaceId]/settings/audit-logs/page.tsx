'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Shield, ChevronRight } from 'lucide-react'
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

function formatRelTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1)
    return `Yesterday, ${new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  if (days < 30)
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function humanizeAction(item: AuditItem): { who: string; action: string; target: string } {
  const who = item.actor?.fullName || item.actor?.email || 'System'
  const raw = item.action ?? ''
  const parts = raw.split('.')
  const noun = parts[1] ?? parts[0] ?? ''
  const verb = parts[2] ?? ''

  const nounMap: Record<string, string> = {
    agent: 'agent', member: 'member', workspace: 'workspace',
    'api-key': 'API key', apikey: 'API key', invoice: 'invoice',
    credits: 'credits', subscription: 'subscription',
  }
  const verbMap: Record<string, string> = {
    created: 'created', updated: 'updated', deleted: 'deleted',
    invited: 'invited', removed: 'removed', applied: 'applied',
    reset: 'reset', activated: 'activated', cancelled: 'cancelled', trained: 'trained',
  }

  const humanNoun = nounMap[noun] ?? noun.replace(/-/g, ' ')
  const humanVerb = (verbMap[verb] ?? verb.replace(/-/g, ' ')) || 'performed action on'

  const meta = item.metadata ?? {}
  const target =
    (meta.name as string) ||
    (meta.email as string) ||
    (meta.agentName as string) ||
    (meta.keyName as string) ||
    (item.entityId ? `${humanNoun} #${item.entityId}` : humanNoun)

  return { who, action: `${humanVerb} ${humanNoun}`, target }
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs() }, [workspaceId, actionFilter])

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm" style={{ color: 'var(--ink-4)' }}>
        Invalid workspace.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div
          className="mb-5 flex items-start justify-between gap-6 pb-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>Settings</span>
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'var(--ink)', marginBottom: 4 }}>
              Audit logs
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              Tamper-evident record of who did what and when.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(195,54,101,0.18)' }}>
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-4 overflow-hidden rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--line)' }}>
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>
              Filter by action
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. workspace.member.invited"
              className="mt-2 w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* Logs table */}
        <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          {/* Head row */}
          <div
            className="grid px-[18px] py-[10px]"
            style={{
              gridTemplateColumns: '160px 1fr 1fr 80px 28px',
              gap: 16,
              background: 'var(--surface-2)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Outcome</span>
            <span />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14" style={{ color: 'var(--ink-4)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Shield className="h-8 w-8" style={{ color: 'var(--ink-5)' }} />
              <p className="text-[13px]" style={{ color: 'var(--ink-4)' }}>
                {actionFilter ? 'No events match your filter.' : 'No audit events yet.'}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((item, i) => {
                const { who, action, target } = humanizeAction(item)
                return (
                  <li
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 1fr 80px 28px',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 18px',
                      fontSize: 13,
                      borderTop: i === 0 ? '1px solid var(--line)' : undefined,
                      borderBottom: i < items.length - 1 ? '1px solid var(--line)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                      {formatRelTime(item.createdAt)}
                    </div>
                    <div style={{ color: 'var(--ink-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {who}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ color: 'var(--ink-3)' }}>{action} </span>
                      <span style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-2)', paddingBottom: 1 }}>{target}</span>
                    </div>
                    <div>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={
                          item.outcome === 'success'
                            ? { background: 'var(--success-soft)', color: 'var(--success)' }
                            : { background: 'var(--danger-soft)', color: 'var(--danger)' }
                        }
                      >
                        {item.outcome}
                      </span>
                    </div>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
                      style={{ color: 'var(--ink-4)' }}
                      title={item.ipAddress ? `IP: ${item.ipAddress}` : undefined}
                    >
                      <ChevronRight className="h-[14px] w-[14px]" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

