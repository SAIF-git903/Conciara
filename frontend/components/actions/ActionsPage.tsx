'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MoreHorizontal, Plus, Zap } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import ActionsGrid from '@/components/actions/ActionsGrid'
import { ACTION_TYPE_META } from '@/components/actions/action-meta'
import CustomButtonsDrawer from '@/components/actions/custom-buttons/CustomButtonsDrawer'
import CustomActionsDrawer from '@/components/actions/custom-actions/CustomActionsDrawer'
import { useActions } from '@/hooks/useActions'
import { useActionTest } from '@/hooks/useActionTest'
import type { ActionType, ChatbotAction, CustomActionConfig, CustomButtonsConfig } from '@/components/actions/types'

interface ActionsPageProps {
  chatbotIdParam?: string
}

interface ToastMessage {
  id: string
  text: string
  variant?: 'error' | 'default'
}

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

function CustomActionCard({
  action,
  onManage,
}: {
  action: ChatbotAction
  onManage: () => void
}) {
  const cfg = action.config as CustomActionConfig
  const method = cfg.method ?? 'POST'
  const url = cfg.executionMode === 'client_side' ? 'Client-side execution' : (cfg.apiUrl ?? '—')
  const isDanger = method === 'DELETE'

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MethodBadge method={method} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.3 }}>
            {action.name}
          </div>
          <div style={{
            fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2,
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {url}
          </div>
        </div>
        <div style={{ fontSize: 11, color: action.isEnabled ? 'var(--success)' : 'var(--ink-4)', flexShrink: 0 }}>
          {action.isEnabled ? '● Active' : '○ Disabled'}
        </div>
        <button
          type="button"
          onClick={onManage}
          aria-label="Manage action"
          style={{
            width: 28, height: 28, borderRadius: 'var(--r-sm)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--ink-4)',
          }}
          className="hover:bg-[var(--bg-2)] hover:!text-[var(--ink)]"
        >
          <MoreHorizontal style={{ width: 15, height: 15 }} />
        </button>
      </div>
      {isDanger && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, color: 'var(--warn)',
          padding: '5px 8px', borderRadius: 'var(--r-sm)',
          background: 'var(--warn-soft)',
        }}>
          <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0 }} />
          Requires confirmation before execution
        </div>
      )}
    </div>
  )
}

// Built-in action type metas (everything except custom_action which is shown as the main list)
const BUILTIN_META = ACTION_TYPE_META.filter((m) => m.type !== 'custom_action')

export default function ActionsPage({ chatbotIdParam }: ActionsPageProps) {
  const { currentWorkspace, currentAgent } = useDashboard()
  const workspaceId = currentWorkspace?.id
  const chatbotId = chatbotIdParam ?? currentAgent?.id
  const [openType, setOpenType] = useState<ActionType | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const {
    actionsByType,
    loading,
    error,
    canFetch,
    loadActions,
    saveAction,
    deleteAction,
    toggleAction,
    validateFunctionName,
  } = useActions({ workspaceId, chatbotId })

  const { runTest } = useActionTest({ workspaceId, chatbotId })

  const addToast = (text: string, variant: ToastMessage['variant'] = 'default') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, text, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  useEffect(() => {
    if (!canFetch) return
    void loadActions()
  }, [canFetch, loadActions])

  const customActionActions = useMemo(() => actionsByType.custom_action ?? [], [actionsByType])
  const customButtonsActions = useMemo(() => actionsByType.custom_buttons ?? [], [actionsByType])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>
            Actions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            Let the agent call your API or external tools. Define inputs, outputs, and auth.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenType('custom_action')}
          className="btn btn--primary btn--sm"
        >
          <Plus className="h-[12px] w-[12px]" />
          New action
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px 40px' }}>

        {loading && (
          <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 16px' }}>Loading actions…</p>
        )}
        {error && (
          <div style={{
            marginBottom: 16, padding: '8px 12px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--danger-soft)', background: 'var(--danger-soft)',
            fontSize: 13, color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {/* Custom API actions list */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Section header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
              }}>
                Custom API actions
              </span>
              {customActionActions.length > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)',
                  padding: '1px 6px', borderRadius: 4,
                  background: 'var(--bg-2)', color: 'var(--ink-3)',
                }}>
                  {customActionActions.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenType('custom_action')}
              className="btn btn--ghost btn--sm"
            >
              <Plus className="h-[11px] w-[11px]" />
              Add
            </button>
          </div>

          {/* Action rows */}
          {customActionActions.length === 0 ? (
            <div style={{
              padding: '32px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              textAlign: 'center',
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 'var(--r-md)',
                background: 'var(--bg-2)', border: '1px solid var(--line)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap style={{ width: 16, height: 16, color: 'var(--ink-4)' }} />
              </span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', margin: '0 0 3px' }}>
                  No actions yet
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 14px' }}>
                  Connect your agent to any external API — look up orders, schedule events, process refunds.
                </p>
                <button
                  type="button"
                  onClick={() => setOpenType('custom_action')}
                  className="btn btn--secondary btn--sm"
                >
                  <Plus className="h-[11px] w-[11px]" />
                  Create your first action
                </button>
              </div>
            </div>
          ) : (
            customActionActions.map((action) => (
              <CustomActionCard
                key={action.id}
                action={action}
                onManage={() => setOpenType('custom_action')}
              />
            ))
          )}
        </div>

        {/* Built-in action types */}
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
          }}>
            Built-in actions
          </span>
        </div>
        <ActionsGrid
          actionMeta={BUILTIN_META}
          actionsByType={actionsByType}
          onOpenType={(type) => setOpenType(type as ActionType)}
        />
      </div>

      {/* Drawers */}
      <CustomButtonsDrawer
        open={openType === 'custom_buttons'}
        actions={customButtonsActions}
        onOpenChange={(open) => { if (!open) setOpenType(null) }}
        onSave={async (payload) => {
          const action = await saveAction({ ...payload, type: 'custom_buttons', config: payload.config as CustomButtonsConfig })
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

      <CustomActionsDrawer
        open={openType === 'custom_action'}
        actions={customActionActions}
        onOpenChange={(open) => { if (!open) setOpenType(null) }}
        onSave={async (payload) => {
          const action = await saveAction({ ...payload, type: 'custom_action', config: payload.config as CustomActionConfig })
          addToast('Action saved')
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
        onValidateFunctionName={validateFunctionName}
        onRunTest={runTest}
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex flex-col gap-2">
        {toasts.map((toast) => (
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
    </div>
  )
}
