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
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const prettyResult = useMemo(() => JSON.stringify(result?.responseBody ?? {}, null, 2), [result])

  const handleRun = async () => {
    const missing = inputFields.filter(
      (f) => f.required && (values[f.name] === undefined || values[f.name] === '' || values[f.name] === null)
    )
    if (missing.length > 0) {
      setValidationErrors(missing.map((f) => f.name))
      return
    }
    setValidationErrors([])
    await onRun(values)
  }

  const setValue = (name: string, value: unknown) => {
    setValidationErrors((prev) => prev.filter((n) => n !== name))
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Test Inputs</h3>

        {inputFields.length === 0 ? (
          <p className="text-sm text-slate-500">
            No input fields defined. Add input fields in the Configuration tab first.
          </p>
        ) : (
          inputFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700">
                {field.name}
                {field.required && <span className="ml-1 text-red-500">*</span>}
                {field.description && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400">— {field.description}</span>
                )}
              </label>

              {field.type === 'boolean' ? (
                <label className="mt-1.5 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(e) => setValue(field.name, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--v2-primary)]"
                  />
                  <span className="text-sm text-slate-600">{values[field.name] ? 'Yes' : 'No'}</span>
                </label>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) =>
                    setValue(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                  className={`mt-1 h-9 w-full rounded-lg border px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none ${
                    validationErrors.includes(field.name) ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                  placeholder={field.description || `Enter ${field.name}`}
                />
              )}

              {validationErrors.includes(field.name) && (
                <p className="mt-0.5 text-xs text-red-600">This field is required</p>
              )}
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading || inputFields.length === 0}
          className="rounded-lg bg-[var(--v2-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Test'}
        </button>
      </div>

      <p className="text-xs text-slate-500">Test calls bypass rate limits and won&apos;t affect your live chatbot.</p>

      {result && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                result.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {result.statusCode}
            </span>
            <span className="text-xs text-slate-500">{result.durationMs} ms</span>
            <span className={`text-xs font-medium ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {result.success ? 'Success' : 'Failed'}
            </span>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            <code>{prettyResult}</code>
          </pre>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
