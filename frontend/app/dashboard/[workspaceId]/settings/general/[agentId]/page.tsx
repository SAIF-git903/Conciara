'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

export default function AgentSettingsGeneralPage() {
  const { currentAgent, currentWorkspace, setAgentToDelete } = useDashboard()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentAgent) setName(currentAgent.name ?? '')
  }, [currentAgent])

  const handleSave = useCallback(async () => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setSaving(true)
    setSaveError(null)
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}`, { name })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setSaveError(msg || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id, name])

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Select an agent to edit settings.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div className="shrink-0 px-6 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
        <span style={{
          display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--ink-4)', fontWeight: 500, marginBottom: 6, fontFamily: 'var(--font-mono)',
        }}>
          Agent settings
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>
          General
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0 }}>
          Identity and danger zone for this agent.
        </p>
      </div>

      {/* Settings body */}
      <div className="flex-1 p-6 pb-16">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start', maxWidth: 900 }}>

          {/* Left sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 500, margin: '0 0 8px' }}>
              Identity
            </h4>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
              Name and agent ID are visible to end users in the chat widget and API calls.
            </p>
          </div>

          {/* Right cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Identity card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Identity</div>
              </div>
              <div style={{ padding: 18 }}>
                {saveError && (
                  <div style={{
                    marginBottom: 14, padding: '8px 12px', borderRadius: 'var(--r-md)',
                    background: 'var(--danger-soft)', color: 'var(--danger)',
                    fontSize: 13, border: '1px solid rgba(195,54,101,0.2)',
                  }}>
                    {saveError}
                  </div>
                )}
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                    Agent name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      display: 'block', width: '100%', height: 34, padding: '0 10px',
                      border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                      background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
                    }}
                  />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                    Public agent ID
                  </span>
                  <input
                    value={String(currentAgent.id)}
                    readOnly
                    style={{
                      display: 'block', width: '100%', height: 34, padding: '0 10px',
                      border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                      background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-2)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, display: 'block' }}>
                    Used in API calls and the embed snippet.
                  </span>
                </label>
              </div>
              <div style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--line)',
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
              }}>
                <button
                  type="button"
                  onClick={() => setName(currentAgent.name ?? '')}
                  className="btn btn--ghost"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || name === (currentAgent.name ?? '')}
                  className="btn btn--primary"
                >
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
                </button>
              </div>
            </div>

            {/* Danger zone card */}
            <div style={{
              background: 'linear-gradient(180deg, var(--surface), var(--danger-soft))',
              border: '1px solid rgba(195,54,101,0.18)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(195,54,101,0.18)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: 'var(--danger)' }}>
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  Danger zone
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                  Permanently delete this agent and all its data — files, Q&amp;A pairs, website crawls, chat logs, and widget settings. This cannot be undone.
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Delete agent</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      This will permanently remove the agent and all associated data.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgentToDelete({ id: currentAgent.id, name: currentAgent.name })}
                    className="btn btn--danger-outline"
                    style={{ flexShrink: 0 }}
                  >
                    Delete agent
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
