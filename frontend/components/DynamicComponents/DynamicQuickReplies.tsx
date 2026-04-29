'use client'

import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicQuickRepliesProps {
  config: MergedSkinConfig
  replies: string[]
  onReply: (reply: string) => void
}

export default function DynamicQuickReplies({
  config,
  replies,
  onReply
}: DynamicQuickRepliesProps) {
  const quickRepliesConfig = config.components?.quickReplies || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  
  if (quickRepliesConfig.show === false || replies.length === 0) {
    return null
  }

  const layout = quickRepliesConfig.layout || 'horizontal'
  const style = quickRepliesConfig.style || 'buttons'
  const maxVisible = quickRepliesConfig.maxVisible || replies.length
  const visibleReplies = replies.slice(0, maxVisible)

  const layoutClasses = {
    horizontal: 'flex flex-wrap',
    vertical: 'flex flex-col',
    grid: 'grid grid-cols-2 gap-2'
  }

  const styleClasses = {
    buttons: 'px-3 py-1.5 text-xs rounded-full border transition-colors hover:bg-gray-50',
    chips: 'px-3 py-1.5 text-xs rounded-full bg-gray-100 transition-colors hover:bg-gray-200',
    links: 'px-3 py-1.5 text-xs text-blue-600 underline transition-colors hover:text-blue-800'
  }

  return (
    <div className={`px-4 pb-2 ${layoutClasses[layout]} gap-2 animate-fade-in`}>
      {visibleReplies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onReply(reply)}
          className={styleClasses[style]}
          style={
            style === 'buttons'
              ? { borderColor: primaryColor, color: primaryColor }
              : undefined
          }
        >
          {reply}
        </button>
      ))}
    </div>
  )
}

