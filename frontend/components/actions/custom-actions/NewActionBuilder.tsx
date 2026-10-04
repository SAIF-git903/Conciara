'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Copy,
  Globe,
  Info,
  List,
  MessageSquare,
  Play,
  Plus,
  Settings2,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react'
import type {
  ChatbotAction,
  CustomActionConfig,
  ActionInputField,
  ActionKeyValuePair,
  AuthType,
} from '@/components/actions/types'
import { Select as UISelect, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_CONFIG: CustomActionConfig = {
  executionMode: 'server_side',
  apiUrl: 'https://api.example.com/v1/',
  method: 'POST',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  queryParams: [],
  bodyParams: [],
  triggerInstructions: '',
  actionFunctionName: '',
  inputFields: [],
  responseMapping: '',
  requiresConfirmation: false,
  allowStreaming: true,
  authConfig: { type: 'none' },
}

type TabId = 'setup' | 'params' | 'request' | 'auth' | 'response' | 'when'

interface Tab {
  id: TabId
  label: string
  Icon: React.FC<{ style?: React.CSSProperties }>
}

const TABS: Tab[] = [
  { id: 'setup',   label: 'Setup',        Icon: Settings2 },
  { id: 'params',  label: 'Parameters',   Icon: List },
  { id: 'request', label: 'Request',      Icon: Globe },
  { id: 'auth',    label: 'Auth',         Icon: Shield },
  { id: 'response',label: 'Response',     Icon: Zap },
  { id: 'when',    label: 'When to call', Icon: MessageSquare },
]

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: '#ecfdf5', color: '#166534' },
  POST:   { bg: '#f5f3ff', color: '#5b21b6' },
  PUT:    { bg: '#fef3c7', color: '#92400e' },
  PATCH:  { bg: '#fae8ff', color: '#6b21a8' },
  DELETE: { bg: '#fee2e2', color: '#991b1b' },
}

function toFunctionName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

function getTestDiagnostic(statusCode: number, responseBody: unknown): { title: string; detail: string } | null {
  const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody ?? '')
  if (/ssrf|private.{0,10}range|reserved.{0,10}ip/i.test(bodyStr)) {
    return { title: 'SSRF protection blocked this request', detail: 'The URL resolves to a private / internal IP. Use a public internet endpoint.' }
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|getaddrinfo/i.test(bodyStr)) {
    return { title: 'DNS / connection error', detail: 'The hostname could not be resolved or the connection was refused. Check the URL.' }
  }
  if (statusCode === 0) {
    return { title: 'No response received', detail: 'The request could not be sent. Check the URL and that the server is publicly reachable.' }
  }
  if (statusCode === 401) {
    return { title: 'Unauthorized (401)', detail: 'The API key or token is missing or incorrect. Open the Auth tab and verify your credentials.' }
  }
  if (statusCode === 403) {
    return { title: 'Forbidden (403)', detail: 'Your credentials do not have permission for this endpoint. Check the API key scopes.' }
  }
  if (statusCode === 404) {
    return { title: 'Not found (404)', detail: 'The URL path does not exist on the server. Verify the endpoint path.' }
  }
  if (statusCode === 405) {
    return { title: 'Method not allowed (405)', detail: 'The server does not accept this HTTP method. Try a different method (e.g. POST instead of GET).' }
  }
  if (statusCode === 422) {
    return { title: 'Unprocessable entity (422)', detail: 'The request body format is wrong. Check the Request tab and your body params.' }
  }
  if (statusCode === 429) {
    return { title: 'Rate limited (429)', detail: 'Too many requests. Wait a moment before running another test.' }
  }
  if (statusCode >= 500) {
    return { title: `Server error (${statusCode})`, detail: 'The target API returned a server error. This is an issue on the external API side.' }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface TestResult {
  success: boolean
  statusCode: number
  responseBody: unknown
  durationMs: number
  debug?: { url: string; method: string }
  responseHeaders?: Record<string, string>
  responseSize?: number
}

interface NewActionBuilderProps {
  editing?: ChatbotAction | null
  onCancel: () => void
  onSave: (payload: {
    id?: string
    name: string
    isEnabled: boolean
    config: CustomActionConfig
    lastKnownUpdatedAt?: string
  }) => Promise<ChatbotAction>
  onRunTest: (
    actionId: string,
    inputs: Record<string, unknown>
  ) => Promise<TestResult>
}

/* ------------------------------------------------------------------ */
/* Shared sub-components                                               */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5,
      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      color: 'var(--ink-3)', fontWeight: 500, marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  )
}

function ABInput({
  value,
  onChange,
  placeholder,
  style,
  mono,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
  mono?: boolean
  readOnly?: boolean
}) {
  return (
    <input
      value={value}
      onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="input"
      style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 12.5, ...style }}
    />
  )
}

function ABSelect({
  value,
  onChange,
  options,
  style,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  style?: React.CSSProperties
}) {
  return (
    <UISelect value={value} onValueChange={onChange}>
      <SelectTrigger compact style={{ fontSize: 12.5, ...style }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent compact>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} compact>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </UISelect>
  )
}

function ABToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`toggle ${on ? 'toggle--on' : ''}`}
      style={{ flexShrink: 0 }}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

function IconBtn({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="icon-btn"
      style={{ width: 28, height: 28 }}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Setup                                                          */
/* ------------------------------------------------------------------ */

function SetupTab({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  return (
    <div>
      <Eyebrow>Behavior</Eyebrow>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Require user confirmation</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Agent shows the collected inputs and asks the user to approve before calling. Recommended for destructive or paid actions.
              </div>
            </div>
            <ABToggle
              on={config.requiresConfirmation ?? false}
              onClick={() => patchConfig({ requiresConfirmation: !(config.requiresConfirmation ?? false) })}
            />
          </label>
          <div className="divider" style={{ margin: '6px 0' }} />
          <label style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Allow streaming responses</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Let the agent narrate the API result as it streams back.
              </div>
            </div>
            <ABToggle
              on={config.allowStreaming ?? true}
              onClick={() => patchConfig({ allowStreaming: !(config.allowStreaming ?? true) })}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Parameters                                                     */
/* ------------------------------------------------------------------ */

function ParamsTab({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  const fields = config.inputFields ?? []

  const update = (idx: number, patch: Partial<ActionInputField>) =>
    patchConfig({
      inputFields: fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    })

  const remove = (idx: number) =>
    patchConfig({ inputFields: fields.filter((_, i) => i !== idx) })

  const add = () =>
    patchConfig({
      inputFields: [
        ...fields,
        { name: '', description: '', required: false, type: 'string' },
      ],
    })

  return (
    <div>
      <Eyebrow>Input parameters</Eyebrow>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
        The agent fills these from the conversation. Each parameter is available as{' '}
        <code className="code-inline">{'{{name}}'}</code> in the URL, headers, or body.
      </p>

      <div style={{
        border: '1px solid var(--line)', borderRadius: 10,
        overflow: 'hidden', background: 'var(--surface)', marginBottom: 12,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1.3fr 72px 28px',
          gap: 8, padding: '7px 12px',
          background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
          color: 'var(--ink-3)', fontWeight: 500,
        }}>
          <span>Name</span><span>Type</span><span>Source</span><span>Required</span><span />
        </div>
        {fields.length === 0 && (
          <div style={{ padding: '22px 14px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12.5 }}>
            No parameters yet. Add one below.
          </div>
        )}
        {fields.map((f, i) => (
          <div key={i} style={{ borderTop: i === 0 ? undefined : '1px solid var(--line)' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1.3fr 72px 28px',
              gap: 8, padding: '10px 12px', alignItems: 'center',
            }}>
              <ABInput
                value={f.name}
                onChange={(v) => update(i, { name: v })}
                placeholder="e.g. order_id"
                style={{ height: 30 }}
                mono
              />
              <ABSelect
                value={f.type}
                onChange={(v) => update(i, { type: v as ActionInputField['type'] })}
                options={[
                  { value: 'string', label: 'string' },
                  { value: 'number', label: 'number' },
                  { value: 'boolean', label: 'boolean' },
                ]}
                style={{ height: 30 }}
              />
              <ABSelect
                value={(f as { source?: string }).source ?? 'agent'}
                onChange={(v) => update(i, { source: v } as Partial<ActionInputField>)}
                options={[
                  { value: 'agent', label: 'From conversation' },
                  { value: 'user', label: 'Ask user' },
                  { value: 'fixed', label: 'Fixed value' },
                  { value: 'context', label: 'Workspace context' },
                ]}
                style={{ height: 30 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <ABToggle on={f.required} onClick={() => update(i, { required: !f.required })} />
              </div>
              <IconBtn onClick={() => remove(i)}>
                <Trash2 style={{ width: 13, height: 13 }} />
              </IconBtn>
            </div>
            <div style={{ padding: '0 12px 10px' }}>
              <ABInput
                value={f.description}
                onChange={(v) => update(i, { description: v })}
                placeholder="Tell the agent how to extract this value from the conversation"
                style={{
                  height: 30, width: '100%', fontSize: 12,
                  background: 'var(--bg)', borderStyle: 'dashed',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="btn btn--ghost btn--sm">
        <Plus style={{ width: 12, height: 12 }} /> Add parameter
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Request                                                        */
/* ------------------------------------------------------------------ */

function BodyParamsEditor({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  const params = config.bodyParams ?? []
  const inputFieldNames = (config.inputFields ?? []).map((f) => f.name).filter(Boolean)

  const update = (idx: number, patch: Partial<ActionKeyValuePair>) =>
    patchConfig({ bodyParams: params.map((p, i) => (i === idx ? { ...p, ...patch } : p)) })

  const remove = (idx: number) =>
    patchConfig({ bodyParams: params.filter((_, i) => i !== idx) })

  const add = () =>
    patchConfig({ bodyParams: [...params, { key: '', value: '', source: 'static' as const }] })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {params.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 1.5fr 28px',
          gap: 6, padding: '5px 4px',
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
          color: 'var(--ink-3)', fontWeight: 500,
        }}>
          <span>Key</span><span>Source</span><span>Value / Parameter</span><span />
        </div>
      )}
      {params.map((p, i) => {
        const src = p.source ?? 'static'
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1.5fr 28px', gap: 6 }}>
            <ABInput
              value={p.key}
              onChange={(v) => update(i, { key: v })}
              placeholder="field_name"
              mono
              style={{ height: 32 }}
            />
            <ABSelect
              value={src}
              onChange={(v) => update(i, { source: v as ActionKeyValuePair['source'], userInputField: undefined, value: '' })}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'user_input', label: 'From param' },
              ]}
              style={{ height: 32 }}
            />
            {src === 'user_input' ? (
              <ABSelect
                value={p.userInputField ?? ''}
                onChange={(v) => update(i, { userInputField: v })}
                options={[
                  { value: '', label: '— select param —' },
                  ...inputFieldNames.map((n) => ({ value: n, label: n })),
                ]}
                style={{ height: 32 }}
              />
            ) : (
              <ABInput
                value={p.value ?? ''}
                onChange={(v) => update(i, { value: v })}
                placeholder="value or {{param_name}}"
                mono
                style={{ height: 32 }}
              />
            )}
            <IconBtn onClick={() => remove(i)}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </IconBtn>
          </div>
        )
      })}
      <button type="button" onClick={add} className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }}>
        <Plus style={{ width: 12, height: 12 }} /> Add field
      </button>
    </div>
  )
}

function RequestTab({
  config,
  patchConfig,
  method,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
  method: string
}) {
  const headers = config.headers ?? []

  const updateHeader = (idx: number, patch: Partial<ActionKeyValuePair>) =>
    patchConfig({ headers: headers.map((h, i) => (i === idx ? { ...h, ...patch } : h)) })
  const removeHeader = (idx: number) =>
    patchConfig({ headers: headers.filter((_, i) => i !== idx) })
  const addHeader = () =>
    patchConfig({ headers: [...headers, { key: '', value: '' }] })

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method)

  return (
    <div>
      <Eyebrow>Headers</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {headers.map((h, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 28px', gap: 6 }}>
            <ABInput
              value={h.key}
              onChange={(v) => updateHeader(i, { key: v })}
              placeholder="Header-Name"
              style={{ height: 32 }}
              mono
            />
            <ABInput
              value={h.value}
              onChange={(v) => updateHeader(i, { value: v })}
              placeholder="value or {{template}}"
              style={{ height: 32 }}
              mono
            />
            <IconBtn onClick={() => removeHeader(i)}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </IconBtn>
          </div>
        ))}
        <button type="button" onClick={addHeader} className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }}>
          <Plus style={{ width: 12, height: 12 }} /> Add header
        </button>
      </div>

      {hasBody && (
        <>
          <Eyebrow style={{ marginTop: 24 }}>Request body</Eyebrow>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
            Each field is sent as JSON. Use <code className="code-inline">Static</code> for literal values or{' '}
            <code className="code-inline">From param</code> to inject a collected parameter.
          </p>
          <BodyParamsEditor config={config} patchConfig={patchConfig} />
        </>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 12px', background: 'var(--accent-soft)',
        border: '1px solid var(--accent-ring)', borderRadius: 8,
        fontSize: 12.5, color: 'var(--ink-2)', marginTop: 16,
      }}>
        <Info style={{ width: 12, height: 12, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
        <div>
          Use <code className="code-inline">{'{{param_name}}'}</code> in the URL or static values to insert parameters at runtime.
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Auth                                                           */
/* ------------------------------------------------------------------ */

function AuthTab({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  const auth = config.authConfig ?? { type: 'none' as AuthType }
  const setAuth = (patch: Partial<typeof auth>) =>
    patchConfig({ authConfig: { ...auth, ...patch } })

  const authOptions: { id: string; label: string; desc: string }[] = [
    { id: 'none',   label: 'None',               desc: 'Public endpoint' },
    { id: 'bearer', label: 'Bearer token',        desc: 'Authorization: Bearer …' },
    { id: 'basic',  label: 'Basic auth',          desc: 'Username + password' },
    { id: 'apikey', label: 'API key in header',   desc: 'Custom header name' },
    { id: 'oauth',  label: 'OAuth 2.0',           desc: 'Connect a provider' },
  ]
  const authUiId = auth.type === 'api_key' ? 'apikey' : auth.type === 'oauth_bearer' ? 'oauth' : auth.type
  const uiToAuthType = (id: string): AuthType =>
    id === 'apikey' ? 'api_key' : id === 'oauth' ? 'oauth_bearer' : (id as AuthType)

  return (
    <div>
      <Eyebrow>Authentication</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {authOptions.map((o) => (
          <label
            key={o.id}
            className={`model-option ${authUiId === o.id ? 'model-option--active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="radio"
              name="ab-auth"
              checked={authUiId === o.id}
              onChange={() => setAuth({ type: uiToAuthType(o.id) })}
              style={{ flexShrink: 0, accentColor: 'var(--accent)' }}
            />
            <div className="model-option-body">
              <div style={{ fontWeight: 500, fontSize: 13 }}>{o.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {auth.type !== 'none' && (
        <div className="card">
          <div className="card-body" style={{ padding: 14 }}>
            {auth.type === 'bearer' && (
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Token</span>
                <ABInput
                  value={auth.bearerToken ?? ''}
                  onChange={(v) => setAuth({ bearerToken: v })}
                  placeholder="env.MY_API_KEY or paste a literal token"
                  mono
                  style={{ width: '100%', height: 34 }}
                />
                <span className="field-hint">
                  Use <code className="code-inline">env.NAME</code> to reference a workspace secret.
                </span>
              </label>
            )}
            {auth.type === 'basic' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <span className="field-label">Username</span>
                  <ABInput
                    value={auth.basicUsername ?? ''}
                    onChange={(v) => setAuth({ basicUsername: v })}
                    placeholder="env.BASIC_USER"
                    style={{ width: '100%', height: 34 }}
                    mono
                  />
                </label>
                <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <span className="field-label">Password</span>
                  <input
                    type="password"
                    className="input"
                    value={auth.basicPassword ?? ''}
                    onChange={(e) => setAuth({ basicPassword: e.target.value })}
                    placeholder="env.BASIC_PASS"
                    style={{ width: '100%', height: 34, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                  />
                </label>
              </div>
            )}
            {auth.type === 'api_key' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <span className="field-label">Header name</span>
                  <ABInput
                    value={auth.apiKeyHeader ?? 'X-API-Key'}
                    onChange={(v) => setAuth({ apiKeyHeader: v })}
                    style={{ width: '100%', height: 34 }}
                    mono
                  />
                </label>
                <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <span className="field-label">Value</span>
                  <ABInput
                    value={auth.apiKeyValue ?? ''}
                    onChange={(v) => setAuth({ apiKeyValue: v })}
                    placeholder="env.MY_API_KEY"
                    style={{ width: '100%', height: 34 }}
                    mono
                  />
                </label>
              </div>
            )}
            {auth.type === 'oauth_bearer' && (
              <div className="ab-oauth-empty">
                <Shield style={{ width: 20, height: 20, color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Connect an OAuth provider</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    The agent will use your team's connected account when calling this action.
                  </div>
                </div>
                <button type="button" className="btn btn--primary btn--sm">Connect</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Response                                                       */
/* ------------------------------------------------------------------ */

function ResponseTab({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  return (
    <div>
      <Eyebrow>Response mapping</Eyebrow>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
        Extract the fields the agent should remember from the response. Use JSONPath syntax.
      </p>
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
          fontSize: 11, color: 'var(--ink-3)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>extracted fields</span>
          <button type="button" style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', border: '1px solid var(--line)',
            background: 'var(--surface)', borderRadius: 4, fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer',
          }}>
            <Copy style={{ width: 11, height: 11 }} /> Insert example
          </button>
        </div>
        <textarea
          className="textarea"
          rows={6}
          value={config.responseMapping ?? ''}
          onChange={(e) => patchConfig({ responseMapping: e.target.value })}
          spellCheck={false}
          style={{
            width: '100%', border: 'none', background: 'var(--surface)',
            fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6,
            padding: '12px 14px', resize: 'vertical', borderRadius: 0,
          }}
          placeholder={`{\n  "order_id": "$.data.id",\n  "status":   "$.data.status"\n}`}
        />
      </div>

      <Eyebrow>On failure</Eyebrow>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {[
            { code: '401, 403', label: 'Auth errors',   action: 'Tell the user the integration needs attention' },
            { code: '404',      label: 'Not found',     action: "Tell the user the resource doesn't exist" },
            { code: '429',      label: 'Rate limited',  action: 'Retry once with backoff, then tell the user' },
            { code: '5xx',      label: 'Server errors', action: 'Retry twice, then apologize and offer to escalate' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
            }}>
              <span className="badge badge--neutral" style={{ fontFamily: 'var(--font-mono)' }}>{r.code}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.action}</div>
              </div>
              <button type="button" className="btn btn--ghost btn--sm">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab: When to call                                                   */
/* ------------------------------------------------------------------ */

function WhenToCallTab({
  config,
  patchConfig,
}: {
  config: CustomActionConfig
  patchConfig: (p: Partial<CustomActionConfig>) => void
}) {
  const trigger = config.triggerInstructions.trim()
  const isEmpty = trigger.length === 0
  const isTooShort = trigger.length > 0 && trigger.length < 20

  return (
    <div>
      <Eyebrow>Trigger instructions</Eyebrow>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
        Plain-English description of when the agent should call this action. The agent uses this to decide between multiple actions.
      </p>
      <textarea
        className="textarea"
        rows={5}
        value={config.triggerInstructions}
        onChange={(e) => patchConfig({ triggerInstructions: e.target.value })}
        placeholder="e.g. When the user asks about an order status, refund, or shipment."
        style={{
          width: '100%', fontSize: 13,
          borderColor: isEmpty ? 'var(--danger)' : isTooShort ? 'var(--warn)' : undefined,
        }}
      />

      {isEmpty && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', background: 'var(--danger-soft)',
          border: '1px solid rgba(195,54,101,0.2)', borderRadius: 8, marginTop: 10,
          fontSize: 12.5, color: 'var(--danger)',
        }}>
          <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Required — </strong>
            without trigger instructions the agent will never call this action, even when it should.
          </div>
        </div>
      )}

      {isTooShort && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', background: 'var(--warn-soft)',
          border: '1px solid rgba(184,106,23,0.2)', borderRadius: 8, marginTop: 10,
          fontSize: 12.5, color: 'var(--warn)',
        }}>
          <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
          <div>
            These instructions are very short. Add more detail — the more specific they are, the more reliably the agent invokes the action.
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 12px', background: 'var(--bg-2)',
        border: '1px solid var(--line)', borderRadius: 8, marginTop: 14,
        fontSize: 12.5, color: 'var(--ink-3)',
      }}>
        <Info style={{ width: 12, height: 12, color: 'var(--ink-3)', flexShrink: 0, marginTop: 1 }} />
        <div>
          The more specific these instructions are, the better the agent decides when to call vs. not call. Include scenarios where it should <strong>not</strong> trigger.
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Test runner (right pane)                                            */
/* ------------------------------------------------------------------ */

interface TestRunnerProps {
  config: CustomActionConfig
  method: string
  paramValues: Record<string, string>
  setParamValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  testStatus: null | 'running' | 'ok' | 'err'
  testResponse: TestResult | null
  onRun: () => void
  onClear: () => void
  isSaved: boolean
}

// ── HTTP status text ────────────────────────────────────────────
const HTTP_STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 408: 'Timeout',
  409: 'Conflict', 410: 'Gone', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function smartFillValue(field: ActionInputField): string {
  const hint = `${field.name} ${field.description ?? ''}`.toLowerCase()
  if (field.type === 'boolean') return 'true'
  if (field.type === 'number') {
    if (/page|offset/.test(hint)) return '1'
    if (/limit|size|count|max/.test(hint)) return '10'
    if (/price|amount|total|cost|fee/.test(hint)) return '99.99'
    return '42'
  }
  if (/email/.test(hint)) return 'user@example.com'
  if (/phone|mobile|tel/.test(hint)) return '+1-555-0100'
  if (/_id$|^id$|identifier/.test(field.name.toLowerCase())) return '12345'
  if (/url|link|endpoint|website/.test(hint)) return 'https://example.com'
  if (/first.?name/.test(hint)) return 'Jane'
  if (/last.?name/.test(hint)) return 'Smith'
  if (/name|username/.test(hint)) return 'Jane Smith'
  if (/date|birthday/.test(hint)) return new Date().toISOString().slice(0, 10)
  if (/city/.test(hint)) return 'New York'
  if (/country/.test(hint)) return 'US'
  if (/zip|postal/.test(hint)) return '10001'
  if (/message|body|text|content/.test(hint)) return 'Hello, this is a test.'
  if (/token|key|secret/.test(hint)) return 'test-token-abc123'
  if (/status/.test(hint)) return 'active'
  if (/type|category/.test(hint)) return 'default'
  return `sample_${field.name}`
}

function summariseResponse(body: unknown): string {
  if (Array.isArray(body)) {
    if (body.length === 0) return 'Empty array returned.'
    const first = body[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const keys = Object.keys(first as Record<string, unknown>)
      const preview = keys.slice(0, 5).join(', ')
      const extra = keys.length > 5 ? ` +${keys.length - 5} more` : ''
      return `${body.length} item${body.length !== 1 ? 's' : ''} returned — fields: ${preview}${extra}`
    }
    return `${body.length} item${body.length !== 1 ? 's' : ''} returned`
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    for (const k of ['data', 'items', 'results', 'records', 'list', 'rows', 'content']) {
      if (Array.isArray(obj[k])) {
        const arr = obj[k] as unknown[]
        return `${arr.length} ${k} returned`
      }
    }
    const keys = Object.keys(obj)
    const preview = keys.slice(0, 5).join(', ')
    const extra = keys.length > 5 ? ` +${keys.length - 5} more` : ''
    return `Object with ${keys.length} field${keys.length !== 1 ? 's' : ''}: ${preview}${extra}`
  }
  if (typeof body === 'string') return `Plain text (${(body as string).length} chars)`
  return 'Response received'
}

function TestRunner({
  config,
  method,
  paramValues,
  setParamValues,
  testStatus,
  testResponse,
  onRun,
  onClear,
  isSaved,
}: TestRunnerProps) {
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')
  const [bodyMode, setBodyMode] = useState<'pretty' | 'raw'>('pretty')
  const [copied, setCopied] = useState(false)
  const [reqBodyOpen, setReqBodyOpen] = useState(false)

  const fields = config.inputFields ?? []
  const headers = config.headers ?? []
  const queryParams = (config.queryParams ?? []).filter((q: ActionKeyValuePair) => q.key)
  const bodyParams = (config.bodyParams ?? []).filter((b: ActionKeyValuePair) => b.key)
  const url = (config.apiUrl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k: string) => paramValues[k] ?? `{{${k}}}`)
  const methodStyle = METHOD_COLORS[method] ?? { bg: 'var(--bg-2)', color: 'var(--ink-3)' }
  const methodUpper = method.toUpperCase()
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(methodUpper)

  const hasResponseHeaders = !!(
    testResponse?.responseHeaders && Object.keys(testResponse.responseHeaders).length > 0
  )
  const bodyJson = testResponse
    ? (bodyMode === 'pretty'
        ? JSON.stringify(testResponse.responseBody, null, 2)
        : JSON.stringify(testResponse.responseBody))
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(bodyJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* clipboard unavailable */ })
  }

  const monoBlock: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 8, padding: '10px 12px',
    fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7,
    color: 'var(--ink-2)',
  }

  const eyebrowSt: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 10.5,
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    color: 'var(--ink-3)', fontWeight: 500,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div>
          <div style={eyebrowSt}>Test runner</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>
            Calls the real API with sample inputs.
          </div>
        </div>
        {testStatus && testStatus !== 'running' && (
          <button type="button" onClick={onClear} className="btn btn--ghost btn--sm">Clear</button>
        )}
      </div>

      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Unsaved warning ── */}
        {!isSaved && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
            background: 'var(--warn-soft)', border: '1px solid rgba(184,106,23,0.2)',
            borderRadius: 8, fontSize: 12.5, color: 'var(--warn)',
          }}>
            <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
            Save this action first, then run a live test.
          </div>
        )}

        {/* ── Sample inputs ── */}
        <div>
          <div style={{ ...eyebrowSt, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Sample inputs</span>
            {fields.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ fontSize: 11 }}
                onClick={() => {
                  const filled: Record<string, string> = {}
                  fields.forEach((f) => { filled[f.name] = smartFillValue(f) })
                  setParamValues((v) => ({ ...v, ...filled }))
                }}
              >
                ✨ Auto-fill
              </button>
            )}
          </div>
          {fields.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>
              No parameters defined. Add some on the Parameters tab.
            </div>
          ) : (
            fields.map((f) => (
              <label key={f.name} className="field" style={{ marginBottom: 8 }}>
                <span className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{f.name || 'unnamed'}</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)' }}>
                    {f.type}{f.required ? ' · required' : ''}
                  </span>
                </span>
                <input
                  className="input"
                  placeholder={`Sample ${f.type} value`}
                  value={paramValues[f.name] ?? ''}
                  onChange={(e) => setParamValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  style={{ height: 32, fontSize: 12.5 }}
                />
              </label>
            ))
          )}
        </div>

        {/* ── Outgoing request preview ── */}
        <div>
          <div style={{ ...eyebrowSt, marginBottom: 8 }}>Outgoing request</div>
          <div style={{ ...monoBlock, overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--line)' }}>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.04em', background: methodStyle.bg, color: methodStyle.color,
              }}>{method}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink)', wordBreak: 'break-all' }}>
                {url || 'https://api.example.com/…'}
              </span>
            </div>
            {headers.filter((h) => h.key).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{h.key}:</span>
                <span style={{ color: 'var(--ink)' }}>{h.value}</span>
              </div>
            ))}
            {queryParams.length > 0 && (
              <>
                <div style={{ margin: '6px 0 3px', color: 'var(--ink-4)', fontSize: 10, letterSpacing: '0.06em' }}>
                  ── Query params ──
                </div>
                {queryParams.map((q: ActionKeyValuePair, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{q.key}:</span>
                    <span style={{ color: 'var(--ink)' }}>{q.value ?? ''}</span>
                  </div>
                ))}
              </>
            )}
            {hasBody && bodyParams.length > 0 && (
              <>
                <div
                  style={{ margin: '6px 0 3px', color: 'var(--ink-4)', fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setReqBodyOpen((o) => !o)}
                >
                  {reqBodyOpen ? '▾' : '▸'} ── Body ──
                </div>
                {reqBodyOpen && (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 10.5, color: 'var(--ink)' }}>
                    {JSON.stringify(
                      Object.fromEntries(bodyParams.map((b: ActionKeyValuePair) => [b.key, b.value || `{{${b.key}}}`])),
                      null, 2,
                    )}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Run button ── */}
        <button
          type="button"
          onClick={onRun}
          disabled={testStatus === 'running' || !isSaved}
          className="btn btn--primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {testStatus === 'running' ? (
            <><span className="dot-pulse" /> Sending test request…</>
          ) : (
            <><Play style={{ width: 12, height: 12 }} /> Run test request</>
          )}
        </button>

        {/* ── Response ── */}
        {testResponse && (
          <div>

            {/* Resolved request */}
            {testResponse.debug && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...eyebrowSt, marginBottom: 6 }}>Resolved request</div>
                <div style={{ ...monoBlock, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: (METHOD_COLORS[testResponse.debug.method] ?? METHOD_COLORS.POST).bg,
                    color: (METHOD_COLORS[testResponse.debug.method] ?? METHOD_COLORS.POST).color,
                  }}>{testResponse.debug.method}</span>
                  <span style={{ color: 'var(--ink)', wordBreak: 'break-all', fontSize: 11.5 }}>
                    {testResponse.debug.url}
                  </span>
                </div>
              </div>
            )}

            {/* Status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 12px',
              background: testResponse.success ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${testResponse.success ? 'rgba(14,155,107,0.2)' : 'rgba(195,54,101,0.15)'}`,
              borderRadius: 8, marginBottom: 10, gap: 8,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600,
                color: testResponse.success ? 'var(--success)' : 'var(--danger)',
              }}>
                {testResponse.statusCode > 0
                  ? `${testResponse.statusCode} ${HTTP_STATUS_TEXT[testResponse.statusCode] ?? ''}`
                  : 'Error'
                }
                {' · '}{testResponse.durationMs}ms
                {testResponse.responseSize != null
                  ? ` · ${formatBytes(testResponse.responseSize)}`
                  : ''
                }
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleCopy}
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Copy style={{ width: 10, height: 10 }} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Body / Headers tabs */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
              {(['body', ...(hasResponseHeaders ? ['headers'] : [])] as Array<'body' | 'headers'>).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setResponseTab(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '5px 10px 6px', fontSize: 12, fontWeight: 500,
                    color: responseTab === t ? 'var(--ink)' : 'var(--ink-3)',
                    borderBottom: `2px solid ${responseTab === t ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: -1, textTransform: 'capitalize' as const,
                  }}
                >
                  {t}
                </button>
              ))}
              {responseTab === 'body' && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                  {(['pretty', 'raw'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBodyMode(m)}
                      style={{
                        background: bodyMode === m ? 'var(--bg-2)' : 'none',
                        border: '1px solid ' + (bodyMode === m ? 'var(--line)' : 'transparent'),
                        borderRadius: 4, cursor: 'pointer',
                        padding: '2px 8px', fontSize: 10.5, color: 'var(--ink-3)',
                        textTransform: 'capitalize' as const,
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body tab */}
            {responseTab === 'body' && (
              <div style={{ ...monoBlock, overflowX: 'auto', maxHeight: 220, overflowY: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
                  {bodyJson}
                </pre>
              </div>
            )}

            {/* Headers tab */}
            {responseTab === 'headers' && hasResponseHeaders && (
              <div style={{ ...monoBlock, maxHeight: 220, overflowY: 'auto' }}>
                {Object.entries(testResponse.responseHeaders!).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}>{k}:</span>
                    <span style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ✨ AI summary */}
            {testResponse.success && (
              <div style={{
                marginTop: 8, padding: '6px 10px',
                background: 'var(--bg-2)', borderRadius: 6,
                fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
              }}>
                ✨ {summariseResponse(testResponse.responseBody)}
              </div>
            )}

            {/* Success banner */}
            {testResponse.success && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                background: 'var(--success-soft)', border: '1px solid rgba(14,155,107,0.2)',
                borderRadius: 8, marginTop: 8,
              }}>
                <Check style={{ width: 11, height: 11, color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>Test passed</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                    Status {testResponse.statusCode} in {testResponse.durationMs}ms — the action is reachable and responding correctly.
                  </div>
                </div>
              </div>
            )}

            {/* Error diagnostic */}
            {!testResponse.success && (() => {
              const diag = getTestDiagnostic(testResponse.statusCode, testResponse.responseBody)
              return (
                <div style={{
                  padding: '10px 12px', background: 'var(--danger-soft)',
                  border: '1px solid rgba(195,54,101,0.15)', borderRadius: 8, marginTop: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: diag ? 6 : 0 }}>
                    <AlertTriangle style={{ width: 11, height: 11, color: 'var(--danger)', flexShrink: 0 }} />
                    <div style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--danger)' }}>
                      {diag ? diag.title : `Test failed — status ${testResponse.statusCode}`}
                    </div>
                  </div>
                  {diag && (
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', marginLeft: 18, lineHeight: 1.5 }}>
                      {diag.detail}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Root component                                                      */
/* ------------------------------------------------------------------ */

export default function NewActionBuilder({
  editing,
  onCancel,
  onSave,
  onRunTest,
}: NewActionBuilderProps) {
  const [tab, setTab] = useState<TabId>('setup')
  const [name, setName] = useState(editing?.name ?? '')
  const [config, setConfig] = useState<CustomActionConfig>(
    editing ? (editing.config as CustomActionConfig) : { ...EMPTY_CONFIG }
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<null | 'running' | 'ok' | 'err'>(null)
  const [testResponse, setTestResponse] = useState<TestResult | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  const isSaved = Boolean(editing?.id)
  const method = config.method ?? 'POST'

  // Auto-generate function name from action name
  useEffect(() => {
    setConfig((c) => ({ ...c, actionFunctionName: toFunctionName(name) }))
  }, [name])

  const isValid =
    name.trim().length > 0 &&
    config.actionFunctionName.trim().length > 0 &&
    (config.executionMode === 'client_side' || (config.apiUrl ?? '').trim().length > 8)

  const saveWarnings = useMemo(() => {
    const w: { key: string; msg: string }[] = []
    const trigger = config.triggerInstructions.trim()
    if (!trigger) {
      w.push({ key: 'trigger', msg: 'No trigger instructions — the agent won\'t know when to call this action.' })
    } else if (trigger.length < 20) {
      w.push({ key: 'trigger-short', msg: 'Trigger instructions are very short — add more detail for reliable invocation.' })
    }
    const auth = config.authConfig ?? { type: 'none' as const }
    if (auth.type === 'bearer' && !auth.bearerToken?.trim()) {
      w.push({ key: 'auth-bearer', msg: 'Bearer auth is selected but no token is configured.' })
    }
    if (auth.type === 'api_key' && !auth.apiKeyValue?.trim()) {
      w.push({ key: 'auth-apikey', msg: 'API key auth is selected but the key value is empty.' })
    }
    if (auth.type === 'basic' && !auth.basicPassword?.trim()) {
      w.push({ key: 'auth-basic', msg: 'Basic auth is selected but no password is set.' })
    }
    if (method === 'GET' && (config.bodyParams ?? []).length > 0) {
      w.push({ key: 'get-body', msg: 'Body params are ignored for GET requests — use Query Params instead.' })
    }
    return w
  }, [config, method])

  const patchConfig = (patch: Partial<CustomActionConfig>) =>
    setConfig((c) => ({ ...c, ...patch }))

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        ...(editing ? { id: editing.id, lastKnownUpdatedAt: editing.updatedAt } : {}),
        name: name.trim(),
        isEnabled: editing?.isEnabled ?? true,
        config,
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; errors?: string[] } } }).response?.data?.error
        ?? (err as { response?: { data?: { errors?: string[] } } }).response?.data?.errors?.join(', ')
      setSaveError(msg || 'Failed to save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    if (!isSaved) return
    setTestStatus('running')
    setTestResponse(null)
    try {
      const inputs: Record<string, unknown> = {}
      config.inputFields.forEach((f) => { inputs[f.name] = paramValues[f.name] ?? '' })
      const result = await onRunTest(editing!.id, inputs)
      setTestStatus(result.success ? 'ok' : 'err')
      setTestResponse(result)
      if (result.success) {
        try { localStorage.setItem(`ab-tested-${editing!.id}`, 'true') } catch { /* storage unavailable */ }
      }
    } catch (err: unknown) {
      setTestStatus('err')
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Could not reach the test endpoint — check your internet connection.'
      setTestResponse({ success: false, statusCode: 0, responseBody: { error: errMsg }, durationMs: 0 })
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* ── Sticky top header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '10px 22px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, color: 'var(--ink-3)',
            background: 'none', border: 0, cursor: 'pointer', padding: '4px 0',
            transition: 'color 0.12s',
          }}
          className="hover:!text-[var(--ink)]"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Back to Actions
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end', paddingRight: 16 }}>
          {!isSaved && <span className="badge badge--neutral">Draft</span>}
          {saveError && (
            <span style={{ fontSize: 12, color: 'var(--danger)', maxWidth: 340, textAlign: 'right' }}>{saveError}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {saveWarnings.length > 0 && (
            <div
              title={saveWarnings.map(w => w.msg).join('\n')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 6,
                background: 'var(--warn-soft)', border: '1px solid rgba(184,106,23,0.25)',
                fontSize: 12, color: 'var(--warn)', cursor: 'default',
                fontWeight: 500,
              }}
            >
              <AlertTriangle style={{ width: 11, height: 11 }} />
              {saveWarnings.length} warning{saveWarnings.length > 1 ? 's' : ''}
            </div>
          )}
          <button type="button" onClick={onCancel} className="btn btn--ghost btn--sm">Discard</button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isValid || saving}
            className="btn btn--primary btn--sm"
            title={!name.trim() ? 'Action name is required' : undefined}
          >
            <Check style={{ width: 12, height: 12 }} />
            {saving ? 'Saving…' : 'Save action'}
          </button>
        </div>
      </header>

      {/* ── Identity strip ── */}
      <div style={{
        padding: '18px 24px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720 }}>
          {/* Action name */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled action"
            style={{
              display: 'block', width: '100%',
              border: 'none', background: 'transparent',
              fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em',
              color: 'var(--ink)', padding: 0, marginBottom: 14,
              fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />

          {/* Method + URL bar */}
          <div style={{
            display: 'flex', alignItems: 'stretch',
            border: '1px solid var(--line)', borderRadius: 8,
            background: 'var(--bg)', overflow: 'hidden',
            transition: 'border-color 0.15s',
          }}>
            <UISelect value={method} onValueChange={(v) => patchConfig({ method: v as CustomActionConfig['method'] })}>
              <SelectTrigger
                segment
                style={{
                  background: (METHOD_COLORS[method] ?? METHOD_COLORS.POST).bg,
                  color: (METHOD_COLORS[method] ?? METHOD_COLORS.POST).color,
                  fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.04em', fontSize: 12.5,
                  width: 100, flexShrink: 0,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </UISelect>
            <input
              value={config.apiUrl ?? ''}
              onChange={(e) => patchConfig({ apiUrl: e.target.value })}
              placeholder="https://api.example.com/v1/…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '10px 14px', fontFamily: 'var(--font-mono)',
                fontSize: 12.5, color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 320px',
        flex: 1, minHeight: 0, overflow: 'hidden',
      }}>
        {/* Left: tabs + content */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          <nav style={{
            display: 'flex', gap: 0, padding: '0 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface)', flexShrink: 0,
            overflowX: 'auto',
          }}>
            {TABS.map(({ id, label, Icon }) => {
              const isActive = tab === id
              const count = id === 'params' ? config.inputFields.length : undefined
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '11px 14px',
                    fontSize: 12.5, fontWeight: 500,
                    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                    background: 'transparent', border: 0,
                    borderBottom: `2px solid ${isActive ? 'var(--ink)' : 'transparent'}`,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    marginBottom: -1, transition: 'color 0.12s',
                  }}
                >
                  <Icon style={{ width: 13, height: 13 }} />
                  {label}
                  {count !== undefined && count > 0 && (
                    <span style={{
                      fontSize: 10, padding: '1px 5px',
                      background: 'var(--bg-2)', color: 'var(--ink-3)',
                      borderRadius: 4, fontFamily: 'var(--font-mono)',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
            {tab === 'setup'    && <SetupTab config={config} patchConfig={patchConfig} />}
            {tab === 'params'   && <ParamsTab config={config} patchConfig={patchConfig} />}
            {tab === 'request'  && <RequestTab config={config} patchConfig={patchConfig} method={method} />}
            {tab === 'auth'     && <AuthTab config={config} patchConfig={patchConfig} />}
            {tab === 'response' && <ResponseTab config={config} patchConfig={patchConfig} />}
            {tab === 'when'     && <WhenToCallTab config={config} patchConfig={patchConfig} />}
          </div>
        </div>

        {/* Right: test runner */}
        <aside style={{ background: 'var(--bg)', overflowY: 'auto' }}>
          <TestRunner
            config={config}
            method={method}
            paramValues={paramValues}
            setParamValues={setParamValues}
            testStatus={testStatus}
            testResponse={testResponse}
            onRun={() => void runTest()}
            onClear={() => { setTestStatus(null); setTestResponse(null) }}
            isSaved={isSaved}
          />
        </aside>
      </div>
    </div>
  )
}
