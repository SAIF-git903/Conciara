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
  }) => Promise<ChatbotAction>
  onDelete: (actionId: string) => Promise<void>
  onToggle: (actionId: string, next: boolean) => Promise<void>
  onValidateFunctionName: (functionName: string, excludeActionId?: string) => Promise<boolean>
  onRunTest: (
    actionId: string,
    inputs: Record<string, unknown>
  ) => Promise<{ success: boolean; statusCode: number; responseBody: unknown; durationMs: number }>
}

const MASKED = '********'

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

function stripMaskedAuth(config: CustomActionConfig): CustomActionConfig {
  if (!config.authConfig) return config
  const auth = { ...config.authConfig }
  for (const key of Object.keys(auth) as Array<keyof typeof auth>) {
    if (auth[key] === MASKED) delete auth[key]
  }
  return { ...config, authConfig: auth }
}

type Snapshot = { name: string; isEnabled: boolean; config: CustomActionConfig }

function snapshotFrom(action: ChatbotAction): Snapshot {
  return {
    name: action.name,
    isEnabled: action.isEnabled,
    config: action.config as CustomActionConfig,
  }
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
  const [savedSnapshot, setSavedSnapshot] = useState<Snapshot | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmModeSwitchOpen, setConfirmModeSwitchOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<'server_side' | 'client_side' | null>(null)
  const [functionNameConflict, setFunctionNameConflict] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    statusCode: number
    responseBody: unknown
    durationMs: number
  } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const isSaved = Boolean(editing?.id)
  const showList = mode === 'list' && actions.length > 0

  const isDirty = useMemo(() => {
    const current = JSON.stringify({ name, isEnabled, config })
    if (!savedSnapshot) {
      return current !== JSON.stringify({ name: '', isEnabled: false, config: emptyConfig })
    }
    return current !== JSON.stringify(savedSnapshot)
  }, [name, isEnabled, config, savedSnapshot])

  const title = useMemo(() => {
    if (showList) return 'Custom Actions'
    return editing ? 'Edit Custom Action' : 'New Custom Action'
  }, [showList, editing])

  const resetForm = () => {
    setEditing(null)
    setName('')
    setConfig(emptyConfig)
    setIsEnabled(false)
    setErrors({})
    setSaveError(null)
    setFunctionNameConflict(null)
    setTestResult(null)
    setTestError(null)
    setSavedSnapshot(null)
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
    setSaveError(null)
    setFunctionNameConflict(null)
    setTestResult(null)
    setTestError(null)
    setSavedSnapshot(snapshotFrom(action))
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
    if (!config.inputFields.length) nextErrors.inputFields = 'Add at least one input field so the chatbot knows what to collect'
    const hasEmptyName = config.inputFields.some((f) => !f.name.trim())
    if (hasEmptyName) nextErrors.inputFields = 'All input fields must have a name'
    const names = config.inputFields.map((f) => f.name.trim().toLowerCase()).filter(Boolean)
    const hasDuplicate = names.length !== new Set(names).size
    if (hasDuplicate) nextErrors.inputFields = 'Input field names must be unique'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await onSave({
        ...(editing ? { id: editing.id, lastKnownUpdatedAt: editing.updatedAt } : {}),
        name: name.trim(),
        isEnabled,
        config: stripMaskedAuth(config),
      })
      setEditing(saved)
      setSavedSnapshot(snapshotFrom(saved))
      setMode('list')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        setSaveError(
          'This action was updated by someone else. Close the drawer and reopen it to get the latest version before saving.'
        )
      } else {
        const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        setSaveError(message || 'Failed to save — please try again.')
      }
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
    } catch {
      setConfirmDeleteOpen(false)
      setSaveError('Failed to delete — please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const requestClose = () => {
    if (isDirty && mode === 'form') {
      setConfirmCloseOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleCancelForm = () => {
    if (isDirty) {
      setConfirmCloseOpen(true)
    } else if (actions.length > 0) {
      setMode('list')
    } else {
      onOpenChange(false)
    }
  }

  const handleFunctionNameBlur = async () => {
    if (!config.actionFunctionName.trim()) return
    const isUnique = await onValidateFunctionName(config.actionFunctionName, editing?.id)
    setFunctionNameConflict(isUnique ? null : 'This identifier is already used by another action')
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
          ? (err as { response?: { data?: { responseBody?: { error?: string }; error?: string } } }).response?.data
              ?.responseBody?.error ||
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
          if (!nextOpen) {
            requestClose()
            return
          }
          setMode(actions.length > 0 ? 'list' : 'form')
          onOpenChange(true)
        }}
      >
        <SheetContent className="max-w-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {!showList && (
                <p className="text-sm text-slate-500">
                  Automate tasks your chatbot can trigger during a conversation.
                </p>
              )}
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
                  {saveError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {saveError}
                    </div>
                  )}
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
                    {editing && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelForm}
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
                      {saving ? 'Saving…' : 'Save'}
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
        title="Delete this action?"
        description="This permanently removes the action. If it is currently enabled, the chatbot will stop using it immediately."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <AlertDialog
        open={confirmCloseOpen}
        title="Discard unsaved changes?"
        description="You have unsaved changes. Closing now will lose them."
        confirmLabel="Discard changes"
        confirmVariant="danger"
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => {
          setConfirmCloseOpen(false)
          if (actions.length > 0 && editing) {
            setMode('list')
          } else {
            onOpenChange(false)
          }
        }}
      />

      <AlertDialog
        open={confirmModeSwitchOpen}
        title="Switch connection type?"
        description="Switching will clear your current API configuration including the URL, headers, and authentication settings."
        confirmLabel="Switch and clear"
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
