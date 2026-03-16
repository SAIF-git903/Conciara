'use client'

import { ReactNode, forwardRef } from 'react'
import { usePermissions, type FeatureKey } from '@/hooks/usePermissions'
import { useUpgrade } from '@/contexts/UpgradeContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  feature: FeatureKey
  children: ReactNode
  showLockIcon?: boolean
  showCrownIcon?: boolean
  disabledClassName?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Permission-aware button. When user lacks permission: keeps same black-theme UI, disables the button,
 * and shows a Shadcn tooltip with message and "Upgrade your plan" link (per screenshot).
 */
const PermissionButton = forwardRef<HTMLButtonElement, PermissionButtonProps>(({
  feature,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  ...props
}, ref) => {
  const { checkFeature, getUpgradeContext } = usePermissions()
  const { showUpgrade } = useUpgrade()
  const permission = checkFeature(feature)
  const upgradeContext = getUpgradeContext(feature)
  const noPermission = !permission.allowed

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-6 py-3 text-base rounded-lg gap-2'
  }
  const variantStyles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 disabled:bg-slate-900 disabled:hover:bg-slate-900',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-600 disabled:hover:bg-gray-600',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-slate-700 disabled:bg-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-slate-700 disabled:text-gray-400 disabled:hover:bg-transparent'
  }

  const buttonClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (noPermission) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick?.(e)
  }

  const tooltipMessage = noPermission
    ? (permission.reason || "You have reached your plan's limit.")
    : undefined

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (permission.upgradeRequired && upgradeContext) showUpgrade(upgradeContext)
  }

  const buttonEl = (
    <button
      ref={ref}
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      disabled={noPermission || props.disabled}
      aria-disabled={noPermission}
      {...props}
    >
      {children}
    </button>
  )

  if (noPermission && tooltipMessage) {
    return (
      <TooltipProvider delayDuration={200} skipDelayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              {buttonEl}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-[280px]">
            <p className="text-white text-sm leading-relaxed">
              {tooltipMessage}
              {permission.upgradeRequired && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="underline font-medium text-white hover:text-slate-200 focus:outline-none focus:underline"
                  >
                    Upgrade your plan
                  </button>
                </>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttonEl
})

PermissionButton.displayName = 'PermissionButton'

export default PermissionButton
