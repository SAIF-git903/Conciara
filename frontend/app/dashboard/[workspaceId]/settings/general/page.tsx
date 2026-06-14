'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react'

const MODELS = [
  { id: 'haiku', name: 'Claude Haiku 4.5', desc: 'Fast, cheap, great for high-volume agents', tag: 'Recommended' },
  { id: 'sonnet', name: 'Claude Sonnet 4', desc: 'Balanced reasoning and speed', tag: null },
  { id: 'gpt', name: 'GPT-4.1', desc: 'External provider — uses your own key', tag: 'Bring your own key' },
]

export default function WorkspaceSettingsGeneralPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const { user, refreshUser } = useAuth()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedModel, setSelectedModel] = useState('haiku')

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const isOwner = Boolean(workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner')
  const isMember = Boolean(workspaceId && user?.workspaces?.find((w) => w.id === workspaceId))
  const workspaceName =
    currentWorkspace?.id === workspaceId
      ? currentWorkspace.name
      : (user?.workspaces?.find((w) => w.id === workspaceId)?.name ?? name) || ''

  useEffect(() => {
    if (currentWorkspace?.id === workspaceId && currentWorkspace?.name) {
      setName(currentWorkspace.name)
    } else if (workspaceId && user?.workspaces?.length) {
      const w = user.workspaces.find((x) => x.id === workspaceId)
      if (w?.name) setName(w.name)
    }
  }, [workspaceId, currentWorkspace?.id, currentWorkspace?.name, user?.workspaces])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (workspaceId == null || !isOwner) return
    setSaveError(null)
    setSaveSuccess(false)
    setSaving(true)
    try {
      await api.patch(`/workspaces/${workspaceId}`, { name: name.trim() })
      await refreshUser()
      setSaveSuccess(true)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setSaveError(msg || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (workspaceId == null || !isOwner || deleteConfirmText.trim() !== workspaceName.trim()) return
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await api.delete(`/workspaces/${workspaceId}`)
      await refreshUser()
      setDeleteConfirmOpen(false)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setDeleteError(msg || 'Failed to delete workspace')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLeaveWorkspace = async () => {
    if (workspaceId == null || !isMember || isOwner) return
    setLeaveError(null)
    setLeaveLoading(true)
    try {
      await api.post(`/workspaces/${workspaceId}/leave`)
      await refreshUser()
      setLeaveConfirmOpen(false)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setLeaveError(msg || 'Failed to leave workspace')
    } finally {
      setLeaveLoading(false)
    }
  }

  if (workspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Invalid workspace.</p>
      </div>
    )
  }

  const slugPreview = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-workspace'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* page-header */}
        <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <span
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
          >
            Settings
          </span>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'var(--ink)', marginBottom: 4 }}>
            General
          </h1>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
            Workspace name, slug, and basic settings. Only the owner can change these.
          </p>
        </div>

        {/* settings-split: 220px side + 1fr */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

          {/* settings-side */}
          <div className="sticky top-6">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--ink-4)' }}>
              About this workspace
            </p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Your workspace is the container for agents, members, and billing. Renaming it doesn&apos;t break links.
            </p>
          </div>

          {/* main col */}
          <div className="flex flex-col gap-3">

            {/* Workspace name card */}
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            >
              {/* card-header */}
              <div className="flex items-center justify-between gap-3 border-b px-[18px] py-[14px]" style={{ borderColor: 'var(--line)' }}>
                <div>
                  <p className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Workspace name</p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>Used in invitations, invoices, and the workspace switcher.</p>
                </div>
              </div>

              {/* card-body */}
              <div className="px-[18px] py-[18px] space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSaveSuccess(false) }}
                    disabled={!isOwner}
                    className="w-full rounded-md px-3 py-2 text-sm outline-none transition disabled:opacity-60"
                    style={{
                      border: '1px solid var(--line-2)',
                      background: isOwner ? 'var(--surface)' : 'var(--bg-2)',
                      color: 'var(--ink)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>Workspace URL</span>
                  <div className="flex items-stretch">
                    <span
                      className="flex items-center px-2.5 text-[12.5px]"
                      style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--line-2)',
                        borderRight: 0,
                        borderRadius: 'var(--r-sm) 0 0 var(--r-sm)',
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      conciara.app/
                    </span>
                    <input
                      type="text"
                      value={slugPreview}
                      disabled
                      className="flex-1 px-3 py-2 text-sm outline-none opacity-60"
                      style={{
                        border: '1px solid var(--line-2)',
                        borderLeft: 0,
                        borderRadius: '0 var(--r-sm) var(--r-sm) 0',
                        background: 'var(--bg-2)',
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                  </div>
                  <span className="mt-1 block text-[12px]" style={{ color: 'var(--ink-4)' }}>Lowercase letters, numbers and hyphens.</span>
                </label>

                {!isOwner && (
                  <p className="text-[12px]" style={{ color: 'var(--ink-4)' }}>Only the workspace owner can edit the name.</p>
                )}
                {saveError && <p className="text-[12.5px]" style={{ color: 'var(--danger)' }}>{saveError}</p>}
                {saveSuccess && <p className="text-[12.5px]" style={{ color: 'var(--success)' }}>Settings saved.</p>}
              </div>

              {/* card-footer */}
              {isOwner && (
                <div
                  className="flex items-center justify-end gap-2 px-[18px] py-3"
                  style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}
                >
                  <button
                    type="button"
                    onClick={() => { setName(workspaceName); setSaveError(null); setSaveSuccess(false) }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'var(--ink)' }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              )}
            </form>

            {/* Default agent model card */}
            <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between gap-3 border-b px-[18px] py-[14px]" style={{ borderColor: 'var(--line)' }}>
                <div>
                  <p className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Default agent model</p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>New agents will use this model by default.</p>
                </div>
              </div>
              <div className="px-[18px] py-[18px]">
                <div className="flex flex-col">
                  {MODELS.map((m, i) => {
                    const active = selectedModel === m.id
                    return (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-3.5 py-3 transition-colors"
                        style={{
                          marginTop: i > 0 ? 8 : 0,
                          border: '1px solid',
                          borderColor: active ? 'var(--accent)' : 'var(--line-2)',
                          background: active ? 'var(--accent-soft)' : 'transparent',
                          borderRadius: 'var(--r-sm)',
                        }}
                      >
                        <input
                          type="radio"
                          name="defaultModel"
                          value={m.id}
                          checked={active}
                          onChange={() => setSelectedModel(m.id)}
                          className="mt-0.5 shrink-0"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{m.name}</span>
                            {m.tag && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[10.5px] font-medium"
                                style={{ background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                              >
                                {m.tag}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>{m.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Danger zone card */}
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: 'rgba(195,54,101,0.18)',
                background: 'linear-gradient(180deg, var(--surface), var(--danger-soft))',
              }}
            >
              <div className="flex items-center gap-3 border-b px-[18px] py-[14px]" style={{ borderColor: 'rgba(195,54,101,0.18)' }}>
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Danger zone
                  </p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                    Irreversible actions. Delete the workspace, or leave it if you&apos;re a member.
                  </p>
                </div>
              </div>
              <div className="px-[18px] py-[18px]">
                {isOwner && (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>Delete workspace</p>
                      <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                        Permanently removes &quot;{workspaceName}&quot;, all agents, and all data.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirmOpen(true); setDeleteError(null); setDeleteConfirmText('') }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--danger-soft)]"
                      style={{ borderColor: 'rgba(195,54,101,0.3)', color: 'var(--danger)', background: 'var(--surface)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete workspace
                    </button>
                  </div>
                )}
                {isMember && !isOwner && (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>Leave workspace</p>
                      <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                        You&apos;ll lose access and can only rejoin via a new invitation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLeaveConfirmOpen(true); setLeaveError(null) }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                      style={{ borderColor: 'var(--line-2)', color: 'var(--ink-2)', background: 'var(--surface)' }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Leave workspace
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>{/* end main col */}
        </div>{/* end settings-split */}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,29,0.5)' }}
          onClick={() => !deleteLoading && (setDeleteConfirmOpen(false), setDeleteError(null))}
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Delete &quot;{workspaceName}&quot;?</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                  This cannot be undone. All agents, data sources, chat logs, and workspace data will be permanently deleted.
                </p>
                <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Type the workspace name to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={workspaceName}
                  autoFocus
                  className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--surface)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--danger)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
                />
                {deleteError && <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{deleteError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirmOpen(false); setDeleteError(null); setDeleteConfirmText('') }}
                    disabled={deleteLoading}
                    className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteWorkspace}
                    disabled={deleteLoading || deleteConfirmText.trim() !== workspaceName.trim()}
                    className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'var(--danger)' }}
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave confirmation modal */}
      {leaveConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,29,0.5)' }}
          onClick={() => !leaveLoading && (setLeaveConfirmOpen(false), setLeaveError(null))}
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                <LogOut className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Leave &quot;{workspaceName}&quot;?</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                  You will lose access to this workspace and its agents. You can rejoin only if invited again.
                </p>
                {leaveError && <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{leaveError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setLeaveConfirmOpen(false); setLeaveError(null) }}
                    disabled={leaveLoading}
                    className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveWorkspace}
                    disabled={leaveLoading}
                    className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'var(--warn)' }}
                  >
                    {leaveLoading ? 'Leaving…' : 'Leave workspace'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
