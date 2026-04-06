'use client'

import { useMemo, useState } from 'react'
import type { ActionInputField } from '@/components/actions/types'

interface TestTabProps {
  inputFields: ActionInputField[]
  loading: boolean
  result: { success: boolean; statusCode: number; responseBody: unknown; durationMs: number } | null
  error: string | null
  onRun: (inputs: Record<string, unknown>) => Promise<void>
}

export default function TestTab({ inputFields, loading, result, error, onRun }: TestTabProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const prettyResult = useMemo(() => JSON.stringify(result?.responseBody ?? {}, null, 2), [result])

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Test Inputs</h3>
        {inputFields.length === 0 ? (
          <p className="text-sm text-slate-500">No input fields defined.</p>
        ) : (
          inputFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700">
                {field.name}
                {field.required ? <span className="ml-1 text-red-600">*</span> : null}
              </label>
              <input
                type="text"
                value={String(values[field.name] ?? '')}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                placeholder={field.description || `Enter ${field.name}`}
              />
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => void onRun(values)}
          disabled={loading}
          className="rounded-lg bg-[var(--v2-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Test'}
        </button>
      </div>

      <p className="text-xs text-slate-500">Test calls bypass rate limits and won&apos;t affect your live chatbot.</p>

      {result ? (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                result.statusCode >= 200 && result.statusCode < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {result.statusCode}
            </span>
            <span className="text-slate-600">{result.durationMs} ms</span>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            <code>{prettyResult}</code>
          </pre>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
