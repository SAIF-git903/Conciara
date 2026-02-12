'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, X, Info, AlertCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  }

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-large border-2 backdrop-blur-sm animate-slide-in ${styles[type]}`}
    >
      {icons[type]}
      <p className="flex-1 font-medium">{message}</p>
      <button
        onClick={onClose}
        className="hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

