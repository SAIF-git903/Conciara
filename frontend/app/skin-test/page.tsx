'use client'

import { useState, useEffect } from 'react'
import ChatbotWidget from '@/components/ChatbotWidget'

export default function SkinTestPage() {
  const [skinId, setSkinId] = useState<number | null>(null)
  const [websiteId, setWebsiteId] = useState<number | null>(null)
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:3001/api')

  useEffect(() => {
    // Get parameters from URL query string
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const skinIdParam = params.get('skinId')
      const websiteIdParam = params.get('websiteId')
      const apiUrlParam = params.get('apiUrl')
      
      if (skinIdParam) {
        setSkinId(parseInt(skinIdParam))
      }
      
      if (websiteIdParam) {
        setWebsiteId(parseInt(websiteIdParam))
      }
      
      if (apiUrlParam) {
        setApiUrl(apiUrlParam)
      } else {
        setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Skin Debug Test Page</h1>
          <p className="text-gray-600 mb-6">
            Test the chatbot widget with different skins. The debug panel will appear automatically!
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Skin ID (for direct skin selection)
                </label>
                <input
                  type="number"
                  value={skinId || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null
                    setSkinId(value)
                    // Update URL
                    const params = new URLSearchParams(window.location.search)
                    if (value) {
                      params.set('skinId', value.toString())
                    } else {
                      params.delete('skinId')
                    }
                    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                  }}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a skin ID to test that specific skin
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website ID (alternative)
                </label>
                <input
                  type="number"
                  value={websiteId || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null
                    setWebsiteId(value)
                    // Update URL
                    const params = new URLSearchParams(window.location.search)
                    if (value) {
                      params.set('websiteId', value.toString())
                    } else {
                      params.delete('websiteId')
                    }
                    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                  }}
                  placeholder="e.g., 1"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or use website ID to get active skin
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {(skinId || websiteId) && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✓ Widget Active</strong>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {skinId ? `Using Skin ID: ${skinId}` : `Using Website ID: ${websiteId}`}
                </p>
                <p className="text-xs text-green-600">
                  Look for the <strong>🐛 Debug Skin</strong> button in the bottom-left corner!
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How to Use Debug Panel:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Look for the <strong>🐛 Debug Skin</strong> button in the bottom-left corner</li>
                <li>Click it to open the debug panel</li>
                <li>Check the "Theme Colors" section to see what colors are loaded</li>
                <li>Click "Refresh" to reload config from API</li>
                <li>Check browser console for detailed logs (look for <code className="bg-blue-100 px-1 rounded">[ChatbotWidget]</code>)</li>
                <li>Use "Copy" button to copy all debug info</li>
              </ol>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">What to Check:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-purple-800">
                <li><strong>Skin ID:</strong> Is it correct?</li>
                <li><strong>Theme Colors:</strong> Are they showing? Do they match your dark theme?</li>
                <li><strong>API Response:</strong> Does it include <code className="bg-purple-100 px-1 rounded">skin.config</code>?</li>
                <li><strong>Console Logs:</strong> Check for errors or warnings</li>
                <li><strong>Widget Appearance:</strong> Does the chatbot actually use the dark theme colors?</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Widget with Debug Panel */}
      {(skinId || websiteId) && (
        <ChatbotWidget
          apiUrl={apiUrl}
          skinId={skinId || undefined}
          websiteId={websiteId || undefined}
          position="bottom-right"
        />
      )}
    </div>
  )
}

