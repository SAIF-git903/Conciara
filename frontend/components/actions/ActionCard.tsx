'use client'

import type { LucideIcon } from 'lucide-react'
import ComingSoonCard from './shared/ComingSoonCard'

interface ActionCardProps {
  title: string
  description: string
  example?: string
  Icon?: LucideIcon
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
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)',
      padding: 16,
    }}>
      <div className="flex items-start gap-3">
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--r-sm)',
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px' }}>{title}</p>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>{description}</p>
          {example && !comingSoon && (
            <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '4px 0 0', fontStyle: 'italic' }}>{example}</p>
          )}
        </div>
      </div>

      {comingSoon ? (
        <ComingSoonCard />
      ) : (
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--line)', background: 'var(--bg)',
        }}>
          <div className="flex items-center gap-1.5">
            {isConfigured ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, display: 'block' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {activeCount} of {totalCount} active
                </span>
              </>
            ) : (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-5)', flexShrink: 0, display: 'block' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Not configured</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="btn btn--secondary btn--sm"
          >
            {isConfigured ? 'Manage' : 'Set up'}
          </button>
        </div>
      )}
    </div>
  )
}
