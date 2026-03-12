'use client'

import { useState, useEffect } from 'react'
import { Zap, AlertTriangle, TrendingUp } from 'lucide-react'
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
}

interface CreditUsageWidgetProps {
  /** Show detailed breakdown */
  detailed?: boolean
  /** Show upgrade button when low */
  showUpgradeButton?: boolean
  /** Custom className */
  className?: string
}

export default function CreditUsageWidget({ 
  detailed = false, 
  showUpgradeButton = true,
  className = ''
}: CreditUsageWidgetProps) {
  // Use optional context so we never throw when outside DashboardProvider
  const dashboard = useDashboardOptional()
  const currentWorkspace = dashboard?.currentWorkspace ?? null
  if (!currentWorkspace?.id) return null
  
  const { getCurrentPlan, getUpgradeContext } = usePermissions()
  const { showUpgrade } = useUpgrade()
  const [credits, setCredits] = useState<CreditUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!currentWorkspace?.id) return

    setError(false)
    setLoading(true)
    const fetchCredits = async () => {
      try {
        const response = await api.get(`/workspaces/${currentWorkspace.id}/credits`)
        const data = response.data

        setCredits({
          monthlyAllowance: data.monthlyAllowance,
          monthlyUsed: data.monthlyUsed,
          monthlyRemaining: data.monthlyRemaining,
          bonusCredits: data.bonusCredits,
          totalAvailable: data.monthlyRemaining + data.bonusCredits,
          usagePercentage: data.monthlyAllowance ? (data.monthlyUsed / data.monthlyAllowance) * 100 : 0
        })
      } catch (err) {
        console.error('Failed to fetch credits:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [currentWorkspace?.id])

  if (loading) {
    return (
      <div className={`animate-pulse rounded-lg p-3 ${className}`}>
        <div className="h-4 bg-slate-200 rounded mb-2" />
        <div className="h-2 bg-slate-200 rounded" />
      </div>
    )
  }

  if (error || !credits) {
    return (
      <div className={`rounded-lg p-3 ${className}`}>
        <p className="text-xs font-medium text-slate-500">Credits</p>
        <p className="mt-0.5 text-xs text-slate-400">{error ? 'Unable to load' : '—'}</p>
        <a
          href="/pricing"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <span>↑</span> Upgrade
        </a>
      </div>
    )
  }

  const isLow = credits.usagePercentage > 80
  const isCritical = credits.totalAvailable < 10
  const currentPlan = getCurrentPlan()

  const handleUpgrade = () => {
    const upgradeContext = getUpgradeContext('createAgent') // Use a generic feature for credit upgrades
    if (upgradeContext) {
      showUpgrade({
        ...upgradeContext,
        feature: 'More Credits',
        reason: 'You\'re running low on monthly credits'
      })
    }
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isCritical ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-600'}`} />
          <span className="text-sm font-medium text-slate-700">Credits</span>
        </div>
        {(isLow || isCritical) && (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>{credits.monthlyUsed.toLocaleString()} used</span>
          <span>{credits.monthlyAllowance.toLocaleString()} monthly</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-slate-600'
            }`}
            style={{ width: `${Math.min(credits.usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-600">
          <span className="font-medium">{credits.totalAvailable.toLocaleString()}</span> remaining
          {credits.bonusCredits > 0 && (
            <span className="text-green-600 ml-1">
              (+{credits.bonusCredits.toLocaleString()} bonus)
            </span>
          )}
        </div>
        
        {showUpgradeButton && (isLow || isCritical) && (
          <button
            onClick={handleUpgrade}
            className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Detailed breakdown */}
      {detailed && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Monthly allowance:</span>
              <span>{credits.monthlyAllowance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Used this month:</span>
              <span>{credits.monthlyUsed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly remaining:</span>
              <span>{credits.monthlyRemaining.toLocaleString()}</span>
            </div>
            {credits.bonusCredits > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Bonus credits:</span>
                <span>{credits.bonusCredits.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1 border-t border-slate-100">
              <span>Total available:</span>
              <span>{credits.totalAvailable.toLocaleString()}</span>
            </div>
          </div>

          {/* Usage trend */}
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <TrendingUp className="w-3 h-3" />
            <span>Current plan: {currentPlan.displayName}</span>
          </div>
        </div>
      )}

      {/* Warning messages */}
      {isCritical && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Critical:</strong> You have less than 10 credits remaining. Upgrade to continue using the service.
        </div>
      )}
      {isLow && !isCritical && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <strong>Low credits:</strong> You've used {Math.round(credits.usagePercentage)}% of your monthly allowance.
        </div>
      )}
    </div>
  )
}