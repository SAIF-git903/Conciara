'use client'

import { useState, useRef, useEffect } from 'react'
import { MergedSkinConfig } from '../types/skinConfig'
import { WIDGET_LANGUAGES, getWidgetTranslations } from '@/lib/widgetTranslations'
import DynamicButton from './DynamicComponents/DynamicButton'
import DynamicWindow from './DynamicComponents/DynamicWindow'
import DynamicHeader from './DynamicComponents/DynamicHeader'
import DynamicMessages from './DynamicComponents/DynamicMessages'
import DynamicInput from './DynamicComponents/DynamicInput'
import DynamicQuickReplies from './DynamicComponents/DynamicQuickReplies'

interface MediaItem {
  id: number
  media_type: 'image' | 'video'
  s3_url: string
  presigned_url?: string
  file_name: string
  content_type: string
  file_size: number
}

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  media?: MediaItem[]
}

export interface SkinRendererProps {
  config: MergedSkinConfig
  apiUrl: string
  treeId: number | null
  userId?: string | null
  useMemory?: boolean
  /** Selected language code (e.g. "es"). When null and requireLanguageSelection, picker is shown first. */
  language?: string | null
  /** Called when user selects a language in the picker */
  onLanguageSelect?: (lang: string) => void
  /** When true, user must select a language before the conversation starts (picker shown first) */
  requireLanguageSelection?: boolean
  onMessage?: (message: string) => Promise<void>
  initialMessages?: Message[]
  sessionId?: string | null
}

export default function SkinRenderer({
  config,
  apiUrl,
  treeId,
  userId,
  useMemory = true,
  language = null,
  onLanguageSelect,
  requireLanguageSelection = false,
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initializingRef = useRef(false)

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

  // When onLanguageSelect is provided, only start conversation after user selects a language
  const hasLanguagePicker = typeof onLanguageSelect === 'function'
  const canStartConversation = !hasLanguagePicker || !!language
  useEffect(() => {
    if (!isOpen || messages.length > 0 || isLoading) return
    if (!canStartConversation) return // Must choose language first
    if (treeId) {
      if (initializingRef.current) return // Prevent double call (e.g. React Strict Mode)
      initializingRef.current = true
      initializeConversation()
    } else {
      addMessage('bot', config.states?.error?.message || "Sorry, no chatbot is configured. Please contact support.")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, language, canStartConversation])

  const initializeConversation = async (languageOverride?: string) => {
    if (!treeId) {
      addMessage('bot', "Sorry, no chatbot is configured for this website. Please contact support.")
      return
    }
    const langToUse = languageOverride ?? language
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: treeId,
          user_message: '__START__',
          session_id: null,
          user_id: userId || null,
          use_memory: useMemory,
          ...(langToUse ? { language: langToUse } : {})
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      setSessionId(data.session_id)

      if (data.bot_response) {
        addMessage('bot', data.bot_response, data.media)
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
      initializingRef.current = false
    }
  }

  const addMessage = (type: 'user' | 'bot', content: string, media?: MediaItem[]) => {
    const newMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      media
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
            session_id: sessionId,
            user_id: userId || null,
            use_memory: useMemory,
            ...(language ? { language } : {})
          })
        })

        const data = await response.json()
        
        if (!sessionId) {
          setSessionId(data.session_id)
        }

        if (data.bot_response) {
          addMessage('bot', data.bot_response, data.media)
          
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
    setSettingsOpen(false)
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
            showSettings={!!(language && typeof onLanguageSelect === 'function')}
            onSettingsClick={() => setSettingsOpen(true)}
          />

          {!isMinimized && (
            <>
              {settingsOpen && language && typeof onLanguageSelect === 'function' ? (
                <div
                  className="flex-1 overflow-y-auto p-4 min-h-0"
                  style={{ backgroundColor: config.theme?.backgroundColor || '#ffffff' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1 text-sm font-medium"
                      style={{ color: config.theme?.textColor || '#1f2937' }}
                    >
                      <span className="text-lg leading-none">←</span>
                      Back
                    </button>
                  </div>
                  <p className="text-sm font-semibold mb-2" style={{ color: config.theme?.textColor || '#1f2937' }}>
                    {getWidgetTranslations(language).chooseLanguage}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {WIDGET_LANGUAGES.map(({ code, name }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const isNewLanguage = code !== language
                          onLanguageSelect(code)
                          setSettingsOpen(false)
                          if (isNewLanguage) {
                            setMessages([])
                            setQuickReplies([])
                            setSessionId(null)
                            initializingRef.current = false
                            if (treeId) initializeConversation(code)
                          }
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
                        style={{
                          backgroundColor: code === language ? (config.theme?.primaryColor || '#6366f1') : undefined,
                          color: code === language ? 'white' : (config.theme?.textColor || '#1f2937'),
                          border: code === language ? 'none' : `1px solid ${config.theme?.borderColor || '#e5e7eb'}`,
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (!language && typeof onLanguageSelect === 'function') ? (
                <div
                  className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[280px]"
                  style={{ backgroundColor: config.theme?.backgroundColor || '#ffffff' }}
                  data-conversatree="language-picker"
                >
                  <p className="text-base font-semibold mb-1" style={{ color: config.theme?.textColor || '#1f2937' }}>
                    {getWidgetTranslations('en').chooseLanguage}
                  </p>
                  <p className="text-sm text-gray-500 mb-5">
                    Select a language to continue
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                    {WIDGET_LANGUAGES.map(({ code, name }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => onLanguageSelect(code)}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90 text-white"
                        style={{ backgroundColor: config.theme?.primaryColor || '#6366f1' }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
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
            </>
          )}
        </DynamicWindow>
      )}
    </div>
  )
}

