'use client'

import { Send } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicInputProps {
  config: MergedSkinConfig
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  inputRef?: React.RefObject<HTMLInputElement>
}

export default function DynamicInput({
  config,
  value,
  onChange,
  onSubmit,
  isLoading,
  inputRef
}: DynamicInputProps) {
  const inputConfig = config.components?.input || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  const borderColor = config.theme?.borderColor || '#e5e7eb'
  
  const placeholder = inputConfig.placeholder || 'Type your message...'
  const showSendButton = inputConfig.showSendButton !== false
  const allowMultiline = inputConfig.allowMultiline || false

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !isLoading) {
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor }}>
      <div className="flex gap-2">
        {allowMultiline ? (
          <textarea
            ref={inputRef as any}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm resize-none"
            style={{ 
              borderColor,
              '--tw-ring-color': primaryColor 
            } as React.CSSProperties}
            disabled={isLoading}
            rows={3}
            maxLength={inputConfig.maxLength}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm"
            style={{ 
              borderColor,
              '--tw-ring-color': primaryColor 
            } as React.CSSProperties}
            disabled={isLoading}
            maxLength={inputConfig.maxLength}
            autoFocus={inputConfig.autoFocus !== false}
          />
        )}
        {showSendButton && (
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      {inputConfig.showCharacterCount && inputConfig.maxLength && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {value.length} / {inputConfig.maxLength}
        </div>
      )}
    </form>
  )
}

