'use client'

import { useMemo } from 'react'
import InputFieldBuilder from './InputFieldBuilder'
import KeyValueBuilder from './KeyValueBuilder'
import ClientSideCodeSnippet from './ClientSideCodeSnippet'
import type { CustomActionConfig } from '@/components/actions/types'

interface ConfigurationTabProps {
  name: string
  config: CustomActionConfig
  errors: Record<string, string>
  functionNameConflict: string | null
  onNameChange: (name: string) => void
  onConfigChange: (config: CustomActionConfig) => void
  onFunctionNameBlur: () => void
}

function slugifyFunctionName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export default function ConfigurationTab({
  name,
  config,
  errors,
  functionNameConflict,
  onNameChange,
  onConfigChange,
  onFunctionNameBlur,
}: ConfigurationTabProps) {
  const inputFieldNames = useMemo(() => config.inputFields.map((field) => field.name).filter(Boolean), [config.inputFields])

  const updateExecutionMode = (mode: 'server_side' | 'client_side') => {
    onConfigChange({
      ...config,
      executionMode: mode,
      ...(mode === 'client_side'
        ? {
            apiUrl: '',
            method: 'POST',
            headers: [],
            queryParams: [],
            bodyParams: [],
          }
        : {}),
    })
  }

  const triggerWarning = !config.triggerInstructions.trim()

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Basic Info</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Action Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value
                onNameChange(nextName)
                if (!config.actionFunctionName.trim()) {
                  onConfigChange({ ...config, actionFunctionName: slugifyFunctionName(nextName) })
                }
              }}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              placeholder="Order Status Lookup"
            />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Function Name</label>
            <input
              type="text"
              value={config.actionFunctionName}
              onBlur={onFunctionNameBlur}
              onChange={(event) => onConfigChange({ ...config, actionFunctionName: slugifyFunctionName(event.target.value) })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              placeholder="order_status_lookup"
            />
            {errors.actionFunctionName ? <p className="mt-1 text-xs text-red-600">{errors.actionFunctionName}</p> : null}
            {functionNameConflict ? <p className="mt-1 text-xs text-red-600">{functionNameConflict}</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-700">Execution Mode</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-2">
              <input
                type="radio"
                name="executionMode"
                checked={config.executionMode === 'server_side'}
                onChange={() => updateExecutionMode('server_side')}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  Server-side
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Recommended</span>
                </div>
                <p className="text-xs text-slate-500">Our server calls your API. Secure, works everywhere.</p>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-2">
              <input
                type="radio"
                name="executionMode"
                checked={config.executionMode === 'client_side'}
                onChange={() => updateExecutionMode('client_side')}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Client-side</p>
                <p className="text-xs text-slate-500">Your website handles the call in the browser. Requires embed script.</p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Trigger Instructions</h3>
        <textarea
          value={config.triggerInstructions}
          onChange={(event) => onConfigChange({ ...config, triggerInstructions: event.target.value })}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
          placeholder="Describe when the AI should call this action..."
        />
        {triggerWarning ? <p className="text-xs text-amber-600">Recommended: add trigger instructions for better reliability.</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 p-3">
        <InputFieldBuilder fields={config.inputFields} onChange={(fields) => onConfigChange({ ...config, inputFields: fields })} />
      </section>

      {config.executionMode === 'server_side' ? (
        <section className="space-y-3 rounded-lg border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">API Configuration</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Method</label>
              <select
                value={config.method ?? 'POST'}
                onChange={(event) => onConfigChange({ ...config, method: event.target.value as CustomActionConfig['method'] })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">API URL</label>
              <input
                type="url"
                value={config.apiUrl ?? ''}
                onChange={(event) => onConfigChange({ ...config, apiUrl: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                placeholder="https://api.example.com/orders/status"
              />
              {errors.apiUrl ? <p className="mt-1 text-xs text-red-600">{errors.apiUrl}</p> : null}
            </div>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
            Values are encrypted at rest and never exposed to the frontend.
          </div>
          <KeyValueBuilder label="Headers" rows={config.headers ?? []} onChange={(headers) => onConfigChange({ ...config, headers })} />
          <KeyValueBuilder label="Query Parameters" rows={config.queryParams ?? []} onChange={(queryParams) => onConfigChange({ ...config, queryParams })} />
          <KeyValueBuilder
            label="Request Body"
            mode="body"
            inputFieldNames={inputFieldNames}
            rows={config.bodyParams ?? []}
            onChange={(bodyParams) => onConfigChange({ ...config, bodyParams })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700">Response Mapping</label>
            <textarea
              value={config.responseMapping ?? ''}
              onChange={(event) => onConfigChange({ ...config, responseMapping: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              placeholder="Optional: tell the AI how to interpret the response..."
            />
          </div>
        </section>
      ) : (
        <section className="space-y-2 rounded-lg border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Client-side Setup</h3>
          <ClientSideCodeSnippet functionName={config.actionFunctionName} />
        </section>
      )}

    </div>
  )
}
