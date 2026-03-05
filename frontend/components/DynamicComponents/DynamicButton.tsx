'use client'

import { Bot, MessageCircle } from 'lucide-react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicButtonProps {
  config: MergedSkinConfig
  onClick: () => void
}

export default function DynamicButton({ config, onClick }: DynamicButtonProps) {
  const buttonConfig = config.components?.button || {}
  const primaryColor = config.theme?.primaryColor || '#6366f1'
  
  const size = buttonConfig.size || 'large'
  const sizeMap = {
    small: 'w-12 h-12',
    medium: 'w-14 h-14',
    large: 'w-16 h-16'
  }

  const type = buttonConfig.type || 'circular'
  const borderRadiusMap = {
    circular: 'rounded-full',
    rounded: 'rounded-lg',
    square: 'rounded-none'
  }

  const iconMap: Record<string, any> = {
    bot: Bot,
    chat: MessageCircle,
    message: MessageCircle,
  }

  const isCustomIcon = buttonConfig.icon === 'custom' && buttonConfig.customIconUrl
  const Icon = !isCustomIcon && buttonConfig.icon ? iconMap[buttonConfig.icon] || Bot : Bot
  const iconSize = size === 'large' ? 'w-6 h-6' : size === 'medium' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <button
      onClick={onClick}
      className={`${sizeMap[size]} ${borderRadiusMap[type]} shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 overflow-hidden`}
      style={{ backgroundColor: primaryColor }}
      aria-label={buttonConfig.label || 'Open chat'}
    >
      {isCustomIcon ? (
        <img src={buttonConfig.customIconUrl!} alt="" className={`${iconSize} object-contain`} />
      ) : (
        <Icon className={iconSize} />
      )}
      {buttonConfig.showLabel && buttonConfig.label && (
        <span className="ml-2 text-sm font-medium">{buttonConfig.label}</span>
      )}
    </button>
  )
}

