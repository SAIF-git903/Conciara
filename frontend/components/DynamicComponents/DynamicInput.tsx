'use client'

import { ArrowUp, Mic } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'
import { useRef, useEffect } from 'react'

const LINE_HEIGHT_PX = 24
const MAX_LINES = 3
const MIN_HEIGHT_PX = LINE_HEIGHT_PX + 16
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES + 16

interface DynamicInputProps {
  config: MergedSkinConfig
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setRef = (el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    if (inputRef && typeof inputRef === 'object' && 'current' in inputRef)
      (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
  }

  const placeholder = inputConfig.placeholder || 'Message...'
  const showSendButton = inputConfig.showSendButton !== false

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !isLoading) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit()
    }
    // Shift+Enter: allow default (insert newline, height grows)
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX)
    el.style.height = h + 'px'
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor }}>
      <div
        className="flex items-end gap-1 rounded-full border bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-offset-0"
        style={{
          borderColor,
          '--tw-ring-color': primaryColor,
        } as React.CSSProperties}
      >
        <textarea
          ref={setRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 py-2.5 pl-4 pr-1 border-0 focus:outline-none focus:ring-0 bg-transparent text-sm resize-none overflow-y-auto rounded-full placeholder:text-gray-400"
          style={{
            minHeight: MIN_HEIGHT_PX,
            maxHeight: MAX_HEIGHT_PX,
          }}
          maxLength={inputConfig.maxLength}
          autoFocus={inputConfig.autoFocus !== false}
        />
        <div className="flex items-center gap-0.5 shrink-0 pr-1.5 pb-1.5 pt-1">
          <button
            type="button"
            aria-label="Voice message"
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
          {showSendButton && (
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {inputConfig.showCharacterCount && inputConfig.maxLength && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {value.length} / {inputConfig.maxLength}
        </div>
      )}
    </form>
  )
}

