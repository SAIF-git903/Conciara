'use client'

import { ReactNode } from 'react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicWindowProps {
  config: MergedSkinConfig
  children: ReactNode
  isMinimized: boolean
  /** When true (e.g. in settings live preview), window fills its container instead of fixed size */
  fillContainer?: boolean
}

export default function DynamicWindow({ config, children, isMinimized, fillContainer = false }: DynamicWindowProps) {
  const windowConfig = config.components?.window || {}
  const backgroundColor = config.theme?.backgroundColor || '#ffffff'
  const borderColor = config.theme?.borderColor || '#e2e8f0'

  const width = windowConfig.width || 384
  const height = windowConfig.height || 600
  const borderRadius = Math.min(30, Math.max(0, windowConfig.borderRadius ?? 8))

  const shadowMap = {
    none: 'shadow-none',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-2xl'
  }
  const shadow = shadowMap[windowConfig.shadow || 'large']

  return (
    <div
      className={`bg-white border ${shadow} flex flex-col transition-all overflow-hidden ${
        isMinimized ? 'w-80 h-12' : fillContainer ? 'w-full h-full min-h-0' : 'animate-scale-in'
      }`}
      style={{
        backgroundColor,
        borderColor,
        ...(fillContainer && !isMinimized
          ? { borderRadius: `${borderRadius}px` }
          : {
              width: isMinimized ? undefined : width,
              height: isMinimized ? undefined : height,
              borderRadius: `${borderRadius}px`,
              minWidth: windowConfig.minWidth,
              minHeight: windowConfig.minHeight,
              maxWidth: windowConfig.maxWidth,
              maxHeight: windowConfig.maxHeight,
            }),
      }}
    >
      {children}
    </div>
  )
}

