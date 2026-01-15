'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

export default function MemoryTestPage() {
  const [userId, setUserId] = useState('john')
  const [treeId, setTreeId] = useState(41)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const apiUrl = 'http://localhost:3001/api'
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, userId])

  const initializeConversation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: treeId,
          user_message: '__START__',
          session_id: null,
          user_id: userId,
          use_memory: true
        })
      })

      const data = await response.json()
      setSessionId(data.session_id)

      if (data.bot_response) {
        addMessage('bot', data.bot_response)
      }
    } catch (error: any) {
      addMessage('bot', `Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (type: 'user' | 'bot', content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isLoading) {
      console.log('Send blocked:', { trimmedMessage, isLoading })
      return
    }

    console.log('Sending message:', trimmedMessage)
    addMessage('user', trimmedMessage)
    setInput('')
    setIsLoading(true)

    try {
      const requestBody = {
        tree_id: treeId,
        user_message: trimmedMessage,
        session_id: sessionId,
        user_id: userId || null,
        use_memory: true
      }
      
      console.log('Request body:', requestBody)

      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      console.log('Response:', data)
      
      setSessionId(data.session_id)

      if (data.bot_response) {
        addMessage('bot', data.bot_response)
      } else {
        addMessage('bot', 'No response received from server')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      addMessage('bot', `Error: ${error.message || 'Failed to send message. Check console for details.'}`)
    } finally {
      setIsLoading(false)
      // Focus input after sending
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const resetConversation = () => {
    setMessages([])
    setSessionId(null)
    setInput('')
    initializeConversation()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Left Panel */}
      <div style={{
        width: '300px',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        backgroundColor: '#f9fafb',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>🧪 Memory Test</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            User ID:
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              setMessages([])
              setSessionId(null)
            }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="e.g., john, steve"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Tree ID:
          </label>
          <input
            type="number"
            value={treeId}
            onChange={(e) => {
              setTreeId(parseInt(e.target.value) || 41)
              setMessages([])
              setSessionId(null)
            }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <button
          onClick={resetConversation}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            marginBottom: '20px'
          }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>User Memory System Test</h1>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#f9fafb'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              marginTop: '50px'
            }}>
              <p>Start a conversation to test the memory system</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: '15px',
                display: 'flex',
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: msg.type === 'user' ? '#6366f1' : 'white',
                color: msg.type === 'user' ? 'white' : '#1f2937',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '15px'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'white'
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                console.log('Input changed:', e.target.value)
                setInput(e.target.value)
              }}
              placeholder="Type your message..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: isLoading || !input.trim() ? '#9ca3af' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
