'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  label: string
  icon: LucideIcon
  active?: boolean
}

export default function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  const pathname = usePathname()
  const isActive = active !== undefined ? active : pathname === href

  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150
        ${
          isActive
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      <Icon
        className={`w-4 h-4 transition-colors ${
          isActive ? 'text-indigo-600' : 'text-gray-500'
        }`}
      />
      <span>{label}</span>
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />
      )}
    </Link>
  )
}
