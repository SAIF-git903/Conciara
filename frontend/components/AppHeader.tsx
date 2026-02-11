'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { MessageSquare, Users, Bug } from 'lucide-react'
import NavItem from './NavItem'
import UserDropdown from './UserDropdown'

export default function AppHeader() {
  const { user, isAdmin } = useAuth()

  if (!user) return null

  const navItems = [
    {
      href: '/',
      label: 'Dialog Trees',
      icon: MessageSquare,
    },
    {
      href: '/conversation-debugger',
      label: 'Debugger',
      icon: Bug,
    },

  ]

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200/80 backdrop-blur-sm bg-white/95">
      <div className="h-full px-4 md:px-6">
        <div className="h-full flex items-center justify-between max-w-[1920px] mx-auto">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8 flex-1 min-w-0">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 flex-shrink-0 group"
              aria-label="ConversaTree Home"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-xl group-hover:shadow-indigo-500/40 transition-all duration-300 group-hover:scale-105">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight hidden sm:inline-block font-['Poppins',sans-serif] drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300">
                ConversaTree
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1 ml-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </nav>
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* User Dropdown */}
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}
