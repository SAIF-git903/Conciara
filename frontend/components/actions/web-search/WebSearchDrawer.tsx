'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AlertDialog } from '@/components/ui/alert-dialog'
import type { ChatbotAction, WebSearchConfig } from '@/components/actions/types'

interface WebSearchDrawerProps {
  open: boolean
  actions: ChatbotAction[]
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    id?: string
    name: string
    isEnabled: boolean
    config: WebSearchConfig
    lastKnownUpdatedAt?: string
  }) => Promise<ChatbotAction>
  onDelete: (actionId: string) => Promise<void>
  onToggle: (actionId: string, next: boolean) => Promise<void>
}

const DEFAULT_CONFIG: WebSearchConfig = {
  maxResults: 5,
  triggerInstructions: '',
}

const MAX_RESULTS_OPTIONS = [3, 5, 8, 10] as const

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
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

export default function WebSearchDrawer({
  open,
  actions,
  onOpenChange,
  onSave,
  onDelete,
  onToggle,
}: WebSearchDrawerProps) {
  const existing = actions[0] ?? null
  const existingConfig = existing ? (existing.config as WebSearchConfig) : null

  const [name, setName] = useState(existing?.name ?? 'Web Search')
  const [isEnabled, setIsEnabled] = useState(existing?.isEnabled ?? true)
  const [config, setConfig] = useState<WebSearchConfig>(
    existingConfig ?? { ...DEFAULT_CONFIG }
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? 'Web Search')
      setIsEnabled(existing?.isEnabled ?? true)
      setConfig(existingConfig ?? { ...DEFAULT_CONFIG })
      setSaveError(null)
    }
  }, [open, existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<WebSearchConfig>) => setConfig((c) => ({ ...c, ...p }))

  const triggerTrimmed = config.triggerInstructions.trim()
  const isEmpty = triggerTrimmed.length === 0
  const isTooShort = triggerTrimmed.length > 0 && triggerTrimmed.length < 20
  const isValid = !isEmpty

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        ...(existing ? { id: existing.id, lastKnownUpdatedAt: existing.updatedAt } : {}),
        name: name.trim() || 'Web Search',
        isEnabled,
        config,
      })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        setSaveError('Action was updated elsewhere — close and reopen to get the latest version.')
      } else {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        setSaveError(msg || 'Failed to save — please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    setDeleting(true)
    try {
      await onDelete(existing.id)
      setConfirmDeleteOpen(false)
    } catch {
      setConfirmDeleteOpen(false)
      setSaveError('Failed to delete — please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const eyebrow: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase' as const,
    color: 'var(--ink-4)', marginBottom: 8,
  }
  const card: React.CSSProperties = {
    border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
    background: 'var(--surface)', overflow: 'hidden', marginBottom: 20,
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

            {/* Header */}
            <div style={{
              padding: '18px 20px 16px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--r-md)',
                  background: '#0e9b6b18', color: '#0e9b6b', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Search style={{ width: 15, height: 15 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Web Search</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Give your agent real-time internet access
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>

              {saveError && (
                <div style={{
                  marginBottom: 16, padding: '8px 12px', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--danger-soft)', background: 'var(--danger-soft)',
                  fontSize: 13, color: 'var(--danger)',
                }}>
                  {saveError}
                </div>
              )}

              {/* Identity */}
              <div style={eyebrow}>Action name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Web Search"
                style={{ width: '100%', marginBottom: 20, fontSize: 13 }}
              />

              {/* Behaviour */}
              <div style={eyebrow}>Behaviour</div>
              <div style={card}>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  gap: 16, padding: '12px 14px', cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Enabled</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                      Agent can use web search during conversations
                    </div>
                  </div>
                  <Toggle on={isEnabled} onClick={() => setIsEnabled((v) => !v)} />
                </label>
              </div>

              {/* Max results */}
              <div style={eyebrow}>Results per search</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {MAX_RESULTS_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch({ maxResults: n })}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${config.maxResults === n ? '#0e9b6b' : 'var(--line)'}`,
                      background: config.maxResults === n ? '#0e9b6b12' : 'var(--surface)',
                      boxShadow: config.maxResults === n ? '0 0 0 3px #0e9b6b22' : 'none',
                      fontSize: 13, fontWeight: 600,
                      color: config.maxResults === n ? '#0e9b6b' : 'var(--ink-3)',
                      cursor: 'pointer', transition: 'border-color .12s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Trigger instructions */}
              <div style={eyebrow}>When to search</div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10, marginTop: 0 }}>
                Tell the agent when it should search the web. Be specific — the more detail,
                the more reliably it triggers.
              </p>
              <textarea
                className="textarea"
                rows={4}
                value={config.triggerInstructions}
                onChange={(e) => patch({ triggerInstructions: e.target.value })}
                placeholder="e.g. When the user asks about current events, recent news, or any topic that requires up-to-date information not covered by your training data."
                style={{
                  width: '100%', fontSize: 13,
                  borderColor: isEmpty ? 'var(--danger)' : isTooShort ? 'var(--warn)' : undefined,
                  marginBottom: 8,
                }}
              />

              {isEmpty && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '10px 12px', background: 'var(--danger-soft)',
                  border: '1px solid rgba(195,54,101,0.2)', borderRadius: 8, marginBottom: 8,
                  fontSize: 12.5, color: 'var(--danger)',
                }}>
                  <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>Required — </strong>
                    without this the agent won't know when to use web search.
                  </div>
                </div>
              )}

              {isTooShort && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '10px 12px', background: 'var(--warn-soft)',
                  border: '1px solid rgba(184,106,23,0.2)', borderRadius: 8, marginBottom: 8,
                  fontSize: 12.5, color: 'var(--warn)',
                }}>
                  <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                  Instructions are very short — add more detail for reliable triggering.
                </div>
              )}


            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: '1px solid var(--line)',
              background: 'var(--surface)', flexShrink: 0,
            }}>
              <div>
                {existing && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--danger)', padding: '6px 2px',
                    }}
                    className="hover:opacity-80"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!isValid || saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Saving…' : existing ? 'Save changes' : 'Enable Web Search'}
                </button>
              </div>
            </div>

          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmDeleteOpen}
        title="Remove web search?"
        description="This disables web search for this agent. You can re-enable it at any time."
        confirmLabel={deleting ? 'Removing…' : 'Remove'}
        confirmVariant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
