'use client'

import { Trash2 } from 'lucide-react'
import type { ActionKeyValuePair } from '@/components/actions/types'

interface KeyValueBuilderProps {
  label: string
  rows: ActionKeyValuePair[]
  inputFieldNames?: string[]
  onChange: (rows: ActionKeyValuePair[]) => void
}

const CONTEXT_KEYS = [
  { value: 'chatbot_name', label: 'Chatbot name' },
  { value: 'current_url', label: 'Current page URL' },
  { value: 'session_id', label: 'Session ID' },
]

export default function KeyValueBuilder({ label, rows, inputFieldNames = [], onChange }: KeyValueBuilderProps) {
  const addRow = () => {
    onChange([...rows, { key: '', value: '', source: 'static' }])
  }

  const updateRow = (index: number, patch: Partial<ActionKeyValuePair>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const resetRowSource = (index: number, source: ActionKeyValuePair['source']) => {
    onChange(
      rows.map((row, i) =>
        i === index ? { key: row.key, value: '', source, userInputField: '', contextKey: '' } : row
      )
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => {
          const source = row.source ?? 'static'
          const missingInputWarning =
            source === 'user_input' && row.userInputField && !inputFieldNames.includes(row.userInputField)

          return (
            <div key={`${label}-${index}`} className="rounded-lg border border-slate-200 p-2">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateRow(index, { key: e.target.value })}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  placeholder="Key"
                />

                <select
                  value={source}
                  onChange={(e) => resetRowSource(index, e.target.value as ActionKeyValuePair['source'])}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                >
                  <option value="static">Static value</option>
                  <option value="user_input" disabled={inputFieldNames.length === 0}>
                    From user input{inputFieldNames.length === 0 ? ' (no fields defined)' : ''}
                  </option>
                  <option value="context">From context</option>
                </select>

                {source === 'user_input' ? (
                  <select
                    value={row.userInputField ?? ''}
                    onChange={(e) => updateRow(index, { userInputField: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  >
                    <option value="">Select input field</option>
                    {inputFieldNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : source === 'context' ? (
                  <select
                    value={row.contextKey ?? ''}
                    onChange={(e) => updateRow(index, { contextKey: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  >
                    <option value="">Select context value</option>
                    {CONTEXT_KEYS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                    placeholder="Value"
                  />
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {missingInputWarning && (
                <p className="mt-1 text-xs text-amber-600">
                  This references an input field that no longer exists.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
