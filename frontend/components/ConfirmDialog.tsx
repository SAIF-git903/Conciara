'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-scale-in border border-gray-100">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-6 py-2.5 text-white rounded-xl font-semibold shadow-medium transition-all ${variantStyles[variant]}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

