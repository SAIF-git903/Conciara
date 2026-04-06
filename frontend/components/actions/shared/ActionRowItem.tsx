'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { ChatbotAction } from '@/components/actions/types'

interface ActionRowItemProps {
  action: ChatbotAction
  onEdit: (action: ChatbotAction) => void
  onDelete: (action: ChatbotAction) => void
  onToggle: (action: ChatbotAction, next: boolean) => void
}

export default function ActionRowItem({ action, onEdit, onDelete, onToggle }: ActionRowItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{action.name}</p>
        <p className="text-xs text-slate-500">{action.isEnabled ? 'Enabled' : 'Disabled'}</p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <Switch checked={action.isEnabled} onCheckedChange={(next) => onToggle(action, next)} />
        <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => onEdit(action)} aria-label="Edit action">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(action)} aria-label="Delete action">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
