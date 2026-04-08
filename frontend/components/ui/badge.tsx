'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline'

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-emerald-100 text-emerald-800',
        variant === 'secondary' && 'bg-slate-100 text-slate-600',
        variant === 'outline' && 'border border-slate-200 text-slate-600',
        className
      )}
    >
      {children}
    </span>
  )
}
