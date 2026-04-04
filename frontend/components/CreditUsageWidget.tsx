'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowUp, AlertCircle, TrendingUp, ExternalLink } from 'lucide-react'
import { useDashboardOptional } from '@/contexts/DashboardContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useUpgrade } from '@/contexts/UpgradeContext'
import api from '@/lib/api'

interface CreditUsage {
  monthlyAllowance: number
  monthlyUsed: number
  monthlyRemaining: number
  bonusCredits: number
  totalAvailable: number
  usagePercentage: number
  /** ISO date when the monthly allowance resets (from API). */
  resetDate: string | null
}

/** “Resets 1 May 2026, 5:00 AM” — sidebar-friendly. */
function formatCreditsResetLine(resetIso: string | null | undefined): string | null {
  if (!resetIso) return null
  const end = new Date(resetIso)
  if (Number.isNaN(end.getTime())) return null
  if (end.getTime() <= Date.now()) return 'Allowance refreshes soon'
  const formatted = end.toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Resets ${formatted}`
}

interface CreditUsageWidgetProps {
  /** Show detailed breakdown */
  detailed?: boolean
  /** Show Upgrade control (plan modal or link to pricing). */
  showUpgradeButton?: boolean
  /** Custom className */
  className?: string
}

function creditStatusBadge(
  totalAvailable: number,
  usagePercentage: number,
): { label: string; className: string } | null {
  if (totalAvailable <= 0) {
    return {
      label: 'Empty',
      className: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80',
    }
  }
  if (totalAvailable < 10) {
    return {
      label: 'Almost out',
      className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
    }
  }
  if (usagePercentage > 80) {
    return {
      label: 'Low',
      className: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
    }
  }
  return null
}

/** Pill CTA: orange → pink → purple gradient border, white fill (credits upgrade reference). */
const UPGRADE_GRADIENT_SHELL =
  'mt-4 w-full rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 p-px shadow-[0_2px_16px_-4px_rgba(236,72,153,0.4)]'

const UPGRADE_INNER =
  'flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

function UpgradePlanButtonContent() {
  return (
    <>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900"
        aria-hidden
      >
        <ArrowUp className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </span>
      Upgrade
      <ExternalLink className="h-4 w-4 shrink-0 text-slate-900" strokeWidth={2.25} aria-hidden />
    </>
  )
}

export default function CreditUsageWidget({
  detailed = false,
  showUpgradeButton = true,
  className = '',
}: CreditUsageWidgetProps) {
  const dashboard = useDashboardOptional()
  const currentWorkspace = dashboard?.currentWorkspace ?? null
  const socket = dashboard?.socket ?? null
  const { getCurrentPlan, getUpgradeContext } = usePermissions()
  const { showUpgrade } = useUpgrade()
  const [credits, setCredits] = useState<CreditUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const currentWorkspaceIdRef = useRef<number | null>(currentWorkspace?.id ?? null)
  currentWorkspaceIdRef.current = currentWorkspace?.id ?? null

  const fetchCredits = useCallback(async () => {
    const workspaceId = currentWorkspaceIdRef.current
    if (!workspaceId) {
      setCredits(null)
      setError(false)
      setLoading(false)
      return
    }
    setError(false)
    setLoading(true)
    try {
      const response = await api.get(`/workspaces/${workspaceId}/credits`)
      if (currentWorkspaceIdRef.current !== workspaceId) return
      const data = response.data as {
        monthlyAllowance: number
        monthlyUsed: number
        monthlyRemaining: number
        bonusCredits: number
        totalAvailable?: number
        resetDate?: string
      }
      setCredits({
        monthlyAllowance: data.monthlyAllowance,
        monthlyUsed: data.monthlyUsed,
        monthlyRemaining: data.monthlyRemaining,
        bonusCredits: data.bonusCredits,
        totalAvailable: data.totalAvailable ?? data.monthlyRemaining + data.bonusCredits,
        usagePercentage: data.monthlyAllowance ? (data.monthlyUsed / data.monthlyAllowance) * 100 : 0,
        resetDate: data.resetDate ?? null,
      })
    } catch (err) {
      if (currentWorkspaceIdRef.current !== workspaceId) return
      console.error('Failed to fetch credits:', err)
      setError(true)
    } finally {
      if (currentWorkspaceIdRef.current !== workspaceId) return
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!currentWorkspace?.id) return
    fetchCredits()
  }, [currentWorkspace?.id, fetchCredits])

  // Refetch credits when subscription updates (e.g. after plan change)
  useEffect(() => {
    if (typeof window === 'undefined' || !currentWorkspace?.id) return
    const onSubscriptionUpdated = (e: Event) => {
      const { workspaceId } = (e as CustomEvent).detail ?? {}
      if (workspaceId === currentWorkspace.id) fetchCredits()
    }
    window.addEventListener('subscription-updated', onSubscriptionUpdated)
    return () => window.removeEventListener('subscription-updated', onSubscriptionUpdated)
  }, [currentWorkspace?.id, fetchCredits])

  // Real-time: update credits when server emits after deduct (e.g. chat message)
  useEffect(() => {
    if (!socket || !currentWorkspace?.id) return
    const onCreditsUpdated = (payload: {
      workspaceId: number
      monthlyAllowance: number
      monthlyUsed: number
      monthlyRemaining: number
      bonusCredits: number
      totalAvailable: number
      resetDate?: string
    }) => {
      if (payload.workspaceId !== currentWorkspace.id) return
      setCredits((prev) => ({
        monthlyAllowance: payload.monthlyAllowance,
        monthlyUsed: payload.monthlyUsed,
        monthlyRemaining: payload.monthlyRemaining,
        bonusCredits: payload.bonusCredits,
        totalAvailable: payload.totalAvailable,
        usagePercentage: payload.monthlyAllowance ? (payload.monthlyUsed / payload.monthlyAllowance) * 100 : 0,
        resetDate: payload.resetDate ?? prev?.resetDate ?? null,
      }))
    }
    socket.on('credits-updated', onCreditsUpdated)
    return () => {
      socket.off('credits-updated', onCreditsUpdated)
    }
  }, [socket, currentWorkspace?.id])

  if (!currentWorkspace?.id) return null

  const cardBase =
    `rounded-xl border border-slate-200/50 bg-white/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm ${className}`.trim()

  if (loading) {
    return (
      <div className={`animate-pulse ${cardBase}`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="h-2.5 w-14 rounded bg-slate-200" />
            <div className="flex items-baseline gap-1">
              <div className="h-8 w-12 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-6 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-slate-200" />
          <div className="h-3 w-40 rounded bg-slate-100" />
        </div>
        <div className="mt-4 h-11 w-full rounded-xl bg-slate-200" />
      </div>
    )
  }

  if (error || !credits) {
    return (
      <div className={cardBase}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Credits</p>
        <p className="mt-2 text-sm text-slate-500">{error ? 'Unable to load usage.' : '—'}</p>
        {showUpgradeButton && (
          <div className={UPGRADE_GRADIENT_SHELL}>
            <Link href="/pricing" className={UPGRADE_INNER}>
              <UpgradePlanButtonContent />
            </Link>
          </div>
        )}
      </div>
    )
  }

  const isLow = credits.usagePercentage > 80
  const isCritical = credits.totalAvailable < 10
  const currentPlan = getCurrentPlan()

  const handleUpgrade = () => {
    const upgradeContext = getUpgradeContext('createAgent')
    if (upgradeContext) {
      showUpgrade({
        ...upgradeContext,
        feature: 'More credits',
        reason:
          isLow || isCritical
            ? "You're running low on monthly credits."
            : 'Get a higher monthly allowance and more features.',
      })
    }
  }

  const resetLabel = formatCreditsResetLine(credits.resetDate)
  const upgradeContextAvailable = Boolean(getUpgradeContext('createAgent'))
  const badge = creditStatusBadge(credits.totalAvailable, credits.usagePercentage)

  const barTone =
    credits.totalAvailable <= 0 ? 'bg-red-500' : isCritical ? 'bg-amber-500' : isLow ? 'bg-amber-400' : 'bg-slate-700'

  return (
    <div className={cardBase}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Credits</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 tabular-nums">
            <span className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-900">
              {credits.monthlyUsed.toLocaleString()}
            </span>
            <span className="text-base font-medium text-slate-500">
              / {credits.monthlyAllowance.toLocaleString()}
            </span>
          </div>
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full max-w-full rounded-full transition-[width] duration-300 ease-out ${barTone}`}
          style={{ width: `${Math.min(credits.usagePercentage, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(Math.min(credits.usagePercentage, 100))}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {(credits.bonusCredits > 0 || credits.totalAvailable !== credits.monthlyRemaining) && (
        <p className="mt-2 text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">{credits.totalAvailable.toLocaleString()}</span>
          {' available'}
          {credits.bonusCredits > 0 && (
            <span className="text-emerald-700"> (+{credits.bonusCredits.toLocaleString()} bonus)</span>
          )}
        </p>
      )}

      {resetLabel && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
          {resetLabel}
        </p>
      )}

      {showUpgradeButton &&
        (upgradeContextAvailable ? (
          <div className={UPGRADE_GRADIENT_SHELL}>
            <button type="button" onClick={handleUpgrade} className={UPGRADE_INNER}>
              <UpgradePlanButtonContent />
            </button>
          </div>
        ) : (
          <div className={UPGRADE_GRADIENT_SHELL}>
            <Link href="/pricing" className={UPGRADE_INNER}>
              <UpgradePlanButtonContent />
            </Link>
          </div>
        ))}

      {/* Detailed breakdown */}
      {detailed && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Monthly allowance:</span>
              <span className="tabular-nums text-slate-900">{credits.monthlyAllowance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Used this month:</span>
              <span className="tabular-nums text-slate-900">{credits.monthlyUsed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly remaining:</span>
              <span className="tabular-nums text-slate-900">{credits.monthlyRemaining.toLocaleString()}</span>
            </div>
            {credits.bonusCredits > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Bonus credits:</span>
                <span className="tabular-nums">{credits.bonusCredits.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-medium text-slate-900">
              <span>Total available:</span>
              <span className="tabular-nums">{credits.totalAvailable.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp className="h-3 w-3" aria-hidden />
            <span>Current plan: {currentPlan.displayName}</span>
          </div>
        </div>
      )}
    </div>
  )
}
