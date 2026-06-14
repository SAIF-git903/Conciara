'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import api from '@/lib/api'
import { Loader2, Bot, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type UsageResponse = {
  includedCredits: number
  bonusCredits: number
  usedCredits: number
  remaining: number
  periodStart: string
  periodEnd: string
  perAgent: { agentId: number; agentName: string; messages: number; creditsUsed: number }[]
}

function StatCard({
  eyebrow, big, small, bar, foot, children,
}: {
  eyebrow: string
  big: ReactNode
  small: string
  bar?: { pct: number; color?: string }
  foot?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)', padding: 18 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
        {eyebrow}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>{big}</span>
        <span style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>{small}</span>
      </div>
      {bar !== undefined && (
        <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color || 'var(--ink)', borderRadius: 'inherit', transition: 'width .5s ease' }} />
        </div>
      )}
      {children}
      {foot !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
          {foot}
        </div>
      )}
    </div>
  )
}

function UsageSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const W = 200, H = 36
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * W},${H - (v / max) * H}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginBottom: 14, display: 'block' }}>
      <polygon points={area} fill="var(--accent-soft)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

function DailyUsageChart({ days }: { days: number[] }) {
  const max = Math.max(8, ...days)
  const W = 1000, H = 220, padL = 36, padR = 12, padT = 16, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = innerW / days.length - 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line
            x1={padL} x2={W - padR}
            y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
            stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? '' : '2 3'}
          />
          <text x={padL - 8} y={padT + innerH * (1 - p) + 3} fontSize="9.5" textAnchor="end" fontFamily="var(--font-mono)" fill="var(--ink-4)">
            {Math.round(max * p)}
          </text>
        </g>
      ))}
      {days.map((v, i) => {
        const x = padL + (i * innerW) / days.length + 2
        const barH = Math.max((v / max) * innerH, 2)
        const y = padT + innerH - barH
        return <rect key={i} x={x} y={y} width={barW} height={barH} rx="2" fill={v > 0 ? 'var(--accent)' : 'var(--line-2)'} />
      })}
      {[0, 7, 14, 21, 29].map(i => (
        <text key={i} x={padL + (i * innerW) / days.length + barW / 2} y={H - 8} fontSize="9.5" textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--ink-4)">
          {i + 1}
        </text>
      ))}
    </svg>
  )
}

export default function WorkspaceUsagePage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id

  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveWorkspaceId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    api.get<UsageResponse>(`/workspaces/${effectiveWorkspaceId}/usage`)
      .then(({ data: d }) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [effectiveWorkspaceId])

  if (effectiveWorkspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Select a workspace to view usage.</p>
      </div>
    )
  }

  const total = data ? data.includedCredits + data.bonusCredits : 0
  const usedPct = data ? Math.min(100, Math.round((data.usedCredits / (total || 1)) * 100)) : 0

  const now = new Date()
  const periodEnd = data ? new Date(data.periodEnd) : null
  const periodStart = data ? new Date(data.periodStart) : null
  const totalDays = (periodStart && periodEnd)
    ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000))
    : 30
  const daysElapsed = periodStart
    ? Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / 86400000))
    : 1
  const avgPerDay = data ? Math.round((data.usedCredits / daysElapsed) * 10) / 10 : 0
  const projected = data ? Math.round(avgPerDay * totalDays) : 0
  const projectedPct = total > 0 ? Math.round((projected / total) * 100) : 0

  const dailyBars = Array.from({ length: 30 }, () => 0)

  const periodEndFull = periodEnd
    ? periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const periodEndShort = periodEnd
    ? periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div className="shrink-0 border-b px-8 py-5" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>Workspace</span>
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'var(--ink)', marginBottom: 4 }}>Usage</h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              Message credits used this billing period. Resets at the start of each period.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              className="h-8 rounded-lg border px-2.5 text-[12.5px] outline-none transition-colors"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}
              defaultValue="this"
            >
              <option value="this">This period</option>
              <option value="last">Last period</option>
              <option value="all">All time</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-2)]"
              style={{ borderColor: 'var(--line-2)', color: 'var(--ink-2)', background: 'var(--surface)' }}
            >
              <ExternalLink className="h-[13px] w-[13px]" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto w-full max-w-[1080px]" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--ink-4)' }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : data ? (
            <>
              {/* 3 stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <StatCard
                  eyebrow="Credits remaining"
                  big={data.remaining.toLocaleString()}
                  small={`of ${total.toLocaleString()}`}
                  bar={{ pct: usedPct, color: usedPct >= 90 ? 'var(--danger)' : usedPct >= 70 ? 'var(--warn)' : 'var(--ink)' }}
                  foot={
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink)', display: 'inline-block' }} />
                        {data.usedCredits.toLocaleString()} used
                        {data.bonusCredits > 0 && <span style={{ color: 'var(--ink-4)' }}> · {data.bonusCredits.toLocaleString()} bonus</span>}
                      </span>
                      <span style={{ color: 'var(--ink-4)' }}>Period ends {periodEndFull}</span>
                    </>
                  }
                />

                <StatCard
                  eyebrow="Avg. credits / day"
                  big={avgPerDay % 1 === 0 ? String(Math.round(avgPerDay)) : avgPerDay.toFixed(1)}
                  small="per day"
                >
                  <UsageSparkline data={Array.from({ length: 28 }, (_, i) => i < daysElapsed ? avgPerDay : 0)} />
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {totalDays} days · {avgPerDay === 0 ? 'trending flat' : 'trending up'}
                  </div>
                </StatCard>

                <StatCard
                  eyebrow="Projected"
                  big={`~${projected.toLocaleString()}`}
                  small={`/ ${total.toLocaleString()} by ${periodEndShort}`}
                >
                  <div style={{ marginBottom: 14 }}>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
                    >
                      {projectedPct}% utilization
                    </span>
                    <span style={{ marginLeft: 8, fontSize: '12.5px', color: 'var(--ink-4)' }}>
                      {projectedPct < 50 ? 'Plenty of headroom' : projectedPct < 80 ? 'On track' : 'Getting close'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>At current rate</div>
                </StatCard>
              </div>

              {/* Daily usage chart */}
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="flex items-center justify-between border-b px-[18px] py-[14px]" style={{ borderColor: 'var(--line)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Daily usage</p>
                    <p style={{ fontSize: '12.5px', color: 'var(--ink-4)', marginTop: 2 }}>Credits consumed per day across all agents</p>
                  </div>
                  <div
                    className="inline-flex items-center p-0.5"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)' }}
                  >
                    {['All agents', 'By agent', 'By type'].map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        className="h-6 rounded px-[10px] text-[12px] font-medium transition-colors"
                        style={{
                          color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
                          background: i === 0 ? 'var(--surface)' : 'transparent',
                          boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : undefined,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <DailyUsageChart days={dailyBars} />
              </div>

              {/* By agent */}
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="flex items-start justify-between border-b px-[18px] py-[14px]" style={{ borderColor: 'var(--line)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>By agent</p>
                    <p style={{ fontSize: '12.5px', color: 'var(--ink-4)', marginTop: 2 }}>
                      {data.perAgent.length === 0 ? 'No assistant messages this period' : `${data.perAgent.length} agent${data.perAgent.length !== 1 ? 's' : ''} with activity`}
                    </p>
                  </div>
                  {data.perAgent.length > 0 && (
                    <Link
                      href={buildDashboardUrl(currentWorkspace.id)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                      style={{ borderColor: 'var(--line-2)', color: 'var(--ink-2)', background: 'var(--surface)' }}
                    >
                      Open agents <ArrowRight className="h-[12px] w-[12px]" />
                    </Link>
                  )}
                </div>
                {data.perAgent.length === 0 ? (
                  <div className="flex items-center gap-3 px-[18px] py-[18px]" style={{ color: 'var(--ink-2)' }}>
                    <Bot className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-3)' }} />
                    <div>
                      <p style={{ fontWeight: 500, margin: 0, fontSize: 13.5 }}>Nothing here yet</p>
                      <p style={{ fontSize: '12.5px', color: 'var(--ink-4)', marginTop: 2 }}>Per-agent usage will appear once your agents start sending messages.</p>
                    </div>
                    <Link
                      href={buildDashboardUrl(currentWorkspace.id)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                      style={{ borderColor: 'var(--line-2)', color: 'var(--ink-2)', background: 'var(--surface)' }}
                    >
                      Open agents <ArrowRight className="h-[12px] w-[12px]" />
                    </Link>
                  </div>
                ) : (
                  data.perAgent.map((a, i) => {
                    const agentPct = Math.min(100, Math.round((a.creditsUsed / (data.usedCredits || 1)) * 100))
                    return (
                      <div
                        key={a.agentId}
                        className="flex items-center gap-4 px-[18px] py-3.5"
                        style={{ borderTop: i > 0 ? '1px solid var(--line)' : undefined }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>{a.agentName}</p>
                          <div style={{ marginTop: 6, height: 4, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)' }}>
                            <div style={{ width: `${agentPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 'inherit' }} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{a.creditsUsed.toLocaleString()}</p>
                          <p className="text-xs tabular-nums" style={{ color: 'var(--ink-4)' }}>{a.messages.toLocaleString()} msg</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-3)' }}>Failed to load usage data.</p>
          )}
        </div>
      </div>
    </div>
  )
}
