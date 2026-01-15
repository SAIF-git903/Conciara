'use client'

import { useState } from 'react'
import ChatbotWidget from '@/components/ChatbotWidget'

export default function WidgetDemoPage() {
  const [userId, setUserId] = useState('john')
  const [treeId, setTreeId] = useState(41)

  return (
    <div style={{ 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '10px' }}>🤖 Live Chatbot Widget Demo</h1>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          This demonstrates the chatbot widget with user memory enabled. 
          The bot will remember user context and provide personalized responses.
        </p>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Configuration</h2>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                User ID (for memory):
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., john, steve"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Change this to test different users. The bot remembers each user separately.
              </small>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Tree ID:
              </label>
              <input
                type="number"
                value={treeId}
                onChange={(e) => setTreeId(parseInt(e.target.value) || 41)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '15px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>💡 How to Test:</strong>
            <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li>Set User ID to "john"</li>
              <li>Open chatbot (bottom-right)</li>
              <li>Say: "I am a React programmer"</li>
              <li>Then say: "I need a laptop"</li>
              <li>Bot should remember you're a React programmer and recommend Mac</li>
            </ol>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          minHeight: '400px'
        }}>
          <h2 style={{ marginTop: 0 }}>Demo Website Content</h2>
          <p>
            This simulates a real website. The chatbot widget appears in the bottom-right corner.
            Click the chat button to start a conversation.
          </p>
          <p>
            The chatbot will remember information based on the User ID you set above.
            Try changing the User ID and see how different users get different responses.
          </p>
        </div>
      </div>

      {/* Chatbot Widget with Memory Enabled */}
      <ChatbotWidget
        apiUrl="http://localhost:3001/api"
        treeId={treeId}
        userId={userId}
        useMemory={true}
        position="bottom-right"
      />
    </div>
  )
}

