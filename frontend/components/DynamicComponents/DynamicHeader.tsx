'use client'

import { X, Settings } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicHeaderProps {
  config: MergedSkinConfig
  isMinimized: boolean
  onMinimize: () => void
  onClose: () => void
  onSettingsClick?: () => void
  showSettings?: boolean
}

export default function DynamicHeader({ 
  config, 
  isMinimized, 
  onMinimize, 
  onClose,
  onSettingsClick,
  showSettings = false
}: DynamicHeaderProps) {
  const headerConfig = config.components?.header || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  
  if (headerConfig.show === false) {
    return null
  }

  const height = headerConfig.height || 65;
  const title = headerConfig.title || 'Chat Assistant'
  const windowRadius = Math.min(30, Math.max(0, config.components?.window?.borderRadius ?? 8))

  return (
    <div
      className="px-4 flex items-center justify-between text-white shrink-0"
      style={{ 
        backgroundColor: primaryColor,
        height: `${height}px`,
        minHeight: `${height}px`,
        borderTopLeftRadius: `${windowRadius}px`,
        borderTopRightRadius: `${windowRadius}px`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {headerConfig.showAvatar !== false && headerConfig.avatarIcon && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/20">
            <img src={headerConfig.avatarIcon} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {headerConfig.showTitle && (
          <span className="font-semibold truncate">{title}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showSettings && onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        {headerConfig.showClose !== false && (
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

