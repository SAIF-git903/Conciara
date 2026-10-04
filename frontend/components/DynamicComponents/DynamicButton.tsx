'use client'

import { Bot, MessageCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicButtonProps {
  config: MergedSkinConfig
  onClick: () => void
  /** When true, shows a close (X) icon instead of the chat icon. */
  isOpen?: boolean
}

export default function DynamicButton({ config, onClick, isOpen = false }: DynamicButtonProps) {
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

  const iconMap: Record<string, typeof Bot> = {
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
      className={`${sizeMap[size]} ${borderRadiusMap[type]} shadow-lg flex items-center justify-center text-white transition-shadow hover:shadow-xl overflow-hidden relative`}
      style={{ backgroundColor: primaryColor }}
      aria-label={isOpen ? 'Close chat' : (buttonConfig.label || 'Open chat')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center justify-center"
          >
            <X className={iconSize} strokeWidth={2.5} />
          </motion.span>
        ) : isCustomIcon ? (
          <motion.img
            key="custom"
            src={buttonConfig.customIconUrl!}
            alt=""
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`${iconSize} object-contain`}
          />
        ) : (
          <motion.span
            key="icon"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center justify-center"
          >
            <Icon className={iconSize} />
          </motion.span>
        )}
      </AnimatePresence>
      {buttonConfig.showLabel && buttonConfig.label && !isOpen && (
        <span className="ml-2 text-sm font-medium">{buttonConfig.label}</span>
      )}
    </button>
  )
}
