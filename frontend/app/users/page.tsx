'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, User, CreateUserInput } from '@/lib/authApi'
import { websiteApi, Website } from '@/lib/api'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Trash2, Edit, Plus, X, Check } from 'lucide-react'

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    if (isAdmin) {
      const loadData = async () => {
        if (!isMounted) return
        await loadUsers()
        if (isMounted) {
          await loadWebsites()
        }
      }
      loadData()
    }

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [isAdmin])

  const loadUsers = async () => {
    try {
      const data = await userApi.getAll()
      setUsers(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadWebsites = async () => {
    try {
      // Get all customer types and their websites
      const { customerTypeApi } = await import('@/lib/api')
      const customerTypes = await customerTypeApi.getAll()
      const allWebsites: Website[] = []
      
      for (const ct of customerTypes) {
        const ws = await websiteApi.getByCustomerType(ct.id)
        allWebsites.push(...ws)
      }
      
      setWebsites(allWebsites)
    } catch (err) {
      console.error('Failed to load websites:', err)
    }
  }

  const handleCreate = async (formData: CreateUserInput) => {
    try {
      await userApi.create(formData)
      setShowCreateForm(false)
      await loadUsers()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      await userApi.delete(id)
      await loadUsers()
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    }
  }

  const handleUpdateWebsites = async (userId: number, websiteIds: number[]) => {
    try {
      await userApi.updateWebsites(userId, websiteIds)
      await loadUsers()
      setError(null)
      setEditingUser(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update user websites')
    }
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="p-8">
          <p className="text-gray-600">Access denied. Admin only.</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <AppHeader />
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                  <p className="text-gray-600">Manage users, roles, and domain assignments</p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create User
                </button>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Total Users</div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Admins</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Managers</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === 'manager').length}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Viewers</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {users.filter(u => u.role === 'viewer').length}
                  </div>
                </div>
              </div>
            </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Create User Form */}
          {showCreateForm && (
            <CreateUserForm
              websites={websites}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {/* Users List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Assigned Domains
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-indigo-700">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{user.email}</div>
                            {user.fullName && (
                              <div className="text-sm text-gray-500">{user.fullName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {user.role === 'admin' && '👑 '}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingUser?.id === user.id ? (
                          <EditWebsitesForm
                            user={user}
                            websites={websites}
                            onSave={(websiteIds) => handleUpdateWebsites(user.id, websiteIds)}
                            onCancel={() => setEditingUser(null)}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {user.role === 'admin' ? (
                              <span className="text-sm text-gray-500">All domains</span>
                            ) : user.websites && user.websites.length > 0 ? (
                              user.websites.map((w) => (
                                <span
                                  key={w.websiteId}
                                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded"
                                >
                                  {w.domain || w.websiteName}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">No domains assigned</span>
                            )}
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => setEditingUser(user)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                <Edit className="w-4 h-4 inline" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={user.role === 'admin'}
                          title={user.role === 'admin' ? 'Cannot delete admin user' : 'Delete user'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function CreateUserForm({
  websites,
  onSubmit,
  onCancel,
}: {
  websites: Website[]
  onSubmit: (data: CreateUserInput) => void
  onCancel: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'manager' | 'viewer'>('manager')
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<number[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      email,
      password,
      fullName: fullName || undefined,
      role,
      websiteIds: selectedWebsiteIds.length > 0 ? selectedWebsiteIds : undefined,
    })
    // Reset form
    setEmail('')
    setPassword('')
    setFullName('')
    setRole('manager')
    setSelectedWebsiteIds([])
  }

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Optional)</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'manager' | 'viewer')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Domains (Optional)</label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
            {websites.map((website) => (
              <label key={website.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedWebsiteIds.includes(website.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedWebsiteIds([...selectedWebsiteIds, website.id])
                    } else {
                      setSelectedWebsiteIds(selectedWebsiteIds.filter(id => id !== website.id))
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  {website.domain || website.name}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Create User
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function EditWebsitesForm({
  user,
  websites,
  onSave,
  onCancel,
}: {
  user: User
  websites: Website[]
  onSave: (websiteIds: number[]) => void
  onCancel: () => void
}) {
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<number[]>(
    user.websites?.map(w => w.websiteId) || []
  )

  const handleSave = () => {
    onSave(selectedWebsiteIds)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-h-32 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
        {websites.map((website) => (
          <label key={website.id} className="flex items-center gap-2 p-1 text-xs">
            <input
              type="checkbox"
              checked={selectedWebsiteIds.includes(website.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedWebsiteIds([...selectedWebsiteIds, website.id])
                } else {
                  setSelectedWebsiteIds(selectedWebsiteIds.filter(id => id !== website.id))
                }
              }}
              className="rounded"
            />
            <span>{website.domain || website.name}</span>
          </label>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="text-green-600 hover:text-green-800"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="text-gray-600 hover:text-gray-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
