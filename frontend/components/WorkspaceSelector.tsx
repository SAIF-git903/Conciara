'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Globe, ChevronDown } from 'lucide-react'

export default function WorkspaceSelector() {
  const { user, isAdmin } = useAuth()

  if (!user) return null

  // For editors/viewers, show their assigned domains
  if (!isAdmin && user.websites && user.websites.length > 0) {
    if (user.websites.length === 1) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200">
          <Globe className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {user.websites[0].domain || user.websites[0].websiteName}
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {user.websites.length} domains
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
    )
  }

  // For admins, show "All Workspaces" or could be a dropdown
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200">
      <Globe className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">All Workspaces</span>
    </div>
  )
}
