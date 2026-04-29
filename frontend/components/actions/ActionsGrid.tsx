'use client'

import {
  Building2,
  CalendarDays,
  CreditCard,
  Headphones,
  MessageSquare,
  MousePointerClick,
  Search,
  ShoppingBag,
  UserPlus,
  Zap,
} from 'lucide-react'
import type { ActionTypeMeta, ActionsByType } from './types'
import ActionCard from './ActionCard'

const iconMap = {
  custom_action: Zap,
  custom_buttons: MousePointerClick,
  web_search: Search,
  collect_leads: UserPlus,
  escalate_human: Headphones,
  slack: MessageSquare,
  calendly: CalendarDays,
  stripe: CreditCard,
  shopify: ShoppingBag,
  salesforce: Building2,
} as const

interface ActionsGridProps {
  actionMeta: ActionTypeMeta[]
  actionsByType: ActionsByType
  onOpenType: (type: string) => void
}

export default function ActionsGrid({ actionMeta, actionsByType, onOpenType }: ActionsGridProps) {
  const available = actionMeta.filter((item) => !item.comingSoon)
  const comingSoon = actionMeta.filter((item) => item.comingSoon)

  const renderCard = (item: ActionTypeMeta) => {
    const actions = actionsByType[item.type] ?? []
    const activeCount = actions.filter((a) => a.isEnabled).length
    const Icon = iconMap[item.type]
    return (
      <ActionCard
        key={item.type}
        title={item.title}
        description={item.description}
        example={item.example}
        Icon={Icon}
        comingSoon={item.comingSoon}
        activeCount={activeCount}
        totalCount={actions.length}
        onOpen={() => onOpenType(item.type)}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {available.map(renderCard)}
      </div>

      {comingSoon.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Coming Soon</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {comingSoon.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  )
}
