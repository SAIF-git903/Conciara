'use client'

import { Bot, User } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'
import { useState, useEffect, useCallback } from 'react'

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
  const [viewer, setViewer] = useState<{
    items: Array<{ src: string; type: 'image' | 'video'; file_name?: string }>;
    index: number;
    scale: number;
  } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!viewer) return
      if (e.key === 'Escape') setViewer(null)
      if (e.key === 'ArrowRight') setViewer(v => v ? { ...v, index: Math.min(v.index + 1, v.items.length - 1), scale: 1 } : v)
      if (e.key === 'ArrowLeft') setViewer(v => v ? { ...v, index: Math.max(v.index - 1, 0), scale: 1 } : v)
      if (e.key === '+') setViewer(v => v ? { ...v, scale: Math.min(v.scale + 0.25, 3) } : v)
      if (e.key === '-') setViewer(v => v ? { ...v, scale: Math.max(v.scale - 0.25, 0.5) } : v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  const openViewer = useCallback((items: any[], index: number) => {
    const parsed = items.map(i => ({ src: (i as any).presigned_url || (i as any).s3_url, type: (i as any).media_type, file_name: (i as any).file_name }))
    setViewer({ items: parsed, index, scale: 1 })
  }, [])
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
                {(() => {
                  const images = (message.media || []).filter(m => m.media_type === 'image');
                  return message.media!.map((item, idx) => {
                    const src = (item as any).presigned_url || item.s3_url;
                    return (
                      <div key={item.id} className="rounded-lg overflow-hidden">
                        {item.media_type === 'image' ? (
                          <img
                            src={src}
                            alt={item.file_name}
                            className="max-w-full h-auto rounded-lg cursor-pointer"
                            style={{ maxHeight: '300px' }}
                            onClick={() => {
                              const imageIndex = images.findIndex(img => img.id === item.id);
                              openViewer(images, imageIndex >= 0 ? imageIndex : 0);
                            }}
                          />
                        ) : (
                          <video
                            src={src}
                            controls
                            className="max-w-full h-auto rounded-lg"
                            style={{ maxHeight: '300px' }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    );
                  });
                })()}
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
      {/* Viewer Modal */}
      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setViewer(null)}
        >
          <div className="max-w-[90%] max-h-[90%] relative" onClick={(e) => e.stopPropagation()}>
            {/* Controls */}
            <div className="absolute top-2 left-2 z-50 flex gap-2">
              <button
                onClick={() => setViewer(v => v ? { ...v, index: Math.max(v.index - 1, 0), scale: 1 } : v)}
                className="bg-white/90 text-black px-2 py-1 rounded"
                disabled={viewer.index === 0}
              >
                ◀
              </button>
              <button
                onClick={() => setViewer(v => v ? { ...v, index: Math.min(v.index + 1, v.items.length - 1), scale: 1 } : v)}
                className="bg-white/90 text-black px-2 py-1 rounded"
                disabled={viewer.index === viewer.items.length - 1}
              >
                ▶
              </button>
              <button
                onClick={() => {
                  const v = viewer
                  if (!v) return
                  const src = v.items[v.index].src
                  const a = document.createElement('a')
                  a.href = src
                  a.download = v.items[v.index].file_name || ''
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                }}
                className="bg-white/90 text-black px-2 py-1 rounded"
              >
                ⤓
              </button>
              <button
                onClick={() => setViewer(v => v ? { ...v, scale: Math.min(v.scale + 0.25, 3) } : v)}
                className="bg-white/90 text-black px-2 py-1 rounded"
              >
                ＋
              </button>
              <button
                onClick={() => setViewer(v => v ? { ...v, scale: Math.max(v.scale - 0.25, 0.5) } : v)}
                className="bg-white/90 text-black px-2 py-1 rounded"
              >
                −
              </button>
            </div>

            {/* Counter & caption */}
            <div className="absolute top-2 right-2 z-50 text-white/90 px-2 py-1 rounded bg-black/40">
              {viewer.index + 1} / {viewer.items.length}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/90 px-3 py-1 rounded bg-black/40 max-w-[90%] text-center">
              {viewer.items[viewer.index].file_name}
            </div>

            {/* Content */}
            <div className="w-full h-full flex items-center justify-center">
              {viewer.items[viewer.index].type === 'image' ? (
                <img
                  src={viewer.items[viewer.index].src}
                  alt={viewer.items[viewer.index].file_name}
                  className="rounded"
                  style={{ maxWidth: '100%', maxHeight: '100%', transform: `scale(${viewer.scale})` }}
                  onWheel={(e) => {
                    e.preventDefault()
                    const delta = Math.sign((e as any).deltaY) * -0.1
                    setViewer(v => v ? { ...v, scale: Math.min(Math.max(v.scale + delta, 0.5), 3) } : v)
                  }}
                />
              ) : (
                <video
                  src={viewer.items[viewer.index].src}
                  controls
                  autoPlay
                  className="rounded"
                  style={{ maxWidth: '100%', maxHeight: '100%', transform: `scale(${viewer.scale})` }}
                />
              )}
            </div>
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

