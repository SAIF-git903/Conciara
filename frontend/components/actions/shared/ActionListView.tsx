'use client'

import { Plus } from 'lucide-react'
import type { ChatbotAction } from '@/components/actions/types'
import ActionRowItem from './ActionRowItem'

interface ActionListViewProps {
  actions: ChatbotAction[]
  onAddNew: () => void
  onEdit: (action: ChatbotAction) => void
  onDelete: (action: ChatbotAction) => void
  onToggle: (action: ChatbotAction, next: boolean) => void
}

export default function ActionListView({ actions, onAddNew, onEdit, onDelete, onToggle }: ActionListViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Manage actions</h3>
          <p className="text-sm text-slate-500">Enable, edit, or remove configured actions.</p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-5">
        {actions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No actions yet. Add your first action.
          </div>
        ) : (
          actions.map((action) => (
            <ActionRowItem key={action.id} action={action} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
          ))
        )}
      </div>
    </div>
  )
}
