'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, Minimize2, Maximize2, Bot, User } from 'lucide-react'

interface ChatbotWidgetProps {
  apiUrl?: string
  treeId: number
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  theme?: {
    primaryColor?: string
    backgroundColor?: string
    textColor?: string
  }
}

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

export default function ChatbotWidget({
  apiUrl = 'http://localhost:3001/api',
  treeId,
  position = 'bottom-right',
  theme = {}
}: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Initialize conversation with root node
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoading) {
      initializeConversation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const initializeConversation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: treeId,
          user_message: '__START__', // Special message to start conversation
          session_id: null
        })
      })

      const data = await response.json()
      setSessionId(data.session_id)

      // Get root node response
      if (data.bot_response) {
        addMessage('bot', data.bot_response)
        if (data.options && data.options.length > 0) {
          setQuickReplies(data.options)
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error)
      addMessage('bot', "Sorry, I'm having trouble connecting. Please try again.")
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
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    addMessage('user', userMessage)
    setInputValue('')
    setQuickReplies([])
    setIsLoading(true)

    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: treeId,
          user_message: userMessage,
          session_id: sessionId
        })
      })

      const data = await response.json()
      
      if (!sessionId) {
        setSessionId(data.session_id)
      }

      if (data.bot_response) {
        addMessage('bot', data.bot_response)
        
        if (data.options && data.options.length > 0) {
          setQuickReplies(data.options)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage('bot', "Sorry, I'm having trouble. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      sendMessage(inputValue)
    }
  }

  const handleQuickReply = (reply: string) => {
    sendMessage(reply)
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  const primaryColor = theme.primaryColor || '#6366f1'
  const backgroundColor = theme.backgroundColor || '#ffffff'
  const textColor = theme.textColor || '#1f2937'

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`bg-white rounded-lg shadow-2xl flex flex-col transition-all ${
            isMinimized ? 'w-80 h-12' : 'w-96 h-[600px]'
          }`}
          style={{ backgroundColor }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 rounded-t-lg flex items-center justify-between text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">Chat Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setIsMinimized(false)
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor }}>
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Starting conversation...
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type === 'bot' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.type === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-white'
                      }`}
                      style={
                        message.type === 'bot'
                          ? { backgroundColor: primaryColor }
                          : undefined
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {quickReplies.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 text-xs rounded-full border transition-colors hover:bg-gray-50"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm"
                    style={{ 
                      '--tw-ring-color': primaryColor 
                    } as React.CSSProperties}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

