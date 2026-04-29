'use client'

import type { LucideIcon } from 'lucide-react'
import ComingSoonCard from './shared/ComingSoonCard'

interface ActionCardProps {
  title: string
  description: string
  example?: string
  Icon: LucideIcon
  comingSoon: boolean
  activeCount: number
  totalCount: number
  onOpen: () => void
}

export default function ActionCard({
  title,
  description,
  example,
  Icon,
  comingSoon,
  activeCount,
  totalCount,
  onOpen,
}: ActionCardProps) {
  const isConfigured = totalCount > 0

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-slate-100 p-2">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          {example && !comingSoon && (
            <p className="mt-1 text-xs italic text-slate-400">{example}</p>
          )}
        </div>
      </div>

      {comingSoon ? (
        <ComingSoonCard />
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            {isConfigured ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-600">
                  {activeCount} of {totalCount} active
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-400">Not configured</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {isConfigured ? 'Manage' : 'Set up'}
          </button>
        </div>
      )}
    </div>
  )
}
