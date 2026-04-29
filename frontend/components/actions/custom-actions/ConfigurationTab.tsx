'use client'

import { useRef, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import InputFieldBuilder from './InputFieldBuilder'
import KeyValueBuilder from './KeyValueBuilder'
import ClientSideCodeSnippet from './ClientSideCodeSnippet'
import type { ActionAuthConfig, AuthType, CustomActionConfig } from '@/components/actions/types'

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

function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div>
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {hint && !open && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-200 p-3">{children}</div>}
    </div>
  )
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
  const urlInputRef = useRef<HTMLInputElement>(null)
  const inputFieldNames = useMemo(() => config.inputFields.map((f) => f.name).filter(Boolean), [config.inputFields])

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
            authConfig: undefined,
          }
        : {}),
    })
  }

  const insertVariable = (fieldName: string) => {
    const input = urlInputRef.current
    const insertion = `{{${fieldName}}}`
    if (!input) {
      onConfigChange({ ...config, apiUrl: (config.apiUrl ?? '') + insertion })
      return
    }
    const start = input.selectionStart ?? (config.apiUrl ?? '').length
    const end = input.selectionEnd ?? (config.apiUrl ?? '').length
    const current = config.apiUrl ?? ''
    const next = current.slice(0, start) + insertion + current.slice(end)
    onConfigChange({ ...config, apiUrl: next })
    requestAnimationFrame(() => {
      input.focus()
      const pos = start + insertion.length
      input.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="space-y-4">
      {/* Action Name */}
      <section className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Action Name</h3>
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value)
              if (!config.actionFunctionName.trim()) {
                onConfigChange({ ...config, actionFunctionName: slugifyFunctionName(e.target.value) })
              }
            }}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
            placeholder="e.g. Order Status Lookup"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
      </section>

      {/* When to use */}
      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">When should the chatbot use this?</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Describe the situation. The AI uses this to decide when to trigger the action.
          </p>
        </div>
        <textarea
          value={config.triggerInstructions}
          onChange={(e) => onConfigChange({ ...config, triggerInstructions: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
          placeholder='e.g. "When the user asks about their order status or wants to track a shipment"'
        />
        {!config.triggerInstructions.trim() && (
          <p className="text-xs text-amber-600">Recommended — without this the chatbot may not know when to use this action.</p>
        )}
      </section>

      {/* Input Fields */}
      <section className="rounded-lg border border-slate-200 p-3">
        <InputFieldBuilder
          fields={config.inputFields}
          onChange={(fields) => onConfigChange({ ...config, inputFields: fields })}
        />
        {errors.inputFields && <p className="mt-2 text-xs text-red-600">{errors.inputFields}</p>}
      </section>

      {/* Execution Mode */}
      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-900">How does it connect?</h3>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="radio"
              name="executionMode"
              checked={config.executionMode === 'server_side'}
              onChange={() => updateExecutionMode('server_side')}
              className="mt-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Conciara calls your API</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Recommended
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Conciara&apos;s servers make the request on your chatbot&apos;s behalf. Secure and works on any website.
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="radio"
              name="executionMode"
              checked={config.executionMode === 'client_side'}
              onChange={() => updateExecutionMode('client_side')}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-slate-900">My website handles the call</span>
              <p className="mt-0.5 text-xs text-slate-500">
                Your website&apos;s JavaScript handles the request in the visitor&apos;s browser. Requires adding a code snippet to your site.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* API Config (server-side) */}
      {config.executionMode === 'server_side' && (
        <section className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">API Request</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Values are encrypted at rest and never exposed to the browser.
            </p>
          </div>

          {/* Method + URL */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <select
                value={config.method ?? 'POST'}
                onChange={(e) => onConfigChange({ ...config, method: e.target.value as CustomActionConfig['method'] })}
                className="h-10 w-28 shrink-0 rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                ref={urlInputRef}
                type="url"
                value={config.apiUrl ?? ''}
                onChange={(e) => onConfigChange({ ...config, apiUrl: e.target.value })}
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                placeholder="https://api.yoursite.com/orders/{{order_number}}"
              />
            </div>
            {errors.apiUrl && <p className="text-xs text-red-600">{errors.apiUrl}</p>}

            {inputFieldNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400">Insert variable:</span>
                {inputFieldNames.map((fieldName) => (
                  <button
                    key={fieldName}
                    type="button"
                    onClick={() => insertVariable(fieldName)}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-600 hover:border-[var(--v2-primary)] hover:text-[var(--v2-primary)]"
                  >
                    {`{{${fieldName}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Authentication */}
          <CollapsibleSection
            title="Authentication"
            hint={config.authConfig && config.authConfig.type !== 'none' ? config.authConfig.type.replace('_', ' ') : 'none'}
          >
            <AuthorizationSection
              authConfig={config.authConfig}
              onChange={(authConfig) => onConfigChange({ ...config, authConfig })}
            />
          </CollapsibleSection>

          {/* Advanced: Headers, Query Params, Body */}
          <CollapsibleSection
            title="Advanced Request Settings"
            hint={[
              (config.headers?.length ?? 0) > 0 && `${config.headers!.length} header${config.headers!.length !== 1 ? 's' : ''}`,
              (config.queryParams?.length ?? 0) > 0 && `${config.queryParams!.length} query param${config.queryParams!.length !== 1 ? 's' : ''}`,
              (config.bodyParams?.length ?? 0) > 0 && `${config.bodyParams!.length} body param${config.bodyParams!.length !== 1 ? 's' : ''}`,
            ]
              .filter(Boolean)
              .join(', ') || 'Headers, query params, body'}
          >
            <div className="space-y-4">
              <KeyValueBuilder
                label="Headers"
                rows={config.headers ?? []}
                inputFieldNames={inputFieldNames}
                onChange={(headers) => onConfigChange({ ...config, headers })}
              />
              <KeyValueBuilder
                label="Query Parameters"
                rows={config.queryParams ?? []}
                inputFieldNames={inputFieldNames}
                onChange={(queryParams) => onConfigChange({ ...config, queryParams })}
              />
              <KeyValueBuilder
                label="Request Body"
                rows={config.bodyParams ?? []}
                inputFieldNames={inputFieldNames}
                onChange={(bodyParams) => onConfigChange({ ...config, bodyParams })}
              />
              <p className="text-xs text-slate-500">
                <strong>From context</strong> values: <code>chatbot_name</code>, <code>current_url</code>,{' '}
                <code>session_id</code>, or any key from <code>sessionData</code> passed at widget init (e.g.{' '}
                <code>customer_id</code>, <code>cart_id</code>).
              </p>
            </div>
          </CollapsibleSection>

          {/* Response Mapping */}
          <CollapsibleSection
            title="How to use the response"
            hint={config.responseMapping?.trim() ? 'configured' : 'optional'}
          >
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Tell the chatbot how to interpret and present the API response to the user.
              </p>
              <textarea
                value={config.responseMapping ?? ''}
                onChange={(e) => onConfigChange({ ...config, responseMapping: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none"
                placeholder='e.g. "Tell the user their order status from the \"status\" field. If status is \"shipped\", include the tracking number from \"tracking_id\"."'
              />
            </div>
          </CollapsibleSection>
        </section>
      )}

      {/* Client-side Setup */}
      {config.executionMode === 'client_side' && (
        <section className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add this to your website</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Paste this snippet into your site after the chatbot embed script.
            </p>
          </div>
          <ClientSideCodeSnippet functionName={config.actionFunctionName} />
        </section>
      )}

      {/* Developer Settings (collapsed) */}
      <CollapsibleSection title="Developer Settings" hint="Internal function identifier">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Internal ID{' '}
              <span className="font-normal text-slate-400">(auto-filled from action name)</span>
            </label>
            <input
              type="text"
              value={config.actionFunctionName}
              onBlur={onFunctionNameBlur}
              onChange={(e) => onConfigChange({ ...config, actionFunctionName: slugifyFunctionName(e.target.value) })}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-[var(--v2-primary)] focus:outline-none"
              placeholder="order_status_lookup"
            />
            {errors.actionFunctionName && (
              <p className="mt-1 text-xs text-red-600">{errors.actionFunctionName}</p>
            )}
            {functionNameConflict && (
              <p className="mt-1 text-xs text-red-600">{functionNameConflict}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Must be unique per chatbot. Only lowercase letters, numbers, and underscores.
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}

interface AuthorizationSectionProps {
  authConfig: ActionAuthConfig | undefined
  onChange: (next: ActionAuthConfig | undefined) => void
}

function AuthorizationSection({ authConfig, onChange }: AuthorizationSectionProps) {
  const type: AuthType = authConfig?.type ?? 'none'

  const update = (patch: Partial<ActionAuthConfig>) => {
    onChange({ ...(authConfig ?? { type }), type, ...patch })
  }

  const handleTypeChange = (nextType: AuthType) => {
    if (nextType === 'none') {
      onChange({ type: 'none' })
      return
    }
    onChange({ ...(authConfig ?? { type: nextType }), type: nextType })
  }

  const inputCls = 'mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--v2-primary)] focus:outline-none'
  const labelCls = 'block text-xs font-medium text-slate-700'

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Auth Type</label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className={inputCls}
        >
          <option value="none">None</option>
          <option value="api_key">API Key</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth (username + password)</option>
          <option value="oauth_bearer">OAuth Bearer (auto-refresh)</option>
        </select>
      </div>

      {type === 'api_key' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={labelCls}>Header Name</label>
            <input
              type="text"
              value={authConfig?.apiKeyHeader ?? ''}
              onChange={(e) => update({ apiKeyHeader: e.target.value })}
              placeholder="X-API-Key"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>API Key</label>
            <input
              type="password"
              value={authConfig?.apiKeyValue ?? ''}
              onChange={(e) => update({ apiKeyValue: e.target.value })}
              placeholder="sk_live_…"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {type === 'bearer' && (
        <div>
          <label className={labelCls}>Bearer Token</label>
          <input
            type="password"
            value={authConfig?.bearerToken ?? ''}
            onChange={(e) => update({ bearerToken: e.target.value })}
            placeholder="eyJhbGciOi…"
            className={inputCls}
          />
        </div>
      )}

      {type === 'basic' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={labelCls}>Username</label>
            <input
              type="text"
              value={authConfig?.basicUsername ?? ''}
              onChange={(e) => update({ basicUsername: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input
              type="password"
              value={authConfig?.basicPassword ?? ''}
              onChange={(e) => update({ basicPassword: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {type === 'oauth_bearer' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Access Token</label>
              <input
                type="password"
                value={authConfig?.accessToken ?? ''}
                onChange={(e) => update({ accessToken: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Refresh Token</label>
              <input
                type="password"
                value={authConfig?.refreshToken ?? ''}
                onChange={(e) => update({ refreshToken: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Token Expiry</label>
            <input
              type="datetime-local"
              value={authConfig?.expiresAt ? authConfig.expiresAt.slice(0, 16) : ''}
              onChange={(e) =>
                update({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Refresh Endpoint</label>
            <input
              type="url"
              value={authConfig?.refreshEndpoint ?? ''}
              onChange={(e) => update({ refreshEndpoint: e.target.value })}
              placeholder="https://auth.example.com/oauth/token"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Client ID</label>
              <input
                type="text"
                value={authConfig?.refreshClientId ?? ''}
                onChange={(e) => update({ refreshClientId: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Client Secret</label>
              <input
                type="password"
                value={authConfig?.refreshClientSecret ?? ''}
                onChange={(e) => update({ refreshClientSecret: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            The access token auto-refreshes 5 minutes before expiry and retries once on a 401 response.
          </p>
        </div>
      )}
    </div>
  )
}
