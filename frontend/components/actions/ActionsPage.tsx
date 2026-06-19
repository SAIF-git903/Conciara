'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import {
  Calendar,
  CalendarDays,
  ChevronRight,
  Code2,
  CreditCard,
  Headphones,
  Layers,
  LayoutTemplate,
  MessageSquare,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  Search,
  Server,
  UserPlus,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import NewActionBuilder from '@/components/actions/custom-actions/NewActionBuilder'
import CustomButtonsDrawer from '@/components/actions/custom-buttons/CustomButtonsDrawer'
import { useActions } from '@/hooks/useActions'
import { useActionTest } from '@/hooks/useActionTest'
import type { ActionType, ChatbotAction, CustomActionConfig, CustomButtonsConfig } from '@/components/actions/types'

// ──────────────────────── Catalog data ────────────────────────
interface CatalogItem {
  id: string
  icon: ElementType
  color: string
  name: string
  tag: string
  desc: string
  actionType: ActionType | null
}

interface CatalogGroup {
  group: string
  items: CatalogItem[]
}

const ACTION_CATALOG: CatalogGroup[] = [
  {
    group: 'Custom',
    items: [
      { id: 'custom-server',    icon: Server,           color: '#5b6cff', name: 'Server',           tag: 'API',      desc: 'Call an external API. The agent uses the response to answer the user.',                       actionType: 'custom_action' },
      { id: 'custom-server-ui', icon: Layers,            color: '#7c3aed', name: 'Server + Widget',  tag: 'API + UI', desc: 'Call an API and display the result as a rich interactive widget in chat.',                     actionType: null },
      { id: 'custom-client',    icon: Code2,             color: '#0891b2', name: 'Client',           tag: 'Browser',  desc: "Run JavaScript in the user's browser via your embed. No server needed.",                       actionType: null },
      { id: 'custom-widget',    icon: LayoutTemplate,    color: '#475569', name: 'Widget only',      tag: 'UI',       desc: 'Show a standalone widget in chat — no API call. Built from conversation context.',              actionType: null },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { id: 'stripe',        icon: CreditCard,        color: '#635bff', name: 'Stripe',            tag: 'Payments',    desc: 'Show invoices, subscriptions, and billing info. Let users update payment methods.',             actionType: 'stripe' },
      { id: 'web-search',    icon: Search,            color: '#0e9b6b', name: 'Web Search',        tag: 'Search',      desc: 'Search the web in real time. Gives the agent access to current, up-to-date information.',       actionType: 'web_search' },
      { id: 'collect-leads', icon: UserPlus,          color: '#b86a17', name: 'Collect Leads',     tag: 'CRM',         desc: 'Collect name, email, and phone from users. Leads are stored in your dashboard.',                actionType: 'collect_leads' },
      { id: 'escalate',      icon: Headphones,        color: '#c33665', name: 'Escalate to Human', tag: 'Support',     desc: 'Create support tickets in Zendesk, Salesforce, Intercom, Freshdesk, or Zoho Desk.',             actionType: 'escalate_human' },
      { id: 'slack',         icon: MessageSquare,     color: '#611f69', name: 'Slack',             tag: 'Notify',      desc: 'Send messages to Slack channels or DMs when an event happens inside the chat.',                actionType: 'slack' },
      { id: 'calendly',      icon: CalendarDays,      color: '#00a2ff', name: 'Calendly',          tag: 'Scheduling',  desc: 'Show available time slots and let users book meetings — directly inside the conversation.',     actionType: 'calendly' },
      { id: 'cal-com',       icon: Calendar,          color: '#111118', name: 'Cal.com',           tag: 'Scheduling',  desc: 'Connect a Cal.com event URL. Users can browse availability and confirm bookings in chat.',      actionType: null },
      { id: 'buttons',       icon: MousePointerClick, color: '#1d8348', name: 'Custom Buttons',    tag: 'Navigation',  desc: 'Display tappable buttons that route users to specific pages or trigger flows.',                actionType: 'custom_buttons' },
    ],
  },
]

const ALL_CATALOG_ITEMS: CatalogItem[] = ACTION_CATALOG.flatMap(g => g.items)

const ACTION_TYPE_DESIGN_META: Record<string, { label: string; color: string }> = {
  custom_action:   { label: 'Server',     color: '#5b6cff' },
  custom_buttons:  { label: 'Buttons',    color: '#1d8348' },
  stripe:          { label: 'Stripe',     color: '#635bff' },
  web_search:      { label: 'Web Search', color: '#0e9b6b' },
  collect_leads:   { label: 'Leads',      color: '#b86a17' },
  escalate_human:  { label: 'Escalate',   color: '#c33665' },
  slack:           { label: 'Slack',      color: '#611f69' },
  calendly:        { label: 'Calendly',   color: '#00a2ff' },
  shopify:         { label: 'Shopify',    color: '#7ab55c' },
  salesforce:      { label: 'Salesforce', color: '#00a1e0' },
}

// ──────────────────────── Small helpers ────────────────────────
const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: 'var(--success-soft)', color: 'var(--success)' },
  POST:   { bg: 'var(--accent-soft)',  color: 'var(--accent)'  },
  PUT:    { bg: 'var(--warn-soft)',    color: 'var(--warn)'    },
  PATCH:  { bg: 'var(--warn-soft)',    color: 'var(--warn)'    },
  DELETE: { bg: 'var(--danger-soft)', color: 'var(--danger)'  },
}

function MethodBadge({ method }: { method: string }) {
  const c = METHOD_COLORS[method] ?? { bg: 'var(--bg-2)', color: 'var(--ink-3)' }
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 'var(--r-sm)', flexShrink: 0,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
      fontFamily: 'var(--font-mono)', background: c.bg, color: c.color,
    }}>
      {method}
    </span>
  )
}

interface ToastMessage {
  id: string
  text: string
  variant?: 'error' | 'default'
}

function Toasts({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-fade-in"
          style={{
            padding: '8px 12px', borderRadius: 'var(--r-md)',
            fontSize: 13, fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            border: toast.variant === 'error' ? '1px solid var(--danger-soft)' : '1px solid var(--line-2)',
            background: toast.variant === 'error' ? 'var(--danger-soft)' : 'var(--surface)',
            color: toast.variant === 'error' ? 'var(--danger)' : 'var(--ink)',
          }}
        >
          {toast.text}
        </div>
      ))}
    </div>
  )
}

// ──────────────────────── Main component ────────────────────────
interface ActionsPageProps {
  chatbotIdParam?: string
}

export default function ActionsPage({ chatbotIdParam }: ActionsPageProps) {
  const { currentWorkspace, currentAgent } = useDashboard()
  const workspaceId = currentWorkspace?.id
  const chatbotId = chatbotIdParam ?? currentAgent?.id

  const [view, setView] = useState<'list' | 'catalog' | 'builder'>('list')
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null)
  const [openType, setOpenType] = useState<ActionType | null>(null)
  const [builderEditing, setBuilderEditing] = useState<ChatbotAction | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const {
    actionsByType, loading, error, canFetch,
    loadActions, saveAction, deleteAction, toggleAction,
  } = useActions({ workspaceId, chatbotId })
  const { runTest } = useActionTest({ workspaceId, chatbotId })

  useEffect(() => {
    if (!canFetch) return
    void loadActions()
  }, [canFetch, loadActions])

  const addToast = (text: string, variant: ToastMessage['variant'] = 'default') => {
    const id = crypto.randomUUID()
    setToasts(p => [...p, { id, text, variant }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }

  const allActions = useMemo(() => Object.values(actionsByType).flat(), [actionsByType])
  const customButtons = useMemo(() => actionsByType.custom_buttons ?? [], [actionsByType])
  const activeCount = useMemo(() => allActions.filter(a => a.isEnabled).length, [allActions])
  const dangerCount = useMemo(() => {
    return allActions.filter(a => {
      const cfg = a.config as CustomActionConfig
      return cfg.method === 'DELETE'
    }).length
  }, [allActions])

  const openBuilder = (action?: ChatbotAction) => {
    setBuilderEditing(action ?? null)
    setView('builder')
  }

  const handleCatalogConfigure = (item: CatalogItem) => {
    if (item.actionType === 'custom_action') {
      setView('builder')
    } else if (item.actionType === 'custom_buttons') {
      setView('list')
      setSelectedCatalogId(null)
      setOpenType('custom_buttons')
    } else if (item.actionType) {
      addToast(`${item.name} coming soon`)
      setView('list')
      setSelectedCatalogId(null)
    } else {
      addToast(`${item.name} coming soon`)
      setView('list')
      setSelectedCatalogId(null)
    }
  }

  // ── Builder view ──
  if (view === 'builder') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <NewActionBuilder
          editing={builderEditing}
          onCancel={() => { setBuilderEditing(null); setView('list') }}
          onSave={async (payload) => {
            const action = await saveAction({
              ...payload,
              type: 'custom_action',
              config: payload.config as CustomActionConfig,
            })
            addToast('Action saved')
            setBuilderEditing(null)
            setView('list')
            return action
          }}
          onRunTest={runTest}
        />
        <Toasts toasts={toasts} />
      </div>
    )
  }

  // ── Catalog view ──
  if (view === 'catalog') {
    const selectedItem = ALL_CATALOG_ITEMS.find(i => i.id === selectedCatalogId)
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <button
            type="button"
            onClick={() => { setView('list'); setSelectedCatalogId(null) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12.5, color: 'var(--ink-3)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12,
            }}
            className="hover:!text-[var(--ink)]"
          >
            <ChevronRight style={{ width: 12, height: 12, transform: 'rotate(180deg)' }} />
            Back to Actions
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>
            Add action
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: '0 0 24px' }}>
            Choose a type — you can configure every detail after.
          </p>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {ACTION_CATALOG.map(group => (
            <div key={group.group} style={{ marginBottom: 28 }}>
              <div className="section-eyebrow" style={{ marginBottom: 12 }}>{group.group}</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 10,
              }}>
                {group.items.map(item => {
                  const Icon = item.icon
                  const isSelected = selectedCatalogId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCatalogId(item.id)}
                      onDoubleClick={() => { setSelectedCatalogId(item.id); handleCatalogConfigure(item) }}
                      style={{
                        textAlign: 'left', padding: '14px 14px 12px',
                        borderRadius: 'var(--r-lg)',
                        border: `1.5px solid ${isSelected ? item.color : 'var(--line)'}`,
                        background: isSelected ? item.color + '08' : 'var(--surface)',
                        cursor: 'pointer', transition: 'border-color .12s, box-shadow .12s',
                        boxShadow: isSelected ? `0 0 0 3px ${item.color}22` : 'none',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                      className="hover:border-[var(--line-strong)]"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 'var(--r-md)',
                          background: item.color + '18',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: item.color, flexShrink: 0,
                        }}>
                          <Icon style={{ width: 16, height: 16 }} />
                        </div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)',
                          padding: '2px 7px', borderRadius: 'var(--r-sm)',
                          background: 'var(--bg-2)', color: 'var(--ink-3)',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.tag}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>{item.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => { setView('list'); setSelectedCatalogId(null) }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selectedCatalogId}
              onClick={() => { if (selectedItem) handleCatalogConfigure(selectedItem) }}
            >
              Configure {selectedItem ? selectedItem.name : 'action'} →
            </button>
          </div>
        </div>
        <Toasts toasts={toasts} />
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>
              Actions
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0 }}>
              Give your agent superpowers — call APIs, book meetings, collect leads, search the web, and more.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setView('catalog')}
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            <Plus style={{ width: 12, height: 12 }} />
            Add action
          </button>
        </div>

        {loading && <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Loading actions…</p>}
        {error && (
          <div style={{
            marginBottom: 16, padding: '8px 12px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--danger-soft)', background: 'var(--danger-soft)',
            fontSize: 13, color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Active actions',    value: activeCount,        sub: 'Configured and live' },
            { label: 'Total configured',  value: allActions.length,  sub: 'Across all action types' },
            { label: 'Needs confirmation', value: dangerCount,       sub: 'Require user approval' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--ink-4)',
                fontFamily: 'var(--font-mono)', marginBottom: 8,
              }}>
                {s.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Configured actions */}
        {allActions.length > 0 && (
          <div className="card" style={{ marginBottom: 24, overflow: 'visible' }}>
            <div className="card-header">
              <div className="card-title">Configured actions</div>
            </div>
            <div style={{ padding: '0 0 4px' }}>
              {allActions.map((action, idx) => {
                const meta = ACTION_TYPE_DESIGN_META[action.type] ?? { label: action.type, color: '#5b6cff' }
                const cfg = action.config as CustomActionConfig
                const method = cfg.method
                const url = cfg.apiUrl
                const catalogItem = ALL_CATALOG_ITEMS.find(i => i.actionType === action.type)
                const Icon = catalogItem?.icon

                const hasBeenTested = typeof window !== 'undefined'
                  ? localStorage.getItem(`ab-tested-${action.id}`) === 'true'
                  : true

                return (
                  <div
                    key={action.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px',
                      borderBottom: idx < allActions.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    {/* Type icon */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--r-sm)',
                      background: meta.color + '18', color: meta.color, flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {Icon && <Icon style={{ width: 13, height: 13 }} />}
                    </div>

                    {/* Name + type + URL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{action.name}</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)',
                          padding: '2px 7px', borderRadius: 'var(--r-sm)',
                          background: meta.color + '15', color: meta.color,
                        }}>
                          {meta.label}
                        </span>
                        {!action.isEnabled && (
                          <span className="badge badge--neutral" style={{ fontSize: 10.5 }}>Disabled</span>
                        )}
                        {action.type === 'custom_action' && !hasBeenTested && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10.5, fontWeight: 500,
                            padding: '2px 7px', borderRadius: 'var(--r-sm)',
                            background: 'var(--warn-soft)', color: 'var(--warn)',
                            border: '1px solid rgba(184,106,23,0.2)',
                          }}>
                            Not tested
                          </span>
                        )}
                      </div>
                      {url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          {method && <MethodBadge method={method} />}
                          <span style={{
                            fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {url}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Context menu */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === action.id ? null : action.id) }}
                      >
                        <MoreHorizontal style={{ width: 15, height: 15 }} />
                      </button>
                      {menuOpen === action.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 50,
                          background: 'var(--surface)', border: '1px solid var(--line)',
                          borderRadius: 'var(--r-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                          minWidth: 150, padding: '4px 0', marginTop: 4,
                        }}>
                          {action.type === 'custom_action' && (
                            <button
                              type="button"
                              onClick={() => { setMenuOpen(null); openBuilder(action) }}
                              style={{
                                display: 'flex', alignItems: 'center', width: '100%',
                                padding: '7px 12px', fontSize: 13, background: 'none',
                                border: 'none', cursor: 'pointer', color: 'var(--ink)',
                              }}
                              className="hover:bg-[var(--bg-2)]"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              setMenuOpen(null)
                              try {
                                await toggleAction(action.id, !action.isEnabled)
                                addToast(action.isEnabled ? 'Action disabled' : 'Action enabled')
                              } catch {
                                addToast('Failed to update', 'error')
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', width: '100%',
                              padding: '7px 12px', fontSize: 13, background: 'none',
                              border: 'none', cursor: 'pointer', color: 'var(--ink)',
                            }}
                            className="hover:bg-[var(--bg-2)]"
                          >
                            {action.isEnabled ? 'Disable' : 'Enable'}
                          </button>
                          <div style={{ height: 1, background: 'var(--line)', margin: '3px 0' }} />
                          <button
                            type="button"
                            onClick={async () => {
                              setMenuOpen(null)
                              try { await deleteAction(action.id); addToast('Action deleted') }
                              catch { addToast('Failed to delete', 'error') }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', width: '100%',
                              padding: '7px 12px', fontSize: 13, background: 'none',
                              border: 'none', cursor: 'pointer', color: 'var(--danger)',
                            }}
                            className="hover:bg-[var(--danger-soft)]"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available action types teaser */}
        <div className="section-eyebrow" style={{ marginBottom: 12 }}>Available action types</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 8,
        }}>
          {ALL_CATALOG_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSelectedCatalogId(item.id); setView('catalog') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--line)', background: 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', transition: 'border-color .12s',
                }}
                className="hover:border-[var(--line-strong)]"
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--r-sm)',
                  background: item.color + '18', color: item.color, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon style={{ width: 14, height: 14 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{item.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{item.tag}</div>
                </div>
                <ChevronRight style={{ width: 13, height: 13, color: 'var(--ink-4)', flexShrink: 0 }} />
              </button>
            )
          })}
        </div>

      </div>

      {/* Buttons drawer */}
      <CustomButtonsDrawer
        open={openType === 'custom_buttons'}
        actions={customButtons}
        onOpenChange={(open) => { if (!open) setOpenType(null) }}
        onSave={async (payload) => {
          const action = await saveAction({
            ...payload,
            type: 'custom_buttons',
            config: payload.config as CustomButtonsConfig,
          })
          addToast('Buttons saved')
          return action
        }}
        onDelete={async (actionId) => {
          try { await deleteAction(actionId); addToast('Action deleted') }
          catch { addToast('Failed to delete — please try again', 'error') }
        }}
        onToggle={async (actionId, next) => {
          try { await toggleAction(actionId, next); addToast(next ? 'Action enabled' : 'Action disabled') }
          catch { addToast('Failed to update — please try again', 'error') }
        }}
      />

      <Toasts toasts={toasts} />
    </div>
  )
}
