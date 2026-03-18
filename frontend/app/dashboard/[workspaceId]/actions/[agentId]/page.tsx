'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import {
  Zap,
  Plus,
  Trash2,
  Globe,
  UserPlus,
  Ticket,
  Calendar,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  MousePointer,
  Loader2,
  ChevronRight,
} from 'lucide-react'

export type ActionType =
  | 'custom_api'
  | 'web_search'
  | 'collect_leads'
  | 'escalate'
  | 'calendly'
  | 'cal_com'
  | 'shopify'
  | 'stripe'
  | 'salesforce'
  | 'slack'
  | 'custom_button'

export interface AgentAction {
  id: number
  agentId: number
  workspaceId: number
  type: string
  name: string
  description: string | null
  enabled: boolean
  config: Record<string, unknown> | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** Single data input for a Custom API action. */
export interface CustomApiInputRow {
  name: string
  type: string
  description: string
  required: boolean
}

/** Header row for Custom API auth (e.g. x-api-key, Authorization). */
export interface CustomApiHeaderRow {
  name: string
  value: string
}

const ACTION_META: Record<
  ActionType,
  { name: string; description: string; icon: React.ComponentType<{ className?: string }>; available: boolean }
> = {
  custom_api: {
    name: 'Custom API',
    description: 'Call your backend or any external API. Define endpoint, method, and when the bot should use it.',
    icon: Zap,
    available: true,
  },
  web_search: {
    name: 'Web Search',
    description: 'Search the web in real time when the answer isn’t in your data. Optional domain restrictions.',
    icon: Globe,
    available: false,
  },
  collect_leads: {
    name: 'Collect Leads',
    description: 'Show a lead form in chat to capture name, email, phone. Control when to show and success message.',
    icon: UserPlus,
    available: false,
  },
  escalate: {
    name: 'Escalate to Human',
    description: 'Create a ticket in Zendesk, Salesforce, Intercom, etc. when the bot should hand off.',
    icon: Ticket,
    available: false,
  },
  calendly: {
    name: 'Calendly',
    description: 'Let users book appointments from chat. Show slots and confirm bookings.',
    icon: Calendar,
    available: false,
  },
  cal_com: {
    name: 'Cal.com',
    description: 'Same as Calendly using a Cal.com event URL.',
    icon: Calendar,
    available: false,
  },
  shopify: {
    name: 'Shopify',
    description: 'Get products, orders, cart; add to cart; update profile and billing (when store is connected).',
    icon: ShoppingBag,
    available: false,
  },
  stripe: {
    name: 'Stripe',
    description: 'Invoices, subscriptions, change billing address, manage plans (with identity verification).',
    icon: CreditCard,
    available: false,
  },
  salesforce: {
    name: 'Salesforce',
    description: 'Create cases or connect to live chat when the bot can’t resolve the issue.',
    icon: MessageSquare,
    available: false,
  },
  slack: {
    name: 'Slack',
    description: 'Send messages from the bot to your Slack workspace (notifications, alerts).',
    icon: MessageSquare,
    available: false,
  },
  custom_button: {
    name: 'Custom Button',
    description: 'Show clickable buttons in chat that link to pages or trigger flows (e.g. View pricing, Book demo).',
    icon: MousePointer,
    available: true,
  },
}

export default function ActionsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [actions, setActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<ActionType | null>(null)
  const [addName, setAddName] = useState('')
  const [addEndpoint, setAddEndpoint] = useState('')
  const [addMethod, setAddMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [addButtonLabel, setAddButtonLabel] = useState('')
  const [addButtonUrl, setAddButtonUrl] = useState('')
  const [addWhenToUse, setAddWhenToUse] = useState('')
  const [addMockResponse, setAddMockResponse] = useState('')
  const [addHeaders, setAddHeaders] = useState<CustomApiHeaderRow[]>([])
  const [addInputs, setAddInputs] = useState<CustomApiInputRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const fetchActions = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    try {
      const { data } = await api.get<{ actions: AgentAction[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/actions`
      )
      setActions(data.actions ?? [])
    } catch {
      setActions([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, agentId])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  const handleAdd = async () => {
    if (!workspaceId || !agentId || !addType) return
    setError(null)
    setSaving(true)
    try {
      let config: Record<string, unknown> = {}
      if (addType === 'custom_api') {
        const inputs = addInputs
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            type: i.type || 'string',
            description: i.description.trim() || undefined,
            required: i.required,
          }))
        const headersObj: Record<string, string> = {}
        addHeaders.forEach((h) => {
          if (h.name.trim() && h.value.trim()) headersObj[h.name.trim()] = h.value.trim()
        })
        config = {
          endpoint: addEndpoint.trim(),
          method: addMethod,
          whenToUse: addWhenToUse.trim() || undefined,
          ...(inputs.length > 0 && { inputs }),
          ...(addMockResponse.trim() && { mockResponse: addMockResponse.trim() }),
          ...(Object.keys(headersObj).length > 0 && { headers: headersObj }),
        }
      } else if (addType === 'custom_button') {
        config = {
          label: addButtonLabel.trim() || 'Button',
          url: addButtonUrl.trim(),
        }
      }
      await api.post(`/workspaces/${workspaceId}/agents/${agentId}/actions`, {
        type: addType,
        name: addName.trim() || (addType === 'custom_button' ? addButtonLabel.trim() || 'Button' : 'Unnamed action'),
        description: addWhenToUse.trim() || null,
        enabled: true,
        config: Object.keys(config).length ? config : undefined,
      })
      await fetchActions()
      setAddOpen(false)
      setAddType(null)
      setAddName('')
      setAddEndpoint('')
      setAddMethod('GET')
      setAddButtonLabel('')
      setAddButtonUrl('')
      setAddWhenToUse('')
      setAddMockResponse('')
      setAddHeaders([])
      setAddInputs([])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setError(err?.response?.data?.error || err?.message || 'Failed to add action')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (action: AgentAction) => {
    if (!workspaceId || !agentId) return
    try {
      await api.put(
        `/workspaces/${workspaceId}/agents/${agentId}/actions/${action.id}`,
        { enabled: !action.enabled }
      )
      await fetchActions()
    } catch {
      // keep UI state
    }
  }

  const handleDelete = async (action: AgentAction) => {
    if (!workspaceId || !agentId) return
    if (!confirm(`Delete "${action.name}"?`)) return
    try {
      await api.delete(
        `/workspaces/${workspaceId}/agents/${agentId}/actions/${action.id}`
      )
      await fetchActions()
    } catch {
      // ignore
    }
  }

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
          <p className="text-sm">Select an agent to manage Actions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Actions</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Let your agent call APIs, search the web, collect leads, show buttons, and more. Add and configure actions below.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Configured actions */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-700">Configured actions</h2>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : actions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No actions yet. Add one below.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {actions.map((a) => {
                const meta = ACTION_META[a.type as ActionType] ?? {
                  name: a.type,
                  description: '',
                  icon: Zap,
                  available: true,
                }
                const Icon = meta.icon
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{a.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {meta.name}
                          {a.description ? ` · ${a.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(a)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          a.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.enabled ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Add action */}
        <section>
          <h2 className="text-sm font-medium text-slate-700">Add action</h2>
          {!addOpen ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
              {(Object.entries(ACTION_META) as [ActionType, typeof ACTION_META[ActionType]][]).map(
                ([type, meta]) => {
                  const Icon = meta.icon
                  const canAdd = meta.available
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (canAdd) {
                          setAddType(type)
                          setAddOpen(true)
                          setAddName('')
                          setAddEndpoint('')
                          setAddButtonLabel('')
                          setAddButtonUrl('')
                          setAddWhenToUse('')
                          setAddMockResponse('')
                          setAddHeaders([])
                          setAddInputs(type === 'custom_api' ? [{ name: '', type: 'string', description: '', required: true }] : [])
                          setError(null)
                        }
                      }}
                      className={`flex flex-col rounded-xl border p-4 text-left transition ${
                        canAdd
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          : 'border-dashed border-slate-200 bg-slate-50/50 opacity-80 cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            canAdd ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{meta.name}</p>
                          {!canAdd && (
                            <span className="text-xs text-slate-500">Coming soon</span>
                          )}
                        </div>
                        {canAdd && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      </div>
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2">{meta.description}</p>
                    </button>
                  )
                }
              )}
            </div>
          ) : (
            <div className="mt-3 max-w-lg rounded-xl border border-slate-200 bg-slate-50/50 p-5">
              {addType && (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    New {ACTION_META[addType].name}
                  </p>
                  {addType === 'custom_api' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Name</label>
                        <input
                          type="text"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="e.g. Check order status"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Endpoint URL</label>
                        <input
                          type="url"
                          value={addEndpoint}
                          onChange={(e) => setAddEndpoint(e.target.value)}
                          placeholder="https://api.example.com/orders/{{orderId}} or :orderId"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <p className="mt-0.5 text-xs text-slate-500">
                          Use {'{{orderId}}'} or :orderId for path/query. Collected inputs are sent as query (GET) or JSON body (POST/PUT).
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Method</label>
                        <select
                          value={addMethod}
                          onChange={(e) => setAddMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE')}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-slate-600">Headers (optional)</label>
                          <button
                            type="button"
                            onClick={() => setAddHeaders((prev) => [...prev, { name: '', value: '' }])}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            + Add header
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Sent on every request. Use for API keys (e.g. x-api-key) or Authorization: Bearer token. Keep keys server-side only.
                        </p>
                        <div className="mt-2 space-y-2">
                          {addHeaders.map((h, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={h.name}
                                onChange={(e) =>
                                  setAddHeaders((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))
                                }
                                placeholder="Header name (e.g. x-api-key)"
                                className="w-36 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                              <input
                                type="password"
                                value={h.value}
                                onChange={(e) =>
                                  setAddHeaders((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))
                                }
                                placeholder="Value (hidden)"
                                className="min-w-[140px] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setAddHeaders((prev) => prev.filter((_, i) => i !== idx))}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                aria-label="Remove header"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">When to use</label>
                        <input
                          type="text"
                          value={addWhenToUse}
                          onChange={(e) => setAddWhenToUse(e.target.value)}
                          placeholder="e.g. When user asks about order status, tracking, or “where is my order”. Ask for order ID if missing."
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Mock response (optional, for testing)</label>
                        <textarea
                          value={addMockResponse}
                          onChange={(e) => setAddMockResponse(e.target.value)}
                          placeholder={'{"orderId": "{{orderId}}", "status": "Shipped", "estimatedDelivery": "2026-03-25", "trackingUrl": "https://track.example.com/{{orderId}}"}'}
                          rows={4}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                        />
                        <p className="mt-0.5 text-xs text-slate-500">
                          If set, this JSON is returned instead of calling the API. Use {'{{orderId}}'} to inject collected inputs. Great for testing without a real endpoint.
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-slate-600">Data inputs</label>
                          <button
                            type="button"
                            onClick={() => setAddInputs((prev) => [...prev, { name: '', type: 'string', description: '', required: true }])}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            + Add input
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Define what the agent should collect (e.g. orderId, email). For POST with nested JSON, use a single input named <code className="rounded bg-slate-100 px-0.5">payload</code> (type: object) and describe the full structure in the description.
                        </p>
                        <div className="mt-2 space-y-2">
                          {addInputs.map((input, idx) => (
                            <div key={idx} className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
                              <input
                                type="text"
                                value={input.name}
                                onChange={(e) =>
                                  setAddInputs((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                                  )
                                }
                                placeholder="e.g. orderId"
                                className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                              <select
                                value={input.type}
                                onChange={(e) =>
                                  setAddInputs((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, type: e.target.value } : p))
                                  )
                                }
                                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                              >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                                <option value="object">object (nested JSON)</option>
                              </select>
                              <input
                                type="text"
                                value={input.description}
                                onChange={(e) =>
                                  setAddInputs((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p))
                                  )
                                }
                                placeholder="Description for the agent"
                                className="min-w-[140px] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={input.required}
                                  onChange={(e) =>
                                    setAddInputs((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, required: e.target.checked } : p))
                                    )
                                  }
                                />
                                Required
                              </label>
                              <button
                                type="button"
                                onClick={() => setAddInputs((prev) => prev.filter((_, i) => i !== idx))}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                aria-label="Remove input"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {addType === 'custom_button' && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Button label</label>
                        <input
                          type="text"
                          value={addButtonLabel}
                          onChange={(e) => setAddButtonLabel(e.target.value)}
                          placeholder="e.g. View pricing"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">URL</label>
                        <input
                          type="url"
                          value={addButtonUrl}
                          onChange={(e) => setAddButtonUrl(e.target.value)}
                          placeholder="https://yoursite.com/pricing"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600">Name (internal)</label>
                        <input
                          type="text"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          placeholder="e.g. Pricing button"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="mt-3 text-sm text-red-600">{error}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={saving || (addType === 'custom_api' && !addEndpoint.trim()) || (addType === 'custom_button' && (!addButtonLabel.trim() || !addButtonUrl.trim()))}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add action
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddOpen(false)
                        setAddType(null)
                        setError(null)
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
