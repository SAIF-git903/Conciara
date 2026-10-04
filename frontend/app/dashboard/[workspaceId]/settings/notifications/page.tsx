'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Check, Loader2 } from 'lucide-react'
import api from '@/lib/api'

/* ─── Types ─────────────────────────────────────── */
type Preference = {
  id: string
  eventType: string
  inAppEnabled: boolean
  emailEnabled: boolean
}

/* ─── Catalogue ──────────────────────────────────── */
type NotifItem = { id: string; label: string; desc: string; emailDefault: boolean; inAppDefault: boolean }
type NotifGroup = { title: string; items: NotifItem[] }

const GROUPS: NotifGroup[] = [
  {
    title: 'Workspace activity',
    items: [
      { id: 'workspace.agent.error',   label: 'An agent fails or stops responding', desc: 'Critical failures only.',        emailDefault: true,  inAppDefault: true  },
      { id: 'workspace.credits.50',    label: 'Reach 50% of credit limit',          desc: 'Heads-up before you run out.',   emailDefault: true,  inAppDefault: false },
      { id: 'workspace.credits.90',    label: 'Reach 90% of credit limit',          desc: 'Final warning.',                 emailDefault: true,  inAppDefault: true  },
    ],
  },
  {
    title: 'Team',
    items: [
      { id: 'workspace.member.invited',      label: 'New member joins',       desc: 'When an invitation is accepted.',    emailDefault: true,  inAppDefault: false },
      { id: 'workspace.member.role-changed', label: 'Role changed',           desc: 'Someone promoted or demoted.',       emailDefault: false, inAppDefault: false },
      { id: 'workspace.member.removed',      label: 'Member removed',         desc: 'When someone leaves or is removed.', emailDefault: false, inAppDefault: true  },
    ],
  },
  {
    title: 'Product',
    items: [
      { id: 'product.release', label: 'Product updates',       desc: 'Major releases (about once a month).', emailDefault: true,  inAppDefault: false },
      { id: 'product.tips',    label: 'Tips & best practices', desc: 'We send these sparingly.',              emailDefault: false, inAppDefault: false },
    ],
  },
]

/* ─── Toggle ─────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? 'toggle--on' : ''}`}
      style={{ flexShrink: 0, opacity: disabled ? 0.5 : 1 }}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

/* ─── Page ───────────────────────────────────────── */
export default function WorkspaceNotificationsPage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { user } = useAuth()

  // ── Preferences state ────────────────────────────
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [prefLoading, setPrefLoading]   = useState(true)
  const [prefError,   setPrefError]     = useState(false)
  const [saving, setSaving]             = useState<string | null>(null)
  const [savedKey, setSavedKey]         = useState<string | null>(null)  // briefly shows ✓

  // ── Fetch preferences ────────────────────────────
  useEffect(() => {
    if (!workspaceId) { setPrefLoading(false); return }
    setPrefLoading(true); setPrefError(false)
    api.get<{ preferences: Preference[] }>(`/workspaces/${workspaceId}/notifications/preferences`)
      .then(({ data }) => { if (Array.isArray(data.preferences)) setPreferences(data.preferences) })
      .catch(() => setPrefError(true))
      .finally(() => setPrefLoading(false))
  }, [workspaceId])

  // ── Preference helpers ────────────────────────────
  const prefMap = useMemo(() => new Map(preferences.map(p => [p.eventType, p])), [preferences])

  function getVal(eventType: string, field: 'emailEnabled' | 'inAppEnabled', def: boolean): boolean {
    const p = prefMap.get(eventType)
    return p ? p[field] : def
  }

  async function handleToggle(
    eventType: string,
    field: 'emailEnabled' | 'inAppEnabled',
    currentVal: boolean,
    defEmail: boolean,
    defInApp: boolean,
  ) {
    if (!workspaceId || saving) return
    const pref = prefMap.get(eventType)

    // Snapshot for rollback
    const snapshot: Preference = {
      id: pref?.id ?? eventType,
      eventType,
      emailEnabled: pref?.emailEnabled ?? defEmail,
      inAppEnabled: pref?.inAppEnabled ?? defInApp,
    }

    const next: Preference = {
      ...snapshot,
      [field]: !currentVal,
    }

    // Optimistic
    setPreferences(prev => {
      const idx = prev.findIndex(p => p.eventType === eventType)
      if (idx === -1) return [...prev, next]
      const copy = [...prev]; copy[idx] = next; return copy
    })

    const key = `${eventType}:${field}`
    setSaving(key)
    try {
      const { data } = await api.put<{ preference: Preference }>(
        `/workspaces/${workspaceId}/notifications/preferences/${encodeURIComponent(eventType)}`,
        { inAppEnabled: next.inAppEnabled, emailEnabled: next.emailEnabled }
      )
      setPreferences(prev => {
        const idx = prev.findIndex(p => p.eventType === eventType)
        if (idx === -1) return [...prev, data.preference]
        const copy = [...prev]; copy[idx] = data.preference; return copy
      })
      // Brief ✓ indicator
      setSavedKey(key)
      setTimeout(() => setSavedKey(k => k === key ? null : k), 1800)
    } catch {
      // Rollback to snapshot
      setPreferences(prev => {
        const idx = prev.findIndex(p => p.eventType === eventType)
        if (idx === -1) return prev
        const copy = [...prev]; copy[idx] = snapshot; return copy
      })
    } finally {
      setSaving(null)
    }
  }

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Invalid workspace.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            Settings
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '0 0 4px' }}>
            Notifications
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-3)', maxWidth: '60ch', margin: 0 }}>
            Choose what we email you about. You&apos;ll always get critical security alerts.
          </p>
        </div>

        {/* ── Preferences section ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 8 }}>
              Heads-up
            </p>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
              We&apos;ll email{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{user?.email ?? '—'}</strong>.{' '}
              <a href="/dashboard/settings/account" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-strong)', paddingBottom: 1, textDecoration: 'none' }}>
                Change
              </a>
            </p>
          </div>

          {/* Preference cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {prefLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px 0', color: 'var(--ink-4)' }}>
                <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                <span style={{ fontSize: 13 }}>Loading preferences…</span>
              </div>
            ) : prefError ? (
              <div style={{
                padding: '14px 16px', borderRadius: 'var(--r-lg)',
                background: 'var(--danger-soft)', border: '1px solid rgba(195,54,101,0.15)',
                fontSize: 13, color: 'var(--danger)',
              }}>
                Failed to load notification preferences. Please refresh to try again.
              </div>
            ) : (
              GROUPS.map(group => (
                <div key={group.title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {group.title}
                    </span>
                    <div style={{ display: 'flex', gap: 0 }}>
                      {['Email', 'In-app'].map(col => (
                        <span key={col} style={{ width: 56, textAlign: 'center', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  {group.items.map(item => {
                    const emailVal = getVal(item.id, 'emailEnabled', item.emailDefault)
                    const inAppVal = getVal(item.id, 'inAppEnabled', item.inAppDefault)
                    const emailKey = `${item.id}:emailEnabled`
                    const inAppKey = `${item.id}:inAppEnabled`
                    const isSavingRow = saving?.startsWith(item.id)

                    return (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', alignItems: 'center', gap: 16, padding: '13px 18px', borderTop: '1px solid var(--line)' }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {item.label}
                            {(savedKey === emailKey || savedKey === inAppKey) && (
                              <Check style={{ width: 12, height: 12, color: 'var(--success)', flexShrink: 0 }} />
                            )}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--ink-3)' }}>{item.desc}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {saving === emailKey
                            ? <Loader2 style={{ width: 14, height: 14, color: 'var(--ink-4)' }} className="animate-spin" />
                            : <Toggle checked={emailVal} disabled={!!isSavingRow} onChange={() => void handleToggle(item.id, 'emailEnabled', emailVal, item.emailDefault, item.inAppDefault)} />
                          }
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {saving === inAppKey
                            ? <Loader2 style={{ width: 14, height: 14, color: 'var(--ink-4)' }} className="animate-spin" />
                            : <Toggle checked={inAppVal} disabled={!!isSavingRow} onChange={() => void handleToggle(item.id, 'inAppEnabled', inAppVal, item.emailDefault, item.inAppDefault)} />
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
