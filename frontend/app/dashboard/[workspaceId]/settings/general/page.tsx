'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react'

export default function WorkspaceSettingsGeneralPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const isOwner = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner'
  )
  const isMember = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)
  )
  const workspaceName = currentWorkspace?.id === workspaceId
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
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      await api.patch(`/workspaces/${workspaceId}`, { name: name.trim() })
      await refreshUser()
      setSuccess(true)
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null
      setError(message || 'Failed to save workspace settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (workspaceId == null || !isOwner) return
    if (deleteConfirmText.trim() !== workspaceName.trim()) return
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await api.delete(`/workspaces/${workspaceId}`)
      await refreshUser()
      setDeleteConfirmOpen(false)
      setDeleteConfirmText('')
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Invalid workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">General</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Workspace name and basic settings. Only the owner can change these.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-slate-700">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)] disabled:bg-slate-50 disabled:text-slate-500"
            />
            {!isOwner && (
              <p className="mt-1.5 text-xs text-slate-500">Only the workspace owner can edit the name.</p>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="mt-3 text-sm text-green-600">Settings saved.</p>
            )}

            {isOwner && (
              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </form>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Danger zone
            </h2>
            <p className="mt-1 text-xs text-red-700/90">
              Irreversible actions. Delete the workspace or leave it if you are a member.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => { setDeleteConfirmOpen(true); setDeleteError(null); setDeleteConfirmText(''); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Delete workspace
                </button>
              )}
              {isMember && !isOwner && (
                <button
                  type="button"
                  onClick={() => { setLeaveConfirmOpen(true); setLeaveError(null); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Leave workspace
                </button>
              )}
              {isOwner && (
                <p className="text-xs text-slate-600">
                  As owner, you can delete this workspace and all its agents and data. You cannot leave; delete the workspace instead.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete workspace confirmation modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !deleteLoading && (setDeleteConfirmOpen(false), setDeleteError(null))}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Delete workspace &quot;{workspaceName}&quot;?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This cannot be undone. All agents, data sources, chat logs, and workspace data will be permanently deleted.
                </p>
                <p className="mt-3 text-sm font-medium text-slate-700">Type the workspace name to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={workspaceName}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  autoFocus
                />
                {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirmOpen(false); setDeleteError(null); setDeleteConfirmText(''); }}
                    disabled={deleteLoading}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteWorkspace}
                    disabled={deleteLoading || deleteConfirmText.trim() !== workspaceName.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave workspace confirmation modal */}
      {leaveConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !leaveLoading && (setLeaveConfirmOpen(false), setLeaveError(null))}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Leave &quot;{workspaceName}&quot;?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  You will lose access to this workspace and its agents. You can rejoin only if invited again.
                </p>
                {leaveError && <p className="mt-2 text-sm text-red-600">{leaveError}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setLeaveConfirmOpen(false); setLeaveError(null); }}
                    disabled={leaveLoading}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveWorkspace}
                    disabled={leaveLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none"
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
