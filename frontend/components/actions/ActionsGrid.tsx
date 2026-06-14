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
} from 'lucide-react'
import type { ActionTypeMeta, ActionsByType } from './types'
import ActionCard from './ActionCard'

const iconMap = {
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
    const Icon = iconMap[item.type as keyof typeof iconMap]
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {available.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {available.map(renderCard)}
        </div>
      )}

      {comingSoon.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
            }}>
              Coming soon
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {comingSoon.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  )
}
