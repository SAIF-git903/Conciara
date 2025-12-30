'use client'

import { useState, useEffect } from 'react'
import { Save, FileText, Sparkles } from 'lucide-react'
import { Preprompt } from '@/lib/api'

interface PrepromptEditorProps {
  preprompt: Preprompt | null
  onSave: (content: string) => void
  loading: boolean
}

export default function PrepromptEditor({ preprompt, onSave, loading }: PrepromptEditorProps) {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    setContent(preprompt?.content || '')
  }, [preprompt])

  const handleSave = async () => {
    if (!content.trim()) {
      setValidationError('Preprompt content cannot be empty')
      setTimeout(() => setValidationError(null), 3000)
      return
    }

    setValidationError(null)
    setIsSaving(true)
    try {
      await onSave(content)
    } finally {
      setIsSaving(false)
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-bold text-gray-900">Preprompt</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-gray-200">
          <Sparkles className="w-3 h-3 text-primary-500" />
          <span className="text-xs font-semibold text-gray-700">{wordCount}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {validationError && (
          <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg text-yellow-800 text-sm animate-slide-up">
            {validationError}
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            if (validationError) setValidationError(null)
          }}
          placeholder="Enter system preprompt..."
          className="w-full flex-1 p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 text-gray-900 placeholder:text-gray-400 resize-none transition-all text-sm leading-relaxed"
          disabled={loading || isSaving}
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">System message for all conversations</p>
          <button
            onClick={handleSave}
            disabled={loading || isSaving || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
