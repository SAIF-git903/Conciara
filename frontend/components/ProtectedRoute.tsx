'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireEditor?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireEditor = false 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
        return
      }

      if (requireAdmin && user.role !== 'admin') {
        router.push('/')
        return
      }

      if (requireEditor && user.role === 'viewer') {
        router.push('/')
        return
      }
    }
  }, [user, loading, requireAdmin, requireEditor, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && user.role !== 'admin') {
    return null
  }

  if (requireEditor && user.role === 'viewer') {
    return null
  }

  return <>{children}</>
}
