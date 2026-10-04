'use client'

import { useCallback, useState, useEffect, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import api from '@/lib/api'
import { ArrowRight, Bot, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────
type Period = 'this' | 'last' | 'all'

interface DailyPoint { date: string; creditsUsed: number; messages: number }

interface UsageResponse {
  includedCredits: number
  bonusCredits: number
  usedCredits: number
  remaining: number
  periodStart: string
  periodEnd: string
  selectedStart: string
  selectedEnd: string
  perAgent: { agentId: number; agentName: string; messages: number; creditsUsed: number }[]
  dailyUsage: DailyPoint[]
}

// ── Small helpers ──────────────────────────────────────────────
function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString(undefined, opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
}

function exportCsv(data: UsageResponse, period: Period) {
  const rows: string[][] = []
  rows.push(['Date', 'Credits Used', 'Messages'])
  data.dailyUsage.forEach(d => rows.push([d.date, String(d.creditsUsed), String(d.messages)]))
  rows.push([])
  rows.push(['Agent', 'Messages', 'Credits Used'])
  data.perAgent.forEach(a => rows.push([a.agentName, String(a.messages), String(a.creditsUsed)]))
  rows.push([])
  rows.push(['Period', period === 'this' ? 'This period' : period === 'last' ? 'Last period' : 'All time'])
  rows.push(['Included Credits', String(data.includedCredits)])
  rows.push(['Bonus Credits', String(data.bonusCredits)])
  rows.push(['Used Credits', String(data.usedCredits)])
  rows.push(['Remaining', String(data.remaining)])

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `usage-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ eyebrow, big, small, bar, foot, children }: {
  eyebrow: string; big: ReactNode; small: string
  bar?: { pct: number; color?: string }; foot?: ReactNode; children?: ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
        {eyebrow}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>{big}</span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{small}</span>
      </div>
      {bar !== undefined && (
        <div style={{ height: 4, borderRadius: 4, background: 'var(--bg-2)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color ?? 'var(--ink)', borderRadius: 'inherit', transition: 'width .5s ease' }} />
        </div>
      )}
      {children}
      {foot !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap', gap: 4 }}>
          {foot}
        </div>
      )}
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const W = 200, H = 36
  if (data.length < 2) return <div style={{ height: H, marginBottom: 14 }} />
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginBottom: 14, display: 'block' }}>
      <polygon points={area} fill="var(--accent-soft)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Daily bar chart ────────────────────────────────────────────
function DailyBarChart({ points, label }: { points: DailyPoint[]; label: string }) {
  const values = points.map(p => p.creditsUsed)
  const max = Math.max(8, ...values)
  const W = 1000, H = 220, padL = 40, padR = 12, padT = 16, padB = 32
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = Math.max(4, innerW / Math.max(points.length, 1) - 3)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
            stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? '' : '2 3'} />
          <text x={padL - 6} y={padT + innerH * (1 - p) + 4} fontSize="9" textAnchor="end"
            fontFamily="var(--font-mono)" fill="var(--ink-4)">
            {Math.round(max * p)}
          </text>
        </g>
      ))}
      {points.map((pt, i) => {
        const x = padL + (i * innerW) / points.length + 2
        const barH = Math.max((pt.creditsUsed / max) * innerH, 2)
        const y = padT + innerH - barH
        return (
          <g key={pt.date}>
            <rect x={x} y={y} width={barW} height={barH} rx="2"
              fill={pt.creditsUsed > 0 ? 'var(--accent)' : 'var(--line-2)'} />
          </g>
        )
      })}
      {/* Date labels — show ~6 evenly spaced */}
      {points.filter((_, i) => points.length <= 7 || i % Math.max(1, Math.floor(points.length / 6)) === 0).map((pt, _, arr) => {
        const i = points.indexOf(pt)
        return (
          <text key={pt.date} x={padL + (i * innerW) / points.length + barW / 2}
            y={H - 8} fontSize="9" textAnchor="middle"
            fontFamily="var(--font-mono)" fill="var(--ink-4)">
            {new Date(pt.date + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        )
      })}
      {points.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--ink-4)" fontFamily="var(--font-mono)">
          No data for {label}
        </text>
      )}
    </svg>
  )
}

// ── Tab toggle ────────────────────────────────────────────────
function TabToggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: 2, background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)' }}>
      {options.map(opt => (
        <button key={opt} type="button"
          style={{
            height: 24, borderRadius: 'var(--r-sm)', padding: '0 10px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all .1s',
            color: value === opt ? 'var(--ink)' : 'var(--ink-3)',
            background: value === opt ? 'var(--surface)' : 'transparent',
            boxShadow: value === opt ? '0 1px 2px rgba(0,0,0,0.06)' : undefined,
          }}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function WorkspaceUsagePage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id

  const [period, setPeriod] = useState<Period>('this')
  const [chartTab, setChartTab] = useState('Credits')
  const [data, setData]     = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  const fetchUsage = useCallback(async (p: Period) => {
    if (!effectiveWorkspaceId) { setLoading(false); return }
    setLoading(true); setError(false)
    try {
      const { data: d } = await api.get<UsageResponse>(`/workspaces/${effectiveWorkspaceId}/usage?period=${p}`)
      setData(d)
    } catch {
      setError(true); setData(null)
    } finally { setLoading(false) }
  }, [effectiveWorkspaceId])

  useEffect(() => { fetchUsage(period) }, [fetchUsage, period])

  if (effectiveWorkspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Select a workspace to view usage.</p>
      </div>
    )
  }

  // ── Derived values ──────────────────────────────────────────
  const total = data ? data.includedCredits + data.bonusCredits : 0
  const usedPct = data ? Math.min(100, Math.round((data.usedCredits / (total || 1)) * 100)) : 0

  const periodEnd   = data ? new Date(data.periodEnd)   : null
  const periodStart = data ? new Date(data.periodStart) : null
  const selectedStart = data ? new Date(data.selectedStart) : null
  const selectedEnd   = data ? new Date(data.selectedEnd)   : null

  const totalDays  = (selectedStart && selectedEnd) ? Math.max(1, Math.round((selectedEnd.getTime() - selectedStart.getTime()) / 86400000)) : 30
  const now = new Date()
  const daysElapsed = selectedStart ? Math.max(1, Math.min(totalDays, Math.round((now.getTime() - selectedStart.getTime()) / 86400000))) : 1
  const avgPerDay  = data ? Math.round((data.usedCredits / daysElapsed) * 10) / 10 : 0
  const projected  = data ? Math.round(avgPerDay * totalDays) : 0
  const projectedPct = total > 0 ? Math.round((projected / total) * 100) : 0

  const periodEndFull  = periodEnd ? fmtDate(periodEnd.toISOString()) : '—'
  const periodEndShort = periodEnd ? fmtDate(periodEnd.toISOString(), { month: 'short', day: 'numeric' }) : '—'

  // Fill sparse dailyUsage into a dense array for the chart
  const chartPoints: DailyPoint[] = data?.dailyUsage ?? []
  const sparkValues = chartPoints.map(p => p.creditsUsed)

  const periodLabel = period === 'this' ? 'this billing period' : period === 'last' ? 'last billing period' : 'all time'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>

      {/* Page header */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--line)', background: 'var(--bg)', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', marginBottom: 4 }}>Workspace</span>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '0 0 4px' }}>Usage</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0, maxWidth: '60ch' }}>
              Message credits consumed {periodLabel}. Resets at the start of each billing period.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              style={{
                height: 32, padding: '0 10px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--line)', background: 'var(--surface)',
                fontSize: 12.5, color: 'var(--ink-2)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="this">This period</option>
              <option value="last">Last period</option>
              <option value="all">All time</option>
            </select>
            <button
              type="button"
              disabled={!data}
              onClick={() => data && exportCsv(data, period)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 32, padding: '0 12px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--line-2)', background: 'var(--surface)',
                fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)',
                cursor: data ? 'pointer' : 'not-allowed', opacity: data ? 1 : 0.5,
              }}
            >
              <Download style={{ width: 13, height: 13 }} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '64px 0', color: 'var(--ink-4)' }}>
              <Loader2 style={{ width: 20, height: 20 }} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : error ? (
            <p style={{ fontSize: 13, textAlign: 'center', padding: '64px 0', color: 'var(--ink-3)' }}>
              Failed to load usage data. Try refreshing.
            </p>
          ) : data ? (
            <>
              {/* ── 3 stat cards ── */}
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
                      <span style={{ color: 'var(--ink-4)' }}>Resets {periodEndFull}</span>
                    </>
                  }
                />

                <StatCard eyebrow="Avg. credits / day" big={avgPerDay % 1 === 0 ? String(Math.round(avgPerDay)) : avgPerDay.toFixed(1)} small="per day">
                  <Sparkline data={sparkValues.length ? sparkValues : Array(7).fill(0)} />
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {daysElapsed} day{daysElapsed !== 1 ? 's' : ''} elapsed · {avgPerDay === 0 ? 'no activity yet' : 'trending up'}
                  </div>
                </StatCard>

                <StatCard eyebrow="Projected" big={`~${projected.toLocaleString()}`} small={`/ ${total.toLocaleString()} by ${periodEndShort}`}>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', borderRadius: 999,
                      padding: '2px 8px', fontSize: 11, fontWeight: 500,
                      background: projectedPct >= 90 ? 'var(--danger-soft)' : projectedPct >= 70 ? 'var(--warn-soft)' : 'var(--success-soft)',
                      color: projectedPct >= 90 ? 'var(--danger)' : projectedPct >= 70 ? 'var(--warn)' : 'var(--success)',
                    }}>
                      {projectedPct}% utilization
                    </span>
                    <span style={{ marginLeft: 8, fontSize: 12.5, color: 'var(--ink-4)' }}>
                      {projectedPct < 50 ? 'Plenty of headroom' : projectedPct < 80 ? 'On track' : 'Getting close'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>At current rate · {totalDays} day period</div>
                </StatCard>
              </div>

              {/* ── Daily chart ── */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px' }}>Daily usage</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>
                      {chartPoints.length === 0
                        ? 'No activity recorded yet'
                        : `${chartPoints.reduce((s, p) => s + p.messages, 0).toLocaleString()} messages · ${chartPoints.reduce((s, p) => s + p.creditsUsed, 0).toLocaleString()} credits`}
                    </p>
                  </div>
                  <TabToggle options={['Credits', 'Messages']} value={chartTab} onChange={setChartTab} />
                </div>
                <div style={{ padding: '8px 12px 4px' }}>
                  <DailyBarChart
                    points={chartPoints.map(p => ({ ...p, creditsUsed: chartTab === 'Messages' ? p.messages : p.creditsUsed }))}
                    label={periodLabel}
                  />
                </div>
              </div>

              {/* ── By agent ── */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px' }}>By agent</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>
                      {data.perAgent.length === 0
                        ? `No agent activity ${periodLabel}`
                        : `${data.perAgent.length} agent${data.perAgent.length !== 1 ? 's' : ''} with activity`}
                    </p>
                  </div>
                  {data.perAgent.length > 0 && currentWorkspace && (
                    <Link
                      href={buildDashboardUrl(currentWorkspace.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: 'var(--r-md)',
                        border: '1px solid var(--line-2)', background: 'var(--surface)',
                        fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none',
                      }}
                    >
                      Open agents <ArrowRight style={{ width: 12, height: 12 }} />
                    </Link>
                  )}
                </div>

                {data.perAgent.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px', color: 'var(--ink-2)' }}>
                    <Bot style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--ink-3)' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, margin: '0 0 2px', fontSize: 13.5 }}>Nothing here yet</p>
                      <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>Per-agent usage will appear once your agents start receiving messages.</p>
                    </div>
                    {currentWorkspace && (
                      <Link
                        href={buildDashboardUrl(currentWorkspace.id)}
                        style={{
                          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 'var(--r-md)',
                          border: '1px solid var(--line-2)', background: 'var(--surface)',
                          fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none',
                        }}
                      >
                        Open agents <ArrowRight style={{ width: 12, height: 12 }} />
                      </Link>
                    )}
                  </div>
                ) : (
                  data.perAgent.map((a, i) => {
                    const agentPct = Math.min(100, Math.round((a.creditsUsed / (data.usedCredits || 1)) * 100))
                    const agentHref = currentWorkspace
                      ? buildDashboardUrl(currentWorkspace.id, { agentId: String(a.agentId) })
                      : '#'
                    return (
                      <div key={a.agentId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i > 0 ? '1px solid var(--line)' : undefined }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.agentName}
                          </p>
                          <div style={{ height: 4, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)' }}>
                            <div style={{ width: `${agentPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 'inherit', transition: 'width .5s' }} />
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px', fontFamily: 'var(--font-mono)' }}>
                            {a.creditsUsed.toLocaleString()}
                          </p>
                          <p style={{ fontSize: 11.5, color: 'var(--ink-4)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                            {a.messages.toLocaleString()} msg
                          </p>
                        </div>
                        <Link href={agentHref} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-3)' }}>
                          <ArrowRight style={{ width: 13, height: 13 }} />
                        </Link>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
