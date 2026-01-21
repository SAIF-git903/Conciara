'use client'

import { useState } from 'react'
import { MergedSkinConfig } from '@/types/skinConfig'
import { X, Copy, Check, RefreshCw } from 'lucide-react'

interface SkinDebugPanelProps {
  config: MergedSkinConfig | null
  skinId?: number | null
  apiUrl: string
  onRefresh?: () => void
}

export default function SkinDebugPanel({ config, skinId, apiUrl, onRefresh }: SkinDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchConfig = async () => {
    if (!skinId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('skinId', skinId.toString())
      const response = await fetch(`${apiUrl}/widget/config?${params.toString()}`)
      const data = await response.json()
      setApiResponse(data)
      console.log('[SkinDebug] API Response:', data)
    } catch (error) {
      console.error('[SkinDebug] Error fetching config:', error)
      setApiResponse({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const copyConfig = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      skinId,
      apiUrl,
      config,
      apiResponse,
      theme: config?.theme,
      components: config?.components,
      states: config?.states,
    }
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          if (skinId) fetchConfig()
        }}
        className="fixed bottom-4 left-4 z-[9999] bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 text-sm font-medium"
        title="Open Skin Debug Panel"
      >
        🐛 Debug Skin
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-96 max-h-[80vh] bg-white border-2 border-purple-500 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <h3 className="font-bold text-sm">Skin Debug Panel</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            disabled={loading || !skinId}
            className="p-1 hover:bg-purple-700 rounded disabled:opacity-50"
            title="Refresh Config"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={copyConfig}
            className="p-1 hover:bg-purple-700 rounded"
            title="Copy Debug Info"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-purple-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Current Config */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Current Config</h4>
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <div className="space-y-1">
              <div><strong>Skin ID:</strong> {skinId || 'Not set'}</div>
              <div><strong>API URL:</strong> {apiUrl}</div>
              <div><strong>Has Config:</strong> {config ? '✅ Yes' : '❌ No'}</div>
              {config?._meta && (
                <div><strong>Meta:</strong> {JSON.stringify(config._meta, null, 2)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        {config?.theme && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Theme Colors</h4>
            <div className="space-y-2">
              {Object.entries(config.theme).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: value as string }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-700">{key}</div>
                    <div className="text-gray-500 font-mono">{value as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Response */}
        {apiResponse && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">API Response</h4>
            <div className="bg-gray-50 p-2 rounded border border-gray-200 max-h-40 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Full Config JSON */}
        {config && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Full Config JSON</h4>
            <div className="bg-gray-50 p-2 rounded border border-gray-200 max-h-40 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Warnings */}
        {!config && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
            ⚠️ No skin config loaded. Check console for errors.
          </div>
        )}
        {config && !config.theme && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
            ⚠️ Config loaded but no theme colors found.
          </div>
        )}
        {skinId && !apiResponse && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
            ℹ️ Click refresh to fetch config from API.
          </div>
        )}
      </div>
    </div>
  )
}

