'use client'

import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ComingSoonCard from './shared/ComingSoonCard'

interface ActionCardProps {
  title: string
  description: string
  Icon: LucideIcon
  comingSoon: boolean
  activeCount: number
  totalCount: number
  onOpen: () => void
}

export default function ActionCard({
  title,
  description,
  Icon,
  comingSoon,
  activeCount,
  totalCount,
  onOpen,
}: ActionCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-slate-100 p-2">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {activeCount > 0 && (
          <Badge variant="default" className="gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </Badge>
        )}
      </div>

      {comingSoon ? (
        <ComingSoonCard />
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">
            {totalCount > 0 ? `${activeCount} active` : 'No actions yet'}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {totalCount > 0 ? 'Manage' : 'Add'}
          </button>
        </div>
      )}
    </div>
  )
}
