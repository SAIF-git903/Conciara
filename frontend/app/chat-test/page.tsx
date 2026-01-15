'use client'

import { useState, useEffect } from 'react'
import ChatbotWidget from '@/components/ChatbotWidget'
import { dialogTreeApi, DialogTree } from '@/lib/api'

export default function ChatTestPage() {
  const [trees, setTrees] = useState<DialogTree[]>([])
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrees()
  }, [])

  const loadTrees = async () => {
    try {
      setLoading(true)
      const data = await dialogTreeApi.getAll()
      setTrees(data)
      if (data.length > 0) {
        setSelectedTreeId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading trees:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chatbot Test Page</h1>
          <p className="text-gray-600 mb-6">
            Test the chatbot widget with your dialog trees. Select a tree and start chatting!
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Dialog Tree
              </label>
              {loading ? (
                <div className="text-gray-500">Loading trees...</div>
              ) : trees.length === 0 ? (
                <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No dialog trees found. Create one in the main application first.
                </div>
              ) : (
                <select
                  value={selectedTreeId || ''}
                  onChange={(e) => setSelectedTreeId(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {trees.map((tree) => (
                    <option key={tree.id} value={tree.id}>
                      {tree.name} {tree.description && `- ${tree.description}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedTreeId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✓ Chatbot Active</strong> - Look for the chat button in the bottom-right corner!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Tree ID: {selectedTreeId}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Click the chat button in the bottom-right corner</li>
                <li>The bot will start with the root node message</li>
                <li>Type a message or click quick reply buttons</li>
                <li>The bot will navigate through the conversation tree</li>
                <li>Try different inputs to test the matching logic</li>
              </ol>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Testing Tips:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>Try exact matches: Use the exact text from &quot;User Input&quot; fields</li>
                <li>Try partial matches: Use similar words or phrases</li>
                <li>Try keywords: Use key words from the user input</li>
                <li>Try unrelated text: See how the bot handles unmatched input</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">API Endpoints</h2>
          <div className="space-y-3 text-sm font-mono">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-green-600 font-semibold">POST</div>
              <div className="text-gray-700">/api/chat/message</div>
              <div className="text-gray-500 text-xs mt-1">
                Body: {'{'} tree_id, user_message, session_id? {'}'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-blue-600 font-semibold">GET</div>
              <div className="text-gray-700">/api/chat/history/:sessionId</div>
              <div className="text-gray-500 text-xs mt-1">
                Get conversation history for a session
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-orange-600 font-semibold">POST</div>
              <div className="text-gray-700">/api/chat/reset</div>
              <div className="text-gray-500 text-xs mt-1">
                Body: {'{'} session_id {'}'} - Reset conversation to start
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Widget */}
      {selectedTreeId && (
        <ChatbotWidget
          apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}
          treeId={selectedTreeId}
          position="bottom-right"
        />
      )}
    </div>
  )
}

