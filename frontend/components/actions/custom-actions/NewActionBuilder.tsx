'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  Check,
  Settings2,
  List,
  Globe,
  Shield,
  Zap,
  MessageSquare,
  Plus,
  Trash2,
  Play,
  Info,
  Copy,
  AlertTriangle,
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
  authConfig: { type: 'none' },
}

type TabId = 'setup' | 'params' | 'request' | 'auth' | 'response' | 'when'

interface Tab {
  id: TabId
  label: string
  Icon: React.FC<{ style?: React.CSSProperties }>
}

const TABS: Tab[] = [
  { id: 'setup', label: 'Setup', Icon: Settings2 },
  { id: 'params', label: 'Parameters', Icon: List },
  { id: 'request', label: 'Request', Icon: Globe },
  { id: 'auth', label: 'Auth', Icon: Shield },
  { id: 'response', label: 'Response', Icon: Zap },
  { id: 'when', label: 'When to call', Icon: MessageSquare },
]

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: '#ecfdf5', color: '#166534' },
  POST:   { bg: '#f5f3ff', color: '#5b21b6' },
  PUT:    { bg: '#fef3c7', color: '#92400e' },
  PATCH:  { bg: '#fae8ff', color: '#6b21a8' },
  DELETE: { bg: '#fee2e2', color: '#991b1b' },
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

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
  ) => Promise<{ success: boolean; statusCode: number; responseBody: unknown; durationMs: number }>
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
  requireConfirm,
  setRequireConfirm,
  streaming,
  setStreaming,
  tags,
  setTags,
}: {
  requireConfirm: boolean
  setRequireConfirm: (v: boolean) => void
  streaming: boolean
  setStreaming: (v: boolean) => void
  tags: string[]
  setTags: (v: string[]) => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [rateUnit, setRateUnit] = useState('minute')

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  return (
    <div>
      <Eyebrow>Behavior</Eyebrow>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Require user confirmation</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Agent shows the inputs and asks the user to approve before calling. Recommended for destructive or paid actions.
              </div>
            </div>
            <ABToggle on={requireConfirm} onClick={() => setRequireConfirm(!requireConfirm)} />
          </label>
          <div className="divider" style={{ margin: '6px 0' }} />
          <label style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Allow streaming responses</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Let the agent narrate the API result as it streams back.
              </div>
            </div>
            <ABToggle on={streaming} onClick={() => setStreaming(!streaming)} />
          </label>
        </div>
      </div>

      <Eyebrow>Categorization</Eyebrow>
      <div className="card">
        <div className="card-body" style={{ padding: 14 }}>
          <label className="field">
            <span className="field-label">Tags</span>
            <div className="ab-tags">
              {tags.map((t) => (
                <span key={t} className="ab-tag-chip">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} style={{ background: 'none', border: 0, cursor: 'pointer', padding: '0 0 0 4px', color: 'inherit' }}>×</button>
                </span>
              ))}
              <input
                className="ab-tag-input"
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
            <span className="field-hint">Tags help group actions and filter logs. Press Enter to add.</span>
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Rate limit</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="input" style={{ width: 80 }} type="number" defaultValue={30} />
              <UISelect value={rateUnit} onValueChange={setRateUnit}>
                <SelectTrigger compact style={{ width: 140 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">calls / minute</SelectItem>
                  <SelectItem value="hour">calls / hour</SelectItem>
                  <SelectItem value="day">calls / day</SelectItem>
                </SelectContent>
              </UISelect>
              <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>per conversation</span>
            </div>
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
        {/* Head row */}
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
                placeholder="Description — tell the agent how to extract this value"
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
  const bodyType = (config as { _bodyType?: string })._bodyType ?? (
    ['POST', 'PUT', 'PATCH'].includes(method) ? 'json' : 'none'
  )

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
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {['json', 'form', 'none'].map((t) => (
              <button
                key={t}
                type="button"
                className={`ab-pill ${bodyType === t ? 'ab-pill--active' : ''}`}
                onClick={() => patchConfig({ bodyParams: [] })}
              >
                {t === 'json' ? 'JSON' : t === 'form' ? 'Form data' : 'None'}
              </button>
            ))}
          </div>
          {bodyType === 'json' && (
            <div className="ab-code-wrap">
              <div className="ab-code-head">
                <span className="mono">application/json</span>
                <button type="button" className="ab-mini-btn">
                  <Copy style={{ width: 11, height: 11 }} /> Format
                </button>
              </div>
              <textarea
                className="ab-code"
                rows={8}
                defaultValue={`{\n  "id": "{{id}}"\n}`}
                spellCheck={false}
              />
            </div>
          )}
          {bodyType !== 'json' && (
            <div style={{ fontSize: 12.5, padding: 14, background: 'var(--bg-2)', borderRadius: 8, color: 'var(--ink-3)' }}>
              {bodyType === 'form'
                ? 'Form fields will be auto-generated from your Parameters.'
                : 'No body will be sent. Parameters will be passed as URL query strings.'}
            </div>
          )}
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
          Use <code className="code-inline">{'{{param_name}}'}</code> to insert parameter values. They get filled at runtime.
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
    { id: 'none', label: 'None', desc: 'Public endpoint' },
    { id: 'bearer', label: 'Bearer token', desc: 'Authorization: Bearer …' },
    { id: 'basic', label: 'Basic auth', desc: 'Username + password' },
    { id: 'apikey', label: 'API key in header', desc: 'Custom header name' },
    { id: 'oauth', label: 'OAuth 2.0', desc: 'Connect a provider' },
  ]
  // Map design IDs to production auth type stored in config
  const authUiId = auth.type === 'api_key' ? 'apikey' : auth.type === 'oauth_bearer' ? 'oauth' : auth.type
  const uiToAuthType = (id: string): AuthType => id === 'apikey' ? 'api_key' : id === 'oauth' ? 'oauth_bearer' : id as AuthType

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
            { code: '401, 403', label: 'Auth errors', action: 'Tell the user the integration needs attention' },
            { code: '404', label: 'Not found', action: "Tell the user the resource doesn't exist" },
            { code: '429', label: 'Rate limited', action: 'Retry once with backoff, then tell the user' },
            { code: '5xx', label: 'Server errors', action: 'Retry twice, then apologize and offer to escalate' },
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
  return (
    <div>
      <Eyebrow>Trigger instructions</Eyebrow>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
        Plain-English description of when the agent should call this action. The agent uses this to decide between actions.
      </p>
      <textarea
        className="textarea"
        rows={4}
        value={config.triggerInstructions}
        onChange={(e) => patchConfig({ triggerInstructions: e.target.value })}
        placeholder="e.g. When the user asks about an order status, refund, or shipment."
        style={{ width: '100%', fontSize: 13 }}
      />

      <Eyebrow style={{ marginTop: 24 }}>Examples (few-shot)</Eyebrow>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, marginBottom: 12 }}>
        Give the agent examples of conversations that should — and shouldn't — trigger this action.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {[
          { kind: 'positive' as const, text: 'Where is my order #4421?' },
          { kind: 'negative' as const, text: 'What are your business hours?' },
        ].map((ex, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: ex.kind === 'positive' ? 'var(--success)' : 'var(--ink-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              {ex.kind === 'positive'
                ? <span className="badge badge--success"><Check style={{ width: 10, height: 10 }} /> Should call</span>
                : <span className="badge badge--neutral">Should NOT call</span>
              }
              <IconBtn onClick={() => {}}><Trash2 style={{ width: 13, height: 13 }} /></IconBtn>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic' }}>"{ex.text}"</div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--ghost btn--sm">
        <Plus style={{ width: 12, height: 12 }} /> Add example
      </button>
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
  testResponse: { success: boolean; statusCode: number; responseBody: unknown; durationMs: number } | null
  onRun: () => void
  onClear: () => void
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
}: TestRunnerProps) {
  const fields = config.inputFields ?? []
  const headers = config.headers ?? []
  const url = (config.apiUrl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k: string) => paramValues[k] ?? `{{${k}}}`)
  const methodStyle = METHOD_COLORS[method] ?? { bg: 'var(--bg-2)', color: 'var(--ink-3)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Head */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', fontWeight: 500,
          }}>Test runner</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>
            Try this action with sample inputs.
          </div>
        </div>
        {testStatus && testStatus !== 'running' && (
          <button type="button" onClick={onClear} className="btn btn--ghost btn--sm">Clear</button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Sample inputs */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8,
          }}>Sample inputs</div>
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

        {/* Outgoing request preview */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8,
          }}>Outgoing request</div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '10px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7,
            color: 'var(--ink-2)', overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--line)' }}>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.04em', background: methodStyle.bg, color: methodStyle.color,
              }}>{method}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink)', wordBreak: 'break-all' }}>{url || 'https://api.example.com/…'}</span>
            </div>
            {headers.filter((h) => h.key).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{h.key}:</span>
                <span style={{ color: 'var(--ink)' }}>{h.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          type="button"
          onClick={onRun}
          disabled={testStatus === 'running'}
          className="btn btn--primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {testStatus === 'running' ? (
            <><span className="dot-pulse" /> Sending test request…</>
          ) : (
            <><Play style={{ width: 12, height: 12 }} /> Run test request</>
          )}
        </button>

        {/* Response */}
        {testResponse && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8,
            }}>
              <span>Response</span>
              <span className={`badge ${testResponse.success ? 'badge--success' : 'badge--danger'}`}>
                {testResponse.statusCode} · {testResponse.durationMs}ms
              </span>
            </div>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7,
              overflowX: 'auto',
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
                {JSON.stringify(testResponse.responseBody, null, 2)}
              </pre>
            </div>
            {testResponse.success && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', background: 'var(--success-soft)',
                border: '1px solid rgba(14,155,107,0.2)', borderRadius: 8, marginTop: 8,
              }}>
                <Check style={{ width: 11, height: 11, color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>Test passed</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                    Status {testResponse.statusCode} in {testResponse.durationMs}ms
                  </div>
                </div>
              </div>
            )}
            {!testResponse.success && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', background: 'var(--danger-soft)',
                border: '1px solid rgba(195,54,101,0.15)', borderRadius: 8, marginTop: 8,
              }}>
                <AlertTriangle style={{ width: 11, height: 11, color: 'var(--danger)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--danger)' }}>Test failed</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                    Status {testResponse.statusCode} in {testResponse.durationMs}ms
                  </div>
                </div>
              </div>
            )}
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
  const [requireConfirm, setRequireConfirm] = useState(false)
  const [streaming, setStreaming] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [testStatus, setTestStatus] = useState<null | 'running' | 'ok' | 'err'>(null)
  const [testResponse, setTestResponse] = useState<{
    success: boolean
    statusCode: number
    responseBody: unknown
    durationMs: number
  } | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  const isSaved = Boolean(editing?.id)
  const method = config.method ?? 'POST'
  const isValid = name.trim().length > 0 && (
    config.executionMode === 'client_side' || (config.apiUrl ?? '').trim().length > 8
  )

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
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setSaveError(msg || 'Failed to save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    if (!editing?.id) {
      setTestStatus('err')
      setTestResponse({ success: false, statusCode: 0, responseBody: { error: 'Save this action first, then run a live test.' }, durationMs: 0 })
      return
    }
    setTestStatus('running')
    setTestResponse(null)
    try {
      const inputs: Record<string, unknown> = {}
      config.inputFields.forEach((f) => { inputs[f.name] = paramValues[f.name] ?? '' })
      const result = await onRunTest(editing.id, inputs)
      setTestStatus(result.success ? 'ok' : 'err')
      setTestResponse(result)
    } catch {
      setTestStatus('err')
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
          {!isSaved && (
            <span className="badge badge--neutral">Draft</span>
          )}
          <span className="muted" style={{ fontSize: 11.5 }}>
            Autosaved <span style={{ fontFamily: 'var(--font-mono)' }}>just now</span>
          </span>
          {saveError && (
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>{saveError}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={onCancel} className="btn btn--ghost btn--sm">Discard</button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isValid || saving}
            className="btn btn--primary btn--sm"
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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled action"
            style={{
              display: 'block', width: '100%',
              border: 'none', background: 'transparent',
              fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em',
              color: 'var(--ink)', padding: 0, marginBottom: 6,
              fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />
          <input
            value={config.triggerInstructions}
            onChange={(e) => patchConfig({ triggerInstructions: e.target.value })}
            placeholder="What does this action do? (visible to the agent)"
            style={{
              display: 'block', width: '100%',
              border: 'none', background: 'transparent',
              fontSize: 13.5, color: 'var(--ink-3)', padding: 0,
              marginBottom: 14, fontFamily: 'var(--font-sans)', outline: 'none',
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
                  minWidth: 90,
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
          {/* Tab nav */}
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

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
            {tab === 'setup' && (
              <SetupTab
                requireConfirm={requireConfirm}
                setRequireConfirm={setRequireConfirm}
                streaming={streaming}
                setStreaming={setStreaming}
                tags={tags}
                setTags={setTags}
              />
            )}
            {tab === 'params' && (
              <ParamsTab config={config} patchConfig={patchConfig} />
            )}
            {tab === 'request' && (
              <RequestTab config={config} patchConfig={patchConfig} method={method} />
            )}
            {tab === 'auth' && (
              <AuthTab config={config} patchConfig={patchConfig} />
            )}
            {tab === 'response' && (
              <ResponseTab config={config} patchConfig={patchConfig} />
            )}
            {tab === 'when' && (
              <WhenToCallTab config={config} patchConfig={patchConfig} />
            )}
          </div>
        </div>

        {/* Right: test runner */}
        <aside style={{
          background: 'var(--bg)', overflowY: 'auto',
          borderLeft: '1px solid var(--line)',
        }}>
          <TestRunner
            config={config}
            method={method}
            paramValues={paramValues}
            setParamValues={setParamValues}
            testStatus={testStatus}
            testResponse={testResponse}
            onRun={() => void runTest()}
            onClear={() => { setTestStatus(null); setTestResponse(null) }}
          />
        </aside>
      </div>
    </div>
  )
}
