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

function getSummary(action: ChatbotAction): string {
  if (action.type === 'custom_action') {
    const cfg = action.config as CustomActionConfig
    if (cfg.executionMode === 'client_side') return 'Client-side execution'
    if (cfg.apiUrl) return `${cfg.method ?? 'POST'} ${cfg.apiUrl}`
    return 'API not configured'
  }
  if (action.type === 'custom_buttons') {
    const cfg = action.config as CustomButtonsConfig
    const count = cfg.buttons?.length ?? 0
    return `${count} button${count !== 1 ? 's' : ''}`
  }
  return ''
}

export default function ActionRowItem({ action, onEdit, onDelete, onToggle }: ActionRowItemProps) {
  const summary = getSummary(action)

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{action.name}</p>
        {summary && <p className="truncate text-xs text-slate-400">{summary}</p>}
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <Switch checked={action.isEnabled} onCheckedChange={(next) => onToggle(action, next)} />
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => onEdit(action)}
          aria-label="Edit action"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => onDelete(action)}
          aria-label="Delete action"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
