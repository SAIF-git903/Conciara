'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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
import { BarChart3, RefreshCw, TrendingUp, MessageSquare, Calendar, ChevronDown } from 'lucide-react'

const CHART_COLOR = '#0f172a' // --v2-primary

// Mock analytics - replace with real API later
const MOCK_CHATS_BY_DAY = [12, 18, 15, 22, 19, 28, 24]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CHART_DATA = MOCK_CHATS_BY_DAY.map((chats, i) => ({
  day: DAY_LABELS[i],
  chats,
}))
const MOCK_TOTAL_MESSAGES = 842
const MOCK_TOTAL_CONVERSATIONS = 137
const MOCK_TREND_PCT = 14

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
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function AnalyticsChatsPage() {
  const [customRange, setCustomRange] = useState(getDefaultCustomRange)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const dateFilterRef = useRef<HTMLDivElement>(null)

  const rangeLabel = useMemo(
    () => formatRangeLabel(customRange.start, customRange.end),
    [customRange.start, customRange.end]
  )

  const selectionRange = useMemo(
    () => ({
      startDate: new Date(customRange.start),
      endDate: new Date(customRange.end),
      key: 'selection',
    }),
    [customRange.start, customRange.end]
  )

  const handleRangeSelect = (ranges: Record<string, { startDate: Date; endDate: Date }>) => {
    const sel = ranges.selection
    if (!sel?.startDate) return
    setCustomRange({
      start: toDateString(sel.startDate),
      end: sel.endDate ? toDateString(sel.endDate) : toDateString(sel.startDate),
    })
  }

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

  const handleRefresh = () => {
    setIsRefreshing(true)
    // TODO: replace with real API refetch
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Chats
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Chat volume and trends for this agent.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative" ref={dateFilterRef}>
            <button
              type="button"
              onClick={() => setDateFilterOpen((v) => !v)}
              className="flex min-w-[240px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              aria-expanded={dateFilterOpen}
              aria-haspopup="dialog"
            >
              <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="flex-1 truncate">
                {rangeLabel}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${dateFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {dateFilterOpen && (
              <div
                className="absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-lg"
                role="dialog"
                aria-label="Date range filter"
              >
                <div className="analytics-date-range-picker p-4 pb-0">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date range
                  </p>
                  <DateRangePicker
                    ranges={[selectionRange]}
                    onChange={handleRangeSelect}
                    months={2}
                    direction="horizontal"
                    rangeColors={['var(--v2-primary, #0f172a)']}
                    showMonthAndYearPickers={false}
                  />
                </div>
                <div className="flex justify-end border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={() => setDateFilterOpen(false)}
                    className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-[var(--v2-primary-foreground)] transition hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            aria-label="Refresh analytics"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Total Messages</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {MOCK_TOTAL_MESSAGES}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">In selected period</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Total Conversations</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {MOCK_TOTAL_CONVERSATIONS}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">In selected period</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Trends</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              +{MOCK_TREND_PCT}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">vs previous period</p>
          </div>
        </div>

        {/* Line chart - Recharts */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Chats over time
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily chat count: {rangeLabel}
          </p>
          <div className="mt-6 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={CHART_DATA}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                aria-label="Daily chats line chart"
              >
                <defs>
                  <linearGradient id="chatsAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  dataKey="chats"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value: number | undefined) => [`${value ?? 0} chats`, 'Chats']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke={CHART_COLOR}
                  strokeWidth={2}
                  fill="url(#chatsAreaFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
