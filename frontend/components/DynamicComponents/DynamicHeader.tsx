'use client'

import { Bot, Minimize2, Maximize2, X } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicHeaderProps {
  config: MergedSkinConfig
  isMinimized: boolean
  onMinimize: () => void
  onClose: () => void
}

export default function DynamicHeader({ 
  config, 
  isMinimized, 
  onMinimize, 
  onClose 
}: DynamicHeaderProps) {
  const headerConfig = config.components?.header || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  
  if (headerConfig.show === false) {
    return null
  }

  const height = headerConfig.height || 48
  const title = headerConfig.title || 'Chat Assistant'

  return (
    <div
      className="px-4 rounded-t-lg flex items-center justify-between text-white"
      style={{ 
        backgroundColor: primaryColor,
        height: `${height}px`,
        minHeight: `${height}px`
      }}
    >
      <div className="flex items-center gap-2">
        {headerConfig.showAvatar && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Bot className="w-4 h-4" />
          </div>
        )}
        {headerConfig.showTitle && (
          <span className="font-semibold">{title}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {headerConfig.showMinimize && (
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
        )}
        {headerConfig.showClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

