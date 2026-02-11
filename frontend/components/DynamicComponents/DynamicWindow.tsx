'use client'

import { ReactNode } from 'react'
import { MergedSkinConfig } from '../../types/skinConfig'

interface DynamicWindowProps {
  config: MergedSkinConfig
  children: ReactNode
  isMinimized: boolean
}

export default function DynamicWindow({ config, children, isMinimized }: DynamicWindowProps) {
  const windowConfig = config.components?.window || {}
  const backgroundColor = config.theme?.backgroundColor || '#ffffff'
  
  const width = windowConfig.width || 384
  const height = windowConfig.height || 600
  const borderRadius = windowConfig.borderRadius || 8
  
  const shadowMap = {
    none: 'shadow-none',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-2xl'
  }
  const shadow = shadowMap[windowConfig.shadow || 'large']

  return (
    <div
      className={`bg-white ${shadow} flex flex-col transition-all ${
        isMinimized ? 'w-80 h-12' : ''
      }`}
      style={{
        backgroundColor,
        width: isMinimized ? undefined : width,
        height: isMinimized ? undefined : height,
        borderRadius: `${borderRadius}px`,
        minWidth: windowConfig.minWidth,
        minHeight: windowConfig.minHeight,
        maxWidth: windowConfig.maxWidth,
        maxHeight: windowConfig.maxHeight,
      }}
    >
      {children}
    </div>
  )
}

