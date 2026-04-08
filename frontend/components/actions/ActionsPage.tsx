'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import ActionsGrid from '@/components/actions/ActionsGrid'
import { ACTION_TYPE_META } from '@/components/actions/action-meta'
import CustomButtonsDrawer from '@/components/actions/custom-buttons/CustomButtonsDrawer'
import CustomActionsDrawer from '@/components/actions/custom-actions/CustomActionsDrawer'
import { useActions } from '@/hooks/useActions'
import { useActionTest } from '@/hooks/useActionTest'
import type { ActionType, CustomActionConfig, CustomButtonsConfig } from '@/components/actions/types'

interface ActionsPageProps {
  chatbotIdParam?: string
}

interface ToastMessage {
  id: string
  text: string
}

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

  const addToast = (text: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 2500)
  }

  useEffect(() => {
    if (!canFetch) return
    void loadActions()
  }, [canFetch, loadActions])

  const customButtonsActions = useMemo(() => actionsByType.custom_buttons ?? [], [actionsByType])
  const customActionActions = useMemo(() => actionsByType.custom_action ?? [], [actionsByType])

  const handleOpenType = (type: string) => {
    setOpenType(type as ActionType)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Actions</h1>
        <p className="mt-1 text-sm text-slate-500">Let your chatbot take actions during conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <div className="text-sm text-slate-500">Loading actions...</div> : null}
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <ActionsGrid actionMeta={ACTION_TYPE_META} actionsByType={actionsByType} onOpenType={handleOpenType} />
      </div>

      <CustomButtonsDrawer
        open={openType === 'custom_buttons'}
        actions={customButtonsActions}
        onOpenChange={(open) => {
          if (!open) setOpenType(null)
        }}
        onSave={async (payload) => {
          await saveAction({
            ...payload,
            type: 'custom_buttons',
            config: payload.config as CustomButtonsConfig,
          })
          addToast('Custom buttons saved')
        }}
        onDelete={async (actionId) => {
          await deleteAction(actionId)
          addToast('Action deleted')
        }}
        onToggle={async (actionId, next) => {
          await toggleAction(actionId, next)
          addToast(next ? 'Action enabled' : 'Action disabled')
        }}
      />

      <CustomActionsDrawer
        open={openType === 'custom_action'}
        actions={customActionActions}
        onOpenChange={(open) => {
          if (!open) setOpenType(null)
        }}
        onSave={async (payload) => {
          await saveAction({
            ...payload,
            type: 'custom_action',
            config: payload.config as CustomActionConfig,
          })
          addToast('Custom action saved')
        }}
        onDelete={async (actionId) => {
          await deleteAction(actionId)
          addToast('Action deleted')
        }}
        onToggle={async (actionId, next) => {
          await toggleAction(actionId, next)
          addToast(next ? 'Action enabled' : 'Action disabled')
        }}
        onValidateFunctionName={validateFunctionName}
        onRunTest={runTest}
      />

      <div className="pointer-events-none fixed bottom-4 right-4 z-[300] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg">
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  )
}
