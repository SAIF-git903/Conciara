'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronRight, Loader2 } from 'lucide-react'
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
  actor?: { id: number; email: string; fullName: string | null } | null
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

export default function WorkspaceActivityPage() {
  const params = useParams()
  const workspaceId =
    typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null

  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    api
      .get<{ items: AuditItem[] }>(`/workspaces/${workspaceId}/audit-logs`, {
        params: { limit: 50, offset: 0 },
      })
      .then(({ data }) => { if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []) })
      .catch(() => { if (!cancelled) setError('Failed to load activity.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [workspaceId])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* page-header */}
        <div
          className="mb-5 flex items-start justify-between gap-6 pb-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <h1
              className="text-[22px] font-semibold leading-tight tracking-[-0.015em]"
              style={{ color: 'var(--ink)', marginBottom: 4 }}
            >
              Activity
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              Recent changes across this workspace.
            </p>
          </div>
        </div>

        {/* card */}
        <div
          className="overflow-hidden rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          {error && (
            <div className="px-5 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14" style={{ color: 'var(--ink-4)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : items.length === 0 && !error ? (
            <div className="py-14 text-center text-[13px]" style={{ color: 'var(--ink-4)' }}>
              No activity yet.
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
                      gridTemplateColumns: '160px 1fr 28px',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 18px',
                      fontSize: 13,
                      borderBottom: i < items.length - 1 ? '1px solid var(--line)' : undefined,
                    }}
                  >
                    {/* Time */}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {formatRelTime(item.createdAt)}
                    </div>

                    {/* Body */}
                    <div>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{who}</span>
                      <span style={{ color: 'var(--ink-3)' }}> {action} </span>
                      <span
                        style={{
                          color: 'var(--ink)',
                          borderBottom: '1px solid var(--line-2)',
                          paddingBottom: 1,
                        }}
                      >
                        {target}
                      </span>
                      {item.outcome !== 'success' && (
                        <span
                          className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                        >
                          {item.outcome}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
                      style={{ color: 'var(--ink-4)' }}
                      aria-label="Details"
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
