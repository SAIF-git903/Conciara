'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { ChatbotAction, CustomActionConfig, CustomButtonsConfig } from '@/components/actions/types'

interface ActionRowItemProps {
  action: ChatbotAction
  onEdit: (action: ChatbotAction) => void
  onDelete: (action: ChatbotAction) => void
  onToggle: (action: ChatbotAction, next: boolean) => void
}

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: 'var(--success-soft)', color: 'var(--success)' },
  POST:   { bg: 'var(--accent-soft)',  color: 'var(--accent)'  },
  PUT:    { bg: 'var(--warn-soft)',    color: 'var(--warn)'    },
  PATCH:  { bg: 'var(--warn-soft)',    color: 'var(--warn)'    },
  DELETE: { bg: 'var(--danger-soft)', color: 'var(--danger)'  },
}

function getSummary(action: ChatbotAction): { method?: string; url?: string; label?: string } {
  if (action.type === 'custom_action') {
    const cfg = action.config as CustomActionConfig
    if (cfg.executionMode === 'client_side') return { label: 'Client-side execution' }
    return { method: cfg.method ?? 'POST', url: cfg.apiUrl ?? '—' }
  }
  if (action.type === 'custom_buttons') {
    const cfg = action.config as CustomButtonsConfig
    const count = cfg.buttons?.length ?? 0
    return { label: `${count} button${count !== 1 ? 's' : ''}` }
  }
  return {}
}

export default function ActionRowItem({ action, onEdit, onDelete, onToggle }: ActionRowItemProps) {
  const summary = getSummary(action)
  const methodColors = summary.method ? (METHOD_COLORS[summary.method] ?? { bg: 'var(--bg-2)', color: 'var(--ink-3)' }) : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 'var(--r-md)',
      border: '1px solid var(--line)', background: 'var(--surface)',
    }}>
      {methodColors && summary.method && (
        <span style={{
          padding: '2px 6px', borderRadius: 'var(--r-sm)', flexShrink: 0,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono)', background: methodColors.bg, color: methodColors.color,
        }}>
          {summary.method}
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {action.name}
        </p>
        {(summary.url || summary.label) && (
          <p style={{
            fontSize: 11.5, color: 'var(--ink-3)', margin: '2px 0 0',
            fontFamily: summary.url ? 'var(--font-mono)' : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {summary.url ?? summary.label}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Switch checked={action.isEnabled} onCheckedChange={(next) => onToggle(action, next)} />
        <button
          type="button"
          aria-label="Edit action"
          onClick={() => onEdit(action)}
          style={{
            width: 28, height: 28, borderRadius: 'var(--r-sm)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)',
          }}
          className="hover:bg-[var(--bg-2)] hover:!text-[var(--ink)]"
        >
          <Pencil style={{ width: 13, height: 13 }} />
        </button>
        <button
          type="button"
          aria-label="Delete action"
          onClick={() => onDelete(action)}
          style={{
            width: 28, height: 28, borderRadius: 'var(--r-sm)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)',
          }}
          className="hover:bg-[var(--danger-soft)] hover:!text-[var(--danger)]"
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  )
}
