'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '@/contexts/AuthContext'

export default function UserDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  const handleLogout = () => {
    setIsOpen(false)
    logout()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="User menu"
      >
        <Avatar name={user.fullName} email={user.email} role={user.role} size="sm" />
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar name={user.fullName} email={user.email} role={user.role} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  {user.websites && user.websites.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.websites.length} domain{user.websites.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
