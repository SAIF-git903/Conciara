'use client'

import { Shield } from 'lucide-react'

interface AvatarProps {
  name?: string
  email: string
  role?: 'admin' | 'manager' | 'viewer'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

export default function Avatar({ name, email, role, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : email.charAt(0).toUpperCase()

  return (
    <div
      className={`${sizeClasses[size]} ${className} flex items-center justify-center rounded-full font-medium bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm ring-2 ring-white`}
    >
      {role === 'admin' ? (
        <Shield className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
