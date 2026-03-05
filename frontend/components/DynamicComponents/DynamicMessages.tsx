'use client'

import { MergedSkinConfig } from '../../types/skinConfig'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

function CodeBlockWithCopy({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const el = ref.current
    const text = el?.querySelector('code')?.textContent ?? el?.textContent ?? ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="relative group my-2 rounded-lg overflow-hidden bg-slate-800">
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded bg-slate-600 hover:bg-slate-500 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre ref={ref} className="p-3 pr-16 overflow-x-auto text-sm text-slate-100 font-mono">
        {children}
      </pre>
    </div>
  )
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
  const showBotAvatar = messagesConfig.showBotAvatar ?? showAvatars
  const showUserAvatar = messagesConfig.showUserAvatar ?? showAvatars
  const bubbleStyle = messagesConfig.bubbleStyle || 'rounded'

  const borderRadiusMap = {
    rounded: 'rounded-2xl',
    square: 'rounded-none',
    minimal: 'rounded-lg'
  } as const

  const alignmentMap = {
    left: 'justify-start',
    right: 'justify-end',
  } as const

  const userJustify = alignmentMap[userAlignment as keyof typeof alignmentMap] ?? 'justify-end'
  const botJustify = alignmentMap[botAlignment as keyof typeof alignmentMap] ?? 'justify-start'

  const isList = layout === 'list'
  const isCards = layout === 'cards'
  const isBubbles = layout === 'bubbles'

  const messageRowClass = (isUser: boolean) =>
    `flex gap-2 ${isUser ? userJustify : botJustify}`

  const bubbleRadius = borderRadiusMap[bubbleStyle] ?? 'rounded-2xl'
  const bubbleMaxWidth = isList ? 'max-w-full' : isCards ? 'max-w-full' : 'max-w-[80%]'
  const bubbleLayoutClasses = isCards
    ? 'border border-slate-200 shadow-sm'
    : ''

  const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-0.5 first:mt-0">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-slate-300 pl-3 py-0.5 my-2 bg-slate-100/80 rounded-r text-slate-700">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a href={href ?? '#'} target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: primaryColor }}>
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-slate-200" />,
    code: ({ className, children, ...props }) => {
      const isBlock = className != null
      if (isBlock) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }
      return <code className="bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>{children}</code>
    },
    pre: ({ children }) => <CodeBlockWithCopy>{children}</CodeBlockWithCopy>,
    table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border border-slate-200 rounded">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
    th: ({ children }) => <th className="text-left px-3 py-1.5 text-sm font-semibold border-b border-slate-200">{children}</th>,
    td: ({ children }) => <td className="px-3 py-1.5 text-sm border-b border-slate-100">{children}</td>,
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 ${isList ? 'space-y-2' : isCards ? 'space-y-3' : 'space-y-4'}`}
      style={{ backgroundColor }}
      data-layout={layout}
    >
      {messages.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 text-sm py-8">
          {config.states?.empty?.message || 'Starting conversation...'}
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={messageRowClass(message.type === 'user')}
        >
          {message.type === 'bot' && showBotAvatar && messagesConfig.botAvatar && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-200">
              <img src={messagesConfig.botAvatar} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div
            className={`${bubbleMaxWidth} ${bubbleRadius} px-3 py-2 ${bubbleLayoutClasses} ${
              message.type === 'user'
                ? 'text-white'
                : ''
            }`}
            style={
              message.type === 'user'
                ? { backgroundColor: primaryColor }
                : { backgroundColor: '#f1f5f9', color: textColor }
            }
          >
            <div className="text-sm ct-message-body" style={{ color: message.type === 'user' ? 'white' : textColor }}>
              {message.type === 'bot' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
            
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
          {message.type === 'user' && showUserAvatar && messagesConfig.userAvatar && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-200">
              <img src={messagesConfig.userAvatar} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2 justify-start">
          {showBotAvatar && messagesConfig.botAvatar && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-200">
              <img src={messagesConfig.botAvatar} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="bg-gray-100 rounded-2xl px-3 py-2">
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

