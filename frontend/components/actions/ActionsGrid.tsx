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
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {actionMeta.map((item) => {
        const actions = actionsByType[item.type] ?? []
        const activeCount = actions.filter((action) => action.isEnabled).length
        const Icon = iconMap[item.type]
        return (
          <ActionCard
            key={item.type}
            title={item.title}
            description={item.description}
            Icon={Icon}
            comingSoon={item.comingSoon}
            activeCount={activeCount}
            totalCount={actions.length}
            onOpen={() => onOpenType(item.type)}
          />
        )
      })}
    </div>
  )
}
