'use client'

import { GripVertical, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CustomButtonsButton } from '@/components/actions/types'

interface ButtonItemProps {
  button: CustomButtonsButton
  index: number
  canDelete: boolean
  urlError?: string
  listeners?: any
  attributes?: any
  className?: string
  onChange: (next: CustomButtonsButton) => void
  onDelete: () => void
}

export default function ButtonItem({
  button,
  index,
  canDelete,
  urlError,
  listeners,
  attributes,
  className,
  onChange,
  onDelete,
}: ButtonItemProps) {
  const remaining = Math.max(0, 30 - button.label.length)
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">Button {index + 1}</div>
        <button
          type="button"
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Reorder button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">Label</label>
          <input
            type="text"
            maxLength={30}
            value={button.label}
            onChange={(event) => onChange({ ...button, label: event.target.value.slice(0, 30) })}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">{remaining} characters left</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">URL</label>
          <input
            type="url"
            value={button.url}
            onChange={(event) => onChange({ ...button, url: event.target.value })}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
            placeholder="https://example.com"
          />
          {urlError ? <p className="mt-1 text-xs text-red-600">{urlError}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          Open in new tab
          <Switch checked={button.openInNewTab} onCheckedChange={(next) => onChange({ ...button, openInNewTab: next })} />
        </label>
        {canDelete ? (
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  )
}
