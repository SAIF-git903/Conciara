'use client'

import { useMemo, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AlertDialog } from '@/components/ui/alert-dialog'
import ActionListView from '@/components/actions/shared/ActionListView'
import CustomActionsForm from './CustomActionsForm'
import type { ChatbotAction, CustomActionConfig } from '@/components/actions/types'

interface CustomActionsDrawerProps {
  open: boolean
  actions: ChatbotAction[]
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    id?: string
    name: string
    isEnabled: boolean
    config: CustomActionConfig
    lastKnownUpdatedAt?: string
  }) => Promise<void>
  onDelete: (actionId: string) => Promise<void>
  onToggle: (actionId: string, next: boolean) => Promise<void>
  onValidateFunctionName: (functionName: string, excludeActionId?: string) => Promise<boolean>
  onRunTest: (actionId: string, inputs: Record<string, unknown>) => Promise<{ success: boolean; statusCode: number; responseBody: unknown; durationMs: number }>
}

const emptyConfig: CustomActionConfig = {
  executionMode: 'server_side',
  apiUrl: '',
  method: 'POST',
  headers: [],
  queryParams: [],
  bodyParams: [],
  triggerInstructions: '',
  actionFunctionName: '',
  inputFields: [],
  responseMapping: '',
}

export default function CustomActionsDrawer({
  open,
  actions,
  onOpenChange,
  onSave,
  onDelete,
  onToggle,
  onValidateFunctionName,
  onRunTest,
}: CustomActionsDrawerProps) {
  const [mode, setMode] = useState<'list' | 'form'>(actions.length > 0 ? 'list' : 'form')
  const [editing, setEditing] = useState<ChatbotAction | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<CustomActionConfig>(emptyConfig)
  const [isEnabled, setIsEnabled] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmModeSwitchOpen, setConfirmModeSwitchOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<'server_side' | 'client_side' | null>(null)
  const [functionNameConflict, setFunctionNameConflict] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; statusCode: number; responseBody: unknown; durationMs: number } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const isSaved = Boolean(editing?.id)
  const showList = mode === 'list' && actions.length > 0

  const title = useMemo(() => {
    if (showList) return 'Custom Action'
    return editing ? 'Edit Custom Action' : 'Add Custom Action'
  }, [showList, editing])

  const resetForm = () => {
    setEditing(null)
    setName('')
    setConfig(emptyConfig)
    setIsEnabled(false)
    setErrors({})
    setFunctionNameConflict(null)
    setTestResult(null)
    setTestError(null)
  }

  const openCreate = () => {
    resetForm()
    setMode('form')
  }

  const openEdit = (action: ChatbotAction) => {
    setEditing(action)
    setName(action.name)
    setConfig(action.config as CustomActionConfig)
    setIsEnabled(action.isEnabled)
    setErrors({})
    setFunctionNameConflict(null)
    setTestResult(null)
    setTestError(null)
    setMode('form')
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'Action name is required'
    if (!config.actionFunctionName.trim()) nextErrors.actionFunctionName = 'Function name is required'
    if (config.executionMode === 'server_side') {
      if (!config.apiUrl?.trim()) nextErrors.apiUrl = 'API URL is required'
      else if (!/^https?:\/\//.test(config.apiUrl.trim())) nextErrors.apiUrl = 'API URL must start with http:// or https://'
    }
    if (!config.inputFields.length) nextErrors.inputFields = 'Add at least one input field'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        ...(editing ? { id: editing.id, lastKnownUpdatedAt: editing.updatedAt } : {}),
        name: name.trim(),
        isEnabled,
        config,
      })
      setMode(actions.length > 0 ? 'list' : 'form')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    setDeleting(true)
    try {
      await onDelete(editing.id)
      setConfirmDeleteOpen(false)
      resetForm()
      setMode(actions.length > 1 ? 'list' : 'form')
    } finally {
      setDeleting(false)
    }
  }

  const handleFunctionNameBlur = async () => {
    if (!config.actionFunctionName.trim()) return
    const isUnique = await onValidateFunctionName(config.actionFunctionName, editing?.id)
    setFunctionNameConflict(isUnique ? null : 'Function name already exists for this chatbot')
  }

  const applyModeChange = (nextMode: 'server_side' | 'client_side') => {
    setConfig((prev) => ({ ...prev, executionMode: nextMode }))
  }

  const handleConfigChange = (nextConfig: CustomActionConfig) => {
    if (editing?.id && nextConfig.executionMode !== config.executionMode) {
      setPendingMode(nextConfig.executionMode)
      setConfirmModeSwitchOpen(true)
      return
    }
    setConfig(nextConfig)
  }

  const runTest = async (inputs: Record<string, unknown>) => {
    if (!editing?.id) return
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    try {
      const result = await onRunTest(editing.id, inputs)
      setTestResult(result)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { responseBody?: { error?: string }; error?: string } } }).response?.data?.responseBody?.error ||
            (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Failed to run test'
      setTestError(message || 'Failed to run test')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setMode(actions.length > 0 ? 'list' : 'form')
          onOpenChange(nextOpen)
        }}
      >
        <SheetContent className="max-w-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">Define API or client-side actions your chatbot can execute.</p>
            </div>

            {showList ? (
              <ActionListView
                actions={actions}
                onAddNew={openCreate}
                onEdit={openEdit}
                onDelete={(action) => {
                  setEditing(action)
                  setConfirmDeleteOpen(true)
                }}
                onToggle={(action, next) => void onToggle(action.id, next)}
              />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5">
                  <CustomActionsForm
                    isSaved={isSaved}
                    name={name}
                    isEnabled={isEnabled}
                    config={config}
                    errors={errors}
                    functionNameConflict={functionNameConflict}
                    testLoading={testLoading}
                    testResult={testResult}
                    testError={testError}
                    onNameChange={setName}
                    onEnabledChange={setIsEnabled}
                    onConfigChange={handleConfigChange}
                    onFunctionNameBlur={() => void handleFunctionNameBlur()}
                    onRunTest={runTest}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                  <div>
                    {editing ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete Action
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (actions.length > 0) {
                          setMode('list')
                          return
                        }
                        onOpenChange(false)
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving || Boolean(functionNameConflict)}
                      className="rounded-lg bg-[var(--v2-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmDeleteOpen}
        title="Delete action?"
        description="This permanently deletes this custom action."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <AlertDialog
        open={confirmModeSwitchOpen}
        title="Switch execution mode?"
        description="Switching mode may reset parts of your API configuration."
        confirmLabel="Switch mode"
        onCancel={() => {
          setPendingMode(null)
          setConfirmModeSwitchOpen(false)
        }}
        onConfirm={() => {
          if (pendingMode) applyModeChange(pendingMode)
          setPendingMode(null)
          setConfirmModeSwitchOpen(false)
        }}
      />
    </>
  )
}
