'use client'

import { Trash2 } from 'lucide-react'
import type { ActionKeyValuePair } from '@/components/actions/types'

interface KeyValueBuilderProps {
  label: string
  rows: ActionKeyValuePair[]
  mode?: 'simple' | 'body'
  inputFieldNames?: string[]
  onChange: (rows: ActionKeyValuePair[]) => void
}

export default function KeyValueBuilder({
  label,
  rows,
  mode = 'simple',
  inputFieldNames = [],
  onChange,
}: KeyValueBuilderProps) {
  const addRow = () => {
    onChange([
      ...rows,
      {
        key: '',
        value: '',
        ...(mode === 'body' ? { source: 'static' as const } : {}),
      },
    ])
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
          const missingInputWarning =
            mode === 'body' && row.source === 'user_input' && row.userInputField && !inputFieldNames.includes(row.userInputField)
          return (
            <div key={`${label}-${index}`} className="rounded-lg border border-slate-200 p-2">
              <div className={`grid gap-2 ${mode === 'body' ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                <input
                  type="text"
                  value={row.key}
                  onChange={(event) => onChange(rows.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  placeholder="Key"
                />
                {mode === 'body' ? (
                  <select
                    value={row.source ?? 'static'}
                    onChange={(event) =>
                      onChange(
                        rows.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                source: event.target.value as ActionKeyValuePair['source'],
                                value: '',
                                userInputField: '',
                                contextKey: '',
                              }
                            : item
                        )
                      )
                    }
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  >
                    <option value="static">Static</option>
                    <option value="user_input">From user input</option>
                    <option value="context">From context</option>
                  </select>
                ) : null}
                {mode === 'body' && row.source === 'user_input' ? (
                  <select
                    value={row.userInputField ?? ''}
                    onChange={(event) =>
                      onChange(rows.map((item, i) => (i === index ? { ...item, userInputField: event.target.value } : item)))
                    }
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  >
                    <option value="">Select input field</option>
                    {inputFieldNames.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                ) : mode === 'body' && row.source === 'context' ? (
                  <select
                    value={row.contextKey ?? ''}
                    onChange={(event) =>
                      onChange(rows.map((item, i) => (i === index ? { ...item, contextKey: event.target.value } : item)))
                    }
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                  >
                    <option value="">Select context field</option>
                    <option value="chatbot_name">chatbot name</option>
                    <option value="current_url">current URL</option>
                    <option value="session_id">session ID</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={row.value}
                    onChange={(event) => onChange(rows.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                    placeholder="Value"
                  />
                )}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {missingInputWarning ? (
                <p className="mt-1 text-xs text-amber-600">This row references an input field that does not exist anymore.</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
