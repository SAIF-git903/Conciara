'use client'

import { Bot, User } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface MediaItem {
  id: number
  media_type: 'image' | 'video'
  s3_url: string
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

interface DynamicMessagesProps {
  config: MergedSkinConfig
  messages: Message[]
  isLoading: boolean
}

export default function DynamicMessages({ 
  config, 
  messages, 
  isLoading 
}: DynamicMessagesProps) {
  const messagesConfig = config.components?.messages || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  const backgroundColor = config.theme?.backgroundColor || '#ffffff'
  const textColor = config.theme?.textColor || '#1f2937'
  
  const layout = messagesConfig.layout || 'bubbles'
  const userAlignment = messagesConfig.userAlignment || 'right'
  const botAlignment = messagesConfig.botAlignment || 'left'
  const showAvatars = messagesConfig.showAvatars !== false
  const bubbleStyle = messagesConfig.bubbleStyle || 'rounded'
  
  const borderRadiusMap = {
    rounded: 'rounded-lg',
    square: 'rounded-none',
    minimal: 'rounded-sm'
  }

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ backgroundColor }}
    >
      {messages.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 text-sm py-8">
          {config.states?.empty?.message || 'Starting conversation...'}
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-2 ${
            message.type === 'user' 
              ? `justify-${userAlignment}` 
              : `justify-${botAlignment}`
          }`}
        >
          {message.type === 'bot' && showAvatars && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}
          <div
            className={`max-w-[80%] ${borderRadiusMap[bubbleStyle]} px-3 py-2 ${
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
            <p className="text-sm whitespace-pre-wrap" style={{ color: message.type === 'user' ? textColor : 'white' }}>
              {message.content}
            </p>
            
            {/* Media Display */}
            {message.media && message.media.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.media.map((item) => (
                  <div key={item.id} className="rounded-lg overflow-hidden">
                    {item.media_type === 'image' ? (
                      <img
                        src={item.s3_url}
                        alt={item.file_name}
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    ) : (
                      <video
                        src={item.s3_url}
                        controls
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {messagesConfig.showTimestamps && (
              <span className="text-xs opacity-70 mt-1 block">
                {messagesConfig.timestampFormat === 'relative'
                  ? getRelativeTime(message.timestamp)
                  : message.timestamp.toLocaleTimeString()}
              </span>
            )}
          </div>
          {message.type === 'user' && showAvatars && (
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
            <LoadingIndicator config={config} />
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingIndicator({ config }: { config: MergedSkinConfig }) {
  const loadingConfig = config.states?.loading || {}
  const type = loadingConfig.type || 'dots'
  const primaryColor = config.theme?.primaryColor || '#6366f1'

  if (type === 'dots') {
    return (
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ 
            backgroundColor: loadingConfig.color === 'primary' ? primaryColor : '#9ca3af',
            animationDelay: '0ms' 
          }}
        />
        <div 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ 
            backgroundColor: loadingConfig.color === 'primary' ? primaryColor : '#9ca3af',
            animationDelay: '150ms' 
          }}
        />
        <div 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ 
            backgroundColor: loadingConfig.color === 'primary' ? primaryColor : '#9ca3af',
            animationDelay: '300ms' 
          }}
        />
      </div>
    )
  }

  return <div>Loading...</div>
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

