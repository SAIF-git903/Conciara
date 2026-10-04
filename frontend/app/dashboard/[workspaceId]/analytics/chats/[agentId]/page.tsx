'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { DateRangePicker } from 'react-date-range'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RefreshCw, MessageSquare, Calendar, ChevronDown, Loader2, BarChart2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

interface ChatAnalytics {
  totalMessages: number
  totalConversations: number
  trendPct: number
  chatsByDay: { date: string; dayLabel: string; chats: number }[]
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getDefaultCustomRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return { start: toDateString(start), end: toDateString(end) }
}

function formatRangeLabel(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}`
}

function formatChartLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatCard({
  eyebrow,
  big,
  bigColor,
  sub,
}: {
  eyebrow: string
  big: string | number
  bigColor?: string
  sub: string
}) {
  return (
    <div className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)', padding: 18 }}>
      <p style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 12,
      }}>
        {eyebrow}
      </p>
      <div style={{ marginBottom: 6 }}>
        <span style={{
          fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em',
          color: bigColor || 'var(--ink)', lineHeight: 1,
        }}>
          {big}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>{sub}</p>
    </div>
  )
}

export default function AnalyticsChatsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [customRange, setCustomRange] = useState(getDefaultCustomRange)
  const [pendingRange, setPendingRange] = useState(getDefaultCustomRange)
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const dateFilterRef = useRef<HTMLDivElement>(null)

  const rangeLabel = useMemo(
    () => formatRangeLabel(customRange.start, customRange.end),
    [customRange.start, customRange.end]
  )

  const selectionRange = useMemo(
    () => ({
      startDate: new Date(pendingRange.start),
      endDate: new Date(pendingRange.end),
      key: 'selection',
    }),
    [pendingRange.start, pendingRange.end]
  )

  const fetchAnalytics = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) {
      setAnalytics(null)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const { data } = await api.get<ChatAnalytics>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/analytics/chats`,
        { params: { start: customRange.start, end: customRange.end } }
      )
      setAnalytics(data)
    } catch (e: unknown) {
      setAnalytics(null)
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, customRange.start, customRange.end])

  useEffect(() => {
    setLoading(true)
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateFilterRef.current?.contains(e.target as Node)) return
      setDateFilterOpen(false)
    }
    if (dateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dateFilterOpen])

  const handleRangeSelect = (ranges: Record<string, { startDate: Date; endDate: Date }>) => {
    const sel = ranges.selection
    if (!sel?.startDate) return
    setPendingRange({
      start: toDateString(sel.startDate),
      end: sel.endDate ? toDateString(sel.endDate) : toDateString(sel.startDate),
    })
  }

  const handleApplyRange = () => {
    setCustomRange(pendingRange)
    setDateFilterOpen(false)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setLoading(true)
    fetchAnalytics()
  }

  const chartData = useMemo(
    () =>
      (analytics?.chatsByDay ?? []).map((d) => ({
        date: d.date,
        dayLabel: d.dayLabel,
        label: formatChartLabel(d.date),
        chats: d.chats,
      })),
    [analytics?.chatsByDay]
  )

  const total = analytics?.totalMessages ?? 0
  const convos = analytics?.totalConversations ?? 0
  const avgPerConvo = convos > 0 ? (total / convos).toFixed(1) : '0'
  const trendPct = analytics?.trendPct ?? 0
  const trendColor = trendPct >= 0 ? 'var(--success)' : 'var(--danger)'
  const trendPrefix = trendPct >= 0 ? '+' : ''

  if (!currentAgent) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 'var(--r-lg)',
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare style={{ width: 20, height: 20, color: 'var(--ink-4)' }} />
        </span>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>Select an agent to view chat analytics.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div
          className="mb-6 flex items-start justify-between gap-6 pb-6"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <h1
              className="text-[22px] font-semibold leading-tight tracking-[-0.015em]"
              style={{ color: 'var(--ink)', marginBottom: 4 }}
            >
              Chats
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              Volume and trends for {currentAgent.name}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Date range */}
            <div style={{ position: 'relative' }} ref={dateFilterRef}>
              <button
                type="button"
                onClick={() => { setPendingRange(customRange); setDateFilterOpen((v) => !v) }}
                style={{
                  height: 32, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '0 10px', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                  background: 'var(--surface)', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Calendar style={{ width: 12, height: 12, color: 'var(--ink-4)', flexShrink: 0 }} />
                <span>{rangeLabel}</span>
                <ChevronDown style={{
                  width: 11, height: 11, color: 'var(--ink-4)', flexShrink: 0,
                  transform: dateFilterOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s',
                }} />
              </button>

              {dateFilterOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 60,
                  background: 'var(--surface)', border: '1px solid var(--line-2)',
                  borderRadius: 'var(--r-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  overflow: 'hidden',
                }}>
                  <div className="analytics-date-range-picker" style={{ padding: '12px 12px 0' }}>
                    <DateRangePicker
                      ranges={[selectionRange]}
                      onChange={handleRangeSelect}
                      months={1}
                      direction="vertical"
                      rangeColors={['#5b6cff']}
                      showMonthAndYearPickers={false}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderTop: '1px solid var(--line)' }}>
                    <button type="button" onClick={handleApplyRange} className="btn btn--primary btn--sm">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              style={{
                height: 32, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0 12px', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                background: 'var(--surface)', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                cursor: isRefreshing || loading ? 'not-allowed' : 'pointer',
                opacity: isRefreshing || loading ? 0.6 : 1,
              }}
            >
              <RefreshCw
                style={{ width: 12, height: 12 }}
                className={isRefreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !analytics ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 }}>
            <Loader2 style={{ width: 20, height: 20, color: 'var(--ink-4)' }} className="animate-spin" />
            <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
              <StatCard
                eyebrow="Total messages"
                big={total}
                sub="In selected period"
              />
              <StatCard
                eyebrow="Conversations"
                big={convos}
                sub={`Avg ${avgPerConvo} messages each`}
              />
              <StatCard
                eyebrow="Trend"
                big={`${trendPrefix}${trendPct}%`}
                bigColor={trendColor}
                sub="vs. previous period"
              />
            </div>

            {/* Chart card */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Chats over time</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                    Daily conversations · {rangeLabel}
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px 20px 20px' }}>
                {chartData.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
                    <BarChart2 style={{ width: 24, height: 24, color: 'var(--ink-5)' }} />
                    <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>No data for this period</p>
                  </div>
                ) : (
                  <div style={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        key={`${customRange.start}-${customRange.end}`}
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="chatsAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5b6cff" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#5b6cff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 3" stroke="#ececea" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10.5, fill: '#a3a3ad', fontFamily: 'JetBrains Mono, monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#ececea' }}
                        />
                        <YAxis
                          dataKey="chats"
                          tick={{ fontSize: 10.5, fill: '#a3a3ad', fontFamily: 'JetBrains Mono, monospace' }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={28}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e3e2df',
                            background: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: 12,
                            color: '#1a1a1d',
                          }}
                          labelStyle={{ color: '#1a1a1d', fontWeight: 600 }}
                          labelFormatter={(label) => label}
                          cursor={{ stroke: '#cfcec9', strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="chats"
                          stroke="#5b6cff"
                          strokeWidth={1.8}
                          fill="url(#chatsAreaFill)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#ffffff', stroke: '#5b6cff', strokeWidth: 1.8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
