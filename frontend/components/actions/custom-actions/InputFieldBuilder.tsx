'use client'

import { Trash2 } from 'lucide-react'
import type { ActionInputField } from '@/components/actions/types'
import { Switch } from '@/components/ui/switch'

interface InputFieldBuilderProps {
  fields: ActionInputField[]
  onChange: (fields: ActionInputField[]) => void
}

export default function InputFieldBuilder({ fields, onChange }: InputFieldBuilderProps) {
  const addField = () => {
    onChange([
      ...fields,
      {
        name: '',
        description: '',
        required: false,
        type: 'string',
      },
    ])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Input Fields</p>
        <button
          type="button"
          onClick={addField}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add Input Field
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={`field-${index}`} className="rounded-lg border border-slate-200 p-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <input
                type="text"
                value={field.name}
                onChange={(event) => onChange(fields.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                placeholder="Field Name"
                className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              />
              <input
                type="text"
                value={field.description}
                onChange={(event) => onChange(fields.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))}
                placeholder="Description"
                className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none md:col-span-2"
              />
              <select
                value={field.type}
                onChange={(event) => onChange(fields.map((item, i) => (i === index ? { ...item, type: event.target.value as ActionInputField['type'] } : item)))}
                className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  Required
                  <Switch
                    checked={field.required}
                    onCheckedChange={(next) => onChange(fields.map((item, i) => (i === index ? { ...item, required: next } : item)))}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onChange(fields.filter((_, i) => i !== index))}
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
