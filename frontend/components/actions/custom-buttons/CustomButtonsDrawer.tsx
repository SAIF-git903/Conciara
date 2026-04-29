'use client'

import { useMemo, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AlertDialog } from '@/components/ui/alert-dialog'
import ActionListView from '@/components/actions/shared/ActionListView'
import CustomButtonsForm from './CustomButtonsForm'
import type { ChatbotAction, CustomButtonsConfig } from '@/components/actions/types'

interface CustomButtonsDrawerProps {
  open: boolean
  actions: ChatbotAction[]
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    id?: string
    name: string
    isEnabled: boolean
    config: CustomButtonsConfig
    lastKnownUpdatedAt?: string
  }) => Promise<ChatbotAction>
  onDelete: (actionId: string) => Promise<void>
  onToggle: (actionId: string, next: boolean) => Promise<void>
}

const emptyForm: {
  name: string
  isEnabled: boolean
  config: CustomButtonsConfig
} = {
  name: '',
  isEnabled: false,
  config: {
    triggerInstructions: '',
    buttons: [
      {
        id: crypto.randomUUID(),
        label: '',
        url: '',
        openInNewTab: true,
      },
    ],
  },
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function CustomButtonsDrawer({
  open,
  actions,
  onOpenChange,
  onSave,
  onDelete,
  onToggle,
}: CustomButtonsDrawerProps) {
  const [mode, setMode] = useState<'list' | 'form'>(actions.length > 0 ? 'list' : 'form')
  const [editing, setEditing] = useState<ChatbotAction | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canShowList = actions.length > 0

  const title = useMemo(() => {
    if (mode === 'list') return 'Custom Buttons'
    return editing ? 'Edit Custom Buttons' : 'Add Custom Buttons'
  }, [mode, editing])

  const startCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      config: {
        ...emptyForm.config,
        buttons: [
          {
            id: crypto.randomUUID(),
            label: '',
            url: '',
            openInNewTab: true,
          },
        ],
      },
    })
    setErrors({})
    setMode('form')
  }

  const startEdit = (action: ChatbotAction) => {
    const config = action.config as CustomButtonsConfig
    setEditing(action)
    setForm({
      name: action.name,
      isEnabled: action.isEnabled,
      config: {
        triggerInstructions: config.triggerInstructions ?? '',
        buttons: (config.buttons ?? []).length > 0 ? config.buttons : emptyForm.config.buttons,
      },
    })
    setErrors({})
    setMode('form')
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Action name is required'
    if (!form.config.buttons.length) nextErrors.buttons = 'At least one button is required'
    for (const button of form.config.buttons) {
      if (!button.url.trim() || !isValidUrl(button.url)) {
        nextErrors.buttons = 'All button URLs must start with http:// or https://'
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        ...(editing ? { id: editing.id, lastKnownUpdatedAt: editing.updatedAt } : {}),
        name: form.name.trim(),
        isEnabled: form.isEnabled,
        config: {
          triggerInstructions: form.config.triggerInstructions.trim(),
          buttons: form.config.buttons.map((button) => ({
            ...button,
            label: button.label.trim().slice(0, 30),
            url: button.url.trim(),
          })),
        },
      })
      setMode(canShowList ? 'list' : 'form')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        setSaveError('This action was updated by someone else. Close and reopen to get the latest version.')
      } else {
        setSaveError('Failed to save — please try again.')
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
      setMode(actions.length > 1 ? 'list' : 'form')
      setEditing(null)
      setForm(emptyForm)
    } catch {
      setConfirmDeleteOpen(false)
      setSaveError('Failed to delete — please try again.')
    } finally {
      setDeleting(false)
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
        <SheetContent>
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">Configure CTA buttons your chatbot can show in conversation.</p>
            </div>
            {mode === 'list' && canShowList ? (
              <ActionListView
                actions={actions}
                onAddNew={startCreate}
                onEdit={startEdit}
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
                  <CustomButtonsForm value={form} errors={errors} onChange={setForm} />
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
                        if (canShowList) {
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
                      disabled={saving}
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
        description="This permanently deletes this custom buttons action."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
