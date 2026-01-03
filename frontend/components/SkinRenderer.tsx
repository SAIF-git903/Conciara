'use client'

import { useState, useRef, useEffect } from 'react'
import { MergedSkinConfig } from '../types/skinConfig'
import DynamicButton from './DynamicComponents/DynamicButton'
import DynamicWindow from './DynamicComponents/DynamicWindow'
import DynamicHeader from './DynamicComponents/DynamicHeader'
import DynamicMessages from './DynamicComponents/DynamicMessages'
import DynamicInput from './DynamicComponents/DynamicInput'
import DynamicQuickReplies from './DynamicComponents/DynamicQuickReplies'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

interface SkinRendererProps {
  config: MergedSkinConfig
  apiUrl: string
  treeId: number | null
  onMessage?: (message: string) => Promise<void>
  initialMessages?: Message[]
  sessionId?: string | null
}

export default function SkinRenderer({
  config,
  apiUrl,
  treeId,
  onMessage,
  initialMessages = [],
  sessionId: initialSessionId = null
}: SkinRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const buttonConfig = config.components?.button || {}
  const position = buttonConfig.position || 'bottom-right'

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoading) {
      if (treeId) {
        initializeConversation()
      } else {
        // Show error message if no treeId
        addMessage('bot', config.states?.error?.message || "Sorry, no chatbot is configured. Please contact support.")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const initializeConversation = async () => {
    if (!treeId) {
      addMessage('bot', "Sorry, no chatbot is configured for this website. Please contact support.")
      return
    }
    
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: treeId,
          user_message: '__START__',
          session_id: null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      setSessionId(data.session_id)

      if (data.bot_response) {
        addMessage('bot', data.bot_response)
        if (data.options && data.options.length > 0) {
          setQuickReplies(data.options)
        }
      } else {
        addMessage('bot', "Sorry, I received an empty response. Please try again.")
      }
    } catch (error) {
      console.error('Error initializing conversation:', error)
      addMessage('bot', config.states?.error?.message || "Sorry, I'm having trouble connecting. Please try again.")
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
    if (!message.trim() || isLoading || !treeId) return

    const userMessage = message.trim()
    addMessage('user', userMessage)
    setInputValue('')
    setQuickReplies([])
    setIsLoading(true)

    try {
      if (onMessage) {
        await onMessage(userMessage)
      } else {
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
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage('bot', config.states?.error?.message || "Sorry, I'm having trouble. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue)
    }
  }

  const handleQuickReply = (reply: string) => {
    sendMessage(reply)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  // Show error message if no treeId instead of hiding widget
  if (!treeId) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <DynamicButton
          config={config}
          onClick={() => setIsOpen(true)}
        />
        {isOpen && (
          <DynamicWindow config={config} isMinimized={isMinimized}>
            <DynamicHeader
              config={config}
              isMinimized={isMinimized}
              onMinimize={() => setIsMinimized(!isMinimized)}
              onClose={handleClose}
            />
            {!isMinimized && (
              <div className="flex-1 p-4 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-sm">
                    {config.states?.error?.message || "No chatbot is configured for this website."}
                  </p>
                  <p className="text-xs mt-2 text-gray-400">
                    Please contact support or check the configuration.
                  </p>
                </div>
              </div>
            )}
          </DynamicWindow>
        )}
      </div>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Chat Button */}
      {!isOpen && (
        <DynamicButton
          config={config}
          onClick={() => setIsOpen(true)}
        />
      )}

      {/* Chat Window */}
      {isOpen && (
        <DynamicWindow config={config} isMinimized={isMinimized}>
          <DynamicHeader
            config={config}
            isMinimized={isMinimized}
            onMinimize={() => setIsMinimized(!isMinimized)}
            onClose={handleClose}
          />

          {!isMinimized && (
            <>
              <DynamicMessages
                config={config}
                messages={messages}
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />

              <DynamicQuickReplies
                config={config}
                replies={quickReplies}
                onReply={handleQuickReply}
              />

              <DynamicInput
                config={config}
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                inputRef={inputRef}
              />
            </>
          )}
        </DynamicWindow>
      )}
    </div>
  )
}

