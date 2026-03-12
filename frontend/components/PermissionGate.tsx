'use client'

import { ReactNode } from 'react'
import { usePermissions, type FeatureKey } from '@/hooks/usePermissions'
import { useUpgrade } from '@/contexts/UpgradeContext'

interface PermissionGateProps {
  feature: FeatureKey
  children: ReactNode
  /** Custom fallback when permission is denied */
  fallback?: ReactNode
  /** Show upgrade button instead of hiding content */
  showUpgradeButton?: boolean
  /** Custom upgrade button text */
  upgradeButtonText?: string
  /** Custom upgrade button className */
  upgradeButtonClassName?: string
}

/**
 * Permission gate component that conditionally renders children based on feature permissions.
 * Automatically handles upgrade prompts and fallback UI.
 * Uses useDashboardOptional via usePermissions so it can render outside DashboardProvider without throwing.
 */
export default function PermissionGate({
  feature,
  children,
  fallback,
  showUpgradeButton = false,
  upgradeButtonText = 'Upgrade Plan',
  upgradeButtonClassName = 'px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium'
}: PermissionGateProps) {
  // Call hooks at top level only (Rules of Hooks)
  const { checkFeature, getUpgradeContext } = usePermissions()
  const { showUpgrade } = useUpgrade()
  const permission = checkFeature(feature)
  const upgradeContext = getUpgradeContext(feature)

  // If permission is granted, render children
  if (permission.allowed) {
    return <>{children}</>
  }

  // If no upgrade is required (e.g., role restriction), show fallback or nothing
  if (!permission.upgradeRequired) {
    return <>{fallback || null}</>
  }

  // If showUpgradeButton is true, show upgrade button
  if (showUpgradeButton && upgradeContext) {
    return (
      <button
        onClick={() => showUpgrade(upgradeContext)}
        className={upgradeButtonClassName}
        type="button"
      >
        {upgradeButtonText}
      </button>
    )
  }

  // Default: show fallback or nothing
  return <>{fallback || null}</>
}