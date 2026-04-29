'use client'

import { Trash2 } from 'lucide-react'
import type { ActionInputField } from '@/components/actions/types'
import { Switch } from '@/components/ui/switch'

interface InputFieldBuilderProps {
  fields: ActionInputField[]
  onChange: (fields: ActionInputField[]) => void
}

const TYPE_LABELS: Record<ActionInputField['type'], string> = {
  string: 'Text',
  number: 'Number',
  boolean: 'Yes / No',
}

export default function InputFieldBuilder({ fields, onChange }: InputFieldBuilderProps) {
  const addField = () => {
    onChange([...fields, { name: '', description: '', required: false, type: 'string' }])
  }

  const usedNames = fields.map((f) => f.name.trim().toLowerCase()).filter(Boolean)
  const duplicateNames = new Set(usedNames.filter((name, i) => usedNames.indexOf(name) !== i))

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">What info does it need from the user?</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Each field is a piece of data the chatbot collects before calling your API.{' '}
            <span className="text-slate-400">e.g. order_number, customer_email</span>
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
          <p className="text-xs text-slate-400">No fields added yet. Click &ldquo;+ Add Field&rdquo; to get started.</p>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const isDuplicate = Boolean(field.name.trim() && duplicateNames.has(field.name.trim().toLowerCase()))
            const isEmpty = !field.name.trim() && fields.length > 0

            return (
              <div
                key={`field-${index}`}
                className={`rounded-lg border p-2.5 ${isDuplicate ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
              >
                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        onChange(fields.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))
                      }
                      placeholder="field_name"
                      className={`h-9 w-full rounded-lg border px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none ${
                        isDuplicate ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={field.description}
                      onChange={(e) =>
                        onChange(fields.map((item, i) => (i === index ? { ...item, description: e.target.value } : item)))
                      }
                      placeholder="What is this? (helps the AI ask correctly)"
                      className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <select
                      value={field.type}
                      onChange={(e) =>
                        onChange(
                          fields.map((item, i) =>
                            i === index ? { ...item, type: e.target.value as ActionInputField['type'] } : item
                          )
                        )
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                    >
                      {(Object.entries(TYPE_LABELS) as [ActionInputField['type'], string][]).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2 md:col-span-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                      Required
                      <Switch
                        checked={field.required}
                        onCheckedChange={(next) =>
                          onChange(fields.map((item, i) => (i === index ? { ...item, required: next } : item)))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onChange(fields.filter((_, i) => i !== index))}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {isDuplicate && (
                  <p className="mt-1 text-xs text-red-600">
                    &ldquo;{field.name}&rdquo; is already used — field names must be unique.
                  </p>
                )}
                {isEmpty && (
                  <p className="mt-1 text-xs text-amber-600">Field name is required.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
